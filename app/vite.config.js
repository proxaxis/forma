import { fileURLToPath, URL } from 'node:url';
import { builtinModules } from 'node:module';
import { defineConfig } from 'vite';

const builtinsInNode = [
  ...builtinModules,
  ...builtinModules.map((m) => `node:${m}`),
];

// Packages that should not be bundled and should be treated as external dependencies
const notBundledPackages = [
  'vscode',
  'sass',
  'puppeteer-core',
];

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  ssr: {
    noExternal: ['github-slugger'],
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'node20',
    sourcemap: true,
    minify: false,
    ssr: fileURLToPath(new URL('./src/index.js', import.meta.url)),
    rollupOptions: {
      external: [
        ...builtinsInNode,
        ...notBundledPackages,
      ],
      output: {
        format: 'cjs',
        entryFileNames: 'extension.cjs',
        exports: 'named',
      },
    },
  },
});
