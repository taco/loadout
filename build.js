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

// Remove the import line from the module script, prepend inlined calc.js, drop type="module"
const result = html.replace(
  /<script type="module">([\s\S]*?)<\/script>/,
  (_, appJs) => {
    const appJsNoImport = appJs.replace(/^\s*import\s+.*?from\s+['"].*?['"];?\s*\n/m, '');
    return `<script>\n${inlineJs}\n${appJsNoImport}</script>`;
  }
);

mkdirSync(distDir, { recursive: true });
writeFileSync(resolve(distDir, 'index.html'), result);
console.log('Built dist/index.html');
