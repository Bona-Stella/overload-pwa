import assert from 'node:assert/strict'
import { auditMessageDialog } from './modal-audit.mjs'
import { auditRefreshMotion } from './refresh-audit.mjs'

export async function checkFront18Preview({ click, evaluate, send, waitFor, modalClosed, capture, dialogs }) {
  const shown = text => waitFor(() => evaluate(`document.body.innerText.includes(${JSON.stringify(text)})`), text)
  const cardSurface = async (selector, padding) => {
    await waitFor(() => evaluate(`Boolean(document.querySelector(${JSON.stringify(selector)})?.getClientRects().length)`), selector)
    assert.deepEqual(await evaluate(`(() => {
      const style = getComputedStyle(document.querySelector(${JSON.stringify(selector)}));
      return [style.padding, style.borderRadius, style.borderWidth, style.borderColor, style.backgroundColor];
    })()`), [padding, '5px', '1px', 'rgb(53, 57, 65)', 'rgb(27, 29, 34)'], selector)
  }
  const compactButton = selector => evaluate(`(() => {
    const button = document.querySelector(${JSON.stringify(selector)});
    const surface = button?.querySelector('[data-compact-surface]');
    if (!surface) return null;
    const style = getComputedStyle(surface);
    const hit = button.getBoundingClientRect(), face = surface.getBoundingClientRect();
    return [hit.height >= 44, hit.width >= 44, face.height, Math.abs(hit.top + hit.height / 2 - face.top - face.height / 2) < 1,
      style.paddingLeft, style.paddingRight, style.borderWidth, style.borderColor, style.borderRadius];
  })()`)
  const compactDimensions = [true, true, 30, true, '12px', '12px', '1px', 'rgb(53, 57, 65)', '999px']
  const save = type => waitFor(() => evaluate(`document.querySelector('[data-workout-save-status]')?.dataset.workoutSaveStatus === '${type}'`), type)
  const toast = (text, tone) => waitFor(() => evaluate(`[...document.querySelectorAll(${JSON.stringify(tone ? `[data-tone=${tone}]` : '[data-tone]')})].some(e => e.innerText.includes(${JSON.stringify(text)}))`), text)
  const tools = async label => { await click('운동 검수 도구 열기'); await click(label, 'dialog button'); await modalClosed() }
  const audit = async (use, tone, whiteAction) => {
    await waitFor(() => evaluate(`!!document.querySelector('dialog[open][data-message-tone="${tone}"]')`), use)
    const report = await auditMessageDialog({ send, evaluate }, `FRONT 18 / ${use}`, tone)
    if (whiteAction) for (const sample of report.samples) {
      assert.ok(sample.actions.some(action => action.label === whiteAction && action.recovery && !action.disabled), use)
    }
    dialogs.push(report)
  }
  const dismiss = async () => { await click('닫기', 'dialog .icon-button'); await modalClosed() }
  const position = () => evaluate(`(() => {
    const selectors = ['[data-keyboard-header]', '[data-workout-save-status]', '[data-swipe-current] [role=table]', '[data-swipe-current] [aria-label="1세트 이번 반복 횟수"]', 'footer', 'footer button'];
    return [scrollY, ...selectors.map(selector => {const el = document.querySelector(selector); if (!el) return null; const r = el.getBoundingClientRect(); return [r.x,r.y,r.width,r.height]})];
  })()`)
  const settleViewport = async width => {
    await waitFor(() => evaluate(`innerWidth === ${width}`), String(width))
    await evaluate(`(async () => {
      await document.fonts.ready;
      for (let frame = 0; frame < 3; frame++) await new Promise(requestAnimationFrame);
    })()`)
  }
  const beginSet = () => click('1세트 완료', 'footer button')
  const menu = () => click('검수 분류로 돌아가기')
  const refreshCases = {}
  const fresh = async (name, selector = 'main [data-refresh]') => {
    const visibleRetry = `[...document.querySelectorAll(${JSON.stringify(selector)})].find(b => b.getClientRects().length)`
    await waitFor(() => evaluate(`!!(${visibleRetry}) && !(${visibleRetry}).disabled`), name + ' ready')
    const idle = await evaluate(`(() => {
      const b = ${visibleRetry};
      b.scrollIntoView({block:'center'});
      const {width, height} = b.getBoundingClientRect();
      b.click(); b.click();
      return [width, height];
    })()`)
    await waitFor(() => evaluate(`(${visibleRetry})?.disabled`), name + ' pending')
    refreshCases[name] = await auditRefreshMotion(evaluate, selector, false, idle[1])
    assert.deepEqual(refreshCases[name][0].button.slice(2), idle, name + ' retains its existing size')
    await waitFor(() => evaluate(`!(${visibleRetry})?.disabled`), name + ' settled')
    if (process.env.OVERLOAD_CAPTURE_COMMON_UI) console.log('Preview refresh:', name)
  }
  const input = async (selector, value) => {
    await waitFor(() => evaluate(`!!document.querySelector(${JSON.stringify(selector)})`), selector)
    await evaluate(`(() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      const type = el.tagName === 'SELECT' ? HTMLSelectElement : HTMLInputElement;
      Object.getOwnPropertyDescriptor(type.prototype, 'value').set.call(el, ${JSON.stringify(value)});
      el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', {bubbles:true}));
    })()`)
  }
  await shown('FRONT 18 안내·오류·복구 검수')
  await click('운동 진행 검수 열기')
  await save('saved')
  const layouts = []
  for (const width of [320, 375, 393, 430, 1280]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 852, deviceScaleFactor: 1, mobile: width < 500 })
    await settleViewport(width)
    assert.deepEqual(await compactButton('[data-swipe-current] button[data-button-size=compact]'), compactDimensions)
    assert.equal(await evaluate("getComputedStyle(document.querySelector('[data-workout-frame] footer button')).borderRadius"), '5px')
    assert.deepEqual(await evaluate(`(() => {
      const style = getComputedStyle(document.querySelector('[data-swipe-current] [role=table]').closest('.app-card'));
      return [style.padding, style.rowGap, style.borderRadius];
    })()`), ['12px 8px', '7px', '5px'], 'existing set-grid clearance at ' + width)
    await evaluate('scrollTo({top:96,behavior:"instant"})')
    await settleViewport(width)
    const before = await position()
    await beginSet()
    await toast('반복 횟수를 입력해 주세요.')
    assert.deepEqual(await position(), before, String(width))
    assert.deepEqual(await evaluate(`(() => {
      const el = document.querySelector('[data-workout-save-status]');
      return [getComputedStyle(el).fontSize, el.querySelector('svg').getBoundingClientRect().width, document.documentElement.scrollWidth <= innerWidth]
    })()`), ['10px', 10, true])
    assert.equal(await evaluate(`(() => {
      const toast = document.querySelector('[data-tone=warning]');
      return toast?.querySelector('[data-feedback-icon=warning]')?.getAttribute('width') === '18' &&
        toast.getBoundingClientRect().bottom <= document.querySelector('footer').getBoundingClientRect().top
    })()`), true)
    if (width === 393) await capture('front18-393-validation')
    layouts.push({ width, before })
    await click('알림 닫기')
  }
  await send('Emulation.setDeviceMetricsOverride', { width: 393, height: 852, deviceScaleFactor: 1, mobile: true })
  await click('1세트 이번 반복 횟수', '[data-swipe-current] button')
  await waitFor(() => evaluate(`!!document.querySelector('[data-workout-frame] dialog[open]')`), 'workout number wheel')
  dialogs.push(await auditMessageDialog({ send, evaluate }, 'FRONT 18 / 운동 진행 숫자 휠'))
  await capture('front18-393-number-wheel')
  await dismiss()
  await tools('저장 중 · 5초 지연 후 완료')
  await save('saving')
  await beginSet()
  await toast('반복 횟수를 입력해 주세요.')
  await save('saved')
  await toast('반복 횟수를 입력해 주세요.')
  await click('알림 닫기')
  await tools('전송 대기 · 연결 끊김')
  await save('waiting')
  await beginSet()
  await toast('반복 횟수를 입력해 주세요.')
  await click('전송 대기 · 데이터 상태 확인')
  await shown('서버 전송이 남아 있어요.')
  await audit('전송 대기', 'warning')
  await click('닫기', 'dialog button')
  await modalClosed()
  await tools('저장 완료 · 정상 상태 초기화')
  await save('saved')
  await tools('저장 실패 · 로컬 초안')
  await save('failed')
  assert.equal(await evaluate(`!!document.querySelector('[data-tone],dialog[open]')`), false)
  await beginSet()
  await toast('반복 횟수를 입력해 주세요.')
  await click('저장 실패 · 데이터 상태 확인')
  await shown('입력값은 화면에 남아 있어요.')
  await audit('로컬 입력 저장 실패', 'critical', '다시 저장')
  await shown('저장소 설정과 여유 공간을 확인해 주세요.')
  assert.equal(await evaluate("document.querySelector('dialog[open] [role=alert]').textContent.includes('이 기기에 저장하지 못했습니다.')"), false)
  await capture('modal-audit-workout-recovery')
  await click('다시 저장', 'dialog button')
  await save('saved')
  await audit('다시 저장 완료 후 열린 상세', 'info')
  await click('닫기', 'dialog button')
  await modalClosed()
  for (const [scenario, label, message] of [
    ['중량 미입력', '1세트 완료', '중량을 입력해 주세요.'],
    ['반복 횟수 범위 오류', '1세트 완료', '입력한 반복 횟수를 확인해 주세요.'],
    ['중량 범위 오류', '1세트 완료', '입력한 중량을 확인해 주세요.'],
    ['맨몸 추가 중량 범위 오류', '1세트 완료', '입력한 추가 중량을 확인해 주세요.'],
    ['유산소 활동 시간 없음', '유산소 기록 확정', '운동 시간을 기록해 주세요.'],
    ['유산소 시간 정정 범위 오류', '유산소 기록 확정', '정정한 운동 시간을 확인해 주세요.'],
    ['유산소 거리 범위 오류', '유산소 기록 확정', '직접 입력 거리는 0.001~1000 km'],
    ['실측 속도만 입력', '유산소 기록 확정', '평균 속도를 저장하려면 실제 거리를 입력해 주세요.'],
    ['예상 거리와 수정 속도', '유산소 기록 확정', '수정한 평균 속도를 저장하려면 실제 거리를 입력해 주세요.'],
    ['계산 거리 불일치', '유산소 기록 확정', '계산한 거리와 입력값이 달라요.'],
    ['유산소 심박수 범위 오류', '유산소 기록 확정', '평균 심박수는 20~300 BPM'],
    ['거리·속도를 지원하지 않는 종목', '유산소 기록 확정', '거리와 속도는 러닝머신·자전거·야외 운동에만'],
  ]) {
    await tools(scenario)
    await save('saved')
    await click(label, 'footer button')
    await toast(message)
  }
  await tools('저장 완료 · 정상 상태 초기화')
  await click('운동 종료', '[data-workout-frame] button')
  await audit('미완료 운동 종료', 'warning')
  await dismiss()
  await click('운동·세트 편집', '[data-swipe-current] button')
  await click('현재 종목 제외', '[data-swipe-current] button')
  await audit('운동 종목 제외', 'destructive')
  await dismiss()
  await tools('완료 세트 취소')
  await click('1세트 완료 취소', '[data-swipe-current] button')
  await audit('웨이트 세트 완료 취소', 'info')
  await dismiss()
  await tools('유산소 완료 취소')
  await click('유산소 완료 취소', '[data-swipe-current] button')
  await audit('유산소 완료 취소', 'info')
  await dismiss()

  await tools('저장 완료 · 정상 상태 초기화')
  await tools('저장과 무관한 조회 오류')
  await click('저장 완료 · 데이터 상태 확인')
  await audit('저장과 무관한 서버 조회 오류', 'error', '운동 정보 다시 조회')
  await dismiss()
  await tools('저장 완료 · 정상 상태 초기화')
  await tools('자동 동기화 거절')
  await click('저장 실패 · 데이터 상태 확인')
  await audit('서버 저장 거절', 'critical', '저장 결과 확인')
  await dismiss()
  await tools('완료한 운동 · 종료 및 요약')
  await tools('다음 종료 서버 거절')
  await click('운동 종료 및 요약', 'footer button')
  await click('저장 실패 · 데이터 상태 확인')
  await audit('서버 종료 거절', 'critical', '종료 결과 확인')
  await dismiss()

  await tools('완료한 운동 · 종료 및 요약')
  await tools('다음 종료 결과 미확인')
  await click('운동 종료 및 요약', 'footer button')
  await shown('종료 결과 확인')
  await click('저장 실패 · 데이터 상태 확인')
  await shown('저장 여부를 아직 확인하지 못했어요.')
  await audit('운동 종료 결과 미확인', 'recheck')
  assert.deepEqual(await evaluate(`(() => {
    const dialog = document.querySelector('dialog[open]'), description = dialog.querySelector('p');
    const action = [...dialog.querySelectorAll('button')].find(button => button.textContent === '다시 확인');
    return [dialog.dataset.messageTone, getComputedStyle(dialog.querySelector('[data-feedback-icon=syncing]')).color,
      getComputedStyle(description).textAlign, getComputedStyle(description).wordBreak, getComputedStyle(action).backgroundColor];
  })()`), ['recheck', 'rgb(108, 147, 198)', 'center', 'keep-all', 'rgb(108, 147, 198)'])
  await click('닫기', 'dialog button[data-modal-neutral]')
  await modalClosed()
  await tools('재연결·복구 가능 상태로 전환')
  await shown('운동 기록 요약')
  await menu()
  await click('운동 진행 검수 열기')
  await tools('중량 승인 충돌 및 재선택')
  await click('저장 완료 · 데이터 상태 확인')
  const dismissApprovalConfirmation = async () => {
    await click('닫기', 'dialog[open][data-message-tone] .icon-button')
    await waitFor(() => evaluate('document.querySelectorAll("dialog[open]").length === 1'), 'weight approval form remains open')
  }
  await click('현재 루틴 중량 유지', 'dialog button')
  await audit('진행 중 현재 루틴 중량 유지', 'info')
  await dismissApprovalConfirmation()
  await click('이 중량으로 지금 재승인', 'dialog button')
  await audit('진행 중 루틴 중량 재승인', 'info')
  await dismissApprovalConfirmation()
  await dismiss()
  await tools('저장 완료 · 정상 상태 초기화')
  await tools('다른 기기에서 수정 · 편집권 충돌')
  await click('저장 실패 · 데이터 상태 확인')
  await audit('다른 기기 편집권 충돌', 'critical', '세션 상세 다시 확인')
  await dismiss()
  await tools('편집 잠금 · 읽기 전용')
  await click('저장 실패 · 데이터 상태 확인')
  await audit('로컬 편집 열기 실패', 'critical', '로컬 운동 다시 확인')
  await dismiss()
  await tools('이 기기에 보존된 운동 이어가기')
  await click('이 기기의 운동 이어가기')
  await click('저장 완료 · 데이터 상태 확인')
  await audit('오프라인 기록 복원과 같은 계정 재인증', 'info')
  await dismiss()
  await tools('읽기 전용 세션·기기 인계')
  await click('이 기기로 편집 가져오기')
  await audit('기기 인계', 'info')
  await dismiss()
  await menu()
  await click('종료 확정 후 요약 조회 실패·재시도')
  await shown('운동을 종료했고 기록은 저장됐어요.')
  await fresh('종료 확정 후 요약')
  await shown('운동 기록 요약')
  await menu()
  await click('기록 삭제 결과 미확인')
  await waitFor(() => evaluate(`(() => {
    const menu = document.querySelector('summary[aria-label="운동 기록 메뉴"]')
    if (!menu?.getClientRects().length) return false
    menu.click()
    return true
  })()`), 'record action menu')
  await click('기록 전체 삭제')
  await audit('운동 기록 삭제', 'destructive')
  await click('삭제', 'dialog button')
  await shown('삭제 결과를 확인하지 못했어요.')
  await shown('이 창을 닫고 ‘저장 결과 확인’을 눌러 주세요.')
  await audit('운동 기록 삭제 결과 미확인', 'destructive')
  await click('닫기', 'dialog button')
  await modalClosed()
  await click('현재 기록 확인 완료')
  await audit('운동 기록 검토 완료', 'info')
  await dismiss()
  await click('저장 결과 확인')
  await shown('삭제된 운동입니다.')
  await menu()
  await click('계정 재인증·로그인 수단')
  await click('이메일 재인증 성공')
  await toast('이메일 재인증을 완료했습니다.')
  await click('대표 이메일 등록 성공')
  await toast('대표 이메일을 등록하고 이메일 재인증을 완료했습니다.')
  await click('이메일 로그인 연결 성공')
  await toast('이메일 로그인을 연결했어요.', 'success')
  await click('이미 연결된 이메일 로그인 확인')
  await toast('이미 연결된 이메일이에요.', 'info')
  await click('이메일 로그인 해제 확인')
  await shown('이메일 로그인 수단을 해제할까요?')
  await audit('이메일 로그인 해제', 'warning')
  await click('취소', 'dialog button')
  await modalClosed()
  await click('이메일 로그인 해제 확인')
  await click('연결 해제', 'dialog button')
  await toast('로그인 수단을 해제했어요.', 'success')
  await click('Google 로그인 해제 확인')
  await audit('Google 로그인 해제', 'warning')
  await dismiss()
  await click('이메일 연결 처리 후 상태 조회 실패')
  await shown('이메일 연결 상태를 불러오지 못했어요.')
  await fresh('계정 조회 실패', '[aria-label="계정 설정"] [data-refresh]')
  await click('로그인된 기기 관리')
  await input('[aria-label="로그인된 기기"] select', 'error')
  await fresh('로그인된 기기 조회 실패', '[aria-label="로그인된 기기"] [data-refresh]')
  await click('계정 설정으로')
  await click('OTP 불일치')
  await shown('코드가 맞지 않거나 만료됐습니다.')
  await menu()
  await click('루틴 조회·성공 Toast·확인 Dialog')
  await shown('저장된 루틴')
  await cardSurface('.app-card[aria-label="루틴 주간 일정"]', '12px')
  await click('기존 루틴 데이터 조회 실패')
  await toast('루틴을 불러오지 못했어요.', 'error')
  await fresh('기존 루틴 데이터 조회 실패', '[aria-label="루틴"] [data-refresh]')
  await click('빈 루틴 목록')
  await shown('등록된 루틴이 없어요')
  assert.equal(await evaluate(`document.querySelector('[data-content-state=empty] h2').textContent`), '등록된 루틴이 없어요')
  await click('데이터 없는 루틴 조회 실패')
  await waitFor(() => evaluate(`!!document.querySelector('[data-content-state=error] h2')`), 'routine first read error')
  await fresh('데이터 없는 루틴 조회 실패', '[aria-label="루틴"] [data-refresh]')
  await click('정상 루틴 목록')
  await click('루틴 생성 · 저장·폐기')
  await input('form[aria-label="루틴 생성"] input[placeholder="나의 루틴"]', '새 루틴 검수')
  await click('취소', 'form[aria-label="루틴 생성"] button')
  await audit('루틴 생성 초안 폐기', 'destructive')
  await click('버리기', 'dialog button')
  await modalClosed()
  await click('루틴 편집 · 저장·폐기')
  await input('form[aria-label="루틴 편집"] input[placeholder="나의 루틴"]', '상체 푸시 · 검수 수정')
  await click('취소', 'form[aria-label="루틴 편집"] button')
  await shown('루틴 변경을 버릴까요?')
  await audit('루틴 편집 변경 폐기', 'destructive')
  await click('닫기', 'dialog button')
  await modalClosed()
  await click('다음 루틴 쓰기 실패')
  await click('변경 사항 저장', 'form[aria-label="루틴 편집"] button')
  await toast('입력 내용을 확인해 주세요.', 'error')
  await click('다음 루틴 저장 결과 미확인')
  await click('변경 사항 저장', 'form[aria-label="루틴 편집"] button')
  await toast('루틴 저장 결과를 확인하지 못했어요.', 'warning')
  await click('저장 결과 확인', 'form[aria-label="루틴 편집"] button')
  await toast('루틴 변경사항을 저장했습니다.')
  await click('루틴 상세 · 삭제 확인')
  await shown('운동 시작')
  await waitFor(() => evaluate("Boolean(document.querySelector('[aria-label=\"루틴 상세\"] button[data-button-size=compact]'))"), 'routine detail edit')
  assert.deepEqual(await compactButton('[aria-label="루틴 상세"] button[data-button-size=compact]'), compactDimensions)
  await click('다음 운동 시작에서 루틴 버전 변경')
  await click('운동 시작')
  await toast('루틴이 변경됐어요. 다시 확인해 주세요.', 'warning')
  await click('루틴 삭제')
  await shown('루틴을 삭제할까요?')
  await audit('루틴 삭제', 'destructive')
  await click('삭제', 'dialog button')
  await toast('루틴을 삭제했습니다.')
  await menu()
  await click('주간 일정·계획 분석')
  await click('데이터 없는 일정 조회 실패')
  await fresh('데이터 없는 일정 조회 실패', '[aria-label="루틴 주간 일정"] [data-refresh]')
  await click('일정 조회 실패 · 쓰기 차단')
  await fresh('기존 일정이 있는 조회 실패', '[aria-label="루틴 주간 일정"] [data-refresh]')
  await click('계획 분석 루틴 조회 실패')
  await fresh('계획 분석 루틴 조회 실패', '[aria-label="루틴"] [data-refresh]')
  await toast('연결할 수 없어요. 다시 시도해 주세요.', 'error')
  await click('‹ 루틴으로')
  await click('일정·계획 조회 복구')
  const scheduleForm = 'form[aria-label="주간 일정 편집"]'
  await click('주간 일정 배정·편집')
  await shown('저장 즉시 적용합니다.')
  const monday = 'form[aria-label="주간 일정 편집"] select[aria-label="월요일 루틴"]'
  const nextRoutine = await evaluate(`(() => { const el = document.querySelector(${JSON.stringify(monday)}); return [...el.options].find(option => option.value !== el.value).value; })()`)
  await input(monday, nextRoutine)
  await click('일정 저장', 'form[aria-label="주간 일정 편집"] button')
  await audit('주간 일정 변경 저장', 'info')
  await dismiss()
  await click('닫기', 'form[aria-label="주간 일정 편집"] button')
  await audit('요일 배정 변경 폐기', 'destructive')
  await click('버리기', 'dialog button')
  await modalClosed()
  await waitFor(() => evaluate(`!document.querySelector(${JSON.stringify(scheduleForm)})`), 'dismissed schedule editor closed')
  await click('주간 일정 배정·편집')
  await waitFor(() => evaluate(`document.querySelector(${JSON.stringify(monday)})?.matches(':disabled') === false`), 'schedule editor reopened')
  await click('일정 조회 실패 · 쓰기 차단')
  await fresh('일정 배정 편집 조회 실패', 'form[aria-label="주간 일정 편집"] [data-refresh]')
  await waitFor(() => evaluate(`document.querySelector(${JSON.stringify(monday)})?.matches(':disabled') === false &&
    [...document.querySelectorAll(${JSON.stringify(scheduleForm + ' button')})].some(b => b.textContent === '일정 저장')`), 'schedule write protection released after read')
  await click('다음 일정 저장 충돌')
  const anotherRoutine = await evaluate(`(() => { const el = document.querySelector(${JSON.stringify(monday)}); return [...el.options].find(option => option.value !== el.value).value; })()`)
  await input(monday, anotherRoutine)
  assert.equal(await evaluate(`document.querySelector(${JSON.stringify(monday)}).value`), anotherRoutine)
  await click('일정 저장', scheduleForm + ' button')
  await audit('일정 충돌 전 변경 저장 확인', 'info')
  await click('저장', 'dialog button')
  await toast('일정이 변경됐어요.', 'warning')
  await waitFor(() => evaluate(`document.querySelector(${JSON.stringify(monday)})?.matches(':disabled') === false`), 'latest weekly schedule is loaded')
  await click('최신 일정 확인', 'form[aria-label="주간 일정 편집"] button')
  await audit('최신 일정 열기 전 변경 폐기 확인', 'destructive')
  await click('버리기', 'dialog button')
  await modalClosed()
  await menu()
  await click('최근 운동·전체 이력 조회')
  await shown('상체 푸시 + 러닝')
  await click('기존 기록 조회 실패')
  await toast('연결할 수 없어요. 다시 시도해 주세요.', 'error')
  await fresh('기존 최근 기록 조회 실패', '[aria-label="최근 7일 운동 기록"] [data-refresh]')
  await shown('상체 푸시 + 러닝')
  await click('데이터 없는 기록 조회 실패')
  const readRetry = '[data-content-state=error] [data-refresh]'
  await waitFor(() => evaluate(`!!document.querySelector(${JSON.stringify(readRetry)})`), 'record read error')
  const retryLayout = () => evaluate(`(() => {
    const button = document.querySelector(${JSON.stringify(readRetry)});
    const layout = el => {const {x,y,width,height} = el.getBoundingClientRect(); return [x,y,width,height]};
    return [layout(button), layout(button.closest('[data-content-state]')), document.scrollingElement.scrollHeight, scrollY];
  })()`)
  for (const width of [320, 375, 393, 430, 1280]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 852, deviceScaleFactor: 1, mobile: width < 500 })
    await settleViewport(width)
    assert.deepEqual(await evaluate(`(() => {
      const button = document.querySelector(${JSON.stringify(readRetry)});
      const icon = button.closest('[data-content-state]').querySelector('[data-feedback-icon=error]').parentElement;
      return [getComputedStyle(button).backgroundColor, getComputedStyle(button).borderTopWidth,
        getComputedStyle(icon).backgroundColor, button.lastElementChild.textContent, button.getBoundingClientRect().height >= 44,
        document.documentElement.scrollWidth <= innerWidth];
    })()`), ['rgba(0, 0, 0, 0)', '0px', 'rgba(0, 0, 0, 0)', '새로고침', true, true])
    if (width !== 393) continue
    await click('다음 새로고침 시간 초과 예약')
    const errorLayout = await retryLayout()
    await evaluate(`(() => {const b = document.querySelector(${JSON.stringify(readRetry)}); b.click(); b.click()})()`)
    await waitFor(() => evaluate(`document.querySelector(${JSON.stringify(readRetry)})?.disabled === true`), 'refresh in flight')
    assert.deepEqual(await retryLayout(), errorLayout)
    const motion = await auditRefreshMotion(evaluate, readRetry)
    await toast('연결할 수 없어요. 다시 시도해 주세요.', 'error')
    assert.equal(await evaluate(`document.querySelector(${JSON.stringify(readRetry)}).disabled`), false)
    assert.equal(await evaluate(`getComputedStyle(document.querySelector(${JSON.stringify(readRetry + ' svg')})).animationName`), 'none')
    assert.deepEqual(await retryLayout(), errorLayout)
    Object.assign(layouts.find(sample => sample.width === width), { refresh: errorLayout, motion })
    await click('알림 닫기')
  }
  await send('Emulation.setDeviceMetricsOverride', { width: 393, height: 852, deviceScaleFactor: 1, mobile: true })
  await settleViewport(393)
  await evaluate(`void (window.previousRecordRetry = document.querySelector(${JSON.stringify(readRetry)}))`)
  await click('데이터 없는 기록 조회 실패')
  await waitFor(() => evaluate(`(() => {
    const next = document.querySelector(${JSON.stringify(readRetry)});
    if (!next || next === window.previousRecordRetry || next.disabled) return false;
    delete window.previousRecordRetry;
    return true;
  })()`), 'fresh record read error')
  await click('다음 새로고침 실패 예약')
  await click('새로고침', readRetry)
  await auditRefreshMotion(evaluate, readRetry)
  await toast('연결할 수 없어요. 다시 시도해 주세요.', 'error')
  await click('알림 닫기')
  await click('다음 새로고침 성공 예약')
  await click('새로고침', readRetry)
  await auditRefreshMotion(evaluate, readRetry)
  await shown('상체 푸시 + 러닝')
  assert.equal(await evaluate(`!!document.querySelector(${JSON.stringify(readRetry)})`), false)
  await evaluate('new Promise(resolve => setTimeout(resolve, 1050))')
  assert.equal(await evaluate(`document.body.innerText.includes('상체 푸시 + 러닝')`), true)
  await click('전체 운동 이력')
  await click('데이터 없는 기록 조회 실패')
  await fresh('데이터 없는 전체 운동 이력', '[aria-label="전체 운동 이력"] [data-refresh]')
  await click('기존 기록 조회 실패')
  await fresh('기존 전체 운동 이력 조회 실패', '[aria-label="전체 운동 이력"] [data-refresh]')
  await menu()
  await click('운동 종목 보기')
  await click('데이터 없는 운동 목록 조회 실패')
  await fresh('데이터 없는 카탈로그 조회 실패')
  await click('기존 운동 목록 재조회 실패')
  await fresh('기존 카탈로그 조회 실패')
  await click('설정으로 돌아가기')
  await click('성장 추적 검색·기간 변경')
  await click('검색 실패')
  await click('검색 목록 열기')
  await fresh('성장 추적 검색 실패', '.record-search [data-refresh]')
  await click('기간·배치 조회 실패')
  await waitFor(() => evaluate(`(() => {
    const first = document.querySelector('.record-search li button:not(:disabled)')
    if (!first) return false
    first.click()
    return true
  })()`), 'growth exercise is selectable')
  await fresh('성장 추적 기간·배치 조회 실패')
  await menu()
  await click('휴식 설정 저장·충돌·폐기')
  await cardSurface('[aria-label="세트 사이 휴식"] .app-card', '12px')
  await waitFor(() => evaluate("Boolean(document.querySelector('[aria-label=\"세트 사이 휴식\"] button[data-button-size=compact]'))"), 'rest settings edit')
  assert.deepEqual(await compactButton('[aria-label="세트 사이 휴식"] button[data-button-size=compact]'), compactDimensions)
  await click('편집')
  await cardSurface('[aria-label="세트 사이 휴식"] .app-card', '12px')
  await input('input[name="restLowSeconds"]', '135')
  await click('다음 휴식 설정 충돌')
  await click('변경 사항 저장')
  await toast('휴식 설정이 변경됐어요.', 'warning')
  await click('최신 설정 확인')
  await shown('최신 저장값은 150초')
  await click('설정으로')
  await shown('휴식 시간 변경을 버릴까요?')
  await audit('휴식 시간 변경 폐기', 'destructive')
  await click('닫기', 'dialog button')
  await modalClosed()
  await menu()
  await click('홈 로딩·운동 시작')
  await shown('오늘만 다른 루틴 선택')
  await cardSurface('.app-card[aria-label="이번 주 일정"]', '12px')
  await click('기존 홈 데이터 조회 실패')
  await toast('일정을 불러오지 못했어요.', 'error')
  await fresh('홈 기존 데이터 조회 실패')
  await waitFor(() => evaluate(`(() => {
    const button = [...document.querySelectorAll('button')].find(item => item.textContent.trim() === '운동 시작');
    if (!button || button.disabled) return false;
    const css = getComputedStyle(button);
    return css.backgroundColor === 'rgb(108, 147, 198)' && css.color === 'rgb(17, 24, 32)' && css.borderRadius === '999px';
  })()`), 'home primary reference')
  await click('다음 운동 시작 실패')
  await click('운동 시작')
  await toast('기기의 날짜와 시간 설정을 확인해 주세요.', 'error')
  await click('알림 닫기')
  const homePosition = () => evaluate(`(() => {
    const elements = ['[aria-label="홈"] header', '[aria-label="오늘의 루틴"]', '[data-click-action="start"], [data-click-action="retry-start"]'];
    const boxes = elements.map(selector => {
      const b = document.querySelector(selector)?.getBoundingClientRect();
      return b && [b.x, b.y, b.width, b.height];
    });
    return { scrollY, boxes, overflow: document.documentElement.scrollWidth > innerWidth };
  })()`)
  for (const width of [320, 375, 393, 430, 1280]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 852, deviceScaleFactor: 1, mobile: width < 500 })
    await settleViewport(width)
    await click('다음 운동 시작 결과 미확인')
    await waitFor(() => evaluate(`(() => {
      const button = document.querySelector('[data-click-action="start"]');
      if (!button || button.disabled) return false;
      button.focus({ preventScroll: true });
      return true;
    })()`), 'home start is ready')
    await settleViewport(width)
    const before = await homePosition()
    assert.equal(before.overflow, false)
    assert.equal(before.boxes.length, 3)
    assert.ok(before.boxes.every(Boolean))
    await evaluate(`document.querySelector('[data-click-action="start"]').click()`)
    await toast('운동이 시작됐는지 확인하지 못했어요.', 'warning')
    assert.deepEqual(await homePosition(), before, `home ${width}`)
    assert.equal(await evaluate(`document.querySelectorAll('[data-tone=warning]').length`), 1)
    const bounds = await evaluate(`(() => {const b = document.querySelector('[data-tone=warning]').getBoundingClientRect(); return b.left >= 0 && b.right <= innerWidth;})()`)
    assert.equal(bounds, true)
    if (width === 393) await capture('front18-393-start-unconfirmed')
    layouts.find(sample => sample.width === width).home = before
    await click('운동 시작', '[data-click-action="retry-start"]')
    await shown('확인 중')
    await waitFor(() => evaluate(`!!document.querySelector('[data-click-action="start"]:not(:disabled)')`), 'resolved start result')
  }
  await send('Emulation.setDeviceMetricsOverride', { width: 393, height: 852, deviceScaleFactor: 1, mobile: true })
  await menu()
  await click('앱 설치·오프라인 상태')
  await evaluate(`document.querySelector('details summary').click()`)
  await click('앱 화면 미준비')
  await shown('처음 이용할 때는 인터넷 연결이 필요해요.')
  await click('업데이트 준비')
  await shown('업데이트가 준비됐어요.')
  await menu()
  await click('설정 메인·휴식 타이머 알림')
  await shown('운동 이름과 별칭으로 검색')
  await click('휴식 타이머 알림')
  await shown('휴식 테스트')
  assert.equal(await evaluate(`Object.keys(localStorage).length + Object.keys(sessionStorage).length`), 0)
  for (const layout of layouts) {
    if (layout.width === 393) layout.additionalRefreshScenarios = refreshCases
  }
  return layouts
}
