import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createRepeatPointerGuard } from '../src/components/repeatPointerGuard.ts'

function input(target, { x = 100, y = 200, id = 1, detail = 1 } = {}) {
  return {
    currentTarget: target, nativeEvent: { pointerId: id }, clientX: x, clientY: y,
    pointerId: id, button: 0, isPrimary: true, detail,
    preventDefault() { this.prevented = true },
    stopPropagation() { this.stopped = true },
  }
}

test('a second pointer beginning during a handoff is discarded even if it releases after expiry', t => {
  let now = 0
  t.mock.method(performance, 'now', () => now)
  const guard = createRepeatPointerGuard(), opener = {}, revealed = {}
  guard.arm(input(opener), revealed)

  now = 200
  guard.pointerDown(input(revealed, { id: 2 }))
  now = 300
  const second = input(revealed, { id: 2, detail: 2 })
  assert.equal(guard.blocksClick(second), true)
  assert.ok(second.prevented && second.stopped)

  guard.pointerDown(input(revealed, { id: 3 }))
  assert.equal(guard.blocksClick(input(revealed, { id: 3 })), false)
})

test('a handoff only protects nearby pointer input on the revealed control', t => {
  let now = 0
  t.mock.method(performance, 'now', () => now)
  const guard = createRepeatPointerGuard(), opener = {}, revealed = {}, another = {}
  guard.arm(input(opener), revealed)
  now = 80
  assert.equal(guard.blocksClick(input(another)), false)
  assert.equal(guard.blocksClick(input(revealed, { x: 133 })), false)
  assert.equal(guard.blocksClick(input(revealed, { detail: 0 })), false)
  assert.equal(guard.blocksClick(input(revealed, { id: 2 })), true)
  assert.equal(guard.blocksClick(input(revealed, { id: 3 })), true)
  now = 275
  assert.equal(guard.blocksClick(input(revealed)), false)

  guard.arm(input(opener))
  guard.arm(input(opener, { detail: 0 }))
  assert.equal(guard.blocksClick(input(revealed)), false)
})
