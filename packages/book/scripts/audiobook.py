#!/usr/bin/env python3
"""Build an offline, chaptered M4B from exported scripts or recorded narration."""
import argparse
import fcntl
from contextlib import ExitStack
import hashlib
import json
from datetime import datetime, timezone
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import wave
import zipfile

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / '.audiobook'
DIST = ROOT / 'dist' / 'downloads'
PUBLIC = ROOT / 'public' / 'downloads'


def run(command, **kwargs):
    subprocess.run([str(arg) for arg in command], check=True, **kwargs)


def metadata_text(value):
    return value.replace('\\', '\\\\').replace('=', '\\=').replace(';', '\\;').replace('#', '\\#').replace('\n', ' ')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--setup', action='store_true', help='Install Piper in a project-local environment and download the voice')
    parser.add_argument('--engine', choices=['piper', 'recorded'], default='piper')
    parser.add_argument('--voice', default='en_US-lessac-medium', help='Piper voice name, or path to an existing .onnx model')
    parser.add_argument('--recordings', type=Path, help='Recorded WAV files named after each script, e.g. 1.2.1.wav')
    parser.add_argument('--verify-with-voxtype', action='store_true', help='Transcribe each track with local Voxtype for manual comparison')
    parser.add_argument('--only', help='Build a sample section (does not advertise a complete audiobook)')
    parser.add_argument('--jobs', type=int, default=4, help='Sections to synthesize in parallel')
    parser.add_argument('--cache-only', action='store_true', help=argparse.SUPPRESS)
    parser.add_argument('--threads', type=int, default=2, help='CPU threads for local synthesis')
    parser.add_argument('--length-scale', type=float, default=1.05, help='Speech duration multiplier; larger values speak more slowly')
    args = parser.parse_args()
    if args.jobs < 1:
        parser.error('--jobs must be positive')
    if args.threads < 1:
        parser.error('--threads must be positive')
    if args.length_scale <= 0:
        parser.error('--length-scale must be positive')
    if not (DIST / 'narration' / 'manifest.json').exists():
        parser.error('Build the book editions first: npm run build')
    if not shutil.which('ffmpeg'):
        parser.error('ffmpeg must be installed to encode and assemble the audiobook')
    manifest = json.loads((DIST / 'narration' / 'manifest.json').read_text())
    tracks = [track for track in manifest['tracks'] if args.only is None or track['id'] == args.only]
    if not tracks:
        parser.error(f'Unknown section: {args.only}')
    if args.verify_with_voxtype and not shutil.which('voxtype'):
        parser.error('Voxtype must be installed for --verify-with-voxtype')
    if not shutil.which('ffprobe'):
        parser.error('ffprobe must be installed to measure chapter durations')
    voice = None
    model = None
    if args.engine == 'piper':
        environment = CACHE / 'venv'
        python = environment / 'bin' / 'python'
        if args.setup and not environment.exists():
            run([sys.executable, '-m', 'venv', environment])
        if args.setup and Path(sys.prefix).resolve() != environment.resolve():
            run([python, '-m', 'pip', 'install', 'piper-tts==1.8.0'])
            run([python, __file__, *sys.argv[1:]])
            return
        if not args.setup and python.exists() and Path(sys.prefix).resolve() != environment.resolve():
            run([python, __file__, *sys.argv[1:]])
            return
        try:
            from piper import PiperVoice, SynthesisConfig
            from piper.config import PiperConfig
            import onnxruntime
        except ImportError:
            parser.error('Piper is not installed. Run npm run audiobook -- --setup, or use --engine recorded --recordings DIR')
        models = CACHE / 'voices'
        models.mkdir(parents=True, exist_ok=True)
        model = Path(args.voice).resolve() if args.voice.endswith('.onnx') else models / f'{args.voice}.onnx'
        if not model.exists():
            if not args.setup:
                parser.error('Voice is missing. Run with --setup to download it, or pass --voice /path/to/model.onnx')
            run([sys.executable, '-m', 'piper.download_voices', args.voice], cwd=models)
        options = onnxruntime.SessionOptions()
        options.intra_op_num_threads = args.threads
        voice = PiperVoice(config=PiperConfig.from_dict(json.loads(Path(str(model) + '.json').read_text())), session=onnxruntime.InferenceSession(str(model), sess_options=options, providers=['CPUExecutionProvider']), download_dir=models)
        synthesis = SynthesisConfig(length_scale=args.length_scale)
    elif args.recordings is None:
        parser.error('--engine recorded requires --recordings DIR')

    CACHE.mkdir(parents=True, exist_ok=True)
    with ExitStack() as resources:
        if not args.cache_only:
            build_lock = resources.enter_context((CACHE / 'build.lock').open('a'))
            try:
                fcntl.flock(build_lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
            except BlockingIOError:
                parser.error('An audiobook build is already running for this copy of the book.')
        audio_dir = CACHE / 'tracks'
        audio_dir.mkdir(exist_ok=True)
        rendered = []
        def status(state, completed, current=None):
            if args.only:
                return
            data = {'state': state, 'completed': completed, 'total': len(tracks), 'current': current, 'updatedAt': datetime.now(timezone.utc).isoformat()}
            for directory in [DIST, PUBLIC]:
                directory.mkdir(parents=True, exist_ok=True)
                temporary_status = directory / 'audio-status.partial.json'
                temporary_status.write_text(json.dumps(data) + '\n')
                temporary_status.replace(directory / 'audio-status.json')
        status('building', 0)
        parallel = args.engine == 'piper' and args.jobs > 1 and len(tracks) > 1
        if parallel:
            def prepare(track):
                command = [sys.executable, __file__, '--only', track['id'], '--cache-only', '--voice', args.voice, '--length-scale', str(args.length_scale), '--threads', str(args.threads), '--jobs', '1']
                if args.verify_with_voxtype:
                    command.append('--verify-with-voxtype')
                run(command, stdout=subprocess.DEVNULL)
                return track
            with ThreadPoolExecutor(max_workers=args.jobs) as pool:
                futures = [pool.submit(prepare, track) for track in tracks]
                try:
                    for completed, future in enumerate(as_completed(futures), 1):
                        track = future.result()
                        status('building', completed, track['title'])
                        print(f'Prepared {completed}/{len(tracks)}: {track["title"]}', flush=True)
                except BaseException:
                    for future in futures:
                        future.cancel()
                    raise
            status('assembling', len(tracks))
        for track in tracks:
            identifier = track['id'].replace('/', '-')
            if not parallel:
                status('building', len(rendered), track['title'])
            script = (DIST / 'narration' / track['file']).read_text()
            if voice:
                key = hashlib.sha256((script + str(model) + str(model.stat().st_mtime_ns) + str(args.length_scale) + 'piper-1.8.0').encode()).hexdigest()
            else:
                recorded = args.recordings.resolve() / f'{identifier}.wav'
                if not recorded.exists():
                    parser.error(f'Missing recording: {recorded}')
                key = hashlib.sha256(recorded.read_bytes()).hexdigest()
            wav_path = audio_dir / f'{identifier}-{key[:16]}.wav'
            if not wav_path.exists():
                temporary = wav_path.with_suffix('.partial.wav')
                if voice:
                    print(f'Narrating {track["title"]}', flush=True)
                    with wave.open(str(temporary), 'wb') as output:
                        first = True
                        for paragraph in script.split('\n\n'):
                            if not paragraph.strip():
                                continue
                            for chunk in voice.synthesize(paragraph, syn_config=synthesis):
                                if first:
                                    output.setnchannels(chunk.sample_channels)
                                    output.setsampwidth(chunk.sample_width)
                                    output.setframerate(chunk.sample_rate)
                                    first = False
                                output.writeframes(chunk.audio_int16_bytes)
                            if not first:
                                output.writeframes(b'\x00' * int(output.getframerate() * .25) * output.getsampwidth() * output.getnchannels())
                else:
                    run(['ffmpeg', '-v', 'error', '-y', '-i', recorded, '-ar', '22050', '-ac', '1', temporary])
                temporary.replace(wav_path)
            if args.verify_with_voxtype:
                transcript = wav_path.with_suffix('.transcript.txt')
                if not transcript.exists():
                    verification_wav = wav_path.with_suffix('.16k.wav')
                    run(['ffmpeg', '-v', 'error', '-y', '-i', wav_path, '-ar', '16000', '-ac', '1', verification_wav])
                    with transcript.with_suffix('.partial.txt').open('w') as output:
                        run(['voxtype', '--quiet', 'transcribe', verification_wav], stdout=output)
                    transcript.with_suffix('.partial.txt').replace(transcript)
                    verification_wav.unlink()
                print(f'Voxtype transcript: {transcript}', flush=True)
            encoded = wav_path.with_suffix('.m4a')
            if not encoded.exists():
                temporary = encoded.with_suffix('.partial.m4a')
                run(['ffmpeg', '-v', 'error', '-y', '-i', wav_path, '-af', 'loudnorm=I=-18:TP=-3:LRA=11', '-ar', '44100', '-ac', '1', '-c:a', 'aac', '-b:a', '96k', temporary])
                temporary.replace(encoded)
            rendered.append((track, encoded))
            if not parallel:
                status('building', len(rendered), track['title'])
            print(f'Ready: {track["title"]}', flush=True)

        if args.cache_only:
            return
        if json.loads((DIST / 'narration' / 'manifest.json').read_text()) != manifest:
            raise RuntimeError('Book editions changed during narration. Run the audiobook builder again to use the new scripts.')
        status('assembling', len(tracks))
        with tempfile.TemporaryDirectory(dir=CACHE) as staging:
            staging = Path(staging)
            concat = staging / 'tracks.txt'
            # Relative filenames avoid escaping user-controlled filesystem paths in FFmpeg concat syntax.
            for index, (_, encoded) in enumerate(rendered):
                (staging / f'{index}.m4a').symlink_to(encoded)
            concat.write_text(''.join(f"file '{index}.m4a'\n" for index in range(len(rendered))))
            info = [';FFMETADATA1', f'title={metadata_text(manifest["title"])}', 'artist=Andrew Solomon', f'comment={metadata_text(manifest["note"])} Synthetic narration by Piper.' if voice else f'comment={metadata_text(manifest["note"])} Recorded narration.', 'copyright=CC BY-SA 4.0; see companion edition for attribution']
            position = 0
            for track, encoded in rendered:
                duration = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', str(encoded)], text=True))
                end = position + round(duration * 1000)
                info.extend(['[CHAPTER]', 'TIMEBASE=1/1000', f'START={position}', f'END={end}', f'title={metadata_text(track["title"])}'])
                position = end
            metadata = staging / 'chapters.txt'
            metadata.write_text('\n'.join(info) + '\n')
            name = f'sicp-sample-{args.only.replace("/", "-")}.m4b' if args.only else 'sicp-source.m4b'
            target = staging / name
            run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '1', '-i', concat, '-i', metadata, '-map', '0:a', '-map_metadata', '1', '-map_chapters', '1', '-c:a', 'copy', '-movflags', '+faststart', '-f', 'ipod', target])
            shutil.copy2(target, DIST / name)
            PUBLIC.mkdir(parents=True, exist_ok=True)
            shutil.copy2(target, PUBLIC / name)
            if args.only:
                editions = json.loads((DIST / 'manifest.json').read_text())
                editions['files'] = [f for f in editions['files'] if f['format'] != 'sample']
                editions['files'].append({'format': 'sample', 'name': name, 'bytes': (DIST / name).stat().st_size})
                for directory in [DIST, PUBLIC]:
                    (directory / 'manifest.json').write_text(json.dumps(editions, indent=2) + '\n')
            if not args.only:
                # An editable archive makes replacing the synthetic voice with recordings straightforward.
                with zipfile.ZipFile(DIST / 'sicp-audio-tracks.zip', 'w', compression=zipfile.ZIP_STORED) as archive:
                    archive.writestr('manifest.json', json.dumps(manifest, indent=2))
                    for track, encoded in rendered:
                        archive.write(encoded, f'{track["id"].replace("/", "-")}.m4a')
                shutil.copy2(DIST / 'sicp-audio-tracks.zip', PUBLIC / 'sicp-audio-tracks.zip')
                editions = json.loads((DIST / 'manifest.json').read_text())
                editions['files'] = [f for f in editions['files'] if f['format'] != 'audio']
                editions['files'].append({'format': 'audio', 'name': name, 'bytes': (DIST / name).stat().st_size})
                for directory in [DIST, PUBLIC]:
                    (directory / 'manifest.json').write_text(json.dumps(editions, indent=2) + '\n')
            status('complete', len(rendered))
            print(f'Built {DIST / name} ({position / 1000 / 60:.1f} minutes)', flush=True)


if __name__ == '__main__':
    try:
        main()
    except (Exception, KeyboardInterrupt) as error:
        for directory in [DIST, PUBLIC]:
            path = directory / 'audio-status.json'
            if path.exists() and '--only' not in sys.argv:
                data = json.loads(path.read_text())
                data.update(state='failed', message=str(error), updatedAt=datetime.now(timezone.utc).isoformat())
                path.write_text(json.dumps(data) + '\n')
        raise
