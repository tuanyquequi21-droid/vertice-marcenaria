import {calculateCabinet} from './engine.mjs';
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js';
const scene=new THREE.Scene();scene.background=new THREE.Color('#282828');
const camera=new THREE.PerspectiveCamera(40,1,.1,30);camera.position.set(2.8,2.1,3.8);camera.lookAt(0,0,0);
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));
const host=document.getElementById('scene');host.appendChild(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xffffff,0x777777,2));const light=new THREE.DirectionalLight(0xffffff,2);light.position.set(2,4,5);scene.add(light);
const group=new THREE.Group();scene.add(group);
let project=null,rotation={x:0,y:0},drag=null,showFront=true,doorsOpened=false,doorMeta=[];
let viewDistance=3,viewTarget=new THREE.Vector3(),viewAzimuth=.48,viewElevation=.22,modelSize=2,modelWidth=.8,modelHeight=2.2,modelDepth=.55;
const fronts=[];
const material=new THREE.MeshStandardMaterial({color:0xbda889,roughness:.75});
function addBox(x,y,z,w,h,d){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);mesh.position.set(x,y,z);group.add(mesh)}
function draw(p){presentationPreview=false;presentationGroup.visible=false;group.visible=true;fronts.length=0;doorMeta=[];doorsOpened=false;while(group.children.length){const mesh=group.children[0];group.remove(mesh);mesh.geometry.dispose()}
 const {width:w,height:h,depth:d}=p.dimensions;const t=Number(document.querySelector('[name=thickness]').value),s=Number(document.querySelector('[name=shelves]').value),doors=Number(document.querySelector('[name=doors]').value);
 const drawers=Number(document.querySelector('[name=drawers]').value||0),dividers=Number(document.querySelector('[name=dividers]').value||0);const W=w/1000,H=h/1000,D=d/1000,T=t/1000;addBox(-W/2+T/2,0,0,T,H,D);addBox(W/2-T/2,0,0,T,H,D);
 addBox(0,-H/2+T/2,0,W-2*T,T,D);addBox(0,H/2-T/2,0,W-2*T,T,D);
 for(let i=1;i<=s;i++)addBox(0,-H/2+i*H/(s+1),0,W-2*T,T,D-.006);
 for(let i=1;i<=dividers;i++)addBox(-W/2+T+i*(p.layout.bayWidth/1000)+(i-.5)*T,0,0,T,H-2*T,D-.006);
 addBox(0,0,-D/2+.003,W,H,.006);
 const DH=p.layout.drawerHeight/1000,PH=p.layout.doorHeight/1000;
 if(doors&&drawers)addBox(0,-H/2+DH,0,W-2*T,T,D-.006);
 for(let i=0;i<doors;i++){
  const type=p.layout.doorType,overlap=Math.min(.03,W*.025),leafWidth=type==='sliding'?W/doors+overlap:W/doors-.006;
  const flap=type==='flap-down',stacked=flap&&p.layout.flapLayout!=='horizontal';
  const panelW=stacked?W-.006:leafWidth,panelH=stacked?PH/doors-.004:PH-.004;
  const x=stacked?0:-W/2+(i+.5)*W/doors;
  const y=stacked?DH/2-PH/2+(i+.5)*PH/doors:DH/2;
  const z=D/2+.012+(type==='sliding'?(i%2)*(.012+T):0);
  addBox(x,y,z,panelW,panelH,T);
  const mesh=group.children[group.children.length-1];fronts.push(mesh);
  doorMeta.push({mesh,type,index:i,closed:{x,y,z},width:panelW,height:panelH,swing:p.layout.doorSwing});
 }
 const bayW=p.layout.bayWidth/1000,bayX=-W/2+T+(p.layout.drawerBay-.5)*bayW+(p.layout.drawerBay-1)*T;
 for(let i=0;i<drawers;i++){addBox(bayX,-H/2+(i+.5)*DH/drawers,D/2+.012,bayW-.006,DH/drawers-.004,T);fronts.push(group.children[group.children.length-1])}
 for(let i=0;i<drawers;i++){const y=-H/2+(i+.5)*DH/drawers,boxH=Math.min(.16,DH/drawers-.05),boxW=(p.layout.bayWidth-2*t-26)/1000,boxD=(d-60)/1000;addBox(bayX-boxW/2,y,0,T,boxH,boxD);addBox(bayX+boxW/2,y,0,T,boxH,boxD);addBox(bayX,y,-boxD/2,boxW,boxH,T);addBox(bayX,y,boxD/2,boxW,boxH,T);addBox(bayX,y-boxH/2,0,boxW,.006,boxD)}
 for(const front of fronts)front.visible=showFront;
 modelSize=Math.sqrt(W*W+H*H+D*D);modelWidth=W;modelHeight=H;modelDepth=D;resetCamera();document.getElementById('previewDoors').textContent='Simular abertura das portas';render();
}
function updateDoorPreview(){
 for(const item of doorMeta){
  const {mesh,type,index,closed,width,height,swing}=item;
  mesh.rotation.set(0,0,0);mesh.position.set(closed.x,closed.y,closed.z);
  if(!doorsOpened)continue;
  if(type==='sliding'){mesh.position.x=closed.x+(index%2===0?1:-1)*Math.min(width*.45,.24);}
  else if(type==='flap-down'){const angle=Math.PI/2;mesh.rotation.x=angle;mesh.position.y=closed.y-height/2+(height/2)*Math.cos(angle);mesh.position.z=closed.z+(height/2)*Math.sin(angle);}
  else{mesh.rotation.y=(swing==='left'?-1:1)*Math.PI/3;mesh.position.x=closed.x+(swing==='left'?-1:1)*width*.22;mesh.position.z=closed.z+width*.22;}
 }
 render();
}
document.getElementById('previewDoors').addEventListener('click',()=>{
 doorsOpened=!doorsOpened;updateDoorPreview();
 document.getElementById('previewDoors').textContent=doorsOpened?'Fechar portas na prévia':'Simular abertura das portas';
});
document.getElementById('doorType').addEventListener('change',e=>{
 document.getElementById('doorSwingField').hidden=e.target.value!=='hinged';
 document.getElementById('flapLayoutField').hidden=e.target.value!=='flap-down';
});
function cameraFitDistance(){
 const aspect=Math.max(.35,(host.clientWidth||600)/(host.clientHeight||450));
 const vfov=THREE.MathUtils.degToRad(camera.fov);
 const hfov=2*Math.atan(Math.tan(vfov/2)*aspect);
 const horizontal=Math.sqrt(modelWidth*modelWidth+modelDepth*modelDepth);
 const vertical=modelHeight+modelDepth*.3;
 return Math.max(vertical/(2*Math.tan(vfov/2)),horizontal/(2*Math.tan(hfov/2)))*1.25;
}
function updateCamera(){
 viewElevation=THREE.MathUtils.clamp(viewElevation,-1.35,1.35);
 viewDistance=THREE.MathUtils.clamp(viewDistance,modelSize*.6,modelSize*12);
 camera.position.set(viewTarget.x+viewDistance*Math.sin(viewAzimuth)*Math.cos(viewElevation),viewTarget.y+viewDistance*Math.sin(viewElevation),viewTarget.z+viewDistance*Math.cos(viewAzimuth)*Math.cos(viewElevation));
 camera.lookAt(viewTarget);render();
}
function resetCamera(){viewTarget.set(0,0,0);viewAzimuth=.48;viewElevation=.22;viewDistance=cameraFitDistance();updateCamera();}
function zoomCamera(factor){viewDistance*=factor;updateCamera();}
function panCamera(dx,dy){
 // Use the current camera orientation, not its local transform matrix.
 camera.updateMatrixWorld(true);
 const right=new THREE.Vector3(1,0,0).applyQuaternion(camera.quaternion);
 const up=new THREE.Vector3(0,1,0).applyQuaternion(camera.quaternion);
 const scale=2*viewDistance*Math.tan(THREE.MathUtils.degToRad(camera.fov)/2)/(host.clientHeight||450);
 viewTarget.addScaledVector(right,-dx*scale).addScaledVector(up,dy*scale);
 updateCamera();
}
function render(){const width=host.clientWidth||500,height=host.clientHeight||450;renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();renderer.render(scene,camera)}
new ResizeObserver(render).observe(host);
document.getElementById('form').addEventListener('submit',e=>{e.preventDefault();try{const data=Object.fromEntries(new FormData(e.target));const p=calculateCabinet(data);project={schemaVersion:1,kind:'cabinet',params:data};draw(p);document.getElementById('error').textContent='';document.getElementById('totals').textContent='Área: '+p.areaM2.toFixed(2)+' m² | Fita: '+p.edgeM.toFixed(2)+' m | Materiais estimados: '+p.estimatedMaterialCost.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});document.getElementById('hardware').replaceChildren(...p.hardware.map(item=>{const tr=document.createElement('tr');for(const value of [item.label,item.quantity,item.unit]){const td=document.createElement('td');td.textContent=value;tr.appendChild(td)}return tr}));document.getElementById('parts').replaceChildren(...p.parts.map(part=>{const tr=document.createElement('tr');for(const value of [part.name,part.qty,part.width.toFixed(1)+' × '+part.height.toFixed(1)+' × '+part.thickness]){const td=document.createElement('td');td.textContent=value;tr.appendChild(td)}return tr}))}catch(err){document.getElementById('error').textContent=err.message}});
document.getElementById('form').requestSubmit();
document.getElementById('doorSwingField').hidden=false;
document.getElementById('flapLayoutField').hidden=true;

