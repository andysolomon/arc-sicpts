"""Small recorded-audio integration tests, with no voice model or network required."""
import importlib.util
import json
import math
import struct
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch
import wave

spec = importlib.util.spec_from_file_location('audiobook', Path(__file__).with_name('audiobook.py'))
audiobook = importlib.util.module_from_spec(spec)
spec.loader.exec_module(audiobook)


@unittest.skipUnless(shutil.which('ffmpeg') and shutil.which('ffprobe'), 'FFmpeg and FFprobe required')
class AudiobookTests(unittest.TestCase):
    def test_recordings_create_chapters_and_publish_only_the_complete_book(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            dist = root / 'dist'
            public = root / 'public'
            scripts = dist / 'narration'
            recordings = root / 'recordings'
            scripts.mkdir(parents=True)
            recordings.mkdir()
            tracks = [{'id': 'front', 'title': 'Attribution', 'file': 'front.txt'}, {'id': '1.1.1', 'title': 'Expressions', 'file': '1.1.1.txt'}]
            (scripts / 'manifest.json').write_text(json.dumps({'title': 'Test book', 'note': 'Listening companion', 'tracks': tracks}))
            (dist / 'manifest.json').write_text(json.dumps({'files': []}))
            for track in tracks:
                (scripts / track['file']).write_text(track['title'])
                with wave.open(str(recordings / f'{track["id"]}.wav'), 'wb') as wav:
                    wav.setparams((1, 2, 22050, 0, 'NONE', 'not compressed'))
                    wav.writeframes(b''.join(struct.pack('<h', int(5000 * math.sin(2 * math.pi * 440 * i / 22050))) for i in range(44100)))
            with patch.multiple(audiobook, DIST=dist, PUBLIC=public, CACHE=root / 'cache'):
                args = ['audiobook', '--engine', 'recorded', '--recordings', str(recordings)]
                with patch.object(sys, 'argv', [*args, '--only', '1.1.1']):
                    audiobook.main()
                self.assertTrue((dist / 'sicp-sample-1.1.1.m4b').exists())
                self.assertEqual([f['format'] for f in json.loads((dist / 'manifest.json').read_text())['files']], ['sample'])
                with patch.object(sys, 'argv', args):
                    audiobook.main()
                book = dist / 'sicp-source.m4b'
                metadata = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_chapters', '-show_streams', '-of', 'json', str(book)]))
                self.assertEqual([chapter['tags']['title'] for chapter in metadata['chapters']], ['Attribution', 'Expressions'])
                self.assertEqual(metadata['streams'][0]['codec_name'], 'aac')
                self.assertGreater(float(metadata['chapters'][-1]['end_time']), .5)
                self.assertIn('audio', [f['format'] for f in json.loads((public / 'manifest.json').read_text())['files']])
                self.assertEqual(json.loads((public / 'audio-status.json').read_text())['state'], 'complete')
                self.assertTrue((public / 'sicp-audio-tracks.zip').exists())
                self.assertEqual(book.read_bytes(), (public / book.name).read_bytes())


if __name__ == '__main__':
    unittest.main()
