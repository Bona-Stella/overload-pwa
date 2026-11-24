import assert from 'node:assert/strict'

const widths = [320, 375, 393, 430, 1280]
const iconColors = {
  info: 'rgb(108, 147, 198)', recheck: 'rgb(108, 147, 198)', processing: 'rgb(108, 147, 198)',
  success: 'rgb(116, 166, 138)', warning: 'rgb(214, 188, 101)',
  critical: 'rgb(240, 100, 115)', error: 'rgb(240, 100, 115)', destructive: 'rgb(240, 100, 115)',
}

export async function auditMessageDialog({ send, evaluate }, use, expectedTone) {
  const size = await evaluate('({width: innerWidth, height: innerHeight})')
  const resize = (width, height) => send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 500 })
  const samples = []
  try {
    for (const width of widths) {
      await resize(width, size.height)
      const sample = await evaluate(`new Promise(resolve => requestAnimationFrame(() => {
        const dialog = [...document.querySelectorAll('dialog[open][data-message-tone]')].at(-1);
        if (!dialog) { resolve(null); return; }
        const rect = dialog.getBoundingClientRect(), css = getComputedStyle(dialog);
        const title = dialog.querySelector('[data-dialog-heading]'), icon = dialog.querySelector('[data-feedback-icon]');
        const actions = [...dialog.querySelectorAll('button:not([data-close-text]), button[data-modal-neutral], button[data-appearance]')];
        const descriptions = [...dialog.querySelectorAll(':scope > [data-dialog-description], :scope > p, :scope > .stack > p')];
        resolve({
          viewport: innerWidth, left: rect.left, right: rect.right, width: rect.width, padding: css.padding,
          tone: dialog.dataset.messageTone, title: title.textContent, titleAligned: getComputedStyle(title).textAlign,
          icon: icon.dataset.feedbackIcon, iconColor: getComputedStyle(icon).color,
          fits: dialog.scrollWidth <= dialog.clientWidth && title.scrollWidth <= title.clientWidth,
          descriptions: descriptions.map(p => ({text: p.innerText, aligned: getComputedStyle(p).textAlign,
            words: getComputedStyle(p).wordBreak, fits: p.scrollWidth <= p.clientWidth})),
          actions: actions.map(b => ({label: b.innerText, background: getComputedStyle(b).backgroundColor,
            text: getComputedStyle(b).color, border: getComputedStyle(b).borderWidth, disabled: b.disabled,
            recovery: b.matches('.recovery-action, [data-appearance="recovery"]')})),
        });
      }))`)
      assert.ok(sample, `${use} is open at ${width}`)
      assert.equal(sample.tone, expectedTone, use)
      assert.equal(sample.titleAligned, 'center', use)
      assert.equal(sample.iconColor, iconColors[expectedTone], use)
      assert.equal(sample.viewport, width, use)
      assert.equal(sample.padding, '16px', use)
      assert.ok(sample.left >= 16 && sample.right <= width - 16 && sample.width <= 340 && sample.fits, `${use} at ${width}`)
      for (const p of sample.descriptions) assert.deepEqual([p.aligned, p.words, p.fits], ['center', 'keep-all', true], `${use} at ${width}: ${p.text}`)
      for (const action of sample.actions.filter(action => action.recovery && !action.disabled)) {
        assert.deepEqual([action.background, action.text, action.border], ['rgb(240, 241, 244)', 'rgb(17, 18, 22)', '1px'], use)
      }
      samples.push(sample)
    }
  } finally {
    await resize(size.width, size.height)
  }
  return { use, samples }
}
