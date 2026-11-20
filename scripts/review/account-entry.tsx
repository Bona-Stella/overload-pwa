import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../../src/index.css'
import ReviewApp from './ReviewApp.tsx'

createRoot(document.getElementById('root')!).render(<StrictMode><ReviewApp /></StrictMode>)
