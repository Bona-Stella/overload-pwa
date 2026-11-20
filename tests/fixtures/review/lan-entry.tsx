import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../../../src/index.css'
import '../../../src/App.css'
import RoutinePreview from './RoutinePreview.tsx'

createRoot(document.getElementById('root')!).render(<StrictMode>
  <RoutinePreview defaultScenario="workout-cardio" defaultTab="home" />
</StrictMode>)
