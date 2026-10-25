import assert from 'node:assert/strict'
import { test } from 'node:test'
import { getHealth } from '../src/features/health/api.ts'

test('returns UP from the existing Health endpoint without caching', async (t) => {
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, '/api/v1/health')
    assert.equal(options.cache, 'no-store')
    return Response.json({ status: 'UP' })
  })

  assert.deepEqual(await getHealth(new AbortController().signal), { status: 'UP' })
})

test('rejects an HTTP failure even if its body says UP', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ status: 'UP' }, { status: 500 }))

  await assert.rejects(getHealth(new AbortController().signal), /HTTP 500/)
})

test('rejects a response that is not JSON', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response('<html>Error</html>'))

  await assert.rejects(getHealth(new AbortController().signal), /서버 응답을 읽을 수 없습니다/)
})

for (const data of [null, {}, { status: 'DOWN' }, { status: 1 }]) {
  test(`rejects an unexpected Health response: ${JSON.stringify(data)}`, async (t) => {
    t.mock.method(globalThis, 'fetch', async () => Response.json(data))

    await assert.rejects(getHealth(new AbortController().signal), /서버 상태를 확인할 수 없는 응답/)
  })
}

test('explains a network failure without exposing the browser error', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => { throw new TypeError('fetch failed') })

  await assert.rejects(getHealth(new AbortController().signal), /서버에 연결할 수 없습니다/)
})

function waitForAbort(signal) {
  return new Promise((resolve, reject) => {
    if (signal.aborted) reject(signal.reason)
    else signal.addEventListener('abort', () => reject(signal.reason), { once: true })
  })
}

test('cancels the request when its caller is disposed', async (t) => {
  t.mock.method(globalThis, 'fetch', (url, { signal }) => waitForAbort(signal))
  const controller = new AbortController()
  const request = getHealth(controller.signal)
  const rejected = assert.rejects(request, { name: 'AbortError' })
  controller.abort()

  await rejected
})

test('reports a timeout while waiting for response headers', async (t) => {
  t.mock.method(globalThis, 'fetch', (url, { signal }) => waitForAbort(signal))

  await assert.rejects(getHealth(new AbortController().signal), /5초 안에 응답하지 않았습니다/)
})

test('reports a timeout when the response body never completes', async (t) => {
  t.mock.method(globalThis, 'fetch', async (url, { signal }) => ({
    ok: true,
    json: () => waitForAbort(signal),
  }))

  await assert.rejects(getHealth(new AbortController().signal), /5초 안에 응답하지 않았습니다/)
})
