// Manual preliminar baseado nas medidas do móvel; furação depende da ferragem real.
export function assemblyManualHTML(model,params,{projectName='Projeto Vértice'}={}){
 const esc=s=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
 const n=v=>Number(v).toLocaleString('pt-BR',{maximumFractionDigits:1});
 const {width:w,height:h,depth:d}=model.dimensions,layout=model.layout;
 const doors=Number(params.doors||0),drawers=Number(params.drawers||0),shelves=Number(params.shelves||0),dividers=Number(params.dividers||0);
 const frontType=layout.doorType;
 const hardware=model.hardware.map(item=>'<tr><td>'+esc(item.label)+'</td><td>'+n(item.quantity)+'</td><td>'+esc(item.unit)+'</td></tr>').join('');
 const parts=model.parts.map((p,i)=>'<tr><td>'+(i+1)+'</td><td>'+esc(p.name)+'</td><td>'+n(p.width)+' × '+n(p.height)+'</td><td>'+p.qty+'</td><td>'+n(p.thickness)+'</td></tr>').join('');
 const x=70,y=55,sw=320,sh=360,ratio=Math.min(sw/w,sh/h),W=w*ratio,H=h*ratio,X=x+(sw-W)/2,Y=y+(sh-H)/2;
 const line=(x1,y1,x2,y2,cls='structure')=>'<line class="'+cls+'" x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'"/>';
 let inside='';
 for(let i=1;i<=shelves;i++)inside+=line(X,Y+H*i/(shelves+1),X+W,Y+H*i/(shelves+1));
 for(let i=1;i<=dividers;i++)inside+=line(X+W*i/(dividers+1),Y,X+W*i/(dividers+1),Y+H);
 let hardwareMarks='';
 if(frontType==='hinged'&&doors){
  const count=doors===1?1:doors;
  for(let i=0;i<count;i++){
   const hx=X+(i%2===0?8:W-8);
   for(const frac of [.16,.84])hardwareMarks+='<circle cx="'+hx+'" cy="'+(Y+H*frac)+'" r="5" fill="#d48b2b"/>';
  }
 }else if(frontType==='flap-down'&&doors){
  for(const frac of [.15,.85])hardwareMarks+='<circle cx="'+(X+W*frac)+'" cy="'+(Y+H*.65)+'" r="5" fill="#d48b2b"/>';
 }
 if(layout.handleType==='bar'&&doors)hardwareMarks+='<rect x="'+(X+W*.48)+'" y="'+(Y+H*.45)+'" width="7" height="35" rx="3" fill="#3178a8"/>';
 const drawing='<svg viewBox="0 0 460 475" role="img" aria-label="Vista frontal esquemática do móvel"><rect x="'+X+'" y="'+Y+'" width="'+W+'" height="'+H+'" fill="#f5f1e9" stroke="#263646" stroke-width="3"/>'+inside+hardwareMarks+line(X,Y-17,X+W,Y-17,'dimension')+line(X-18,Y,X-18,Y+H,'dimension')+'<text x="'+(X+W/2)+'" y="'+(Y-25)+'" text-anchor="middle">'+n(w)+' mm</text><text x="'+(X-24)+'" y="'+(Y+H/2)+'" transform="rotate(-90 '+(X-24)+' '+(Y+H/2)+')" text-anchor="middle">'+n(h)+' mm</text><text x="230" y="460" text-anchor="middle">Profundidade: '+n(d)+' mm</text></svg>';
 const steps=[
  'Conferir e identificar todas as peças conforme o plano de corte e as etiquetas.',
  'Conferir esquadro, sentido do veio, fita de borda e posição do fundo antes de furar.',
  'Montar laterais, base e tampo usando o sistema de fixação definido pela marcenaria.',
  ...(dividers?['Instalar '+dividers+' divisória(s) vertical(is) respeitando as medidas dos vãos.']:[]),
  ...(shelves?['Posicionar e fixar as '+shelves+' prateleira(s) conforme o projeto.']:[]),
  ...(layout.backType!=='none'?['Conferir esquadro e instalar o fundo traseiro MDF 6 mm.']:[]),
  ...(drawers?['Montar '+drawers+' caixa(s) de gaveta e instalar corrediças e frentes após verificar folgas e fabricante.']:[]),
  ...(doors?['Instalar '+doors+' porta(s) do tipo '+(frontType==='hinged'?'abrir':frontType==='sliding'?'correr':'basculante')+' e regular as ferragens.']:[]),
  ...(layout.handleType!=='none'?['Posicionar os puxadores de acordo com o modelo e com a frente escolhida.']:[]),
  'Conferir nivelamento, funcionamento, segurança e fixação à parede quando aplicável.'
 ];
 const stepsHTML=steps.map((s,i)=>'<li><span class="check"></span>'+esc(s)+'</li>').join('');
 const notes=[
  frontType==='hinged'?'Dobradiças: marcações laranja são apenas indicação de região de instalação. Quantidade e furação exatas dependem do modelo da dobradiça, altura e peso da porta.':frontType==='flap-down'?'Pistões/articuladores: marcações laranja são zonas ilustrativas. Definir modelo, força, ângulo e coordenadas pela ficha técnica do fabricante.':'Portas de correr: trilhos, roldanas e folgas devem seguir o kit especificado.',
  layout.handleType==='none'?'Puxadores: sem puxador externo configurado.':'Puxadores: marcação azul apenas ilustrativa; entre-eixos e recuos dependem da peça real.',
  'Parafusos, cavilhas, minifix e suportes: o Studio ainda não registra o sistema construtivo nem as posições dos furos. Não usar este desenho como gabarito de furação.',
  'Conferir o plano e os encaixes com um profissional antes de executar a montagem.'
 ].map(s=>'<li>'+esc(s)+'</li>').join('');
 return '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>'+esc(projectName)+' — Manual de montagem</title><style>@page{size:A4;margin:13mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#23303e;max-width:900px;margin:24px auto;padding:20px}header{border-bottom:3px solid #b28c46;padding-bottom:12px;display:flex;justify-content:space-between}.brand{font-size:20px;font-weight:bold}h1{font-size:22px}h2{font-size:16px;margin-top:24px}.drawing{display:flex;justify-content:center;border:1px solid #d7dce3;padding:12px}.drawing svg{max-width:470px;width:100%;height:auto}.structure{stroke:#64748b;stroke-width:2}.dimension{stroke:#a77c37;stroke-width:1.5}table{width:100%;border-collapse:collapse;font-size:12px}td,th{border:1px solid #cbd2da;padding:7px;text-align:left}th{background:#edf1f4}ol{padding-left:25px}ol li{padding:8px 0;break-inside:avoid}.check{display:inline-block;width:13px;height:13px;border:1px solid #667;vertical-align:middle;margin-right:9px}.warn{padding:12px;background:#fff4de;border-left:4px solid #c88b2d;font-size:12px}button{background:#b28c46;border:0;padding:10px 16px;cursor:pointer}@media print{.toolbar{display:none}body{margin:0;padding:0}.drawing,table,li{break-inside:avoid}}</style></head><body><div class="toolbar"><button onclick="print()">Imprimir / Salvar PDF</button></div><header><span class="brand">VÉRTICE MARCENARIA</span><span>MANUAL DE MONTAGEM · PRELIMINAR</span></header><h1>'+esc(projectName)+'</h1><p>'+n(w)+' × '+n(h)+' × '+n(d)+' mm · MDF '+n(params.thickness)+' mm</p><h2>Vista frontal e referências de ferragens</h2><div class="drawing">'+drawing+'</div><p class="warn">Desenho esquemático, não é gabarito de furação. As marcações de ferragens são ilustrativas; não indicam coordenadas aprovadas para fabricação.</p><h2>Sequência de montagem</h2><ol>'+stepsHTML+'</ol><h2>Lista de peças</h2><table><thead><tr><th>Nº</th><th>Peça</th><th>Medidas (mm)</th><th>Qtd.</th><th>Espessura</th></tr></thead><tbody>'+parts+'</tbody></table><h2>Ferragens estimadas</h2><table><thead><tr><th>Ferragem</th><th>Quantidade</th><th>Unidade</th></tr></thead><tbody>'+hardware+'</tbody></table><h2>Observações para instalação</h2><ul>'+notes+'</ul></body></html>';
}
