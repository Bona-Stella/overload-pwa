import { NumberWheel } from './NumberWheel.tsx'
import { durationParts, durationSeconds, roundedDurationMs } from './duration.ts'

/** The correction dialog keeps its existing seconds draft and save contract. */
export function DurationWheel({ seconds,onChange,disabled }: {seconds:string;onChange:(seconds:string)=>void;disabled?:boolean}) {
  const parts=durationParts(String(roundedDurationMs(Math.round(Number(seconds)*1000))))
  return <div className="duration-wheels" role="group" aria-label="실제 활동 시간">{([['hours','시간',24],['minutes','분',59],['seconds','초',59]] as const).map(([key,unit,max])=>{
    const validate=(value:string)=>{
      if(!(/^\d+$/).test(value)||Number(value)>max)throw Error(unit+' 범위를 확인해 주세요.')
      return value
    }
    return <div key={key}><span>{unit}</span><NumberWheel label={'실제 활동 '+unit} value={parts[key]} disabled={disabled} unit={unit} start="0" hideSteps validate={validate}
      adjust={(value,direction)=>{const next=Number(value)+direction;return next>=0&&next<=max?String(Math.round(next*1000)/1000):null}}
      onChange={value=>onChange(durationSeconds({...parts,[key]:value}))}/></div>
  })}</div>
}
