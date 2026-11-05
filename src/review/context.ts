import { createContext } from 'react'
import type { ReactNode } from 'react'

/** Presentation only. No session, authorization, plan or statistics fields. */
export const HomeReviewContext = createContext<{ header: ReactNode } | null>(null)