// Persistência local isolada: não acessa dados nem tabelas do Supabase.
const storageKey='vertice-studio3d-project-v1';
const status=document.getElementById('status');
function report(message){status.textContent=message}
function download(name,contents,mime){const blob=new Blob([contents],{type:mime});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function applyProject(data){if(!data||data.schemaVersion!==1||data.kind!=='cabinet'||!data.params||typeof data.params!=='object'||Array.isArray(data.params))throw new Error('Arquivo de projeto inválido ou incompatível');const validated=calculateCabinet(data.params);const form=document.getElementById('form');for(const field of form.elements){if(field.name&&Object.hasOwn(data.params,field.name)){field.value=data.params[field.name]}}document.getElementById('doorSwingField').hidden=form.elements.doorType.value!=='hinged';document.getElementById('flapLayoutField').hidden=form.elements.doorType.value!=='flap-down';form.requestSubmit();return validated}
document.getElementById('save').addEventListener('click',()=>{if(!project)return report('Atualize o projeto antes de salvar.');try{localStorage.setItem(storageKey,JSON.stringify(project));report('Projeto salvo neste navegador.')}catch(err){report('Não foi possível salvar: '+err.message)}});
document.getElementById('load').addEventListener('click',()=>{try{const saved=localStorage.getItem(storageKey);if(!saved)throw new Error('Nenhum projeto salvo neste navegador');applyProject(JSON.parse(saved));report('Projeto recuperado.')}catch(err){report(err.message)}});
document.getElementById('export').addEventListener('click',()=>{if(!project)return report('Atualize o projeto antes de exportar.');download('vertice-projeto-3d.json',JSON.stringify(project,null,2),'application/json');report('Projeto exportado.')} );
document.getElementById('csv').addEventListener('click',()=>{try{const params=Object.fromEntries(new FormData(document.getElementById('form')));const p=calculateCabinet(params);const rows=[['Peça','Quantidade','Largura mm','Altura mm','Espessura mm'],...p.parts.map(part=>[part.name,part.qty,part.width,part.height,part.thickness])];download('vertice-lista-pecas.csv','\ufeff'+rows.map(row=>row.join(';')).join('\r\n'),'text/csv;charset=utf-8');report('Lista de peças exportada.')}catch(err){report(err.message)}});
document.getElementById('import').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;try{if(file.size>100000)throw new Error('Arquivo muito grande');applyProject(JSON.parse(await file.text()));report('Projeto importado.')}catch(err){report('Falha na importação: '+err.message)}finally{e.target.value=''}});
document.getElementById('resetview').addEventListener('click',()=>{resetCamera();report('Vista centralizada e enquadrada.')});
document.getElementById('viewfront').addEventListener('click',()=>{viewAzimuth=0;viewElevation=0;updateCamera()});
document.getElementById('viewiso').addEventListener('click',()=>{viewAzimuth=.48;viewElevation=.22;updateCamera()});
document.getElementById('zoomin').addEventListener('click',()=>zoomCamera(.8));
document.getElementById('zoomout').addEventListener('click',()=>zoomCamera(1.25));
const canvas=renderer.domElement;
canvas.style.touchAction='none';
canvas.addEventListener('contextmenu',e=>e.preventDefault());
const pointers=new Map();
canvas.addEventListener('pointerdown',e=>{
 pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(pointers.size===1)drag={x:e.clientX,y:e.clientY,mode:e.shiftKey||e.button===2?'pan':'orbit'};
 else drag=null;
 canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove',e=>{
 if(!pointers.has(e.pointerId))return;
 const previous=pointers.get(e.pointerId);
 pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(pointers.size===2){
  const current=[...pointers.values()],other=current.find(p=>p!==pointers.get(e.pointerId));
  if(other){
   const before=Math.hypot(previous.x-other.x,previous.y-other.y);
   const after=Math.hypot(e.clientX-other.x,e.clientY-other.y);
   if(before>8&&after>8)zoomCamera(before/after);
   panCamera((e.clientX-previous.x)/2,(e.clientY-previous.y)/2);
  }
 }else if(drag){
  const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
  if(drag.mode==='pan')panCamera(dx,dy);
  else{viewAzimuth-=dx*.005;viewElevation+=dy*.005;updateCamera()}
  drag.x=e.clientX;drag.y=e.clientY;
 }
});
function releasePointer(e){pointers.delete(e.pointerId);drag=null}
canvas.addEventListener('pointerup',releasePointer);
canvas.addEventListener('pointercancel',releasePointer);
// Setas: deslocamento visível em unidades do mundo, independente da escala de pixels.
for(const [id,h,v,label] of [
 ['panleft',-1,0,'esquerda'],['panright',1,0,'direita'],
 ['panup',0,1,'cima'],['pandown',0,-1,'baixo']
]){
 const control=document.getElementById(id);
 if(!control)continue;
 control.addEventListener('click',e=>{
  e.preventDefault();
  const step=Math.max(.12,viewDistance*.16);
  const right=new THREE.Vector3(Math.cos(viewAzimuth),0,-Math.sin(viewAzimuth));
  const up=new THREE.Vector3(0,1,0);
  viewTarget.addScaledVector(right,h*step).addScaledVector(up,v*step);
  updateCamera();
  const status=document.getElementById('status');
  if(status)status.textContent='Vista deslocada para '+label+'.';
 });
}
canvas.addEventListener('wheel',e=>{e.preventDefault();if(e.shiftKey)panCamera(e.deltaX*.35,e.deltaY*.35);else zoomCamera(Math.exp(THREE.MathUtils.clamp(e.deltaY,-120,120)*.002))},{passive:false});

