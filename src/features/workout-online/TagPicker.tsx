import { useId, useRef } from 'react';
import { routineTags } from '../home/tags.ts';
import type { RoutineTag } from '../home/tags.ts';
import styles from './Routine.module.css';
const tagDescriptions = ['가슴·어깨·삼두 중심의 밀기 운동', '등·이두 중심의 당기기 운동', '다리 근육을 집중적으로 훈련하는 루틴', '신체 전면 근육 중심', '신체 후면 근육 중심', '상체와 하체를 고르게 구성하는 전신 루틴', '상·하체 분할에서 상체 전반을 담당', '상·하체 분할에서 하체 전반을 담당', '유산소 운동 중심', '특정 부위나 분할에 얽매이지 않은 자유 구성'];
export function TagPicker({ value, onChange }: {
    value: RoutineTag | '';
    onChange: (value: RoutineTag | '') => void;
}) {
    const id = useId(), ref = useRef<HTMLDetailsElement>(null);
    return <div><span id={id}>루틴 태그 · 선택</span><details ref={ref} className={styles.tagPicker} onKeyDown={e => { if (e.key === 'Escape') {
        e.preventDefault();
        ref.current!.open = false;
        ref.current?.querySelector('summary')?.focus();
    } if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) {
        const buttons = [...e.currentTarget.querySelectorAll('button')], index = buttons.indexOf(document.activeElement as HTMLButtonElement);
        e.preventDefault();
        buttons[e.key === 'Home' ? 0 : e.key === 'End' ? buttons.length - 1 : index < 0 ? (e.key === 'ArrowDown' ? 0 : buttons.length - 1) : (index + (e.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length]?.focus();
    } }}>
    <summary aria-labelledby={id + ' ' + id + '-value'}><span id={id + '-value'}>{value || '미지정'}</span></summary><ul>{([...routineTags, ''] as (RoutineTag | '')[]).map((tag, i) => <li key={tag}><button type="button" aria-pressed={value === tag} onClick={() => { onChange(tag); ref.current!.open = false; ref.current?.querySelector('summary')?.focus(); }}><strong>{tag || '미지정'}</strong><small>{tag ? tagDescriptions[i] : '분류 태그 없이 루틴 이름 사용'}</small></button></li>)}</ul>
  </details></div>;
}
