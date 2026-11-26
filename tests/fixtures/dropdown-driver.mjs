// Exercise the rendered controls, including the disabled state and current option.
export async function dropdownOptions(evaluate, selector, { keepOpen = false } = {}) {
  await openDropdown(evaluate, selector)
  const result = await evaluate(`(() => {
    const trigger = document.querySelector(${JSON.stringify(selector)})
    const panel = document.getElementById(trigger.getAttribute('aria-controls'))
    return [...panel.querySelectorAll('[role=option]')].map(option => ({
      id: option.dataset.value, name: option.textContent.trim(), selected: option.ariaSelected === 'true', disabled: option.disabled,
    }))
  })()`)
  if (!keepOpen) await evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`)
  return result
}

export async function openDropdown(evaluate, selector) {
  await evaluate(`(() => {
    const trigger = document.querySelector(${JSON.stringify(selector)})
    if (!trigger || trigger.matches(':disabled')) throw Error('Dropdown unavailable: ' + ${JSON.stringify(selector)})
    if (trigger.ariaExpanded !== 'true') trigger.click()
  })()`)
}

export async function chooseDropdown(evaluate, selector, value) {
  await openDropdown(evaluate, selector)
  await evaluate(`(() => {
    const trigger = document.querySelector(${JSON.stringify(selector)})
    const panel = document.getElementById(trigger.getAttribute('aria-controls'))
    const option = [...panel.querySelectorAll('[role=option]:not(:disabled)')].find(item => item.dataset.value === ${JSON.stringify(value)})
    if (!option) throw Error('Dropdown option unavailable: ' + ${JSON.stringify(value)})
    option.click()
  })()`)
}
