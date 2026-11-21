import { createContext, useEffect, useState } from 'react'
import type { RefObject } from 'react'
import { editorViewport, revealEditorField } from './editorViewport.ts'

export const EditorViewportOccluded = createContext(false)

const textField = 'textarea, input:not([type]), input:is([type=text], [type=search], [type=number], [type=email], [type=tel], [type=url], [type=password])'
const editorScope = '[data-workout-frame], [data-keyboard-editor]'
const memoSelector = `:is(${editorScope}) [data-workout-memo]`
const settleDelay = 180

/** Owns field placement and keyboard layout for the app shell. */
export function useEditorKeyboard(ref: RefObject<HTMLElement | null>) {
  const [occluded, setOccluded] = useState(false)
  const [keyboardOpen, setKeyboardOpen] = useState(false)
  useEffect(() => {
    const root = ref.current
    const main = root?.querySelector<HTMLElement>('main')
    const visual = window.visualViewport
    if (!root || !main || !visual) return

    const listeners = new AbortController()
    const { signal } = listeners
    const reserved = new Set<HTMLElement>()
    let field: HTMLElement | null = null
    let owner: HTMLElement | null = null
    let recovering = false
    let keyboard = false
    let placedViewport: ReturnType<typeof editorViewport> | null = null
    let userScrolled = false
    let width = document.documentElement.clientWidth
    let pending: ReturnType<typeof setTimeout> | undefined
    let memoEditing = false
    let workoutMemoEditing = false
    let memoPointer: number | null = null
    let touching = false
    let touchOrigin: Touch | null = null
    let memoSpace: { scope: HTMLElement; pixels: number; phase: 'editing' | 'closing' | 'returning' } | null = null

    const stopMemoReturn = () => {
      if (memoSpace?.phase !== 'returning') return
      memoSpace.phase = 'closing'
      window.scrollTo({ left: window.scrollX, top: window.scrollY, behavior: 'instant' })
    }
    const clearMemoSpace = () => {
      memoSpace?.scope.style.removeProperty('--memo-keyboard-space')
      memoSpace?.scope.removeAttribute('data-memo-keyboard-space')
      memoSpace = null
    }
    const settleMemoSpace = () => {
      if (!memoSpace) return
      const { scope, pixels } = memoSpace
      const page = document.scrollingElement
      if (!page || !scope.getClientRects().length || !scope.querySelector('[data-workout-memo]')) {
        stopMemoReturn()
        clearMemoSpace()
        return
      }
      if (memoPointer !== null || touching || visual.scale > 1.01) return
      const closedHeight = Math.max(window.innerHeight, page.clientHeight, visual.height)
      if (closedHeight - visual.height > 2) return
      const ordinaryLimit = Math.max(0, Math.floor(page.scrollHeight - pixels - closedHeight))
      if (window.scrollY <= ordinaryLimit + 0.5) {
        clearMemoSpace()
      } else if (memoSpace.phase !== 'returning') {
        // Keep the full scroll range until the browser has reached the ordinary range.
        memoSpace.phase = 'returning'
        const behavior = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'
        window.scrollTo({ top: ordinaryLimit, behavior })
        schedule()
      }
    }
    const editorSpace = (scope: HTMLElement) => Number.parseFloat(scope.style.getPropertyValue('--editor-keyboard-space')) || 0
    const setMemoSpace = (scope: HTMLElement, pixels: number) => {
      if (memoSpace && memoSpace.scope !== scope) clearMemoSpace()
      scope.setAttribute('data-memo-keyboard-space', '')
      scope.style.setProperty('--memo-keyboard-space', pixels + 'px')
      memoSpace = { scope, pixels, phase: 'editing' }
      if (scope.hasAttribute('data-keyboard-editor')) {
        // An earlier field's clearance must survive until the memo's return has settled.
        scope.style.removeProperty('--editor-keyboard-space')
        reserved.delete(scope)
      }
    }
    const prepareMemoSpace = (input: HTMLElement) => {
      const scope = input.closest<HTMLElement>(editorScope)
      const page = document.scrollingElement
      if (!scope || !page || visual.scale > 1.01 || recovering && memoSpace?.scope === scope) return
      stopMemoReturn()
      if (memoSpace && memoSpace.scope !== scope) clearMemoSpace()
      const closedHeight = Math.max(window.innerHeight, page.clientHeight, visual.height)
      // The first keyboard size is unknown. In the phone trace it left half of
      // the closed viewport and Safari centered the memo within that area.
      const estimatedVisible = Math.min(visual.height, closedHeight / 2)
      const rect = input.getBoundingClientRect()
      const targetBottom = estimatedVisible / 2 + rect.height / 2 - 12
      const requiredEnd = window.scrollY + rect.bottom - targetBottom + closedHeight
      if (memoSpace) memoSpace.phase = 'editing'
      const existing = scope.hasAttribute('data-keyboard-editor') ? editorSpace(scope) : 0
      if (!existing && requiredEnd <= page.scrollHeight) return
      const scopeEnd = window.scrollY + scope.getBoundingClientRect().bottom
      const extra = requiredEnd > page.scrollHeight ? Math.ceil(requiredEnd - Math.min(page.scrollHeight, scopeEnd)) : 0
      setMemoSpace(scope, Math.max(existing, memoSpace?.pixels ?? 0) + extra)
    }

    const updateOwner = (next: HTMLElement | null) => {
      if (next === owner) return
      owner?.removeAttribute('data-edit-keyboard')
      owner?.style.removeProperty('--editor-viewport-top')
      owner?.style.removeProperty('--editor-viewport-height')
      owner = next
      owner?.setAttribute('data-edit-keyboard', '')
    }
    const releaseSpace = () => {
      for (const scope of reserved) scope.style.removeProperty('--editor-keyboard-space')
      reserved.clear()
    }
    const readFocus = () => {
      const active = document.activeElement
      const dialog = active?.closest<HTMLDialogElement>('dialog[open][data-editor-dialog]')
      const next = active instanceof HTMLElement && (root.contains(active) || !!dialog) &&
        (active.isContentEditable || active.matches(textField) && !active.matches(':disabled, [readonly]')) ? active : null
      if (next && next !== field) {
        placedViewport = null
        userScrolled = false
        stopMemoReturn()
        if (memoSpace) memoSpace.phase = 'editing'
        memoEditing = next.matches(memoSelector)
        workoutMemoEditing = memoEditing && !!next.closest('[data-workout-frame]')
        if (memoEditing && matchMedia('(pointer: coarse)').matches) prepareMemoSpace(next)
      }
      field = next
      return field && (dialog ?? field.closest<HTMLElement>(editorScope) ?? main)
    }
    const isCovered = ({ scale, occlusion }: ReturnType<typeof editorViewport>) =>
      scale <= 1.01 && occlusion > (recovering && (memoEditing || memoSpace) ? 2 : 100)
    const needsPlacement = (viewport: ReturnType<typeof editorViewport>) => !userScrolled &&
      (placedViewport === null || !workoutMemoEditing && (viewport.height < placedViewport.height - 2 ||
        Math.abs(viewport.clientTop - placedViewport.clientTop) > 2))

    const place = (input: HTMLElement, scope: HTMLElement, withKeyboard: boolean) => {
      revealEditorField(input, {
        header: scope.querySelector(':scope > [data-keyboard-header], :scope > header'),
        footer: withKeyboard ? null : scope.querySelector(':scope > footer'),
        reserve: withKeyboard && !(workoutMemoEditing && memoSpace?.scope === scope) ? missing => {
          const current = editorSpace(scope)
          const pageHeight = document.scrollingElement?.scrollHeight ?? 0
          const scopeBottom = window.scrollY + scope.getBoundingClientRect().bottom
          // A short page can absorb padding inside the shell's minimum height.
          const unusedSpace = Math.max(0, Math.ceil(pageHeight - scopeBottom))
          if (scope.hasAttribute('data-keyboard-editor') && (input.matches(memoSelector) || memoSpace?.scope === scope)) {
            const prepared = memoSpace?.scope === scope ? memoSpace.pixels : 0
            setMemoSpace(scope, Math.max(current, prepared) + unusedSpace + missing)
            return
          }
          scope.style.setProperty('--editor-keyboard-space', `${current + unusedSpace + missing}px`)
          reserved.add(scope)
        } : undefined,
      })
    }
    const settle = () => {
      pending = undefined
      const scope = readFocus()
      const viewport = editorViewport()
      if (!isCovered(viewport)) {
        const wasCovered = recovering
        recovering = false
        if (wasCovered) setOccluded(false)
        if (keyboard) setKeyboardOpen(false)
        keyboard = false
        updateOwner(null)
        releaseSpace()
        if (memoSpace && wasCovered) {
          // Let the restored footer and final viewport scroll settle before measuring the limit.
          memoSpace.phase = 'closing'
          schedule()
        } else if (memoSpace && (memoSpace.phase !== 'editing' || !field)) {
          if (memoSpace.phase === 'editing') memoSpace.phase = 'closing'
          settleMemoSpace()
        }
        placedViewport = null
        userScrolled = false
        return
      }
      if (!field || !scope || !keyboard) return
      updateOwner(scope)
      if (scope instanceof HTMLDialogElement) {
        // Match the client coordinates used to check the field, even while Safari is panning.
        scope.style.setProperty('--editor-viewport-top', viewport.clientTop + 'px')
        scope.style.setProperty('--editor-viewport-height', viewport.height + 'px')
      }
      if (!needsPlacement(viewport)) return
      placedViewport = viewport
      place(field, scope, true)
    }
    const schedule = () => {
      clearTimeout(pending)
      pending = setTimeout(settle, settleDelay)
    }
    const sync = () => {
      const scope = readFocus()
      const viewport = editorViewport()
      const nextWidth = document.documentElement.clientWidth
      const widthChanged = Math.abs(nextWidth - width) > 2
      // A rapid close and reopen can finish before the placement timer fires.
      if (widthChanged || recovering && !workoutMemoEditing && viewport.scale <= 1.01 && viewport.occlusion <= 2) {
        placedViewport = null
        userScrolled = false
      }
      width = nextWidth
      if (isCovered(viewport)) {
        stopMemoReturn()
        if (memoSpace) memoSpace.phase = 'editing'
        if (!recovering) setOccluded(true)
        recovering = true
        if (field && !keyboard) setKeyboardOpen(true)
        keyboard ||= field !== null
        // Keep the active field's footer hidden during the transition, but position dialogs only once stable.
        if (scope && !(scope instanceof HTMLDialogElement)) updateOwner(scope)
        if (scope && (needsPlacement(viewport) || scope instanceof HTMLDialogElement)) schedule()
        else if (pending !== undefined) {
          clearTimeout(pending)
          pending = undefined
        }
      } else if (recovering || memoSpace && memoSpace.phase !== 'editing') {
        schedule()
      } else if (widthChanged && viewport.occlusion <= 2 && field && scope?.hasAttribute('data-keyboard-editor') && viewport.scale <= 1.01) {
        place(field, scope, false)
      }
    }
    const manualScroll = () => {
      if (keyboard) userScrolled = true
      if (memoSpace && memoSpace.phase !== 'editing') {
        stopMemoReturn()
        schedule()
      }
    }
    visual.addEventListener('resize', sync, { signal })
    visual.addEventListener('scroll', () => {
      if (pending !== undefined) { schedule(); return }
      if (!keyboard || !field || workoutMemoEditing) return
      const viewport = editorViewport()
      const dialogPanned = owner instanceof HTMLDialogElement &&
        Math.abs(viewport.clientTop - (Number.parseFloat(owner.style.getPropertyValue('--editor-viewport-top')) || 0)) > 2
      if (isCovered(viewport) && (dialogPanned || needsPlacement(viewport))) sync()
    }, { signal })
    window.addEventListener('resize', sync, { signal })
    window.addEventListener('wheel', manualScroll, { passive: true, signal })
    window.addEventListener('touchmove', event => {
      const touch = event.touches?.length === 1 ? event.touches[0] : null
      if (workoutMemoEditing || memoSpace?.scope.hasAttribute('data-workout-frame') || touch && touchOrigin && touch.identifier === touchOrigin.identifier &&
        Math.hypot(touch.clientX - touchOrigin.clientX, touch.clientY - touchOrigin.clientY) >= 8) manualScroll()
    }, { passive: true, signal })
    window.addEventListener('pointermove', event => {
      if (event.pointerType !== 'touch' && event.buttons && (event.movementX || event.movementY)) manualScroll()
    }, { passive: true, signal })
    const touchChanged = (event: TouchEvent) => {
      touching = event.touches.length > 0
      if (event.type === 'touchstart' || !touching) touchOrigin = event.touches.length === 1 ? event.touches[0] : null
      if (memoSpace && memoSpace.phase !== 'editing') {
        if (touching) stopMemoReturn()
        else schedule()
      }
    }
    window.addEventListener('touchstart', touchChanged, { passive: true, signal })
    window.addEventListener('touchend', touchChanged, { passive: true, signal })
    window.addEventListener('touchcancel', touchChanged, { passive: true, signal })
    document.addEventListener('pointerdown', event => {
      const input = event.target
      if (event.pointerType !== 'touch' || !event.isPrimary ||
        !(input instanceof HTMLElement) || !root.contains(input) || !input.matches(memoSelector + ':not(:disabled, [readonly])')) return
      memoPointer = event.pointerId
      prepareMemoSpace(input)
    }, { capture: true, passive: true, signal })
    const endMemoPointer = (event: PointerEvent) => {
      if (event.pointerId !== memoPointer) return
      memoPointer = null
      if (memoSpace && !recovering && !document.activeElement?.matches(memoSelector)) schedule()
    }
    document.addEventListener('pointerup', endMemoPointer, { passive: true, signal })
    document.addEventListener('pointercancel', endMemoPointer, { passive: true, signal })
    window.addEventListener('scroll', () => {
      if (memoSpace && (recovering ? pending !== undefined : memoSpace.phase !== 'editing')) schedule()
    }, { passive: true, signal })
    document.addEventListener('focusin', sync, { signal })
    document.addEventListener('focusout', event => {
      if (event.target !== field) return
      field = null
      clearTimeout(pending)
      pending = undefined
      if (recovering || memoSpace) schedule()
    }, { signal })
    document.addEventListener('keydown', event => {
      if (event.key === 'PageUp' || event.key === 'PageDown' ||
        (event.key === 'Home' || event.key === 'End') && !field) manualScroll()
    }, { signal })
    sync()
    return () => {
      clearTimeout(pending)
      listeners.abort()
      updateOwner(null)
      releaseSpace()
      stopMemoReturn()
      clearMemoSpace()
    }
  }, [ref])
  return { occluded, keyboardOpen }
}
