import {createContext,useContext} from 'react'
import type {SearchOption} from './SearchList.tsx'
export const SearchDetailContext=createContext<((option:SearchOption)=>void)|null>(null)
export const useExerciseDetails=()=>useContext(SearchDetailContext)
