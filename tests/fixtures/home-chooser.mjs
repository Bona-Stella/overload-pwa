export const chooserTrigger = '[aria-label="홈"] button[aria-expanded][id$="-trigger"]'
export const chooserPanel = '[aria-label="홈"] [role="region"][aria-labelledby$="-trigger"]'
export const chooserRows = '[aria-label="선택할 루틴"] button'

export async function openHomeChooser({ evaluate, wait }) {
  await wait(() => evaluate(`(() => {
    const trigger = document.querySelector(${JSON.stringify(chooserTrigger)})
    if (!trigger?.getClientRects().length) return false
    if (trigger.getAttribute('aria-expanded') === 'false') trigger.click()
    return true
  })()`), 'routine chooser trigger')
  await wait(() => evaluate(`(() => {
    const all = document.querySelector('[aria-label="루틴 일정 필터"] button')
    if (all?.getAttribute('aria-pressed') === 'false') {
      all.click()
      return false
    }
    return !!document.querySelector(${JSON.stringify(chooserRows)})
  })()`), 'available routine choices')
}
