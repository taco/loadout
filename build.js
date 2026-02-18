import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = dirname(fileURLToPath(import.meta.url));
const srcDir = resolve(__dir, 'src');
const distDir = resolve(__dir, 'dist');

const html = readFileSync(resolve(srcDir, 'index.html'), 'utf8');
const calcJs = readFileSync(resolve(srcDir, 'calc.js'), 'utf8');

// Strip export keywords so the functions become globals
const inlineJs = calcJs.replace(/^export\s+/gm, '');

// Replace the <script type="module"> block (including the import line) with an inline script
const result = html.replace(
  /<script type="module">[\s\S]*?<\/script>/,
  `<script>\n${inlineJs}\n</script>`
);

mkdirSync(distDir, { recursive: true });
writeFileSync(resolve(distDir, 'index.html'), result);
console.log('Built dist/index.html');
