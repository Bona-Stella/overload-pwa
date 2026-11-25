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
        const dialog = [...document.querySelectorAll(${JSON.stringify(expectedTone ? 'dialog[open][data-message-tone]' : 'dialog[open]')})].at(-1);
        if (!dialog) { resolve(null); return; }
        const rect = dialog.getBoundingClientRect(), css = getComputedStyle(dialog);
        const theme = dialog.closest('[data-theme]') ?? document.body;
        const themeStyle = getComputedStyle(theme);
        const edge = styles => [styles.borderTopWidth, styles.borderTopStyle, styles.borderTopColor, styles.borderTopLeftRadius];
        const outer = styles => [styles.outlineStyle, styles.boxShadow, styles.filter, styles.clipPath];
        const radius = expectedRadius();
        const cardBorder = ['1px', 'solid', 'rgb(53, 57, 65)', radius], dialogBorder = edge(css);
        const cardOuter = ['none', 'none', 'none', 'none'], dialogOuter = outer(css);
        function expectedRadius() {
          if (dialog.hasAttribute('data-message-tone')) return themeStyle.getPropertyValue('--radius-card-compact').trim();
          return getComputedStyle(dialog.parentElement).getPropertyValue('--radius-card').trim();
        }
        const title = dialog.querySelector('[data-dialog-heading]'), icon = dialog.querySelector('[data-feedback-icon]');
        const actions = [...dialog.querySelectorAll('button:not([data-close-text]), button[data-modal-neutral], button[data-appearance]')];
        const descriptions = [...dialog.querySelectorAll(':scope > [data-dialog-description], :scope > p, :scope > .stack > p')];
        const descriptionBlocks = dialog.querySelectorAll(':scope > :is([data-dialog-description], p, ul, .notice), :scope > .stack > :is([data-dialog-description], p, ul, .notice)');
        const actionGaps = [...descriptionBlocks].flatMap(block => {
          const action = block.nextElementSibling;
          if (!action?.matches('[data-dialog-actions], .row, button') || !block.getClientRects().length) return [];
          const button = action.matches('button') ? action : action.querySelector('button');
          return button?.getClientRects().length ? [action.getBoundingClientRect().top - block.getBoundingClientRect().bottom] : [];
        });
        const pairs = [...dialog.querySelectorAll(':scope > :is([data-dialog-actions], .row), :scope > .stack > :is([data-dialog-actions], .row)')]
          .filter(row => row.children.length === 2 && [...row.children].every(button => button.matches('button') && button.getClientRects().length))
          .map(row => [...row.children].map(button => {
            const box = button.getBoundingClientRect();
            return [box.width, box.height];
          }));
        resolve({
          viewport: innerWidth, left: rect.left, right: rect.right, width: rect.width, padding: css.padding,
          tone: dialog.dataset.messageTone, title: title.textContent, titleAligned: getComputedStyle(title).textAlign,
          cardBorder, dialogBorder, cardOuter, dialogOuter, actionGaps, pairs,
          icon: icon?.dataset.feedbackIcon, iconColor: icon ? getComputedStyle(icon).color : null,
          fits: dialog.scrollWidth <= dialog.clientWidth && title.scrollWidth <= title.clientWidth,
          descriptions: descriptions.map(p => ({text: p.innerText, aligned: getComputedStyle(p).textAlign,
            words: getComputedStyle(p).wordBreak, fits: p.scrollWidth <= p.clientWidth})),
          actions: actions.map(b => ({label: b.innerText, background: getComputedStyle(b).backgroundColor,
            text: getComputedStyle(b).color, border: getComputedStyle(b).borderWidth, disabled: b.disabled,
            recovery: b.matches('.recovery-action, [data-appearance="recovery"]')})),
        });
      }))`)
      assert.ok(sample, `${use} is open at ${width}`)
      assert.equal(sample.viewport, width, use)
      assert.deepEqual(sample.dialogBorder, sample.cardBorder, use)
      assert.deepEqual(sample.dialogOuter, sample.cardOuter, use)
      if (expectedTone) {
        assert.equal(sample.tone, expectedTone, use)
        assert.equal(sample.titleAligned, 'center', use)
        assert.equal(sample.iconColor, iconColors[expectedTone], use)
        assert.equal(sample.padding, '16px', use)
        assert.ok(sample.actionGaps.every(gap => Math.abs(gap - 20) < 0.1), `${use} description-to-action spacing at ${width}: ${sample.actionGaps}`)
        assert.ok(sample.left >= 16 && sample.right <= width - 16 && sample.width <= 340 && sample.fits, `${use} at ${width}`)
        for (const [left, right] of sample.pairs) assert.ok(left.every((value, i) => Math.abs(value - right[i]) < 0.1), `${use} has equal action sizes at ${width}`)
        for (const p of sample.descriptions) assert.deepEqual([p.aligned, p.words, p.fits], ['center', 'keep-all', true], `${use} at ${width}: ${p.text}`)
        for (const action of sample.actions.filter(action => action.recovery && !action.disabled)) {
          assert.deepEqual([action.background, action.text, action.border], ['rgb(240, 241, 244)', 'rgb(17, 18, 22)', '1px'], use)
        }
      }
      samples.push(sample)
    }
  } finally {
    await resize(size.width, size.height)
  }
  return { use, samples }
}
