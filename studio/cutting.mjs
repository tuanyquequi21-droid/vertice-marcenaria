// Plano preliminar de corte por guilhotina (prateleiras livres).
// Separa espessuras; respeita sentido do veio quando grainLocked=true.
// Não substitui conferência de esquadro, refilo, espessura do disco e plano CNC.
export function planCutting(parts,{sheetWidth=2750,sheetHeight=1850,kerf=3,margin=10,grainLocked=true}={}){
 const W=Number(sheetWidth),H=Number(sheetHeight),K=Number(kerf),M=Number(margin);
 if(![W,H,K,M].every(Number.isFinite)||W<=2*M||H<=2*M||K<0||M<0||![W,H,K,M].every(v=>Math.abs(Math.round(v*100)-v*100)<.000001))throw Error('Dimensões da chapa, refilo ou serra inválidas.');
 const groups=new Map(),unplaced=[];
 for(const p of parts){
  const thick=Number(p.thickness),count=Number(p.qty);
  if(!Number.isInteger(count)||count<0||count>500||!Number.isFinite(thick))throw Error('Quantidade ou espessura inválida.');
  if(!groups.has(thick))groups.set(thick,[]);
  for(let i=0;i<count;i++)groups.get(thick).push({name:p.name,width:Number(p.width),height:Number(p.height),thickness:thick});
 }
 // MDF com veio no eixo de 2750 mm: o lado maior da peça acompanha o lado maior da chapa.
 // Rotação de 90° para colocar uma peça alta (ex.: lateral 550 × 2000) na chapa 2750 × 1850.
 // Sem travamento, ambas as orientações são testadas.
 const orientations=item=>grainLocked?[item.height>item.width]:[false,true];
 const sheets=[];
 for(const [thickness,items] of groups){
  items.sort((a,b)=>Math.max(b.width,b.height)-Math.max(a.width,a.height)||b.width*b.height-a.width*a.height);
  const local=[];
  for(const item of items){
   if(!(item.width>0&&item.height>0&&Number.isFinite(item.width)&&Number.isFinite(item.height))){unplaced.push({...item,reason:'Dimensões inválidas'});continue}
   let best=null;
   for(const sheet of local)for(let i=0;i<sheet.free.length;i++){
    const space=sheet.free[i];
    for(const rotated of orientations(item)){
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
    for(const rotated of orientations(item)){
     const w=rotated?item.height:item.width,h=rotated?item.width:item.height;
     if(w<=W-2*M&&h<=H-2*M){best={sheet,i:0,w,h,rotated,score:0};break}
    }
   }
   if(!best){
    const freeW=W-2*M,freeH=H-2*M;
    const possibleWithoutGrain=[false,true].some(rotated=>{
     const iw=rotated?item.height:item.width,ih=rotated?item.width:item.height;
     return iw<=freeW&&ih<=freeH;
    });
    const reason=grainLocked&&possibleWithoutGrain
     ?'Peça só cabe com orientação diferente do veio configurado'
     :'Peça excede a área útil de uma chapa inteira ('+freeW+' × '+freeH+' mm)';
    unplaced.push({...item,reason});
    if(local.at(-1)?.pieces.length===0)local.pop();
    continue;
   }
   const {sheet,i,w,h,rotated}=best,space=sheet.free.splice(i,1)[0];
   sheet.pieces.push({...item,x:space.x,y:space.y,w,h,rotated});
   // Corte guilhotinado: divide o espaço restante em duas áreas sem sobreposição.
   const remW=space.w-w-K,remH=space.h-h-K;
   if(remW>0)sheet.free.push({x:space.x+w+K,y:space.y,w:remW,h:space.h});
   if(remH>0)sheet.free.push({x:space.x,y:space.y+h+K,w,h:remH});
  }
  sheets.push(...local);
 }
 // Validação geométrica: limites, precisão das medidas e não sobreposição,
 // com espaço mínimo da serra entre todas as peças.
 const eps=.00001;
 for(const sheet of sheets){
  for(let i=0;i<sheet.pieces.length;i++){
   const a=sheet.pieces[i];
   if(a.x<M-eps||a.y<M-eps||a.x+a.w>W-M+eps||a.y+a.h>H-M+eps)
    throw Error('Plano inválido: peça fora da área útil ('+a.name+').');
   if(Math.abs(a.w-(a.rotated?a.height:a.width))>eps||Math.abs(a.h-(a.rotated?a.width:a.height))>eps)
    throw Error('Plano inválido: medida de peça alterada ('+a.name+').');
   if(grainLocked&&a.rotated!==(a.height>a.width))throw Error('Plano inválido: sentido do veio incorreto.');
   for(let j=0;j<i;j++){
    const b=sheet.pieces[j];
    if(a.x<b.x+b.w+K-eps&&b.x<a.x+a.w+K-eps&&a.y<b.y+b.h+K-eps&&b.y<a.y+a.h+K-eps)
     throw Error('Plano inválido: sobreposição ou distância de serra insuficiente.');
   }
  }
 }
 return {sheets,unplaced,byThickness:[...new Set(sheets.map(s=>s.thickness))].map(thickness=>({thickness,quantity:sheets.filter(s=>s.thickness===thickness).length})),grainLocked,kerf:K,margin:M};
}
