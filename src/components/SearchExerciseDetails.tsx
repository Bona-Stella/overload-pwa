import {useCallback,useLayoutEffect,useRef} from 'react'
import type {ReactNode} from 'react'
import {CatalogDetail} from '../features/workout-online/PublicCatalog.tsx'
import type {CatalogBrowseExercise} from '../features/workout-online/catalog-browse.ts'
import {catalogDetailView} from '../features/workout-online/catalog-browse.ts'
import type {WorkoutApi} from '../features/workout-online/api.ts'
import {useScreenHistory} from '../app/navigation.ts'
import {SearchDetailContext as Context} from './search-detail-context.ts'

/** Navigate to the catalog's existing full detail page, retaining the underlying filter screen. */
export function SearchExerciseDetails({children,api,userId,preview=[]}:{children:ReactNode;api?:WorkoutApi;userId?:string;preview?:CatalogBrowseExercise[]}){
 const [selected,setSelected]=useScreenHistory<{id:string;name:string}|null>('exercise-detail:'+(userId??'preview'),null)
 const heading=useRef<HTMLHeadingElement>(null),origin=useRef<HTMLElement|null>(null),scroll=useRef(0)
 useLayoutEffect(()=>{if(selected){heading.current?.focus({preventScroll:true});window.scrollTo(0,0)}else if(origin.current){if(origin.current.isConnected)origin.current.focus({preventScroll:true});window.scrollTo(0,scroll.current)}},[selected])
 const loadDetail=useCallback(async(id:string,signal:AbortSignal)=>catalogDetailView(await api!.exerciseDetail(userId!,id,signal)),[api,userId])
 const sample=selected?preview.find(e=>e.id===selected.id||e.name===selected.name):undefined
 const seed:CatalogBrowseExercise=sample??{id:selected?.id??'',name:selected?.name??'',aliases:[],exerciseType:'WEIGHT',recordMethod:'SETS_REPS',instructionsKo:null,equipmentDescription:null}
 return <Context value={option=>{if(!option.exerciseId)return;origin.current=document.activeElement instanceof HTMLElement?document.activeElement:null;scroll.current=window.scrollY;setSelected({id:option.exerciseId,name:option.name})}}>
  <div data-exercise-detail-source hidden={!!selected} style={selected?undefined:{display:'contents'}}>{children}</div>
  {selected&&<CatalogDetail exercise={seed} headingRef={heading} onBack={()=>{if(window.history.state?.overloadNavigation?.index>0)window.history.back();else setSelected(null,true)}} loadDetail={api&&userId?loadDetail:undefined}/>}
 </Context>
}