// Modo interno: oculta apenas portas e frentes de gaveta, mantendo a estrutura.
document.getElementById('interior').addEventListener('click',()=>{showFront=!showFront;for(const front of fronts)front.visible=showFront;document.getElementById('interior').textContent=showFront?'Ver parte interna':'Mostrar portas e gavetas';render()});


// Ponte independente: transfere uma estimativa para revisão no Gestão, sem gravar no Supabase.
const transferButton=document.getElementById('send-to-gestao');
transferButton?.addEventListener('click',()=>{
 try{
  if(!project)throw new Error('Atualize o projeto antes de transferir.');
  const result=calculateCabinet(project.params);
  const sheetW=Number(document.getElementById('sheet-width').value);
  const sheetH=Number(document.getElementById('sheet-height').value);
  const waste=Number(project.params.wastePercent??15);
  if(!Number.isFinite(sheetW)||!Number.isFinite(sheetH)||sheetW<=0||sheetH<=0)throw new Error('Dimensões de chapa inválidas.');
  const byThickness=new Map();
  for(const part of result.parts){
   const thickness=Number(part.thickness),area=part.qty*part.width*part.height/1e6;
   byThickness.set(thickness,(byThickness.get(thickness)||0)+area);
  }
  const sheets=[...byThickness].map(([thickness,areaM2])=>({thickness,areaM2,quantity:Math.ceil(areaM2*(1+waste/100)/(sheetW*sheetH/1e6)),width:sheetW,height:sheetH}));
  const payload={schemaVersion:1,source:'vertice-studio',kind:'quote-material-estimate',createdAt:new Date().toISOString(),parts:result.parts,sheets,hardware:result.hardware,edgeMeters:result.edgeM,warning:'Quantitativos preliminares: confirmar ferragens, carga, medidas, compatibilidade e plano de corte antes da compra.'};
  localStorage.setItem('vertice:studio:quote-transfer:v1',JSON.stringify(payload));
  report('Estimativa enviada. Abrindo o Gestão para selecionar um orçamento...');
  window.location.assign('../index.html#studio-import');
 }catch(err){report(err.message)}
});

