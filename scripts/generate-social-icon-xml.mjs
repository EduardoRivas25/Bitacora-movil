import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const google = readFileSync(join(root, 'assets', 'google.svg'), 'utf8');
const apple = readFileSync(join(root, 'assets', 'apple.svg'), 'utf8');

writeFileSync(
  join(root, 'src', 'components', 'socialIconXml.ts'),
  `// Generated from assets/google.svg and assets/apple.svg. Run npm run generate:social-icons after editing either SVG.\n` +
    `export const GOOGLE_SVG_XML = ${JSON.stringify(google)};\n` +
    `export const APPLE_SVG_XML = ${JSON.stringify(apple)};\n`,
);
