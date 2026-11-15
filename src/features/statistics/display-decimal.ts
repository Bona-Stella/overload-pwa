/** Group and round decimal API strings without converting their integer part to Number. */
export function displayDecimal(value:string|number|null,digits=2):string {
 if(value===null)return '—'
 const [whole,part='']=String(value).split('.'),scale=10n**BigInt(digits)
 const rounded=BigInt(whole)*scale+BigInt(part.slice(0,digits).padEnd(digits,'0')||'0')+(Number(part[digits]??0)>=5?1n:0n)
 const fraction=(rounded%scale).toString().padStart(digits,'0').replace(/0+$/,'')
 return (rounded/scale).toLocaleString('ko-KR')+(fraction?'.'+fraction:'')
}
export function sumDecimals(values:(string|number)[]):string {
 const precision=Math.max(0,...values.map(v=>(String(v).split('.')[1]??'').length)),scale=10n**BigInt(precision)
 const total=values.reduce<bigint>((n,v)=>{const [a,b='']=String(v).split('.');return n+BigInt(a)*scale+BigInt(b.padEnd(precision,'0')||'0')},0n)
 const fraction=(total%scale).toString().padStart(precision,'0').replace(/0+$/,'')
 return (total/scale).toString()+(precision&&fraction?'.'+fraction:'')
}
