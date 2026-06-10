// Builds dist/ as a Chrome "Load unpacked" extension:
//   dist/content.js   single-file IIFE bundle (sprite sheet inlined as data URL)
//   dist/manifest.json

import { build } from 'vite'
import { copyFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

await build({
  configFile: false, // the repo vite config is for the harness dev server
  root,
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    minify: false, // reviewable output
    lib: {
      entry: join(root, 'src/extension/content.ts'),
      formats: ['iife'],
      name: 'greenroom',
      fileName: () => 'content.js',
    },
  },
})

copyFileSync(join(root, 'src/extension/manifest.json'), join(root, 'dist/manifest.json'))
console.log('dist/ ready — chrome://extensions -> Load unpacked -> dist/')
