// Desenho técnico explodido: componentes separados e códigos iguais aos da lista de peças.
// Representação geométrica esquemática, sem inventar pontos de furação.
export function assemblyExplodedSVG(model,params){
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 const parts=model.parts;
 const find=(term)=>parts.findIndex(p=>p.name.toLowerCase().includes(term));
 const id=i=>i<0?'—':'P'+String(i+1).padStart(2,'0');
 const lateral=id(find('lateral')),base=id(find('base')),top=id(find('tampo')),shelf=id(find('prateleira')),divider=id(find('divisória vertical')),back=id(find('fundo traseiro'));
 const frontIndex=parts.findIndex(p=>/porta de abrir|folha de correr|porta basculante/i.test(p.name)),front=id(frontIndex);
 const ns=Math.min(8,Math.max(0,Number(params.shelves)||0)),nd=Math.min(5,Math.max(0,Number(params.dividers)||0)),nf=Math.min(4,Math.max(0,Number(params.doors)||0));
 const r=(x,y,w,h,fill='#f1e8d8')=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" fill="'+fill+'" stroke="#283744" stroke-width="1.7"/>';
 const txt=(x,y,t,anchor='middle')=>'<text x="'+x+'" y="'+y+'" text-anchor="'+anchor+'" font-size="13" font-weight="600" fill="#243544">'+esc(t)+'</text>';
 const arrow=(x,y,X,Y)=>'<path d="M'+x+' '+y+' L'+X+' '+Y+'" fill="none" stroke="#b47d36" stroke-width="2.2" stroke-dasharray="6 4" marker-end="url(#tip)"/>';
 const poly=(pts,fill='#e6d6b9')=>'<polygon points="'+pts.map(p=>p.join(',')).join(' ')+'" fill="'+fill+'" stroke="#283744" stroke-width="1.7"/>';
 let out='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 660" role="img" aria-label="Vista explodida de componentes separados e numerados"><defs><marker id="tip" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto"><path d="M0 0 L6 3 L0 6Z" fill="#b47d36"/></marker></defs>';
 // Vista axonométrica aberta: não desenhar caixa montada.
 const L=310,R=630,T=155,B=490,D=56;
 // Fundo separado, deslocado para trás.
 out+=poly([[345,100],[665,100],[665,432],[345,432]],'#e8edf0')+txt(505,89,back+' · Fundo 6 mm');
 // Laterais separadas, mostrando profundidade e espessura.
 out+=poly([[165,168],[183,156],[183,480],[165,492]],'#d9c39e')+poly([[165,168],[212,137],[230,145],[183,176]],'#e9d6b6')+poly([[183,176],[230,145],[230,465],[183,496]],'#cfb58d');
 out+=txt(188,125,lateral+' · Lateral 1');
 out+=poly([[770,168],[788,156],[788,480],[770,492]],'#d9c39e')+poly([[770,168],[817,137],[835,145],[788,176]],'#e9d6b6')+poly([[788,176],[835,145],[835,465],[788,496]],'#cfb58d');
 out+=txt(795,125,lateral+' · Lateral 2');
 out+=arrow(240,330,305,330)+arrow(755,330,645,330);
 // Tampo e base fora do conjunto.
 out+=poly([[340,30],[640,30],[682,12],[382,12]],'#dfcba8')+poly([[340,30],[640,30],[640,43],[340,43]],'#d0b68c');
 out+=txt(510,8,top+' · Tampo')+arrow(490,54,490,144);
 out+=poly([[340,565],[640,565],[682,547],[382,547]],'#dfcba8')+poly([[340,565],[640,565],[640,578],[340,578]],'#d0b68c');
 out+=txt(490,598,base+' · Base')+arrow(490,544,490,496);
 // Prateleiras em axonometria, cada uma com indicação própria.
 for(let i=0;i<ns;i++){
  const yy=T+45+(i+1)*(B-T-100)/(ns+1);
  out+=poly([[L+10,yy],[R-10,yy],[R+D-10,yy-25],[L+D+10,yy-25]],'#e5d0a9');
  out+=txt(R+65,yy-8,shelf+'-'+(i+1),'start');
 }
 // Divisórias verticais separadas da carcaça, vistas como placas.
 for(let i=0;i<nd;i++){
  const xx=L+55+(i+1)*205/(nd+1);
  out+=poly([[xx,T+20],[xx+13,T+12],[xx+13,B-15],[xx,B-7]],'#dbc39c');
  out+=txt(xx+18,T+20+i*18,divider+'-'+(i+1),'start');
 }
 // Frentes desmontadas e deslocadas à direita: identificações individualizadas.
 if(nf){
  const fw=48;
  for(let i=0;i<nf;i++){
   const xx=860+i*18,yy=185+i*30;
   out+=r(xx,yy,fw,195,'#d4c6b2')+txt(xx+fw/2,yy+102,front+'-'+(i+1));
  }
  out+=arrow(857,390,700,390)+txt(890,460,'Portas / frentes');
 }
 out+=txt(500,635,'Dimensões externas: '+model.dimensions.width+' × '+model.dimensions.height+' × '+model.dimensions.depth+' mm');
 out+='<text x="500" y="653" text-anchor="middle" font-size="11" fill="#9a6329">Vista esquemática de identificação. Setas não indicam furos nem fixadores aprovados.</text></svg>';
 return out;
}