// Apresentação pública somente leitura. O link codifica apenas medidas/configuração dos módulos.
// Não inclui foto, dados do cliente, custos nem credenciais.
const presentationModules=[];
let presentationPreview=false;
const presentationGroup=new THREE.Group();scene.add(presentationGroup);
const presentationStatus=document.getElementById('presentation-status');
const presentationCount=document.getElementById('presentation-count');
function presentationReport(message){presentationStatus.textContent=message}
function renderPresentationList(){
 const list=document.getElementById('presentation-module-list');list.replaceChildren();
 presentationModules.forEach((params,i)=>{
  const row=document.createElement('div');row.style.cssText='display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:8px 0;border-bottom:1px solid #ddd';
  const name=document.createElement('span');name.style.flex='1';name.textContent='Módulo '+(i+1)+' — '+params.width+' × '+params.height+' × '+params.depth+' mm';
  const edit=document.createElement('button');edit.type='button';edit.textContent='Editar';edit.onclick=()=>{applyProject({schemaVersion:1,kind:'cabinet',params});presentationPreview=false;presentationGroup.visible=false;group.visible=true;render();presentationReport('Módulo '+(i+1)+' carregado. Após alterar, clique em “Substituir módulo” para atualizar a apresentação.');selectedPresentationIndex=i;document.getElementById('add-presentation-module').textContent='Substituir módulo selecionado'};
  const remove=document.createElement('button');remove.type='button';remove.textContent='Remover';remove.onclick=()=>{presentationModules.splice(i,1);selectedPresentationIndex=-1;document.getElementById('add-presentation-module').textContent='Adicionar móvel atual';renderPresentationList();if(presentationPreview)drawPresentation();};
  row.append(name,edit,remove);list.append(row);
 });
 presentationCount.textContent=presentationModules.length+' módulo(s) na apresentação.';
 document.getElementById('presentation-link').value='';
}
let selectedPresentationIndex=-1;
function presentationBox(parent,x,y,z,w,h,d){
 if(w<=0||h<=0||d<=0)return;
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);mesh.position.set(x,y,z);parent.add(mesh);
}
function drawPresentation(){
 while(presentationGroup.children.length){const child=presentationGroup.children[0];presentationGroup.remove(child);child.traverse(o=>{if(o.geometry)o.geometry.dispose()})}
 let total=0,maxHeight=0;const data=presentationModules.map(params=>{const p=calculateCabinet(params);total+=p.dimensions.width/1000;maxHeight=Math.max(maxHeight,p.dimensions.height/1000);return {params,p}});
 total+=Math.max(0,data.length-1)*.06;let offset=-total/2;
 for(const {params,p} of data){
  const w=p.dimensions.width/1000,h=p.dimensions.height/1000,d=p.dimensions.depth/1000,t=Number(params.thickness)/1000;
  const g=new THREE.Group();g.position.x=offset+w/2;presentationGroup.add(g);offset+=w+.06;
  presentationBox(g,-w/2+t/2,0,0,t,h,d);presentationBox(g,w/2-t/2,0,0,t,h,d);
  presentationBox(g,0,-h/2+t/2,0,w-2*t,t,d);presentationBox(g,0,h/2-t/2,0,w-2*t,t,d);presentationBox(g,0,0,-d/2+.003,w,h,.006);
  const shelves=Number(params.shelves||0);
  for(let j=1;j<=shelves;j++)presentationBox(g,0,-h/2+j*h/(shelves+1),0,w-2*t,t,d-.006);
  const div=Number(params.dividers||0);
  for(let j=1;j<=div;j++)presentationBox(g,-w/2+t+j*p.layout.bayWidth/1000+(j-.5)*t,0,0,t,h-2*t,d-.006);
  const doors=Number(params.doors||0),dh=p.layout.drawerHeight/1000,ph=p.layout.doorHeight/1000,stack=p.layout.doorType==='flap-down'&&p.layout.flapLayout!=='horizontal';
  for(let j=0;j<doors;j++)presentationBox(g,stack?0:-w/2+(j+.5)*w/doors,stack?dh/2-ph/2+(j+.5)*ph/doors:dh/2,d/2+.012,stack?w-.006:w/doors-.006,stack?ph/doors-.004:ph-.004,t);
  const drawers=Number(params.drawers||0),bayX=-w/2+t+(p.layout.drawerBay-.5)*p.layout.bayWidth/1000+(p.layout.drawerBay-1)*t;
  for(let j=0;j<drawers;j++)presentationBox(g,bayX,-h/2+(j+.5)*dh/drawers,d/2+.012,p.layout.bayWidth/1000-.006,dh/drawers-.004,t);
 }
 presentationPreview=true;group.visible=false;presentationGroup.visible=true;
 modelWidth=total;modelHeight=maxHeight;modelDepth=Math.max(.55,...data.map(x=>x.p.dimensions.depth/1000));modelSize=Math.sqrt(modelWidth**2+modelHeight**2+modelDepth**2);resetCamera();
}
document.getElementById('add-presentation-module').addEventListener('click',()=>{
 try{
  const params=Object.fromEntries(new FormData(document.getElementById('form')));calculateCabinet(params);
  if(selectedPresentationIndex>=0){presentationModules[selectedPresentationIndex]=params;selectedPresentationIndex=-1;document.getElementById('add-presentation-module').textContent='Adicionar móvel atual';presentationReport('Módulo atualizado na apresentação.')}
  else{
   if(presentationModules.some(m=>JSON.stringify(m)===JSON.stringify(params)))return presentationReport('Este móvel já está na apresentação. Altere as medidas ou selecione “Editar” para substituir um módulo.');
   if(presentationModules.length>=15)throw Error('Limite de 15 módulos por apresentação.');
   presentationModules.push(params);presentationReport('Móvel adicionado. Configure outro móvel ou visualize a composição.');
  }
  renderPresentationList();drawPresentation();
 }catch(e){presentationReport(e.message)}
});
document.getElementById('clear-presentation').addEventListener('click',()=>{
 presentationModules.length=0;selectedPresentationIndex=-1;document.getElementById('add-presentation-module').textContent='Adicionar móvel atual';renderPresentationList();
 presentationPreview=false;presentationGroup.visible=false;group.visible=true;resetCamera();presentationReport('Módulos removidos da apresentação.');
});
document.getElementById('preview-presentation').addEventListener('click',()=>{
 try{if(!presentationModules.length)throw Error('Adicione um móvel primeiro.');drawPresentation();presentationReport('Exibindo todos os módulos na mesma cena.')}catch(e){presentationReport(e.message)}
});
document.getElementById('preview-current').addEventListener('click',()=>{presentationPreview=false;presentationGroup.visible=false;group.visible=true;const params=Object.fromEntries(new FormData(document.getElementById('form')));draw(calculateCabinet(params));presentationReport('Exibindo o móvel em edição.')});
document.getElementById('create-presentation-link').addEventListener('click',()=>{
 try{if(!presentationModules.length)throw Error('Adicione pelo menos um móvel à apresentação.');
 const payload={version:1,title:document.getElementById('presentation-title').value.trim().slice(0,100),modules:presentationModules};
 const bytes=new TextEncoder().encode(JSON.stringify(payload));let binary='';for(const b of bytes)binary+=String.fromCharCode(b);
 const token=btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
 if(token.length>15000)throw Error('Apresentação muito grande para link. Reduza o número de módulos.');
 const url=new URL('./apresentacao.html',location.href);url.hash=token;
 document.getElementById('presentation-link').value=url.href;
 presentationReport('Link criado com '+presentationModules.length+' módulo(s). O cliente poderá explorar sem editar. A foto ainda não acompanha o link.');
 }catch(e){presentationReport(e.message)}
});
document.getElementById('copy-presentation-link').addEventListener('click',async()=>{
 const value=document.getElementById('presentation-link').value;
 if(!value)return presentationReport('Gere um link primeiro.');
 try{await navigator.clipboard.writeText(value);presentationReport('Link copiado.')}catch{document.getElementById('presentation-link').select();presentationReport('Selecione e copie o link exibido.')}
});
let roomPhotoUrl=null;
document.getElementById('room-photo').addEventListener('change',e=>{
 const file=e.target.files?.[0];if(roomPhotoUrl){URL.revokeObjectURL(roomPhotoUrl);roomPhotoUrl=null}
 const img=document.getElementById('room-preview');img.hidden=true;
 if(!file){host.style.backgroundImage='';scene.background=new THREE.Color('#282828');render();return;}
 if(!file.type.startsWith('image/')||file.size>12*1024*1024)return presentationReport('Escolha uma imagem de até 12 MB.');
 roomPhotoUrl=URL.createObjectURL(file);img.src=roomPhotoUrl;img.hidden=false;
 host.style.backgroundImage='url("'+roomPhotoUrl+'")';host.style.backgroundSize='cover';host.style.backgroundPosition='center';scene.background=null;render();
 presentationReport('Foto aplicada ao fundo do 3D. A perspectiva é ilustrativa; ajuste a câmera para aproximar a posição. O link do cliente ainda não inclui a foto.');
});
