import assert from 'node:assert/strict'
import { test } from 'node:test'
import { newId } from '../src/id.ts'

test('UUID helper uses native CSPRNG when available', () => {
  assert.match(newId(), /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
})
test('LAN-compatible UUID preserves v4 version/variant and cryptographic random source', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis,'crypto')
  let calls=0
  try {
    Object.defineProperty(globalThis,'crypto',{configurable:true,value:{getRandomValues(bytes){calls++;bytes.fill(255);return bytes}}})
    assert.equal(newId(),'ffffffff-ffff-4fff-bfff-ffffffffffff');assert.equal(calls,1)
  } finally { Object.defineProperty(globalThis,'crypto',original) }
})
