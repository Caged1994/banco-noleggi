// Build di Banco Noleggi, senza dipendenze oltre a TypeScript.
//
// 1. Compila src/**/*.ts in moduli ES dentro build/js (tsc).
// 2. Unisce i moduli in un unico script, nell'ordine delle dipendenze a partire da main.js.
// 3. Inserisce script e stili in src/index.html e scrive:
//    - dist/index.html       pagina completa (GitHub Pages, apertura locale)
//    - build/artifact.html   solo il contenuto della pagina (anteprima su claude.ai)
//
// Uso: node scripts/build.mjs

import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const jsDir = join(root, 'build', 'js');

// 1. Compilazione
rmSync(jsDir, { recursive: true, force: true });
const localTsc = join(root, 'node_modules', '.bin', 'tsc');
const tsc = existsSync(localTsc) ? `"${localTsc}"` : 'tsc';
try {
  execSync(`${tsc} -p tsconfig.json`, { cwd: root, stdio: 'inherit' });
} catch {
  console.error('\nCompilazione fallita: correggi gli errori di TypeScript qui sopra.');
  process.exit(1);
}

// 2. Unione dei moduli
const importRe = /^import\s+(?:[^'"]*?\s+from\s+)?['"](\.{1,2}\/[^'"]+)['"];?\s*$/gm;
const visited = new Set();
const ordered = [];
function visit(file) {
  if (visited.has(file)) return;
  visited.add(file);
  const code = readFileSync(file, 'utf8');
  for (const m of code.matchAll(importRe)) visit(resolve(dirname(file), m[1]));
  ordered.push(file);
}
visit(join(jsDir, 'main.js'));

const parts = ordered.map((file) => {
  const code = readFileSync(file, 'utf8')
    .replace(importRe, '')
    .replace(/^export\s+(?=(?:async\s+)?function\b|const\b|let\b|var\b|class\b)/gm, '');
  if (/^\s*export\b/m.test(code)) {
    throw new Error(`Esportazione non supportata dal build in ${file.slice(root.length + 1)}`);
  }
  return `// ---- ${file.slice(jsDir.length + 1)}\n${code.trim()}\n`;
});
const bundle = `(() => {\n'use strict';\n${parts.join('\n')}})();\n`;

// 3. Pagine
const template = readFileSync(join(root, 'src', 'index.html'), 'utf8');
const css = readFileSync(join(root, 'src', 'styles.css'), 'utf8');
const page = template
  .replace('<!-- STYLE -->', () => `<style>\n${css}</style>`)
  .replace('<!-- SCRIPT -->', () => `<script>\n${bundle}</script>`);

mkdirSync(join(root, 'dist'), { recursive: true });
writeFileSync(join(root, 'dist', 'index.html'), page);

// L'anteprima su claude.ai aggiunge da sé doctype, head e body: le passiamo solo il contenuto.
const head = page.slice(page.indexOf('<title>'), page.indexOf('</head>'));
const body = page.slice(page.indexOf('<body>') + '<body>'.length, page.indexOf('</body>'));
writeFileSync(join(root, 'build', 'artifact.html'), `${head.trim()}\n${body.trim()}\n`);

const kb = (n) => `${(n / 1024).toFixed(0)} KB`;
console.log(`Build completato: ${ordered.length} moduli, dist/index.html ${kb(Buffer.byteLength(page))}`);
