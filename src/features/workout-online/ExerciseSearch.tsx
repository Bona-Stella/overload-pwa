import { useMemo, useState } from 'react'
import type { MouseEvent } from 'react'
import type { CatalogExercise, StandardExercise } from './types.ts'
import { browseExercises, catalogGroups, catalogRowGroup, primaryMuscles } from './catalog-browse.ts'
import type { CatalogGroup } from './catalog-browse.ts'
import { ExerciseIcon } from '../../components/ExerciseIcon.tsx'
import {useExerciseDetails} from '../../components/search-detail-context.ts'
import { SearchList } from '../../components/SearchList.tsx'
import '../statistics/statistics.css'

type SearchExercise = StandardExercise & { exerciseType?: CatalogExercise['exerciseType'] }

/** Catalog matching and icons stay domain-specific; all search controls and rows are shared. */
export function ExerciseSearch<T extends SearchExercise>({ exercises, onSelect, disabled = false, autoFocus = false, onCancel, loading = false, failed = false, resetOnSelect = true,defaultOpen=false }: {
  exercises: T[]; onSelect: (exercise: T, event: MouseEvent<HTMLButtonElement>) => void; disabled?: boolean; autoFocus?: boolean; onCancel?: () => void
  loading?: boolean; failed?: boolean; resetOnSelect?: boolean;defaultOpen?:boolean
}) {
  const detail=useExerciseDetails()
  const [query,setQuery]=useState(''),[filter,setFilter]=useState<CatalogGroup|'ALL'>('ALL')
  const results=useMemo(()=>browseExercises(exercises,query,filter),[exercises,query,filter])
  return <div className="exercise-search" onKeyDown={e=>{if(e.key==='Escape'&&!e.nativeEvent.isComposing)onCancel?.()}}>
    <SearchList defaultOpen={defaultOpen} tags={{label:'운동 부위',options:[{id:'ALL',name:'전체'},...Object.entries(catalogGroups).map(([id,g])=>({id,name:g.label}))],selected:filter,onSelect:id=>setFilter(id as CatalogGroup|'ALL')}}
      onDetail={(id,event)=>{const exercise=results.find(e=>e.id===id);if(!exercise)return;if(!resetOnSelect)onSelect(exercise,event);else{onCancel?.();detail?.({id,exerciseId:id,name:exercise.name,description:''})}}}
      resultsLabel="표준 운동 목록" closeOnSelect={resetOnSelect} query={query} onQuery={setQuery} onClear={()=>{setQuery('');setFilter('ALL')}} disabled={disabled} autoFocus={autoFocus}
      label="표준 운동 검색 · 이름 또는 별칭" issue={failed?'운동 정보를 불러오지 못했습니다.':loading?'운동 정보를 불러오는 중입니다.':!exercises.length?'등록된 표준 운동이 없습니다. 카탈로그 등록 후 다시 조회해 주세요.':undefined}
      options={results.map(exercise=>{const first=primaryMuscles(exercise)[0],group=catalogGroups[catalogRowGroup(exercise,first)];return{id:exercise.id,exerciseId:exercise.id,name:exercise.name,description:group.label+' · '+(first?.name??'등록 정보 없음'),icon:<ExerciseIcon kind={group.icon}/>}})}
      onSelect={(id,event)=>{const exercise=results.find(e=>e.id===id);if(exercise)onSelect(exercise,event);if(resetOnSelect)setQuery('')}} />
  </div>
}
