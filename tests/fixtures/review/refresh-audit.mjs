import assert from 'node:assert/strict'

export async function auditRefreshMotion(evaluate, selector, reduced = false, minimumHeight = 44) {
  const samples = await evaluate(`(async () => {
    const button = [...document.querySelectorAll(${JSON.stringify(selector)})].find(node => node.getClientRects().length);
    const icon = button.querySelector('svg'), slot = icon.parentElement;
    const started = performance.now(), samples = [];
    const rect = node => {
      const {x, y, width, height} = node.getBoundingClientRect();
      return [x, y, width, height];
    };
    for (const time of [0, 320, 690, 1360, 2100, 2510]) {
      if (time) await new Promise(resolve => setTimeout(resolve, Math.max(0, started + time - performance.now())));
      const style = getComputedStyle(icon), box = rect(icon);
      samples.push({
        elapsed: performance.now() - started, active: button.disabled && button.ariaBusy === 'true',
        label: button.innerText.trim(), opacity: getComputedStyle(button).opacity,
        animation: style.animationName, duration: style.animationDuration, direction: style.animationDirection, matrix: style.transform,
        angle: style.transform === 'none' ? 0 : Math.round(Math.atan2(new DOMMatrixReadOnly(style.transform).b, new DOMMatrixReadOnly(style.transform).a) * 180 / Math.PI),
        center: [box[0] + box[2] / 2, box[1] + box[3] / 2], slot: rect(slot), button: rect(button),
        scroll: scrollY, alternative: getComputedStyle(slot, '::after').borderTopStyle,
        announcement: button.nextElementSibling?.textContent,
      });
    }
    return samples;
  })()`)
  const first = samples[0]
  assert.ok(samples.at(-1).elapsed >= 2500)
  assert.ok(first.button[3] >= minimumHeight)
  for (const sample of samples) {
    assert.deepEqual([sample.active, sample.opacity, sample.label, sample.announcement], [true, '1', '새로고침', '새로고침 중'])
    assert.deepEqual([sample.button, sample.slot, sample.scroll], [first.button, first.slot, first.scroll])
    assert.ok(sample.center.every((value, i) => Math.abs(value - first.center[i]) < 0.1))
    assert.equal(sample.animation === 'none', reduced)
    if (reduced) assert.equal(sample.alternative, 'dashed')
    else assert.deepEqual([sample.duration, sample.direction], ['1.25s', 'reverse'])
  }
  if (!reduced) {
    assert.ok(new Set(samples.map(sample => sample.angle)).size >= 4, 'rendered rotation changes across frames')
    const delta = ((samples[1].angle - first.angle + 540) % 360) - 180
    assert.ok(delta < 0, 'the measured SVG moves counterclockwise')
  }
  return samples
}
