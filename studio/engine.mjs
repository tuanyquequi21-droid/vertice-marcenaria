// Vértice Studio 3D — núcleo independente, sem acesso ao banco de produção.
export const DEFAULTS = Object.freeze({width:800,height:2200,depth:550,thickness:18,backThickness:6,shelves:3,doors:2,pricePerM2:120,edgePricePerM:3,wastePercent:15});
export function positive(value,name){const n=Number(value);if(!Number.isFinite(n)||n<=0)throw new RangeError(name+' deve ser maior que zero');return n}
export function calculateCabinet(input={}){
 const d={...DEFAULTS,...input},w=positive(d.width,'Largura'),h=positive(d.height,'Altura'),depth=positive(d.depth,'Profundidade'),t=positive(d.thickness,'Espessura'),bt=positive(d.backThickness,'Fundo');
 const shelves=Number(d.shelves),doors=Number(d.doors),waste=Number(d.wastePercent);
 if(!Number.isInteger(shelves)||shelves<0||shelves>30)throw new RangeError('Prateleiras inválidas');
 if(![0,1,2].includes(doors))throw new RangeError('Portas devem ser 0, 1 ou 2');
 if(w<=2*t||h<=2*t||depth<=bt)throw new RangeError('Dimensões insuficientes para a espessura');
 if(!Number.isFinite(waste)||waste<0||waste>100)throw new RangeError('Perda inválida');
 const parts=[
  {name:'Lateral',qty:2,width:depth,height:h,thickness:t,edgeMm:h},
  {name:'Base',qty:1,width:w-2*t,height:depth,thickness:t,edgeMm:w-2*t},
  {name:'Tampo',qty:1,width:w-2*t,height:depth,thickness:t,edgeMm:w-2*t},
  ...(shelves?[{name:'Prateleira',qty:shelves,width:w-2*t,height:depth-bt,thickness:t,edgeMm:w-2*t}]:[]),
  {name:'Fundo',qty:1,width:w,height:h,thickness:bt,edgeMm:0},
  ...(doors?[{name:'Porta',qty:doors,width:w/doors-3,height:h-4,thickness:t,edgeMm:2*(w/doors-3+h-4)}]:[])
 ];
 const areaM2=parts.reduce((sum,p)=>sum+p.qty*p.width*p.height/1e6,0);
 const edgeM=parts.reduce((sum,p)=>sum+p.qty*p.edgeMm/1000,0);
 const price=positive(d.pricePerM2,'Preço por m²'),edgePrice=Number(d.edgePricePerM);
 if(!Number.isFinite(edgePrice)||edgePrice<0)throw new RangeError('Preço da fita inválido');
 return {dimensions:{width:w,height:h,depth},parts,areaM2,edgeM,estimatedMaterialCost:areaM2*(1+waste/100)*price+edgeM*edgePrice,assumptions:['Medidas em mm','Custo estimado sem ferragens, mão de obra, usinagem ou plano de corte otimizado','O fundo e as portas requerem validação construtiva antes da fabricação']};
}
