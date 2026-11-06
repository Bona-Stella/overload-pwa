import { useEffect, useId, useRef, useState } from 'react';
import { routineTags } from '../home/tags.ts';
import type { RoutineTag } from '../home/tags.ts';
import styles from './Routine.module.css';
const tagDescriptions = ['가슴·어깨·삼두 중심의 밀기 운동', '등·이두 중심의 당기기 운동', '다리 근육을 집중적으로 훈련하는 루틴', '신체 전면 근육 중심', '신체 후면 근육 중심', '상체와 하체를 고르게 구성하는 전신 루틴', '상·하체 분할에서 상체 전반을 담당', '상·하체 분할에서 하체 전반을 담당', '유산소 운동 중심', '특정 부위나 분할에 얽매이지 않은 자유 구성'];
export function TagPicker({ value, onChange, readOnly = false }: {
    value: RoutineTag | '';
    onChange: (value: RoutineTag | '') => void;
    readOnly?: boolean;
}) {
    const id = useId(), [open,setOpen] = useState(false), root=useRef<HTMLDivElement>(null), trigger=useRef<HTMLButtonElement>(null);
    useEffect(()=>{
      if(!open)return;
      const outside=(event:PointerEvent)=>{if(event.target instanceof Node&&!root.current?.contains(event.target))setOpen(false)};
      document.addEventListener('pointerdown',outside,true);
      return()=>document.removeEventListener('pointerdown',outside,true);
    },[open]);
    return <div className={styles.tagField} ref={root} onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget))setOpen(false)}} onKeyDown={event=>{
      if(event.key==='Escape'){event.preventDefault();setOpen(false);trigger.current?.focus()}
      if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)&&!readOnly){
        event.preventDefault();setOpen(true);
        requestAnimationFrame(()=>{const buttons=[...(root.current?.querySelectorAll<HTMLButtonElement>('[role="option"]')??[])],index=buttons.indexOf(document.activeElement as HTMLButtonElement);buttons[event.key==='Home'?0:event.key==='End'?buttons.length-1:index<0?(event.key==='ArrowUp'?buttons.length-1:0):(index+(event.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length]?.focus()})
      }
    }}><label className={styles.identityField} htmlFor={id}>루틴 태그 · 선택<button id={id} ref={trigger} type="button" className={styles.tagTrigger} aria-label="루틴 태그" aria-haspopup="listbox" aria-expanded={open} aria-controls={id+'-options'} data-value={value} disabled={readOnly} onClick={()=>setOpen(current=>!current)}><span>{value||'미지정'}</span><span aria-hidden="true">▾</span></button></label>
      {open&&<div id={id+'-options'} className={styles.tagOptions} role="listbox" aria-label="루틴 태그 선택">{(['',...routineTags] as (RoutineTag|'')[]).map(tag=><button type="button" role="option" key={tag} aria-selected={value===tag} onClick={()=>{onChange(tag);setOpen(false);trigger.current?.focus()}}><strong>{tag||'미지정'}</strong><small>{tag?tagDescriptions[routineTags.indexOf(tag)]:'분류 태그 없이 루틴 이름 사용'}</small></button>)}</div>}
    </div>;
}
