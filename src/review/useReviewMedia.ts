import { useEffect, useState } from 'react'

const highRowId = '2d04629b-b651-811b-8e66-3d56102988a8'
const sources = { [highRowId]: '/__review-media/v1/nZZZy9m.gif' }
let pending: Promise<boolean> | null = null

function reviewSession() {
  if (pending) return pending
  const parameters = new URLSearchParams(window.location.hash.slice(1))
  const key = parameters.get('review-media')
  if (key) window.history.replaceState(null, '', window.location.pathname + window.location.search)
  pending = fetch('/__review-media/session', {
    method: key ? 'POST' : 'GET',
    credentials: 'same-origin',
    cache: 'no-store',
    ...(key ? { headers: { 'Content-Type': 'text/plain' }, body: key } : {}),
  }).then(response => response.status === 204).finally(() => { pending = null })
  return pending
}

// Runs only inside the development review entry. The access key never enters app storage.
export function useReviewMedia() {
  const [allowed, setAllowed] = useState(false)
  useEffect(() => {
    let active = true
    const check = () => {
      void reviewSession().then(value => { if (active) setAllowed(value) }).catch(() => { if (active) setAllowed(false) })
    }
    window.addEventListener('hashchange', check)
    check()
    return () => { active = false; window.removeEventListener('hashchange', check) }
  }, [])
  return allowed ? sources : undefined
}
