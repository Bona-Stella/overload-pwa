import { useState } from 'react'
import { LoggedInDevices } from '../../../src/features/auth/LoggedInDevices.tsx'
import type { DevicesNavigation, DevicesState, LoggedInDevice } from '../../../src/features/auth/LoggedInDevices.tsx'

const sampleDevices: readonly LoggedInDevice[] = [
  { id: 'preview-phone', name: 'iPhone 15 Pro', kind: 'phone', environment: 'iOS · Safari', presence: 'online', signedInAt: '2026-11-17T10:21:00+09:00', lastSeenAt: '2026-11-17T10:22:00+09:00' },
  { id: 'preview-tablet', name: 'iPad Pro', kind: 'tablet', environment: 'iPadOS · Safari', presence: 'online', signedInAt: '2026-11-17T09:34:00+09:00', lastSeenAt: '2026-11-17T10:20:00+09:00' },
  { id: 'preview-computer', name: 'MacBook Air', kind: 'computer', environment: 'macOS · Chrome', presence: 'offline', signedInAt: '2026-11-15T21:10:00+09:00', lastSeenAt: '2026-11-16T22:30:00+09:00' },
]
const scenarios = {
  idle: '운동 없음',
  here: '현재 기기에서 운동 진행 중',
  elsewhere: '다른 기기에서 운동 진행 중',
  only: '현재 기기만 로그인',
  unknown: '현재 기기와 접속 상태 확인 불가',
  empty: '조회 결과 없음',
  loading: '조회 중',
  error: '조회 실패',
  unsupported: '서버 미지원',
} as const
type Scenario = keyof typeof scenarios
const observedAt = Date.parse('2026-11-17T10:22:20+09:00')

function example(scenario: Scenario): DevicesState {
  if (scenario === 'loading' || scenario === 'error' || scenario === 'unsupported') return { status: scenario }
  const devices = scenario === 'empty' ? []
    : scenario === 'only' ? [sampleDevices[0]]
      : scenario === 'unknown' ? [{ ...sampleDevices[0], name: '운동 검토용 긴 이름의 휴대전화 Safari 개발 환경', presence: 'unknown' as const }, ...sampleDevices.slice(1)]
        : sampleDevices
  const editor = scenario === 'here' ? sampleDevices[0].id : scenario === 'elsewhere' ? sampleDevices[1].id : null
  return { status: 'ready', snapshot: {
    observedAt, timeZone: 'Asia/Seoul', devices,
    currentDeviceId: scenario === 'empty' || scenario === 'unknown' ? null : sampleDevices[0].id,
    workout: editor ? { kind: 'active', deviceId: editor } : { kind: scenario === 'unknown' ? 'unknown' : 'none' },
  } }
}

export function DevicesReview(navigation: DevicesNavigation) {
  const [scenario, setScenario] = useState<Scenario>('idle')
  return <LoggedInDevices {...navigation} state={example(scenario)} onRetry={() => setScenario('idle')}
    previewControls={<label>기기 상태 예시<select value={scenario} onChange={event => setScenario(event.target.value as Scenario)}>
      {Object.entries(scenarios).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
    </select></label>} />
}
