import {useEffect,useId,useRef,useState} from 'react'
import type {MouseEvent,ReactNode} from 'react'
import styles from '../features/workout-online/PublicCatalog.module.css'
import searchStyles from './SearchList.module.css'
import {useExerciseDetails} from './search-detail-context.ts'
export type SearchTags={label:string;options:{id:string;name:string}[];selected:string;onSelect:(id:string)=>void}
export type SearchOption={id:string;name:string;description:string;icon?:ReactNode;exerciseId?:string}
export function SearchResults({options,onSelect,onDetail,disabled=false,label='검색 결과'}:{onDetail?:(id:string,event:MouseEvent<HTMLButtonElement>)=>void;options:SearchOption[];onSelect:(id:string,event:MouseEvent<HTMLButtonElement>)=>void;disabled?:boolean;label?:string}){
 const detail=useExerciseDetails()
 return <ul role="list" aria-label={label} className={styles.results+' '+searchStyles.results}>{options.map(o=><li key={o.id}>
  <button type="button" className={styles.result} disabled={disabled} onClick={e=>onSelect(o.id,e)}>{o.icon}<span className={styles.resultText}><strong>{o.name}</strong><small className="muted">{o.description}</small></span></button>
  {o.exerciseId&&<button type="button" className={searchStyles.detail} aria-label={o.name+' 상세 보기'} disabled={disabled||!detail&&!onDetail} onClick={e=>onDetail?onDetail(o.id,e):detail?.(o)}><span aria-hidden="true">›</span></button>}
 </li>)}</ul>
}
export function SearchList({scopes=[],scope='exercise',onScope,tags,onDetail,query,onQuery,options,onSelect,selected,onClear,disabled,issue,resultsFooter,onCloseSearch,onSearchOpenChange,autoFocus=false,defaultOpen=false,closeOnSelect=true,resultsLabel='검색 결과',label='이름 검색'}:{
 scopes?:{id:string;name:string}[];scope?:string;onScope?:(value:string)=>void;tags?:SearchTags;onDetail?:(id:string,event:MouseEvent<HTMLButtonElement>)=>void;query:string;onQuery:(value:string)=>void;options:SearchOption[];onSelect:(id:string,event:MouseEvent<HTMLButtonElement>)=>void;selected?:string;onClear:()=>void;disabled?:boolean;issue?:string;resultsFooter?:ReactNode;onCloseSearch?:()=>void;onSearchOpenChange?:(open:boolean)=>void;autoFocus?:boolean;defaultOpen?:boolean;closeOnSelect?:boolean;resultsLabel?:string;label?:string
}){
 const [state,setState]=useState<{mode:'IDLE'|'EDITING'|'SELECTED';hideScope:boolean}>(()=>({mode:autoFocus||defaultOpen?'EDITING':selected?'SELECTED':'IDLE',hideScope:autoFocus}))
 const mode=state.mode==='SELECTED'&&!selected?'IDLE':state.mode,open=mode==='EDITING',id=useId(),region=useRef<HTMLDivElement>(null)
 useEffect(()=>{onSearchOpenChange?.(open)},[open,onSearchOpenChange])
 const edit=()=>{if(mode!=='EDITING')onQuery(selected??query);setState({mode:'EDITING',hideScope:true})}
 const close=()=>{setState({mode:selected?'SELECTED':'IDLE',hideScope:false});onCloseSearch?.()}
 useEffect(()=>{if(!open)return;const outside=(e:PointerEvent)=>{if(!region.current?.getClientRects().length)return;if(e.target instanceof Node&&!region.current?.contains(e.target)){setState({mode:selected?'SELECTED':'IDLE',hideScope:false});onCloseSearch?.()}};document.addEventListener('pointerdown',outside);return()=>document.removeEventListener('pointerdown',outside)},[open,selected,onCloseSearch])
 const action=()=>{
  if(mode==='SELECTED'||mode==='EDITING'&&!query){onClear();setState({mode:'IDLE',hideScope:false});region.current?.querySelector('input')?.blur();return}
  if(mode==='EDITING'){onQuery('');region.current?.querySelector('input')?.focus();return}
  edit();region.current?.querySelector('input')?.focus()
 }
 const actionLabel=mode==='SELECTED'?'선택 해제':mode==='EDITING'?query?'검색어 지우기':'검색 닫기':'검색 목록 열기'
 return <div className={'record-search '+searchStyles.search} data-search-state={mode} ref={region} onKeyDown={e=>{
  if(e.nativeEvent.isComposing)return
  if(e.key==='Escape'){e.preventDefault();close();region.current?.querySelector<HTMLButtonElement>('.search-disclosure')?.focus()}
  if(e.key==='Enter'&&e.target instanceof HTMLInputElement)e.preventDefault()
  if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){
   const buttons=[...(region.current?.querySelectorAll<HTMLButtonElement>('li button:not(:disabled)')??[])],at=buttons.indexOf(document.activeElement as HTMLButtonElement)
   if(!buttons.length||at<0&&['Home','End'].includes(e.key))return
   e.preventDefault();buttons[e.key==='Home'?0:e.key==='End'?buttons.length-1:(at+(e.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length]?.focus()
  }
 }}>
  <div className={'record-search-inputs '+searchStyles.controls} data-expanded={state.hideScope||scopes.length<=1?true:undefined}>
   {scopes.length>1&&<label hidden={state.hideScope}><span className="sr-only">검색 범위</span><select aria-label="검색 범위" value={scope} disabled={disabled} onFocus={()=>setState({mode:'EDITING',hideScope:false})} onPointerDown={()=>setState({mode:'EDITING',hideScope:false})} onChange={e=>{onScope?.(e.target.value);setState({mode:'EDITING',hideScope:false})}}>{scopes.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>}
   <div className="search-input-wrap"><label htmlFor={id}><span className="sr-only">{label}</span><input id={id} type="search" placeholder={label} autoComplete="off" autoFocus={autoFocus} value={mode==='SELECTED'?selected??query:query} disabled={disabled} onFocus={edit} onPointerDown={edit} onClick={edit} onChange={e=>{setState({mode:'EDITING',hideScope:true});onQuery(e.target.value)}}/></label></div>
   <button type="button" className={'quiet search-disclosure '+searchStyles.disclosure} disabled={disabled} aria-label={actionLabel} aria-expanded={open} onPointerDown={e=>{e.preventDefault();e.currentTarget.blur()}} onClick={action}>
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">{mode==='IDLE'?<><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/></>:<path d="m6 6 12 12M18 6 6 18"/>}</svg>
   </button>
  </div>
  {tags&&open&&<div className={styles.filters}><p className={styles.filterLabel}>{tags.label}</p><div className={styles.filterStrip} role="group" aria-label={tags.label+' 필터'}>{tags.options.map(tag=><button type="button" key={tag.id} disabled={disabled} aria-pressed={tags.selected===tag.id} onClick={()=>{tags.onSelect(tag.id);setState({mode:'EDITING',hideScope:false})}}><span>{tag.name}</span></button>)}</div></div>}
  {issue?<p className="notice" role="status">{issue}</p>:open&&<><SearchResults onDetail={onDetail} options={options} label={resultsLabel} disabled={disabled} onSelect={(id,event)=>{onSelect(id,event);if(closeOnSelect)setState({mode:'SELECTED',hideScope:false})}}/>{!options.length&&<p role="status">검색 후보가 없습니다.</p>}{resultsFooter}</>}
 </div>
}
