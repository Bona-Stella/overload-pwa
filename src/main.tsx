import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { lazy, Suspense } from 'react'
import './index.css'
import App from './App.tsx'

// The branch is removed by Vite in production; the preview never mounts useWorkout.
const AuthPreview = import.meta.env.DEV
  ? lazy(() => import('./features/auth-preview/AuthPreview'))
  : null
const previewPath = window.location.pathname.replace(/\/$/, '') === '/auth-preview'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {previewPath ? AuthPreview ? <Suspense fallback={<p>인증 UX 프리뷰를 여는 중…</p>}><AuthPreview /></Suspense> : <main className="page"><h1>개발 전용 프리뷰입니다</h1><a href="/">앱으로 돌아가기</a></main> : <App />}
  </StrictMode>,
)
