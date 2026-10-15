// Plano preliminar de corte por guilhotina (prateleiras livres).
// Separa espessuras; respeita sentido do veio quando grainLocked=true.
// Não substitui conferência de esquadro, refilo, espessura do disco e plano CNC.
export function planCutting(parts,{sheetWidth=2750,sheetHeight=1850,kerf=3,margin=10,grainLocked=true}={}){
 const W=Number(sheetWidth),H=Number(sheetHeight),K=Number(kerf),M=Number(margin);
 if(![W,H,K,M].every(Number.isFinite)||W<=2*M||H<=2*M||K<0||M<0)throw Error('Dimensões da chapa, refilo ou serra inválidas.');
 const groups=new Map(),unplaced=[];
 for(const p of parts){
  const thick=Number(p.thickness),count=Number(p.qty);
  if(!Number.isInteger(count)||count<0||count>500||!Number.isFinite(thick))throw Error('Quantidade ou espessura inválida.');
  if(!groups.has(thick))groups.set(thick,[]);
  for(let i=0;i<count;i++)groups.get(thick).push({name:p.name,width:Number(p.width),height:Number(p.height),thickness:thick});
 }
 const sheets=[];
 for(const [thickness,items] of groups){
  items.sort((a,b)=>Math.max(b.width,b.height)-Math.max(a.width,a.height)||b.width*b.height-a.width*a.height);
  const local=[];
  for(const item of items){
   if(!(item.width>0&&item.height>0)){unplaced.push({...item,reason:'Dimensões inválidas'});continue}
   let best=null;
   for(const sheet of local)for(let i=0;i<sheet.free.length;i++){
    const space=sheet.free[i];
    for(const rotated of (grainLocked?[false]:[false,true])){
     const w=rotated?item.height:item.width,h=rotated?item.width:item.height;
     if(w<=space.w+.00001&&h<=space.h+.00001){
      const score=(space.w-w)*(space.h-h);
      if(!best||score<best.score)best={sheet,i,w,h,rotated,score};
     }
    }
   }
   if(!best){
    const sheet={thickness,width:W,height:H,free:[{x:M,y:M,w:W-2*M,h:H-2*M}],pieces:[]};
    local.push(sheet);
    for(const rotated of (grainLocked?[false]:[false,true])){
     const w=rotated?item.height:item.width,h=rotated?item.width:item.height;
     if(w<=W-2*M&&h<=H-2*M){best={sheet,i:0,w,h,rotated,score:0};break}
    }
   }
   if(!best){unplaced.push({...item,reason:'Peça maior que a área útil da chapa'});if(local.at(-1).pieces.length===0)local.pop();continue}
   const {sheet,i,w,h,rotated}=best,space=sheet.free.splice(i,1)[0];
   sheet.pieces.push({...item,x:space.x,y:space.y,w,h,rotated});
   // Corte guilhotinado: divide o espaço restante em duas áreas sem sobreposição.
   const remW=space.w-w-K,remH=space.h-h-K;
   if(remW>0)sheet.free.push({x:space.x+w+K,y:space.y,w:remW,h:space.h});
   if(remH>0)sheet.free.push({x:space.x,y:space.y+h+K,w,h:remH});
  }
  sheets.push(...local);
 }
 return {sheets,unplaced,byThickness:[...new Set(sheets.map(s=>s.thickness))].map(thickness=>({thickness,quantity:sheets.filter(s=>s.thickness===thickness).length})),grainLocked,kerf:K,margin:M};
}
