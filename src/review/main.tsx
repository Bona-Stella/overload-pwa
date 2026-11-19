import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import RoutinePreview from './RoutinePreview.tsx'
import '../index.css'
import '../App.css'

if (import.meta.env.DEV) {
  const diagnostic = new URLSearchParams(location.search).get('keyboardDiagnostic')
  if (diagnostic === 'app' || diagnostic === 'native') {
    void import('./keyboardDiagnostics.ts').then(({ startKeyboardDiagnostics }) => startKeyboardDiagnostics(diagnostic))
  }
}

const CommonUiPreview = window.location.pathname.replace(/\/$/, '') === '/common-ui-preview'
  ? lazy(() => import('./CommonUiPreview.tsx'))
  : null
const RestAudioPreview = import.meta.env.DEV && window.location.pathname.replace(/\/$/, '') === '/rest-audio-preview'
  ? lazy(() => import('./RestAudioPreview.tsx'))
  : null

createRoot(document.getElementById('root')!).render(<StrictMode>
  {RestAudioPreview ? <Suspense fallback={<p>운동 검토 준비 중…</p>}><RestAudioPreview /></Suspense> :
    CommonUiPreview ? <Suspense fallback={<p>공통 UI 검토 준비 중…</p>}><CommonUiPreview /></Suspense> : <RoutinePreview />}
</StrictMode>)
