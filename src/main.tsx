import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { AuthProvider } from './features/auth/AuthProvider'
import { AuthApp } from './features/auth/AuthApp'
import { returnFlow } from './features/auth/controller'
import { registerPwa } from './pwa/registration.ts'

if (import.meta.env.PROD) registerPwa()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider flow={returnFlow(window.location.pathname)}><AuthApp /></AuthProvider>
  </StrictMode>,
)
