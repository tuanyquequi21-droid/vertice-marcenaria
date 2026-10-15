// Diagramas vetoriais esquemáticos derivados da configuração paramétrica.
export function assemblyExplodedSVG(model,params){
 const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 const {width,height,depth}=model.dimensions;
 const shelves=Math.min(20,Math.max(0,Number(params.shelves)||0)),dividers=Math.min(12,Math.max(0,Number(params.dividers)||0)),doors=Math.min(12,Math.max(0,Number(params.doors)||0)),drawers=Math.min(12,Math.max(0,Number(params.drawers)||0));
 const W=235,H=330,D=75,x=300,y=140;
 const poly=(points,fill,stroke='#536170')=>'<polygon points="'+points.map(p=>p.join(',')).join(' ')+'" fill="'+fill+'" stroke="'+stroke+'" stroke-width="2"/>';
 const panel=(xx,yy,w,h,fill='#e2cda9')=>'<rect x="'+xx+'" y="'+yy+'" width="'+w+'" height="'+h+'" fill="'+fill+'" stroke="#536170" stroke-width="2"/>';
 const arrow=(x1,y1,x2,y2)=>'<path d="M'+x1+' '+y1+' L'+x2+' '+y2+'" stroke="#c58a37" stroke-width="2.5" stroke-dasharray="6 4" marker-end="url(#arrow)"/>';
 const label=(xx,yy,t)=>'<text x="'+xx+'" y="'+yy+'" font-size="15" font-weight="600" fill="#344255">'+esc(t)+'</text>';
 let svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 950 670" role="img" aria-label="Vista explodida esquemática das peças do móvel"><defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10Z" fill="#c58a37"/></marker></defs>';
 // Corpo com projeção de profundidade, peças separadas do conjunto.
 svg+=poly([[x,y],[x+D,y-D*.48],[x+W+D,y-D*.48],[x+W,y]],'#f5e8d0');
 svg+=poly([[x+W,y],[x+W+D,y-D*.48],[x+W+D,y+H-D*.48],[x+W,y+H]],'#c5ac85');
 svg+=panel(x,y,W,H,'#f9f4ea');
 // Laterais e tampo/base explodidos.
 svg+=panel(x-100,y,20,H,'#cbb28c')+arrow(x-76,y+H/2,x-8,y+H/2)+label(x-175,y+H/2-15,'Lateral E');
 svg+=poly([[x+W+95,y-38],[x+W+115,y-48],[x+W+115,y+H-48],[x+W+95,y+H-38]],'#cbb28c')+arrow(x+W+88,y+H/2-35,x+W+10,y+H/2-10)+label(x+W+112,y+H/2+15,'Lateral D');
 svg+=panel(x,y-93,W,18,'#e3cba5')+arrow(x+W/2,y-70,x+W/2,y-5)+label(x+W/2-35,y-108,'Tampo');
 svg+=panel(x,y+H+70,W,18,'#e3cba5')+arrow(x+W/2,y+H+67,x+W/2,y+H+7)+label(x+W/2-25,y+H+110,'Base');
 for(let i=1;i<=shelves;i++){
  const yy=y+H*i/(shelves+1);
  svg+=panel(x+12,yy-3,W-24,6,'#d6bd96');
 }
 for(let i=1;i<=dividers;i++){
  const xx=x+W*i/(dividers+1);svg+=panel(xx-3,y+10,6,H-20,'#c6ad88');
 }
 if(model.layout.backType!=='none'){
  svg+=panel(75,y+70,155,230,'#e9edf0')+arrow(233,y+170,x-5,y+170)+label(88,y+56,'Fundo 6 mm');
 }
 if(doors){
  const fw=doors>1?Math.max(18,(W-20)/Math.min(doors,4)):W-20;
  const count=Math.min(doors,4);
  for(let i=0;i<count;i++){
   const xx=x+W+120+i*8,yy=y+30+i*16;
   svg+=panel(xx,yy,fw,Math.max(55,H/(model.layout.doorType==='flap-down'?count:1)-55),'#d9d2c5')+arrow(xx-7,yy+40,x+W-6,y+H*.3)+label(xx+8,yy+24,'P'+(i+1));
  }
  svg+=label(670,95,model.layout.doorType==='sliding'?'Trilhos / roldanas':model.layout.doorType==='flap-down'?'Articuladores':'Dobradiças');
 }
 if(drawers){svg+=label(670,560,drawers+' gaveta(s): frentes, caixas e corrediças');}
 svg+=label(60,625,'Dimensões externas: '+width+' × '+height+' × '+depth+' mm');
 svg+='<text x="60" y="648" font-size="12" fill="#8a5631">Posições e afastamentos ilustrativos; não utilizar como gabarito de furação.</text></svg>';
 return svg;
}
