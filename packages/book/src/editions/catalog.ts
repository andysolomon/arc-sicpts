export interface EditionFile {
  format: 'pdf' | 'epub' | 'scripts' | 'audio' | 'sample';
  name: string;
  bytes: number;
}

export interface EditionManifest {
  generatedAt: string;
  sections: number;
  illustrations: number;
  files: EditionFile[];
}
