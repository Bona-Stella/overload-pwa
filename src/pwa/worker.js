/* No skipWaiting/clients.claim: existing windows keep their build and workout editor. */
const shell = __SHELL_CONFIG__
const prefix = 'overload-static-shell-v1-'
const cacheName = prefix + shell.id
const paths = new Set(shell.assets.map(asset => asset.path))
async function compatibleDatabase() {
  // Read the version only. Abort creation when no database exists; never migrate/write workout data.
  return new Promise((resolve, reject) => {
    const opening = indexedDB.open('overload.workout.v1')
    let absent = false
    opening.onupgradeneeded = () => { absent = true; opening.transaction.abort() }
    opening.onerror = () => absent ? resolve() : reject(Error('Local storage compatibility could not be checked'))
    opening.onblocked = () => reject(Error('Local storage compatibility check blocked'))
    opening.onsuccess = () => {
      const db = opening.result, version = db.version
      db.close()
      version <= 3 ? resolve() : reject(Error('Newer workout storage: keep the installed app'))
    }
  })
}
self.addEventListener('install', event => event.waitUntil((async () => {
  await compatibleDatabase()
  const verified = await Promise.all(shell.assets.map(async asset => {
    const response = await fetch(asset.path, { credentials: 'omit', cache: 'reload', redirect: 'error' })
    if (!response.ok || response.type === 'opaque') throw Error('App shell unavailable')
    const bytes = await response.clone().arrayBuffer()
    const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), n => n.toString(16).padStart(2, '0')).join('')
    if (digest !== asset.sha256) throw Error('App shell differs from this build')
    return [asset.path, response]
  }))
  const cache = await caches.open(cacheName)
  await Promise.all(verified.map(([path, response]) => cache.put(path, response)))
})()))
self.addEventListener('activate', event => event.waitUntil((async () => {
  // Standard waiting lifecycle guarantees the old worker's clients have closed before activation.
  // Only owned static caches are replaced; workout IndexedDB is never involved in activation.
  await Promise.all((await caches.keys()).filter(name => name.startsWith(prefix) && name !== cacheName).map(name => caches.delete(name)))
})()))
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url)
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || url.search) return
  const path = event.request.mode === 'navigate' && ['/', '/account'].includes(url.pathname) ? '/index.html' : url.pathname
  if (!paths.has(path)) return
  event.respondWith((async () => (await (await caches.open(cacheName)).match(path)) ?? fetch(event.request))())
})
