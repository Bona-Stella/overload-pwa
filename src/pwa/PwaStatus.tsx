import { useSyncExternalStore } from 'react'
import type { ReactNode } from 'react'
import { checkUpdate, installApp, pwaSnapshot, subscribePwa } from './registration.ts'

export function PwaStatus({ review = false, className = '', summary = '앱 설치·오프라인 준비' }: { review?: boolean; className?: string; summary?: ReactNode }) {
  const state = useSyncExternalStore(subscribePwa, pwaSnapshot, pwaSnapshot)
  return <PwaStatusView state={state} review={review} className={className} summary={summary} />
}

export function PwaStatusView({ state, review, className = '', summary = '앱 설치·오프라인 준비' }: {
  state: ReturnType<typeof pwaSnapshot>; review?: boolean; className?: string; summary?: ReactNode
}) {
  return <details className={`card ${className}`}><summary>{summary}</summary><div className="stack">
    <p role="status">{state.ready ? '인터넷이 끊겨도 이 기기에서 이미 시작한 운동을 이어갈 수 있어요.' : '처음 이용할 때는 인터넷 연결이 필요해요.'}</p>
    {state.installable && !review ? <button className="outline action-pill" onClick={() => void installApp()}>Overload 설치</button> : <p className="muted small">브라우저의 설치 메뉴를 이용하세요. iPhone에서는 Safari 공유 메뉴의 ‘홈 화면에 추가’를 선택하고, 설치한 앱에서 인터넷에 연결해 로그인해 주세요.</p>}
    {state.waiting && <p className="notice">업데이트가 준비됐어요. 운동 기록을 저장한 뒤 Overload 창을 모두 닫고 다시 열어 주세요.</p>}
    {state.failed && <p className="notice">업데이트를 확인하지 못했어요. 인터넷 연결과 기기의 저장 공간을 확인해 주세요.</p>}
    {review ? <p className="muted small">검토용 설치 안내입니다. 실제 설치·업데이트는 정식 앱에서 사용할 수 있습니다.</p>
      : <button className="quiet" onClick={() => void checkUpdate()}>업데이트 확인</button>}
    <p className="muted small">브라우저 데이터를 지우기 전에 전송이 끝났는지 확인해 주세요. 아직 전송하지 않은 기록은 사라질 수 있어요.</p>
  </div></details>
}
