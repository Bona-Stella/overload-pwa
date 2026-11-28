export function durationParts(seconds: string) {
  if(!/^\d+(\.\d{1,3})?$/.test(seconds))throw Error('유효한 수행 시간을 확인해 주세요.')
  const [whole,fraction='']=seconds.split('.'),ms=BigInt(whole)*1000n+BigInt(fraction.padEnd(3,'0'))
  return {hours:String(ms/3600000n),minutes:String(ms%3600000n/60000n),seconds:decimalSeconds(ms%60000n)}
}
const decimalSeconds=(ms:bigint)=>String(ms/1000n)+(ms%1000n?'.'+String(ms%1000n).padStart(3,'0').replace(/0+$/,''):'')
export function durationSeconds(parts:ReturnType<typeof durationParts>) {
  if(!/^\d+$/.test(parts.hours)||!/^\d+$/.test(parts.minutes)||!/^\d+(\.\d{1,3})?$/.test(parts.seconds))throw Error('시간·분·초를 확인해 주세요.')
  const [whole,fraction='']=parts.seconds.split('.')
  const ms=(BigInt(parts.hours)*3600n+BigInt(parts.minutes)*60n+BigInt(whole))*1000n+BigInt(fraction.padEnd(3,'0'))
  if(Number(parts.hours)>24||Number(parts.minutes)>59||Number(parts.seconds)>=60||ms>86400000n)throw Error('시간은 0~24, 분·초는 0~59 범위이며 전체 시간은 24시간 이하여야 합니다.')
  return decimalSeconds(ms)
}

/** Display only: round once before splitting units; never change stored measurements. */
export function roundedDurationMs(milliseconds: number | string) {
  const ms=typeof milliseconds==='string'?BigInt(milliseconds):BigInt(Math.max(0,Math.round(milliseconds)))
  return (ms+500n)/1000n
}
export function durationLabel(milliseconds: number | string) {
  const seconds=roundedDurationMs(milliseconds),hours=seconds/3600n,minutes=seconds%3600n/60n,remainder=seconds%60n
  return [hours?hours+'시간':'',minutes?minutes+'분':'',remainder||!hours&&!minutes?remainder+'초':''].filter(Boolean).join(' ')
}

export function durationMinutesLabel(milliseconds:number|string){const minutes=roundedDurationMs(milliseconds)/60n,hours=minutes/60n;return (hours?hours+'시간 ':'')+(minutes%60n)+'분'}

export function compactDuration(milliseconds: number | string) {
  const seconds = roundedDurationMs(milliseconds)
  const hours = seconds / 3600n
  const minutes = String(seconds % 3600n / 60n).padStart(2, '0')
  const remainder = String(seconds % 60n).padStart(2, '0')
  return (hours ? hours + ':' : '') + minutes + ':' + remainder
}
