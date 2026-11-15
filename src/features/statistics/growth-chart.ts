import type { GrowthPoint } from './growth.ts'
const amount=(text:string)=>{const [a,b='']=text.split('.');return BigInt(a)*1000000n+BigInt(b.padEnd(6,'0'))}
export function growthChartData(points:GrowthPoint[],zone:string){
  const fraction=(text:string)=>(text.match(/\.(\d+)/)?.[1]??'').padEnd(9,'0')
  const ordered=points.toSorted((a,b)=>Date.parse(a.occurredAt)-Date.parse(b.occurredAt)||fraction(a.occurredAt).localeCompare(fraction(b.occurredAt))||a.id.localeCompare(b.id))
  return ordered.map((p,i)=>({id:p.id,timestamp:Date.parse(p.occurredAt),label:new Intl.DateTimeFormat('ko-KR',{month:'numeric',day:'numeric',timeZone:zone}).format(new Date(p.occurredAt)),value:p.approvedWeightKg,connect:i>0&&p.connectFromPrevious&&p.previousPointId===ordered[i-1].id&&amount(p.previousWeightKg)===amount(ordered[i-1].approvedWeightKg)}))
}
