import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { lazy, Suspense } from 'react'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './features/auth/AuthProvider'
import { AuthApp } from './features/auth/AuthApp'
import { returnFlow } from './features/auth/controller'
import { registerPwa } from './pwa/registration.ts'

if (import.meta.env.PROD) registerPwa()

// The branch is removed by Vite in production; the preview never mounts useWorkout.
const AuthPreview = import.meta.env.DEV
  ? lazy(() => import('./features/auth-preview/AuthPreview'))
  : null
const previewPath = window.location.pathname.replace(/\/$/, '') === '/auth-preview'
const demoPath = import.meta.env.DEV && window.location.pathname.replace(/\/$/, '') === '/demo'
const FoundationPreview = import.meta.env.DEV ? lazy(() => import('./app/FoundationPreview.tsx')) : null
const foundationPath = import.meta.env.DEV && window.location.pathname.replace(/\/$/, '') === '/ui-foundation'
const RoutinePreview = import.meta.env.DEV ? lazy(()=>import('./review/RoutinePreview.tsx')) : null
const routinePreviewPath = import.meta.env.DEV && window.location.pathname.replace(/\/$/,'') === '/routine-preview'
const ReviewApp = import.meta.env.DEV && import.meta.env.VITE_HOME_REVIEW === 'true' ? lazy(() => import('./review/ReviewApp.tsx')) : null

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {routinePreviewPath && RoutinePreview ? <Suspense fallback={<p>루틴 UI 검토 준비 중…</p>}><RoutinePreview /></Suspense> : ReviewApp ? <Suspense fallback={<p>검토 환경을 여는 중…</p>}><ReviewApp /></Suspense> : foundationPath && FoundationPreview ? <Suspense fallback={<p>UI 기반 검증 화면을 여는 중…</p>}><FoundationPreview /></Suspense> : previewPath ? AuthPreview ? <Suspense fallback={<p>인증 UX 프리뷰를 여는 중…</p>}><AuthPreview /></Suspense> : <main className="page"><h1>개발 전용 프리뷰입니다</h1><a href="/">앱으로 돌아가기</a></main> : demoPath ? <><aside className="demo-banner">개발 데모 · 계정 데이터 아님 · 이 기기에만 저장 · 서버 전송 없음<br /><a href="/">로그인 화면으로</a></aside><App /></> : <AuthProvider flow={returnFlow(window.location.pathname)}><AuthApp /></AuthProvider>}
  </StrictMode>,
)
