// Vértice Studio 3D — núcleo independente, sem acesso ao banco de produção.
export const DEFAULTS = Object.freeze({width:800,height:2200,depth:550,thickness:18,backThickness:6,shelves:3,doors:2,doorType:'hinged',flapLayout:'vertical',doorSwing:'left',drawers:0,dividers:0,pricePerM2:120,edgePricePerM:3,wastePercent:15});
export function positive(value,name){const n=Number(value);if(!Number.isFinite(n)||n<=0)throw new RangeError(name+' deve ser maior que zero');return n}
// Quantitativos preliminares de ferragens; regras ajustáveis antes da compra.
export function calculateHardware(input={}){
 const d={...DEFAULTS,...input},doors=Number(d.doors),drawers=Number(d.drawers),height=Number(d.height),width=Number(d.width);
 const type=String(d.doorType||'hinged');
 if(!Number.isInteger(doors)||doors<0||doors>12||!Number.isInteger(drawers)||drawers<0||drawers>12||height<=0||width<=0)throw new RangeError('Medidas ou quantidades inválidas');
 const list=[];
 const add=(code,label,quantity,unit='un')=>{if(quantity>0)list.push({code,label,quantity,unit})};
 if(type==='hinged'){
  const perDoor=height>1800?4:height>900?3:2;
  add('hinge-cup-35','Dobradiça caneco 35 mm',doors*perDoor);
  add('hinge-plate','Calço/base de dobradiça',doors*perDoor);
 }else if(type==='flap-down'){
  add('flap-hinge','Dobradiça para porta basculante inferior',doors*2);
  add('flap-stay','Limitador / braço de sustentação para abertura inferior',doors*2);
 }else if(type==='sliding'){
  add('sliding-upper-track','Trilho superior para porta de correr',width/1000,'m');
  add('sliding-lower-track','Trilho inferior para porta de correr',width/1000,'m');
  add('sliding-roller','Roldana / carro para porta de correr',doors*2);
  add('sliding-stop','Batente / limitador de porta de correr',doors*2);
 }
 add('door-handle','Puxador de porta',doors);
 add('drawer-slide-pair','Par de corrediças para gaveta',drawers,'par');
 add('drawer-handle','Puxador de gaveta',drawers);
 return list;
}
export function calculateCabinet(input={}){
 const d={...DEFAULTS,...input},w=positive(d.width,'Largura'),h=positive(d.height,'Altura'),depth=positive(d.depth,'Profundidade'),t=positive(d.thickness,'Espessura'),bt=positive(d.backThickness,'Fundo');
 const shelves=Number(d.shelves),doors=Number(d.doors),waste=Number(d.wastePercent);
 if(!Number.isInteger(shelves)||shelves<0||shelves>30)throw new RangeError('Prateleiras inválidas');
 if(!Number.isInteger(doors)||doors<0||doors>12)throw new RangeError('Portas devem ser de 0 a 12');
 const doorType=String(d.doorType||'hinged'),doorSwing=String(d.doorSwing||'left'),flapLayout=String(d.flapLayout||'vertical');
 if(!['vertical','horizontal'].includes(flapLayout))throw new RangeError('Distribuição das portas basculantes inválida');
 if(!['hinged','flap-down','sliding'].includes(doorType))throw new RangeError('Tipo de porta inválido');
 if(!['left','right'].includes(doorSwing))throw new RangeError('Sentido de abertura inválido');
 if(doorType==='sliding'&&doors>0&&doors<2)throw new RangeError('Porta de correr precisa de pelo menos duas folhas');
 const drawers=Number(d.drawers??0),dividers=Number(d.dividers??0);
 if(!Number.isInteger(dividers)||dividers<0||dividers>20)throw new RangeError('Divisórias verticais devem ser de 0 a 20');
 if(!Number.isInteger(drawers)||drawers<0||drawers>12)throw new RangeError('Gavetas devem ser de 0 a 12');
 const bays=dividers+1,drawerBay=Number(d.drawerBay??1);
 if(!Number.isInteger(drawerBay)||drawerBay<1||drawerBay>bays)throw new RangeError('Módulo das gavetas deve estar entre 1 e '+bays);
 const bayWidth=(w-2*t-dividers*t)/bays;
 if(bayWidth<=4*t+26&&drawers)throw new RangeError('Módulo estreito demais para a caixa da gaveta');
 const drawerHeight=drawers?Math.max(120,Math.min(h*.42,drawers*180)):0;
 const doorHeight=h-drawerHeight;
 if(doorType==='flap-down'&&flapLayout==='vertical'&&doors>0&&doorHeight/doors<150)throw new RangeError('Cada porta basculante precisa ter ao menos 150 mm de altura');
 if(doors>0&&doorHeight<150)throw new RangeError('Altura insuficiente para portas acima das gavetas');
 if(drawers>0&&drawerHeight/drawers<120)throw new RangeError('Altura insuficiente para a quantidade de gavetas');
 if(w<=4*t+26||h<=2*t||depth<=Math.max(bt,80))throw new RangeError('Dimensões insuficientes para a espessura');
 if(!Number.isFinite(waste)||waste<0||waste>100)throw new RangeError('Perda inválida');
 const parts=[
  {name:'Lateral',qty:2,width:depth,height:h,thickness:t,edgeMm:h},
  {name:'Base',qty:1,width:w-2*t,height:depth,thickness:t,edgeMm:w-2*t},
  {name:'Tampo',qty:1,width:w-2*t,height:depth,thickness:t,edgeMm:w-2*t},
  ...(shelves?[{name:'Prateleira',qty:shelves,width:w-2*t,height:depth-bt,thickness:t,edgeMm:w-2*t}]:[]),
  ...(dividers?[{name:'Divisória vertical adicional',qty:dividers,width:depth-bt,height:h-2*t,thickness:t,edgeMm:h-2*t}]:[]),
  ...(doors&&drawers?[{name:'Divisória horizontal',qty:1,width:w-2*t,height:depth-bt,thickness:t,edgeMm:w-2*t}]:[]),
  {name:'Fundo',qty:1,width:w,height:h,thickness:bt,edgeMm:0},
  ...(doors?[{name:doorType==='sliding'?'Folha de correr':doorType==='flap-down'?'Porta basculante inferior':'Porta de abrir',qty:doors,width:doorType==='flap-down'&&flapLayout==='vertical'?w-6:doorType==='sliding'?(w/doors+Math.min(30,w*.025)):w/doors-3,height:doorType==='flap-down'&&flapLayout==='vertical'?doorHeight/doors-4:doorHeight-4,thickness:t,edgeMm:2*((doorType==='flap-down'&&flapLayout==='vertical'?w-6:doorType==='sliding'?(w/doors+Math.min(30,w*.025)):w/doors-3)+(doorType==='flap-down'&&flapLayout==='vertical'?doorHeight/doors-4:doorHeight-4))}]:[]),
  ...(drawers?[{name:'Frente de gaveta',qty:drawers,width:bayWidth-6,height:drawerHeight/drawers-4,thickness:t,edgeMm:2*(bayWidth-6+drawerHeight/drawers-4)},{name:'Lateral de gaveta',qty:drawers*2,width:depth-60,height:Math.min(160,drawerHeight/drawers-50),thickness:t,edgeMm:depth-60},{name:'Frente interna da caixa',qty:drawers,width:bayWidth-2*t-26,height:Math.min(160,drawerHeight/drawers-50),thickness:t,edgeMm:0},{name:'Contra-frente (traseira da caixa)',qty:drawers,width:w-4*t-26,height:Math.min(160,drawerHeight/drawers-50),thickness:t,edgeMm:0},{name:'Fundo de gaveta',qty:drawers,width:w-4*t-26,height:depth-60,thickness:bt,edgeMm:0}]:[])
 ];
 if(parts.some(p=>p.width<=0||p.height<=0))throw new RangeError('Medidas insuficientes para gavetas');
 const areaM2=parts.reduce((sum,p)=>sum+p.qty*p.width*p.height/1e6,0);
 const edgeM=parts.reduce((sum,p)=>sum+p.qty*p.edgeMm/1000,0);
 const price=positive(d.pricePerM2,'Preço por m²'),edgePrice=Number(d.edgePricePerM);
 if(!Number.isFinite(edgePrice)||edgePrice<0)throw new RangeError('Preço da fita inválido');
 return {hardware:calculateHardware(d),dimensions:{width:w,height:h,depth},layout:{drawerHeight,doorHeight,bayWidth,drawerBay,bays,doorType,doorSwing,flapLayout},parts,areaM2,edgeM,estimatedMaterialCost:areaM2*(1+waste/100)*price+edgeM*edgePrice,assumptions:['Medidas em mm','Ferragens calculadas apenas em quantidades; modelos, cargas e compatibilidade exigem revisão técnica','Caixas de gaveta são estimativas: conferir corrediças, folgas e montagem antes da fabricação']};
}
