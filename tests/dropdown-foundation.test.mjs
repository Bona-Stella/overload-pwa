import assert from 'node:assert/strict'
import { test } from 'node:test'
import { dropdownSide } from '../src/components/common-ui/dropdown-placement.ts'

test('selection panels fit below first, then above, then use the larger available space', () => {
  assert.equal(dropdownSide({ above: 300, below: 220 }, 200), 'below')
  assert.equal(dropdownSide({ above: 300, below: 50 }, 200), 'above')
  assert.equal(dropdownSide({ above: 90, below: 60 }, 200), 'above')
  assert.equal(dropdownSide({ above: 60, below: 90 }, 200), 'below')
})

test('open panels hold direction while it is usable and content chooses below when possible', () => {
  assert.equal(dropdownSide({ above: 80, below: 300 }, 200, 'above'), 'above')
  assert.equal(dropdownSide({ above: 20, below: 300 }, 200, 'above'), 'below')
  assert.equal(dropdownSide({ above: 230, below: 65 }, 200, undefined, true), 'below')
  assert.equal(dropdownSide({ above: 110, below: 20 }, 200, undefined, true), 'above')
  assert.equal(dropdownSide({ above: 140, below: 60 }, 200, 'below', true, 105), 'above', 'keep room for the visible filters and one option')
})
