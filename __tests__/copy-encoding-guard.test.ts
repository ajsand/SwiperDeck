import fs from 'node:fs';
import path from 'node:path';

const PROJECT_ROOT = path.resolve(__dirname, '..');
const SCAN_DIRECTORIES = ['app', 'components', 'hooks', 'lib'];
const TEXT_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.md']);
const MOJIBAKE_MARKERS = ['Â', 'â€™', 'â€“', 'â€”', 'Ã', '�'];

function collectTextFiles(directory: string): string[] {
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...collectTextFiles(entryPath));
      continue;
    }

    if (TEXT_EXTENSIONS.has(path.extname(entry.name))) {
      files.push(entryPath);
    }
  }

  return files;
}

describe('user-facing source encoding guard', () => {
  it('does not contain common mojibake markers in app copy', () => {
    const violations: string[] = [];

    for (const relativeDirectory of SCAN_DIRECTORIES) {
      const absoluteDirectory = path.join(PROJECT_ROOT, relativeDirectory);

      for (const filePath of collectTextFiles(absoluteDirectory)) {
        const source = fs.readFileSync(filePath, 'utf8');

        for (const marker of MOJIBAKE_MARKERS) {
          if (!source.includes(marker)) {
            continue;
          }

          violations.push(
            `${path.relative(PROJECT_ROOT, filePath)} contains "${marker}"`,
          );
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it('keeps the profile tab metadata separators in clean ASCII', () => {
    const profileTabPath = path.join(
      PROJECT_ROOT,
      'app',
      '(tabs)',
      'profile.tsx',
    );
    const source = fs.readFileSync(profileTabPath, 'utf8');

    expect(source).toContain(' | ');
    expect(source).not.toContain('Â');
    expect(source).not.toContain('â€™');
    expect(source).not.toContain('â€“');
    expect(source).not.toContain('â€”');
    expect(source).not.toContain('Ã');
    expect(source).not.toContain('�');
  });
});
