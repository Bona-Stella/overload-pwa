/** Record cards and details use the persisted workout START instant. */
export function recordTime(startedAt:string|null|undefined,timeZone:string,date:string){
 if(!startedAt)return date+' · 시각 미확인'
 const parts=new Intl.DateTimeFormat('ko-KR',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',weekday:'long',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(startedAt))
 const p=(type:string)=>parts.find(p=>p.type===type)!.value
 return p('year')+'-'+p('month')+'-'+p('day')+' · '+p('weekday')+' · '+p('hour')+':'+p('minute')
}

export function compactRecordTime(value:string){return value.replace(/^\d{4}-(\d{2})-(\d{2}) · ([월화수목금토일])요일 · /,'$1/$2 · $3 · ')}

export function homeRecordTime(startedAt:string|null|undefined,timeZone:string,date:string){return recordTime(startedAt,timeZone,date).replace(/^\d{4}-(\d{2})-(\d{2}) · ([월화수목금토일])요일 · (\d{2}):\d{2}$/,(_,month,day,weekday,hour)=>month+'.'+day+' '+weekday+' '+Number(hour)+'시')}
