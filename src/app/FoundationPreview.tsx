import { useEffect, useState } from 'react'
import { AppShell } from './AppShell.tsx'
import type { AppTab, DisplayTheme } from './types.ts'
import { Button, Card, Field, Help, SectionHeading, StatusNotice } from '../components/ui.tsx'
import { Dialog } from '../components/Dialog.tsx'
import { RepsInput } from '../components/RepsInput.tsx'
import { WeightInput } from '../components/WeightInput.tsx'
import { ExerciseIcon } from '../components/ExerciseIcon.tsx'
import '../App.css'
import styles from './FoundationPreview.module.css'

// Development-only visual checks. No authentication, workout storage, or server calls.
export default function FoundationPreview() {
  const [theme, setTheme] = useState<DisplayTheme>('normal'), [tab, setTab] = useState<AppTab>('home')
  const [reps, setReps] = useState('8'), [weight, setWeight] = useState('60'), [draft, setDraft] = useState(''), [dialog, setDialog] = useState(false)
  const [startedAt] = useState(Date.now), [now, setNow] = useState(Date.now)
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer) }, [])
  return <AppShell authenticated tab={tab} onNavigate={setTab} displayTheme={theme}>
    <SectionHeading title="UI 기반 검증" eyebrow="DEVELOPMENT ONLY"><Help label="검증 화면 안내">시각 테마만 전환합니다. 계정 및 디로딩 상태와 연결되지 않습니다.</Help></SectionHeading>
    <div className="stack">
      <StatusNotice>개발용 화면 · 실제 계정·운동 기록과 분리되어 있습니다.</StatusNotice>
      <div className="row" aria-label="표시 테마"><Button aria-pressed={theme === 'normal'} onClick={() => setTheme('normal')}>일반 테마</Button><Button aria-pressed={theme === 'deload'} onClick={() => setTheme('deload')}>디로딩 색상 검증</Button></div>
      <Card hero><p className={styles.accent}>WEIGHT / CARDIO</p><h2>공통 Onyx 강조 카드</h2><p>테마·탭 전환 시 입력과 경과 시간이 유지됩니다.</p><output aria-label="검증 경과 시간">{Math.floor((now - startedAt) / 1000)}초</output><Button variant="primary" onClick={() => setDialog(true)}>공통 대화상자</Button></Card>
      <Card><h2>입력과 숫자 조절</h2><Field label="검증 입력"><input value={draft} onChange={event => setDraft(event.target.value)} /></Field><WeightInput label="검증 중량" value={weight} onChange={setWeight} /><RepsInput ordinal={1} value={reps} disabled={false} onChange={setReps} /></Card>
      <Card><h2>공식 운동 아이콘 · 32px</h2><div className={styles.icons}>{(['chest', 'back', 'legs', 'running', 'walking', 'cycling'] as const).map((kind, index) => <ExerciseIcon key={kind} kind={kind} label={['가슴', '등', '하체', '러닝', '걷기', '자전거'][index]} />)}<ExerciseIcon label="분류 미확인" /></div><small className={styles.metadata}>제조사 / 부하 방식 · 보조 정보</small></Card>
      <StatusNotice error>저장 실패 표시 예시 · 실제 저장 요청은 하지 않습니다.</StatusNotice>
      <a href="/">계정 앱으로</a>
    </div>
    {dialog && <Dialog title="공통 대화상자" onClose={() => setDialog(false)}><p>닫은 뒤 열었던 버튼으로 초점이 돌아갑니다.</p><Button onClick={() => setDialog(false)}>닫기</Button></Dialog>}
  </AppShell>
}
