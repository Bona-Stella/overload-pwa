import { useState } from 'react'
import { AppShell } from '../../../src/app/AppShell.tsx'
import { Button } from '../../../src/components/ui.tsx'
import { CircleCheck } from '../../../src/components/common-ui/CircleCheck.tsx'
import { FeedbackIcon } from '../../../src/components/common-ui/FeedbackIcon.tsx'
import { RefreshButton } from '../../../src/components/common-ui/RefreshButton.tsx'
import { SelectDropdown } from '../../../src/components/common-ui/SelectDropdown.tsx'
import { StatusText } from '../../../src/components/common-ui/StatusIndicator.tsx'
import { DeloadMoon } from '../../../src/components/DeloadMoon.tsx'
import { Icon } from '../../../src/components/icons/Icon.tsx'
import type { IconDefinition } from '../../../src/components/icons/definition.ts'
import { accountIcons } from '../../../src/components/icons/account.tsx'
import { chevronLeft, chevronRight, routineDelete } from '../../../src/components/icons/common.tsx'
import { dropdownChevron, searchClear, searchOpen } from '../../../src/components/icons/controls.tsx'
import { feedbackIcons } from '../../../src/components/icons/feedback.tsx'
import { iconGlyphs } from '../../../src/components/icons/glyphs.ts'
import { NavigationIcon } from '../../../src/components/icons/NavigationIcon.tsx'
import { navigationIcons } from '../../../src/components/icons/navigation.tsx'
import { periodCalendar } from '../../../src/components/icons/period.tsx'
import * as records from '../../../src/components/icons/record.tsx'
import { restAlertIcons } from '../../../src/components/icons/rest-alert.tsx'
import * as routine from '../../../src/components/icons/routine.tsx'
import { restBandDelete, restBandInfo, settingsIcons } from '../../../src/components/icons/settings.tsx'
import * as workout from '../../../src/components/icons/workout.tsx'
import styles from './IconCatalogPreview.module.css'

const { recordIcons, ...recordDetails } = records
const groups: readonly [string, Record<string, IconDefinition>][] = [
  ['하단 내비게이션', navigationIcons],
  ['안내·저장·피드백', feedbackIcons],
  ['공통 조작', { chevronLeft, chevronRight, dropdownChevron, searchOpen, searchClear, routineDelete }],
  ['설정', { ...settingsIcons, restBandDelete, restBandInfo }],
  ['계정과 기기', accountIcons],
  ['휴식 알림', restAlertIcons],
  ['기록과 통계', { ...recordIcons, ...recordDetails, periodCalendar }],
  ['루틴과 주간 일정', routine],
  ['운동 진행', workout],
]
const sizes = [12, 16, 20, 24, 32] as const
const tones = {
  primary: '기본',
  muted: '보조',
  disabled: '비활성',
  accent: '강조',
  done: '성공',
  warning: '주의',
  danger: '오류',
} as const
type Tone = keyof typeof tones
const themes = { normal: 'Onyx', deload: '디로딩' } as const

export default function IconCatalogPreview() {
  const [theme, setTheme] = useState<keyof typeof themes>('normal')
  const [tone, setTone] = useState<Tone>('primary')
  const [size, setSize] = useState<number>()
  const [active, setActive] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [option, setOption] = useState('wide')

  return <AppShell tab="settings" displayTheme={theme} authenticated={false} onNavigate={() => {}}>
    <header className={styles.header}>
      <h1>UI 아이콘 카탈로그</h1>
      <a href={location.pathname}>공통 UI Preview</a>
    </header>
    <div className={styles.filters}>
      <label>테마<select value={theme} onChange={event => setTheme(event.target.value as keyof typeof themes)}>
        {Object.entries(themes).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
      </select></label>
      <label>아이콘 크기<select value={size ?? ''} onChange={event => setSize(Number(event.target.value) || undefined)}>
        <option value="">운영 규격</option>
        {sizes.map(value => <option key={value} value={value}>{value}px</option>)}
      </select></label>
      <label>색상<select value={tone} onChange={event => setTone(event.target.value as Tone)}>
        {Object.entries(tones).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
      </select></label>
    </div>
    <section className={styles.states} aria-label="운영 조작과 상태">
      <h2>운영 조작과 상태</h2>
      <Button aria-pressed={active} onClick={() => setActive(value => !value)}>활성·대기 상태</Button>
      <div className={styles.controls}>
        <span><NavigationIcon tab="home" active={active} /> 홈 {active ? '선택' : '미선택'}</span>
        <span><NavigationIcon tab="history" active={active} /> 기록 {active ? '선택' : '미선택'}</span>
        <span><FeedbackIcon name={active ? 'syncing' : 'check'} size={10} spinning={active} /> 운동 저장 10px</span>
        <span><FeedbackIcon name="info" size={24} /> Dialog 24px</span>
        <span><DeloadMoon /> 디로딩 달 24px</span>
        <StatusText kind={active ? 'online' : 'offline'} label={active ? '온라인' : '오프라인'} />
        <CircleCheck label="세트 완료 표시" checked={active} onClick={() => setActive(value => !value)} />
        <Button loading={active} onClick={() => setActive(true)}>버튼 저장 상태</Button>
        <RefreshButton loading={active} onRefresh={() => setActive(true)} />
        <div className={styles.search}>
          <Button className={styles.searchTarget} aria-label={clearing ? '검색어 지우기' : '검색 목록 열기'}
            shape="control" variant="quiet" onClick={() => setClearing(value => !value)}>
            <Icon icon={clearing ? searchClear : searchOpen} />
          </Button>
          <small>검색 18px · 조작 42×42px</small>
        </div>
      </div>
      <SelectDropdown label="목록 표시" value={option} options={[{ id: 'wide', name: '가로 보기' }, { id: 'tall', name: '세로 보기' }]} onChange={setOption} />
    </section>
    {groups.map(([group, icons]) => <section className={styles.section} key={group}>
      <h2>{group}</h2>
      <ul className={styles.icons} data-tone={tone}>
        {Object.entries(icons).map(([name, icon]) => <li data-catalog-icon={name} key={name}>
          <Icon icon={icon} size={size} />
          <strong>{name}</strong>
          <small>{icon.width ?? 20} × {icon.height ?? icon.width ?? 20}px · 선 {icon.strokeWidth ?? 2}{name === 'upload' ? ' · Preview' : ''}</small>
        </li>)}
      </ul>
    </section>)}
    <section className={styles.section}>
      <h2>기존 문자 표기</h2>
      <ul className={styles.icons} data-tone={tone}>
        {Object.entries(iconGlyphs).map(([name, glyph]) => <li key={name}><span aria-hidden="true">{glyph}</span><strong>{name}</strong></li>)}
      </ul>
    </section>
  </AppShell>
}
