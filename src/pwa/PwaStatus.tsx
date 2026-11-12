import { useSyncExternalStore } from 'react'
import { checkUpdate, installApp, pwaSnapshot, subscribePwa } from './registration.ts'

export function PwaStatus({ review = false }: { review?: boolean }) {
  const state = useSyncExternalStore(subscribePwa, pwaSnapshot, pwaSnapshot)
  return <details className="card"><summary>앱 설치·오프라인 준비</summary><div className="stack">
    <p role="status">{state.ready ? '앱 화면을 이 기기에 준비했습니다. 온라인에서 연 기존 운동은 연결이 끊겨도 명시적으로 이어갈 수 있습니다.' : '앱 화면 준비는 온라인 프로덕션 접속 후 완료됩니다. 최초 오프라인 방문은 지원하지 않습니다.'}</p>
    {state.installable && !review ? <button className="outline" onClick={() => void installApp()}>Overload 설치</button> : <p className="muted small">지원 브라우저의 설치 메뉴를 사용하세요. iPhone에서는 Safari의 공유 메뉴에서 ‘홈 화면에 추가’를 선택하세요. Safari 탭과 홈 화면 앱은 저장 영역을 공유한다고 가정하지 않으므로, 설치한 앱에서도 온라인 로그인 후 운동을 여세요.</p>}
    {state.waiting && <p className="notice">새 앱 버전이 준비되었습니다. 입력의 기기 저장을 확인하고 모든 Overload 창을 닫은 뒤 다시 열어 적용하세요. 운동 화면은 강제로 새로고침하지 않습니다.</p>}
    {state.failed && <p className="notice">앱 준비 또는 업데이트를 확인하지 못했습니다. 기존 운동 원본은 보존됩니다. 온라인 연결·저장소 설정을 확인하세요.</p>}
    {review ? <p className="muted small">검토용 설치 안내입니다. 실제 설치·업데이트는 정식 앱에서 사용할 수 있습니다.</p>
      : <button className="quiet" onClick={() => void checkUpdate()}>업데이트 확인</button>}
    <p className="muted small">저장소 삭제·브라우저 정리로 미전송 원본이 사라질 수 있습니다. 백그라운드 실행이나 영구 보존을 보장하지 않습니다.</p>
  </div></details>
}
