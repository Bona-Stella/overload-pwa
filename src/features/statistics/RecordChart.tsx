import { Bar, BarChart, CartesianGrid, LabelList, Line, LineChart, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useState } from 'react'

export type RecordChartPoint = { id: string; label: string; value: string | null; connect?: boolean; timestamp?: number }

/** Shared rendering only. Original decimal strings remain the source for labels and tooltips. */
export function RecordChart({ data, kind = 'bar', unit, label, maximum, guide, compact = false, timeZone }: {
  data: RecordChartPoint[]; kind?: 'bar' | 'line' | 'horizontal'; unit: string; label: string; maximum?: number; guide?: number; compact?: boolean; timeZone?: string
}) {
  const [pointerFocus,setPointerFocus]=useState(false)
  const points = data.map(point => ({ ...point, raw:point.value, plot:point.value===null?null:maximum===undefined?Number(point.value):Math.min(maximum,Number(point.value)) }))
  const segments: Record<string, number | null>[] = points.map(()=>({}))
  let run = 0, active = false
  for(let i=1;i<points.length;i++){
    if(!points[i].connect||points[i].plot===null||points[i-1].plot===null){active=false;continue}
    if(!active)run++
    active=true
    segments[i-1]['segment'+run]=points[i-1].plot
    segments[i]['segment'+run]=points[i].plot
  }
  const chartData=points.map((p,i)=>({...p,...segments[i]}))
  const tick=(value:number)=>value.toLocaleString('ko-KR',{notation:Math.abs(value)>=10000?'compact':'standard',maximumFractionDigits:1})
  const axis={stroke:'var(--text-muted)',tick:{fill:'var(--text-muted)',fontSize:10},tickLine:false,axisLine:{stroke:'var(--border-subtle)'}}
  // A single gauge needs a track even at exactly zero. Recharts omits zero rectangles,
  // including their backgrounds; a fixed-height track also avoids per-row size observers.
  if(compact&&kind==='horizontal')return <div className="record-chart record-chart-compact" role="img" aria-label={label} data-chart-kind={kind}>
    {points.map(p=>{const max=Math.max(1,maximum??Number(p.raw??0)),percent=(v:number)=>Math.max(0,Math.min(100,v/max*100));return <div key={p.id} className="record-gauge" data-guide={guide!==undefined?true:undefined} title={p.label+' · '+(p.raw===null?'확인 불가':p.raw+unit)}>
      <div className="record-gauge-track"><i className="record-gauge-fill" style={{width:percent(Number(p.raw??0))+'%'}} /></div>
      {guide!==undefined&&<span aria-hidden="true" className="record-gauge-guide" style={{left:percent(guide)+'%'}}>▼</span>}
    </div>})}
    <ul className="sr-only" aria-label={label+' 수치'}>{data.map(p=><li key={p.id}>{p.label}: {p.value===null?'확인 불가':p.value+unit}{guide!==undefined?' · ▼ 권장 시작점 '+guide+unit:''}</li>)}</ul>
  </div>
  return <div className={'record-chart'+(compact?' record-chart-compact':'')} role="img" aria-label={label} data-chart-kind={kind} data-pointer-focus={pointerFocus||undefined} onPointerDownCapture={()=>setPointerFocus(true)} onKeyDownCapture={()=>setPointerFocus(false)} onBlurCapture={event=>{if(!(event.relatedTarget instanceof Node)||!event.currentTarget.contains(event.relatedTarget))setPointerFocus(false)}}>
    <div className="record-chart-canvas" style={{height:compact?guide===undefined?20:36:220,minWidth:0}}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        {kind==='line'?<LineChart data={chartData} margin={{top:14,right:18,bottom:4,left:0}}>
          <CartesianGrid stroke="var(--border-subtle)" strokeDasharray="3 3" vertical={false}/><XAxis {...axis} dataKey={points.some(p=>p.timestamp!==undefined)?"timestamp":"label"} type={points.some(p=>p.timestamp!==undefined)?"number":"category"} scale={points.some(p=>p.timestamp!==undefined)?"time":"auto"} domain={['dataMin','dataMax']} minTickGap={26} tickFormatter={points.some(p=>p.timestamp!==undefined)?value=>new Intl.DateTimeFormat('ko-KR',{month:'numeric',day:'numeric',timeZone}).format(new Date(value)):undefined}/><YAxis {...axis} width={44} tickFormatter={tick} domain={['auto','auto']}/>
          <Tooltip content={({active,payload})=>active&&payload?.length?<div className="record-chart-tooltip">{payload[0].payload.label} · {payload[0].payload.raw}{unit}</div>:null}/>
          {Array.from({length:run},(_,i)=><Line key={i} type="linear" dataKey={'segment'+(i+1)} stroke="var(--chart-primary)" strokeWidth={2} dot={false} activeDot={false} isAnimationActive={false} connectNulls={false}/>)}
          <Line type="linear" dataKey="plot" stroke="none" dot={{r:4,fill:'var(--surface-card)',stroke:'var(--chart-primary)',strokeWidth:2}} activeDot={{r:5}} isAnimationActive={false} connectNulls={false}/>
        </LineChart>:<BarChart data={chartData} layout={kind==='horizontal'?'vertical':'horizontal'} margin={compact?{top:guide===undefined?0:14,right:0,bottom:0,left:0}:{top:20,right:8,bottom:4,left:0}} barSize={kind==='horizontal'?8:22}>
          {!compact&&<CartesianGrid stroke="var(--border-subtle)" strokeDasharray="3 3" vertical={false}/>}
          <XAxis {...axis} hide={compact} type={kind==='horizontal'?'number':'category'} dataKey={kind==='horizontal'?undefined:'label'} domain={kind==='horizontal'?[0,maximum??'auto']:undefined} allowDataOverflow tickFormatter={kind==='horizontal'?tick:undefined}/>
          <YAxis {...axis} hide={compact} type={kind==='horizontal'?'category':'number'} dataKey={kind==='horizontal'?'label':undefined} width={kind==='horizontal'?90:44} tickFormatter={kind==='horizontal'?undefined:tick}/>
          <Tooltip cursor={{fill:'var(--accent-soft)'}} content={({active,payload})=>active&&payload?.length?<div className="record-chart-tooltip">{payload[0].payload.label} · {payload[0].payload.raw===null?'확인 불가':payload[0].payload.raw+unit}</div>:null}/>
          <Bar radius={kind==='horizontal'?0:4} dataKey="plot" fill="var(--chart-primary)" background={compact?{fill:'var(--surface-input)'}:false} isAnimationActive={false}>{!compact&&<LabelList dataKey="raw" position="top" fill="var(--text-primary)" fontSize={10} formatter={value=>value===null?'?':String(value)}/>}</Bar>
          {guide!==undefined&&data.map(p=><ReferenceDot key={p.id} x={guide} y={p.label} r={0} label={{value:'▼',position:'top',fill:'var(--text-muted)',fontSize:10}}/>)}
        </BarChart>}
      </ResponsiveContainer>
    </div>
    {!compact&&data.some(p=>p.value===null)&&<p className="muted small">{data.filter(p=>p.value===null).map(p=>p.label).join(' · ')} · 확인 불가</p>}
    <ul className="sr-only" aria-label={label+' 수치'}>{data.map(p=><li key={p.id}>{p.label}: {p.value===null?'확인 불가':p.value+unit}{guide!==undefined?' · ▼ 권장 시작점 '+guide+unit:''}</li>)}</ul>
  </div>
}
