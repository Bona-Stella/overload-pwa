import { createHash } from 'node:crypto'
import { readFile, readdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { Plugin } from 'vite'

/** Cache only the exact public bytes produced by this build, never runtime responses. */
export function appShell(): Plugin {
  let directory = ''
  return {
    name: 'overload-static-shell', apply: 'build',
    configResolved(config) { if (config.base !== '/') throw new Error('PWA deployment requires root scope'); directory = resolve(config.root, config.build.outDir) },
    async closeBundle() {
      const paths = ['index.html', 'manifest.webmanifest', 'favicon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png', 'icons/apple-touch-icon.png']
      for (const name of await readdir(resolve(directory, 'assets'))) {
        if (!/\.(js|css|woff2?|svg|png)$/.test(name)) throw new Error('Review new app-shell asset type: ' + name)
        paths.push('assets/' + name)
      }
      const assets = await Promise.all(paths.sort().map(async path => ({ path: '/' + path, sha256: createHash('sha256').update(await readFile(resolve(directory, path))).digest('hex') })))
      const id = createHash('sha256').update(JSON.stringify(assets)).digest('hex').slice(0, 24)
      const template = await readFile(new URL('../src/pwa/worker.js', import.meta.url), 'utf8')
      await writeFile(resolve(directory, 'sw.js'), template.replace('__SHELL_CONFIG__', JSON.stringify({ id, assets })))
    },
  }
}
