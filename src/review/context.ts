import { createContext } from 'react'

/** Enables only the HTTP review note for the isolated account workspace. */
export const HomeReviewContext = createContext(false)
export const ReviewExerciseMediaContext = createContext<Readonly<Record<string, string>> | undefined>(undefined)
