import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import RoutinePreview from './RoutinePreview.tsx'
import '../../../src/index.css'
import '../../../src/App.css'

const pages = {
  '/rest-audio-preview': lazy(() => import('./RestAudioPreview.tsx')),
  '/common-ui-preview': lazy(() => import('./CommonUiPreview.tsx')),
  '/common-ui-preview.html': lazy(() => import('./CommonUiPreview.tsx')),
  '/ui-foundation': lazy(() => import('./FoundationPreview.tsx')),
}
const Page = pages[location.pathname as keyof typeof pages] ?? RoutinePreview

createRoot(document.getElementById('root')!).render(<StrictMode>
  <Suspense fallback={<p role="status">검증 화면을 준비하는 중입니다.</p>}><Page /></Suspense>
</StrictMode>)
