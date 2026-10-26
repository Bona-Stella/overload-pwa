import { useState } from 'react'
import HealthPanel from '../health/HealthPanel'
import type { RestSettings } from '../workout/types'

type Section = 'rest' | 'storage' | 'health'
type Props = { settings: RestSettings; onSave: (settings: RestSettings) => boolean }

export function SettingsScreen({ settings, onSave }: Props) {
  const [section, setSection] = useState<Section | null>(null)
  return <>
    <p className="eyebrow">MAKE IT YOURS</p><h1>설정</h1>
    {section === null ? <nav className="card settings-menu" aria-label="설정 메뉴">
      {([
        ['rest', '휴식시간', '목표 반복 횟수에 맞춘 기본 휴식'],
        ['storage', '로컬 저장 안내', '현재 기록의 저장 방식'],
        ['health', '서버 연결 진단', 'Health Check 연결 상태 확인'],
      ] as const).map(([id, title, description]) => <button key={id} className="list-button" onClick={() => setSection(id)}><span>{title}<small>{description}</small></span><span aria-hidden="true">›</span></button>)}
    </nav> : <>
      <button className="quiet" onClick={() => setSection(null)}>‹ 설정 목록</button>
      {section === 'rest' ? <RestSettingsForm settings={settings} onSave={onSave} /> : section === 'health' ? <HealthPanel /> : <section className="card stack"><h2>이 프로토타입의 저장 방식</h2><p className="muted">운동 기록은 현재 브라우저의 로컬 저장소에 보관됩니다. 브라우저 데이터를 삭제하면 사라질 수 있습니다. 서버 동기화, 백업, PWA 설치 지원은 아직 구현하지 않았습니다.</p></section>}
    </>}
  </>
}

function RestSettingsForm({ settings, onSave }: Props) {
  const [draft, setDraft] = useState({ low: String(settings.low), medium: String(settings.medium), high: String(settings.high) })
  const [message, setMessage] = useState('')
  return <form className="card stack" noValidate onSubmit={event => {
    event.preventDefault()
    const value = { low: Number(draft.low), medium: Number(draft.medium), high: Number(draft.high) }
    if (Object.values(value).some(v => !Number.isSafeInteger(v) || v <= 0)) setMessage('휴식시간은 1초 이상의 정수로 입력해 주세요.')
    else if (onSave(value)) setMessage('예시 휴식시간 설정을 적용했습니다.')
  }}><h2>목표 상한별 휴식시간</h2><p className="muted small">시연용 예시 기본값입니다. 목표 반복 횟수 상한에 따라 자동 적용됩니다.</p>{([['low', '상한 8회 이하'], ['medium', '상한 9–12회'], ['high', '상한 13회 이상']] as const).map(([key, label]) => <label key={key}>{label} (초)<input inputMode="numeric" value={draft[key]} onChange={e => setDraft({ ...draft, [key]: e.target.value })} /></label>)}<button type="submit" className="primary">설정 저장</button>{message && <p role="status">{message}</p>}</form>
}
