import { renameSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

const root = import.meta.dirname;

/**
 * Build modes:
 * - default: your deck (src/deck.ts, src/slides, src/theme) to dist/
 * - single: your deck as one self-contained dist-single/deck.html
 * - example / example-single: the Wi-Fi example deck (examples/wifi), the fixture the engine
 *   e2e suite runs against, so engine tests never depend on your own slides. Output: dist-example/
 * - example-<name> / example-<name>-single: any other example, e.g. example-crypto for
 *   examples/crypto. Output: dist-example-<name>/
 */
function exampleName(mode: string): string | null {
  if (!mode.startsWith('example')) return null;
  return mode.replace(/^example-?/, '').replace(/-?single$/, '') || 'wifi';
}

/** Renames the single-file output to deck.html once it is written. */
function renameToDeck(outDir: string): Plugin {
  return {
    name: 'rename-to-deck',
    apply: 'build',
    closeBundle() {
      renameSync(resolve(outDir, 'index.html'), resolve(outDir, 'deck.html'));
    },
  };
}

/** Points the entry points' deck, content and theme imports at an example deck. */
function useExampleDeck(name: string): Plugin {
  const dir = resolve(root, 'examples', name);
  const swap = new Map([
    [resolve(root, 'src/deck.ts'), resolve(dir, 'deck.ts')],
    [resolve(root, 'src/content.ts'), resolve(dir, 'content.ts')],
    [resolve(root, 'src/theme/index.css'), resolve(dir, 'theme/index.css')],
  ]);
  return {
    name: 'use-example-deck',
    enforce: 'pre',
    resolveId(source, importer) {
      if (!importer || !source.startsWith('.')) return null;
      return swap.get(resolve(dirname(importer), source)) ?? null;
    },
  };
}

export default defineConfig(({ mode }) => {
  const example = exampleName(mode);
  const single = mode.endsWith('single');
  const plugins: Plugin[] = example ? [useExampleDeck(example)] : [];
  const base = example ? `dist-example${example === 'wifi' ? '' : `-${example}`}` : 'dist';
  const outDir = resolve(root, `${base}${single ? '-single' : ''}`);
  if (single) {
    return {
      base: './',
      input: { main: resolve(root, 'index.html') },
      plugins: [...plugins, viteSingleFile(), renameToDeck(outDir)],
      build: { outDir, emptyOutDir: true },
    };
  }
  return {
    base: './',
    input: {
      main: resolve(root, 'index.html'),
      presenter: resolve(root, 'presenter.html'),
    },
    plugins,
    build: { outDir, emptyOutDir: true },
    preview: { port: example === 'wifi' ? 4173 : 4175, strictPort: true },
  };
});
