import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import RoutinePreview from './RoutinePreview.tsx'
import '../index.css'
import '../App.css'

const CommonUiPreview = window.location.pathname.replace(/\/$/, '') === '/common-ui-preview'
  ? lazy(() => import('./CommonUiPreview.tsx'))
  : null

createRoot(document.getElementById('root')!).render(<StrictMode>
  {CommonUiPreview ? <Suspense fallback={<p>공통 UI 검토 준비 중…</p>}><CommonUiPreview /></Suspense> : <RoutinePreview />}
</StrictMode>)
