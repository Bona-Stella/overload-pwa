import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { registerHooks } from 'node:module'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import ts from 'typescript'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

registerHooks({
  resolve(specifier, context, nextResolve) {
    try { return nextResolve(specifier, context) } catch (error) {
      if (!specifier.startsWith('.')) throw error
      for (const suffix of ['.ts', '.tsx']) { try { return nextResolve(specifier + suffix, context) } catch { /* next source extension */ } }
      throw error
    }
  },
  load(url, context, nextLoad) {
    if (url.endsWith('.css')) return { format: 'module', source: 'export default new Proxy({}, { get: (_, name) => String(name) })', shortCircuit: true }
    if (url.endsWith('.tsx')) return { format: 'module', source: ts.transpileModule(readFileSync(fileURLToPath(url), 'utf8'), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2023 } }).outputText, shortCircuit: true }
    return nextLoad(url, context)
  },
})
const { AppShell } = await import('../src/app/AppShell.tsx')
const { ExerciseIcon } = await import('../src/components/ExerciseIcon.tsx')
const { Help } = await import('../src/components/ui.tsx')
const render = (type, props) => renderToStaticMarkup(React.createElement(type, props))

test('only authenticated non-focused screens expose exactly four navigation destinations', () => {
  for (const tab of ['home', 'routines', 'history', 'settings']) {
    const html = render(AppShell, { authenticated: true, tab, onNavigate() {}, children: 'content' })
    assert.equal((html.match(/<button/g) ?? []).length, 4)
    assert.equal((html.match(/aria-current="page"/g) ?? []).length, 1)
    for (const name of ['홈', '루틴', '기록', '설정']) assert.ok(html.includes('>' + name + '<'))
  }
  for (const props of [{ authenticated: false }, { authenticated: true, focused: true }]) {
    assert.doesNotMatch(render(AppShell, { ...props, tab: 'home', onNavigate() {}, children: 'preserved content' }), /<nav/)
  }
})
test('display theme is an attribute on the same shell and never claims an active deload', () => {
  const props = { authenticated: true, tab: 'home', onNavigate() {}, children: '운동 원본' }
  for (const displayTheme of ['normal', 'deload']) {
    const html = render(AppShell, { ...props, displayTheme })
    assert.match(html, new RegExp('data-theme="' + displayTheme + '"'))
    assert.match(html, /운동 원본/); assert.doesNotMatch(html, /디로딩 진행 중/)
  }
})
test('exercise icons use original assets at 32px and an unknown classification stays neutral', () => {
  for (const kind of ['chest', 'back', 'legs', 'running', 'walking', 'cycling']) {
    const html = render(ExerciseIcon, { kind, label: kind })
    assert.match(html, new RegExp(kind + '\\.png')); assert.match(html, /width="32" height="32"/)
  }
  const unknown = render(ExerciseIcon, {})
  assert.doesNotMatch(unknown, /<img|chest|back|legs/); assert.match(unknown, /aria-hidden="true"/)
})
test('help starts closed with a named, keyboard-operable disclosure', () => {
  const html = render(Help, { label: '운동 저장 안내', children: '설명' })
  assert.match(html, /type="button"/); assert.match(html, /aria-label="운동 저장 안내"/); assert.match(html, /aria-expanded="false"/)
  assert.doesNotMatch(html, /role="note"/)
})
