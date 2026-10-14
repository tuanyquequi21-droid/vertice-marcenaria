import {calculateCabinet} from './engine.mjs';
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js';
const scene=new THREE.Scene();scene.background=new THREE.Color('#282828');
const camera=new THREE.PerspectiveCamera(40,1,.1,30);camera.position.set(2.8,2.1,3.8);camera.lookAt(0,0,0);
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.35;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const host=document.getElementById('scene');host.appendChild(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xffffff,0x777777,2));const light=new THREE.DirectionalLight(0xffffff,2);light.position.set(2,4,5);light.castShadow=true;light.shadow.mapSize.set(1024,1024);light.shadow.camera.left=-7;light.shadow.camera.right=7;light.shadow.camera.top=7;light.shadow.camera.bottom=-7;scene.add(light);
const group=new THREE.Group();scene.add(group);
let project=null,rotation={x:0,y:0},drag=null,showFront=true,doorsOpened=false,doorMeta=[];
let viewDistance=3,viewTarget=new THREE.Vector3(),viewAzimuth=.48,viewElevation=.22,modelSize=2,modelWidth=.8,modelHeight=2.2,modelDepth=.55;
const fronts=[];
const material=new THREE.MeshStandardMaterial({color:0xbda889,roughness:.75});
const bodyMaterial=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.75});
const doorMaterial=new THREE.MeshStandardMaterial({color:'#bda889',roughness:.75});
const drawerMaterial=new THREE.MeshStandardMaterial({color:'#bda889',roughness:.75});
let componentColorsActive=false;
function componentColors(){return {body:'#'+bodyMaterial.color.getHexString(),doors:'#'+doorMaterial.color.getHexString(),drawers:'#'+drawerMaterial.color.getHexString()}}
function applyComponentColors(colors){for(const [key,mat] of [['body',bodyMaterial],['doors',doorMaterial],['drawers',drawerMaterial]]){const value=colors?.[key];if(/^#[0-9a-fA-F]{6}$/.test(value||'')){mat.color.set(value);document.getElementById('cabinet-'+(key==='doors'?'door':key==='drawers'?'drawer':'body')+'-color').value=value}}componentColorsActive=true;for(const mesh of group.children){if(mesh.userData.partType)mesh.material=mesh.userData.partType==='door'?doorMaterial:mesh.userData.partType==='drawer'?drawerMaterial:bodyMaterial}for(const g of presentationGroup.children){g.traverse(o=>{if(o.isMesh&&o.userData.partType)o.material=o.userData.partType==='door'?doorMaterial:o.userData.partType==='drawer'?drawerMaterial:bodyMaterial})}render()}

function addBox(x,y,z,w,h,d){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData.partType='body';group.add(mesh)}
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
  const mesh=group.children[group.children.length-1];mesh.userData.partType='door';if(componentColorsActive)mesh.material=doorMaterial;fronts.push(mesh);
  doorMeta.push({mesh,type,index:i,closed:{x,y,z},width:panelW,height:panelH,swing:doors===2&&type==='hinged'?(i===0?'left':'right'):p.layout.doorSwing});
 }
 const bayW=p.layout.bayWidth/1000,bayX=-W/2+T+(p.layout.drawerBay-.5)*bayW+(p.layout.drawerBay-1)*T;
 for(let i=0;i<drawers;i++){addBox(bayX,-H/2+(i+.5)*DH/drawers,D/2+.012,bayW-.006,DH/drawers-.004,T);group.children[group.children.length-1].userData.partType='drawer';if(componentColorsActive)group.children[group.children.length-1].material=drawerMaterial;fronts.push(group.children[group.children.length-1])}
 for(let i=0;i<drawers;i++){const y=-H/2+(i+.5)*DH/drawers,boxH=Math.min(.16,DH/drawers-.05),boxW=(p.layout.bayWidth-2*t-26)/1000,boxD=(d-60)/1000;addBox(bayX-boxW/2,y,0,T,boxH,boxD);addBox(bayX+boxW/2,y,0,T,boxH,boxD);addBox(bayX,y,-boxD/2,boxW,boxH,T);addBox(bayX,y,boxD/2,boxW,boxH,T);addBox(bayX,y-boxH/2,0,boxW,.006,boxD)}
 if(componentColorsActive)for(const mesh of group.children)if(mesh.userData.partType==='body')mesh.material=bodyMaterial;
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
queueMicrotask(()=>document.getElementById('form').requestSubmit());
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
const presentationPlacements=[];
const presentationLabels=[];
let presentationPreview=false;
const presentationGroup=new THREE.Group();scene.add(presentationGroup);
const presentationStatus=document.getElementById('presentation-status');
const presentationCount=document.getElementById('presentation-count');
function presentationReport(message){presentationStatus.textContent=message}
function renderPresentationList(){
 const list=document.getElementById('presentation-module-list');list.replaceChildren();
 const placementSelect=document.getElementById('placement-module');const oldChoice=placementSelect.value;placementSelect.replaceChildren();
 presentationModules.forEach((params,i)=>{
  const option=document.createElement('option');option.value=String(i);option.textContent=(presentationLabels[i]?.name||'Módulo '+(i+1))+' ('+params.width+' × '+params.height+' mm)';placementSelect.append(option);
  const row=document.createElement('div');row.style.cssText='display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:8px 0;border-bottom:1px solid #ddd';
  const name=document.createElement('span');name.style.flex='1';name.textContent=(presentationLabels[i]?.name||'Módulo '+(i+1))+' ['+(presentationLabels[i]?.type||'móvel')+'] — '+params.width+' × '+params.height+' × '+params.depth+' mm';
  const edit=document.createElement('button');edit.type='button';edit.textContent='Editar';edit.onclick=()=>{applyProject({schemaVersion:1,kind:'cabinet',params});document.getElementById('module-name').value=presentationLabels[i]?.name||'';document.getElementById('module-type').value=presentationLabels[i]?.type||'outro';presentationPreview=false;presentationGroup.visible=false;group.visible=true;render();presentationReport('Módulo '+(i+1)+' carregado. Após alterar, clique em “Substituir módulo” para atualizar a apresentação.');selectedPresentationIndex=i;document.getElementById('add-presentation-module').textContent='Substituir módulo selecionado'};
  const remove=document.createElement('button');remove.type='button';remove.textContent='Remover';remove.onclick=()=>{presentationModules.splice(i,1);presentationPlacements.splice(i,1);presentationLabels.splice(i,1);selectedPresentationIndex=-1;document.getElementById('add-presentation-module').textContent='Adicionar móvel atual';renderPresentationList();if(presentationPreview)drawPresentation();};
  row.append(name,edit,remove);list.append(row);
 });
 presentationCount.textContent=presentationModules.length+' módulo(s) na apresentação.';
 if(presentationModules.length){placementSelect.value=String(Math.min(Number(oldChoice)||0,presentationModules.length-1));loadPlacement()}
 document.getElementById('presentation-link').value='';
}
let selectedPresentationIndex=-1;
function placementFor(i){return presentationPlacements[i]||{x:0,y:0,z:0,rotation:0}}
function loadPlacement(){const p=placementFor(Number(document.getElementById('placement-module').value));for(const key of ['x','y','z','rotation'])document.getElementById('placement-'+key).value=p[key]||0}
document.getElementById('placement-module').addEventListener('change',loadPlacement);
document.getElementById('apply-placement').addEventListener('click',()=>{const i=Number(document.getElementById('placement-module').value);if(!presentationModules[i])return presentationReport('Adicione um móvel antes de posicionar.');const p={};for(const key of ['x','y','z','rotation']){p[key]=Number(document.getElementById('placement-'+key).value);if(!Number.isFinite(p[key])||Math.abs(p[key])>100000)return presentationReport('Posição inválida.')}presentationPlacements[i]=p;drawPresentation();presentationReport('Posição 3D atualizada para o módulo '+(i+1)+'.')});
document.getElementById('view-placement').addEventListener('click',()=>{viewAzimuth=.48;viewElevation=.22;updateCamera()});
function presentationBox(parent,x,y,z,w,h,d){
 if(w<=0||h<=0||d<=0)return;
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),componentColorsActive?bodyMaterial:material);mesh.userData.partType='body';mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);
}
function drawPresentation(){
 while(presentationGroup.children.length){const child=presentationGroup.children[0];presentationGroup.remove(child);child.traverse(o=>{if(o.geometry)o.geometry.dispose()})}
 let total=0,maxHeight=0;const data=presentationModules.map(params=>{const p=calculateCabinet(params);total+=p.dimensions.width/1000;maxHeight=Math.max(maxHeight,p.dimensions.height/1000);return {params,p}});
 total+=Math.max(0,data.length-1)*.06;let offset=-total/2;
 for(const [index,{params,p}] of data.entries()){
  const w=p.dimensions.width/1000,h=p.dimensions.height/1000,d=p.dimensions.depth/1000,t=Number(params.thickness)/1000;
  const placement=placementFor(index);
  const g=new THREE.Group();g.position.set(offset+w/2+placement.x/1000,placement.y/1000,placement.z/1000);g.rotation.y=THREE.MathUtils.degToRad(placement.rotation);presentationGroup.add(g);offset+=w+.06;
  presentationBox(g,-w/2+t/2,0,0,t,h,d);presentationBox(g,w/2-t/2,0,0,t,h,d);
  presentationBox(g,0,-h/2+t/2,0,w-2*t,t,d);presentationBox(g,0,h/2-t/2,0,w-2*t,t,d);presentationBox(g,0,0,-d/2+.003,w,h,.006);
  const shelves=Number(params.shelves||0);
  for(let j=1;j<=shelves;j++)presentationBox(g,0,-h/2+j*h/(shelves+1),0,w-2*t,t,d-.006);
  const div=Number(params.dividers||0);
  for(let j=1;j<=div;j++)presentationBox(g,-w/2+t+j*p.layout.bayWidth/1000+(j-.5)*t,0,0,t,h-2*t,d-.006);
  const doors=Number(params.doors||0),dh=p.layout.drawerHeight/1000,ph=p.layout.doorHeight/1000,stack=p.layout.doorType==='flap-down'&&p.layout.flapLayout!=='horizontal';
  for(let j=0;j<doors;j++){presentationBox(g,stack?0:-w/2+(j+.5)*w/doors,stack?dh/2-ph/2+(j+.5)*ph/doors:dh/2,d/2+.012,stack?w-.006:w/doors-.006,stack?ph/doors-.004:ph-.004,t);const front=g.children[g.children.length-1];front.userData.partType='door';if(componentColorsActive)front.material=doorMaterial;}
  const drawers=Number(params.drawers||0),bayX=-w/2+t+(p.layout.drawerBay-.5)*p.layout.bayWidth/1000+(p.layout.drawerBay-1)*t;
  for(let j=0;j<drawers;j++){presentationBox(g,bayX,-h/2+(j+.5)*dh/drawers,d/2+.012,p.layout.bayWidth/1000-.006,dh/drawers-.004,t);const front=g.children[g.children.length-1];front.userData.partType='drawer';if(componentColorsActive)front.material=drawerMaterial;}
 }
 presentationPreview=true;group.visible=false;presentationGroup.visible=true;
 const bounds=new THREE.Box3().setFromObject(presentationGroup),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
 modelWidth=Math.max(total,size.x);modelHeight=Math.max(maxHeight,size.y);modelDepth=Math.max(.55,size.z);modelSize=Math.sqrt(modelWidth**2+modelHeight**2+modelDepth**2);resetCamera();viewTarget.copy(center);updateCamera();
}
document.getElementById('add-presentation-module').addEventListener('click',()=>{
 try{
  const params=Object.fromEntries(new FormData(document.getElementById('form')));calculateCabinet(params);
  const label={name:document.getElementById('module-name').value.trim().slice(0,60)||'Módulo '+(selectedPresentationIndex>=0?selectedPresentationIndex+1:presentationModules.length+1),type:document.getElementById('module-type').value};
  if(selectedPresentationIndex>=0){presentationModules[selectedPresentationIndex]=params;presentationLabels[selectedPresentationIndex]=label;selectedPresentationIndex=-1;document.getElementById('add-presentation-module').textContent='Adicionar móvel atual';presentationReport('Módulo atualizado na apresentação.')}
  else{
   if(presentationModules.some(m=>JSON.stringify(m)===JSON.stringify(params)))return presentationReport('Este móvel já está na apresentação. Altere as medidas ou selecione “Editar” para substituir um módulo.');
   if(presentationModules.length>=15)throw Error('Limite de 15 módulos por apresentação.');
   presentationModules.push(params);presentationLabels.push(label);presentationPlacements.push({x:0,y:0,z:0,rotation:0});presentationReport('Móvel adicionado. Configure outro móvel ou visualize a composição.');
  }
  renderPresentationList();drawPresentation();
 }catch(e){presentationReport(e.message)}
});
document.getElementById('clear-presentation').addEventListener('click',()=>{
 presentationModules.length=0;presentationPlacements.length=0;presentationLabels.length=0;selectedPresentationIndex=-1;document.getElementById('add-presentation-module').textContent='Adicionar móvel atual';renderPresentationList();
 presentationPreview=false;presentationGroup.visible=false;group.visible=true;resetCamera();presentationReport('Módulos removidos da apresentação.');
});
document.getElementById('preview-presentation').addEventListener('click',()=>{
 try{if(!presentationModules.length)throw Error('Adicione um móvel primeiro.');drawPresentation();presentationReport('Exibindo todos os módulos na mesma cena.')}catch(e){presentationReport(e.message)}
});
document.getElementById('preview-current').addEventListener('click',()=>{presentationPreview=false;presentationGroup.visible=false;group.visible=true;const params=Object.fromEntries(new FormData(document.getElementById('form')));draw(calculateCabinet(params));presentationReport('Exibindo o móvel em edição.')});
function syncCurrentCabinetForSharing(){
 const params=Object.fromEntries(new FormData(document.getElementById('form')));
 calculateCabinet(params);
 const label={name:(document.getElementById('module-name').value.trim()||'Móvel em edição').slice(0,100),type:document.getElementById('module-type').value};
 if(selectedPresentationIndex>=0&&presentationModules[selectedPresentationIndex]){
  presentationModules[selectedPresentationIndex]={...params};
  presentationLabels[selectedPresentationIndex]=label;
 }else if(!presentationModules.length){
  presentationModules.push({...params});
  presentationLabels.push(label);
  presentationPlacements.push({x:0,y:0,z:0,rotation:0});
 }else{
  // Uma edição isolada não deve desaparecer da apresentação.
  const existing=presentationModules.findIndex(m=>JSON.stringify(m)===JSON.stringify(params));
  if(existing<0){
   if(presentationModules.length>=15)throw Error('Limite de 15 módulos. Remova um módulo para incluir o móvel em edição.');
   presentationModules.push({...params});
   presentationLabels.push(label);
   presentationPlacements.push({x:0,y:0,z:0,rotation:0});
  }
 }
 renderPresentationList();
}
document.getElementById('create-presentation-link').addEventListener('click',()=>{
 try{syncCurrentCabinetForSharing();if(!presentationModules.length)throw Error('Adicione pelo menos um móvel à apresentação.');
 const payload={version:1,title:document.getElementById('presentation-title').value.trim().slice(0,100),modules:presentationModules,placements:presentationPlacements,labels:presentationLabels,finish:{color:'#'+material.color.getHexString(),image:componentColorsActive?null:(activeShareFinishImage||null)},componentColors:componentColorsActive?componentColors():null};
 const bytes=new TextEncoder().encode(JSON.stringify(payload));let binary='';for(const b of bytes)binary+=String.fromCharCode(b);
 const token=btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
 if(token.length>15000)throw Error('O link ficou grande demais para incluir a textura. Utilize um acabamento de cor sólida ou aguarde o compartilhamento de imagens na nuvem.');
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

// Cada módulo é uma caixa estrutural independente: laterais adjacentes são
// contabilizadas duas vezes, como peças distintas, sem compartilhamento automático.
function combinedParts(){
 if(!presentationModules.length)throw Error('Adicione pelo menos um módulo.');
 const rows=[],totals=new Map();let area=0,edge=0;
 presentationModules.forEach((params,i)=>{
  const p=calculateCabinet(params);area+=p.areaM2;edge+=p.edgeM;
  const label=presentationLabels[i]?.name||'Módulo '+(i+1);
  for(const part of p.parts){rows.push([label,part.name,part.qty,part.width,part.height,part.thickness]);const k=String(part.thickness);totals.set(k,(totals.get(k)||0)+part.qty*part.width*part.height/1e6)}
 });
 return {rows,totals,area,edge};
}
document.getElementById('module-materials').addEventListener('click',()=>{
 try{const data=combinedParts();document.getElementById('module-material-summary').textContent=presentationModules.length+' módulos independentes | Área total: '+data.area.toFixed(2)+' m² | Fita: '+data.edge.toFixed(2)+' m | MDF por espessura: '+[...data.totals].map(([t,a])=>t+' mm: '+a.toFixed(2)+' m²').join(' · ')+'. Laterais encostadas são contadas separadamente.'}catch(e){presentationReport(e.message)}
});
document.getElementById('export-module-parts').addEventListener('click',()=>{
 try{const {rows}=combinedParts();download('vertice-cozinha-modulos-pecas.csv','\ufeff'+[['Módulo','Peça','Quantidade','Largura mm','Altura mm','Espessura mm'],...rows].map(r=>r.join(';')).join('\r\n'),'text/csv;charset=utf-8');presentationReport('Lista consolidada exportada, mantendo as peças de cada módulo separadas.')}catch(e){presentationReport(e.message)}
});
document.getElementById('duplicate-module').addEventListener('click',()=>{
 const i=Number(document.getElementById('placement-module').value);
 if(!presentationModules[i])return presentationReport('Selecione um módulo para duplicar.');
 if(presentationModules.length>=15)return presentationReport('Limite de 15 módulos.');
 presentationModules.push({...presentationModules[i]});
 presentationLabels.push({...presentationLabels[i],name:(presentationLabels[i]?.name||'Módulo')+' (cópia)'});
 presentationPlacements.push({...placementFor(i),x:placementFor(i).x+Number(presentationModules[i].width||0)+60});
 renderPresentationList();drawPresentation();presentationReport('Módulo duplicado com estrutura e peças próprias.');
});

// Interação direta: separar navegação da câmera do arrasto de módulos.
let interactionMode='view',movingPointer=null,selectedOutline=null;
const groundGrid=new THREE.GridHelper(12,24,0x8d7955,0x555555);
groundGrid.position.y=-1.12;groundGrid.material.transparent=true;groundGrid.material.opacity=.28;groundGrid.visible=false;scene.add(groundGrid);
function syncInteractionMode(){
 document.getElementById('mode-view').setAttribute('aria-pressed',String(interactionMode==='view'));
 document.getElementById('mode-move').setAttribute('aria-pressed',String(interactionMode==='move'));
 document.getElementById('interaction-hint').textContent=interactionMode==='move'
 ?'Modo Mover: clique no móvel e arraste para posicionar na foto. Use Mais ao fundo / Mais à frente para alterar a profundidade. Para girar a câmera, volte a Visualizar.'
 :'Modo Visualizar: arraste para girar a câmera. Clique em Mover móvel para selecionar e arrastar os módulos da apresentação.';
 canvas.style.cursor=interactionMode==='move'?'move':'grab';
}
document.getElementById('mode-view').onclick=()=>{interactionMode='view';movingPointer=null;syncInteractionMode()};
document.getElementById('mode-move').onclick=()=>{
 if(!presentationModules.length){const add=document.getElementById('add-presentation-module');add.click();if(!presentationModules.length)return presentationReport('Não foi possível adicionar o móvel. Confira as medidas.');}
 if(!presentationPreview)drawPresentation();
 interactionMode='move';syncInteractionMode();selectMoveModule(Number(document.getElementById('placement-module').value)||0);
};
function selectMoveModule(index){
 if(!presentationModules[index])return;
 const select=document.getElementById('placement-module');select.value=String(index);loadPlacement();
 if(selectedOutline){presentationGroup.remove(selectedOutline);selectedOutline.geometry.dispose();selectedOutline.material.dispose();selectedOutline=null}
 const module= presentationGroup.children[index];
 if(module){selectedOutline=new THREE.BoxHelper(module,0xffd15c);presentationGroup.add(selectedOutline)}
 render();
}
const oldDrawPresentation=drawPresentation;
drawPresentation=function(){
 if(selectedOutline){presentationGroup.remove(selectedOutline);selectedOutline.geometry.dispose();selectedOutline.material.dispose();selectedOutline=null}
 oldDrawPresentation();
 groundGrid.position.y=-modelHeight/2-.025;
 if(interactionMode==='move'&&presentationModules.length)selectMoveModule(Number(document.getElementById('placement-module').value)||0);
};
document.getElementById('placement-module').addEventListener('change',()=>{if(presentationPreview)selectMoveModule(Number(document.getElementById('placement-module').value))});
function moveDepth(delta){
 if(!presentationModules.length){document.getElementById('add-presentation-module').click();if(!presentationModules.length)return presentationReport('Adicione um móvel para ajustar a profundidade.');}
 const i=Number(document.getElementById('placement-module').value);
 if(!presentationModules[i])return presentationReport('Selecione um módulo.');
 if(!presentationPreview)drawPresentation();const p={...placementFor(i)};p.z=Math.round((p.z+delta)/10)*10;presentationPlacements[i]=p;
 drawPresentation();loadPlacement();presentationReport('Profundidade do módulo: '+p.z+' mm.');
}
document.getElementById('move-depth-back').onclick=()=>moveDepth(-100);
document.getElementById('move-depth-front').onclick=()=>moveDepth(100);
const raycaster=new THREE.Raycaster(),mouseNdc=new THREE.Vector2();
canvas.addEventListener('pointerdown',e=>{
 if(interactionMode!=='move'||!presentationPreview||e.button!==0)return;
 e.stopImmediatePropagation();e.preventDefault();
 const rect=canvas.getBoundingClientRect();
 mouseNdc.set((e.clientX-rect.left)/rect.width*2-1,-((e.clientY-rect.top)/rect.height*2-1));
 raycaster.setFromCamera(mouseNdc,camera);
 const hit=raycaster.intersectObjects(presentationGroup.children.filter((child,i)=>i<presentationModules.length),true)[0];
 if(!hit){movingPointer=null;return}
 let root=hit.object;while(root.parent&&root.parent!==presentationGroup)root=root.parent;
 const index=presentationGroup.children.indexOf(root);if(index<0||index>=presentationModules.length)return;
 selectMoveModule(index);
 movingPointer={id:e.pointerId,index,x:e.clientX,y:e.clientY};
 canvas.setPointerCapture(e.pointerId);
},true);
canvas.addEventListener('pointermove',e=>{
 if(interactionMode!=='move'||!presentationPreview)return;
 e.stopImmediatePropagation();if(!movingPointer||movingPointer.id!==e.pointerId)return;
 const dx=e.clientX-movingPointer.x,dy=e.clientY-movingPointer.y;
 movingPointer.x=e.clientX;movingPointer.y=e.clientY;
 camera.updateMatrixWorld(true);
 const right=new THREE.Vector3(1,0,0).applyQuaternion(camera.quaternion);
 const up=new THREE.Vector3(0,1,0).applyQuaternion(camera.quaternion);
 const scale=2*viewDistance*Math.tan(THREE.MathUtils.degToRad(camera.fov)/2)/(host.clientHeight||450)*1000;
 const p={...placementFor(movingPointer.index)};
 p.x=Math.round((p.x+(dx*right.x-dy*up.x)*scale)/10)*10;
 p.y=Math.round((p.y+(-dx*right.y+dy*up.y)*scale)/10)*10;
 p.z=Math.round((p.z+(dx*right.z-dy*up.z)*scale)/10)*10;
 presentationPlacements[movingPointer.index]=p;
 const g=presentationGroup.children[movingPointer.index];
 if(g){const baseline=-presentationModules.reduce((s,m)=>s+Number(m.width)/1000,0)/2-(presentationModules.length-1)*.03+presentationModules.slice(0,movingPointer.index).reduce((s,m)=>s+Number(m.width)/1000+.06,0)+Number(presentationModules[movingPointer.index].width)/2000;g.position.set(baseline+p.x/1000,p.y/1000,p.z/1000)}
 if(selectedOutline&&g)selectedOutline.update();loadPlacement();render();
},true);
function stopMoving(e){if(!movingPointer||e.pointerId!==movingPointer.id)return;e.stopImmediatePropagation();movingPointer=null;drawPresentation();presentationReport('Módulo posicionado. Use os botões de profundidade para ajustar a distância.')}
canvas.addEventListener('pointerup',stopMoving,true);
canvas.addEventListener('pointercancel',stopMoving,true);
syncInteractionMode();

const FINISH_KEY='vertice:studio:finishes:v1';
let activeShareFinishImage=null;
let finishes=[];
try{finishes=JSON.parse(localStorage.getItem(FINISH_KEY)||'[]');if(!Array.isArray(finishes))finishes=[]}catch{finishes=[]}
function finishReport(msg){document.getElementById('finish-status').textContent=msg}
function refreshFinishes(){
 const select=document.getElementById('finish-list'),old=select.value;select.replaceChildren();
 finishes.forEach((f,i)=>{const opt=document.createElement('option');opt.value=String(i);opt.textContent=f.brand+' — '+f.name;select.append(opt)});
 if(finishes.length)select.value=old&&Number(old)<finishes.length?old:'0';
}
function applyFinish(f){
 activeShareFinishImage=f.image||null;
 material.color.set(f.image?'#ffffff':(f.color||'#bda889'));
 if(material.map){material.map.dispose();material.map=null}
 if(f.image){
  new THREE.TextureLoader().load(f.image,texture=>{
   texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
   texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
   material.map=texture;material.needsUpdate=true;render();finishReport('Textura '+f.name+' aplicada ao modelo. Confira a orientação do veio.');
  },undefined,()=>finishReport('Não foi possível carregar a imagem. Usando a cor aproximada.'));
 }else{material.needsUpdate=true;render();finishReport('Cor '+f.name+' aplicada ao modelo.')}
}
document.getElementById('finish-save').onclick=async()=>{
 try{
  const brand=document.getElementById('finish-brand').value.trim(),name=document.getElementById('finish-name').value.trim(),color=document.getElementById('finish-color').value;
  if(!brand||!name)throw Error('Informe fabricante e nome do padrão.');
  if(finishes.length>=30)throw Error('Limite local de 30 padrões. Exporte/limpe padrões antigos antes de cadastrar mais.');
  const file=document.getElementById('finish-image').files[0];let image=null;
  if(file){
   if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>8*1024*1024)throw Error('Use JPG, PNG ou WebP de até 8 MB.');
   image=await new Promise((resolve,reject)=>{
    const img=new Image(),url=URL.createObjectURL(file);
    img.onload=()=>{const canvas=document.createElement('canvas');const factor=Math.min(1,768/Math.max(img.width,img.height));canvas.width=Math.max(1,Math.round(img.width*factor));canvas.height=Math.max(1,Math.round(img.height*factor));canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);URL.revokeObjectURL(url);resolve(canvas.toDataURL('image/jpeg',.72))};
    img.onerror=()=>{URL.revokeObjectURL(url);reject(Error('Imagem inválida.'))};img.src=url;
   });
  }
  const finish={brand:brand.slice(0,60),name:name.slice(0,80),color,image};
  const next=[...finishes,finish];localStorage.setItem(FINISH_KEY,JSON.stringify(next));finishes=next;refreshFinishes();
  document.getElementById('finish-list').value=String(finishes.length-1);applyFinish(finish);
  finishReport('Padrão cadastrado neste navegador e aplicado ao 3D. A imagem não é enviada ao cliente.');
 }catch(e){finishReport('Erro: '+e.message)}
};
document.getElementById('finish-apply').onclick=()=>{
 const f=finishes[Number(document.getElementById('finish-list').value)];
 if(!f)return finishReport('Cadastre um acabamento primeiro.');
 applyFinish(f);
};
refreshFinishes();

document.getElementById('quick-share-3d').addEventListener('click',()=>{
 try{
  // O gerador de link inclui automaticamente o móvel atualmente em edição.
  document.getElementById('create-presentation-link').click();
  const link=document.getElementById('presentation-link');
  if(!link.value)return;
  link.scrollIntoView({behavior:'smooth',block:'center'});
  link.focus();link.select();
  presentationReport('Link 3D pronto para copiar e enviar ao cliente. O cliente pode explorar sem editar.');
 }catch(e){presentationReport('Erro ao gerar link: '+e.message)}
});

function activateStudioStep(step){
 const steps=['create','room','finish','share'];
 if(!steps.includes(step))return;
 document.querySelectorAll('#studio-steps [data-step]').forEach(b=>{const active=b.dataset.step===step;b.setAttribute('aria-pressed',String(active));b.style.background=active?'#b08b46':'';b.style.color=active?'#fff':''});
 const panels={create:document.getElementById('form'),room:document.getElementById('placement-panel'),finish:document.getElementById('finish-panel'),share:document.getElementById('share-panel')};
 for(const [key,panel] of Object.entries(panels))if(panel){panel.style.outline=key===step?'2px solid #b08b46':'';panel.style.outlineOffset=key===step?'4px':''}
 if(step==='room'&&presentationModules.length){if(!presentationPreview)drawPresentation();interactionMode='move';syncInteractionMode()}
 if(step==='create'){interactionMode='view';syncInteractionMode()}
 if(step==='share'&&presentationModules.length&&!document.getElementById('presentation-link').value)document.getElementById('create-presentation-link').click();
 const panel=panels[step];if(panel)panel.scrollIntoView({behavior:'smooth',block:'center'});
}
document.querySelectorAll('#studio-steps [data-step]').forEach(b=>b.addEventListener('click',()=>activateStudioStep(b.dataset.step)));

let photoComposeActive=false;
function photoMessage(message){document.getElementById('photo-compose-status').textContent=message}
function photoSelectedIndex(){return Number(document.getElementById('placement-module').value)||0}
function ensurePhotoModule(){
 if(!presentationModules.length)document.getElementById('add-presentation-module').click();
 if(!presentationModules.length){photoMessage('Configure as medidas do móvel antes de posicionar.');return false}
 if(!presentationPreview)drawPresentation();
 return true;
}
document.getElementById('photo-compose').onclick=()=>{
 if(!photoComposeActive&&!roomPhotoUrl){photoMessage('Primeiro carregue uma fotografia do ambiente no painel lateral.');document.getElementById('room-photo').scrollIntoView({behavior:'smooth',block:'center'});return}
 if(!photoComposeActive&&!ensurePhotoModule())return;
 photoComposeActive=!photoComposeActive;
 const btn=document.getElementById('photo-compose');
 btn.setAttribute('aria-pressed',String(photoComposeActive));
 btn.style.background=photoComposeActive?'#b08b46':'';
 btn.style.color=photoComposeActive?'#fff':'';
 groundGrid.visible=!photoComposeActive;
 if(photoComposeActive){
  interactionMode='move';syncInteractionMode();
  selectMoveModule(photoSelectedIndex());
  photoMessage('Foto fixa. Clique no móvel e arraste para posicionar. Girar altera o ângulo; Menor/Maior muda a distância aparente. A escala é ilustrativa.');
 }else{movingPointer=null;interactionMode='view';syncInteractionMode();photoMessage('Modo foto desativado. A câmera pode girar novamente.')}
 render();
};
function photoAdjustRotation(degrees){
 if(!ensurePhotoModule())return;
 const i=photoSelectedIndex(),p={...placementFor(i)};
 p.rotation=(p.rotation+degrees)%360;presentationPlacements[i]=p;
 drawPresentation();loadPlacement();photoMessage('Rotação do móvel: '+p.rotation+'°.'); 
}
document.getElementById('photo-rotate-left').onclick=()=>photoAdjustRotation(-15);
document.getElementById('photo-rotate-right').onclick=()=>photoAdjustRotation(15);
function photoAdjustSize(amount){
 if(!ensurePhotoModule())return;
 const i=photoSelectedIndex(),p={...placementFor(i)};
 p.z=Math.max(-5000,Math.min(5000,p.z+amount));presentationPlacements[i]=p;
 drawPresentation();loadPlacement();photoMessage('Profundidade alterada em '+amount+' mm. A foto não fornece escala real.');
}
document.getElementById('photo-smaller').onclick=()=>photoAdjustSize(-150);
document.getElementById('photo-larger').onclick=()=>photoAdjustSize(150);
// No modo foto, bloqueia a órbita de câmera mesmo ao clicar fora do móvel.
canvas.addEventListener('pointerdown',e=>{
 if(!photoComposeActive)return;
 e.stopImmediatePropagation();
 if(e.button!==0)return;
 const rect=canvas.getBoundingClientRect();
 mouseNdc.set((e.clientX-rect.left)/rect.width*2-1,-((e.clientY-rect.top)/rect.height*2-1));
 raycaster.setFromCamera(mouseNdc,camera);
 const hit=raycaster.intersectObjects(presentationGroup.children.slice(0,presentationModules.length),true)[0];
 if(!hit){photoMessage('Clique sobre o móvel para arrastá-lo. A fotografia permanece fixa.');return}
 let root=hit.object;while(root.parent&&root.parent!==presentationGroup)root=root.parent;
 const index=presentationGroup.children.indexOf(root);
 if(index<0||index>=presentationModules.length)return;
 selectMoveModule(index);
 movingPointer={id:e.pointerId,index,x:e.clientX,y:e.clientY};
 canvas.setPointerCapture(e.pointerId);
},true);
canvas.addEventListener('pointermove',e=>{if(photoComposeActive)e.stopImmediatePropagation()},true);
canvas.addEventListener('wheel',e=>{if(photoComposeActive){e.preventDefault();e.stopImmediatePropagation()}}, {capture:true,passive:false});

// Persistência local completa (v2): mantém compatibilidade com o formato legado.
const STUDIO_COMPLETE_KEY='vertice:studio:complete-project:v2';
function studioSnapshot(){
 const params=Object.fromEntries(new FormData(document.getElementById('form')));
 calculateCabinet(params);
 return {schemaVersion:2,kind:'vertice-studio',savedAt:new Date().toISOString(),
  current:params,modules:presentationModules.map((m,i)=>({
   params:{...m},placement:{...placementFor(i)},label:{...(presentationLabels[i]||{})}
  }))};
}
function restoreStudioSnapshot(snapshot){
 if(!snapshot||snapshot.schemaVersion!==2||snapshot.kind!=='vertice-studio'||!Array.isArray(snapshot.modules)||snapshot.modules.length>100)throw Error('Projeto Studio incompatível.');
 calculateCabinet(snapshot.current);
 const entries=snapshot.modules.map(item=>{
  if(!item||!item.params||!item.placement)throw Error('Módulo inválido.');
  calculateCabinet(item.params);
  const placement={};
  for(const key of ['x','y','z','rotation']){
   const n=Number(item.placement[key]||0);
   if(!Number.isFinite(n)||Math.abs(n)>100000)throw Error('Posicionamento inválido.');
   placement[key]=n;
  }
  return {params:item.params,placement,label:{name:String(item.label?.name||'').slice(0,100),type:String(item.label?.type||'outro').slice(0,40)}};
 });
 applyProject({schemaVersion:1,kind:'cabinet',params:snapshot.current});
 presentationModules.splice(0,presentationModules.length,...entries.map(x=>x.params));
 presentationPlacements.splice(0,presentationPlacements.length,...entries.map(x=>x.placement));
 presentationLabels.splice(0,presentationLabels.length,...entries.map(x=>x.label));
 selectedPresentationIndex=-1;
 document.getElementById('add-presentation-module').textContent='Adicionar móvel atual';
 renderPresentationList();
 if(presentationModules.length)drawPresentation();
 report('Projeto completo recuperado: '+entries.length+' módulo(s).');
}
const legacySave=document.getElementById('save'),legacyLoad=document.getElementById('load'),legacyExport=document.getElementById('export'),legacyImport=document.getElementById('import');
for(const button of [legacySave,legacyLoad,legacyExport])button.addEventListener('click',e=>e.stopImmediatePropagation(),true);
legacySave.addEventListener('click',()=>{
 try{localStorage.setItem(STUDIO_COMPLETE_KEY,JSON.stringify(studioSnapshot()));report('Projeto completo salvo neste navegador, incluindo módulos e posições. Foto e texturas continuam em armazenamento separado.')}catch(e){report('Falha ao salvar: '+e.message)}
});
legacyLoad.addEventListener('click',()=>{
 try{const saved=localStorage.getItem(STUDIO_COMPLETE_KEY);if(saved)restoreStudioSnapshot(JSON.parse(saved));
 else{const old=localStorage.getItem(storageKey);if(!old)throw Error('Nenhum projeto local encontrado.');applyProject(JSON.parse(old));report('Projeto antigo recuperado (apenas móvel atual).')}}
 catch(e){report('Falha ao abrir: '+e.message)}
});
legacyExport.addEventListener('click',()=>{
 try{download('vertice-studio-projeto-completo.json',JSON.stringify(studioSnapshot(),null,2),'application/json');report('Backup completo de módulos e posições exportado. A foto e os arquivos de textura não estão incluídos.')}
 catch(e){report('Falha ao exportar: '+e.message)}
});
legacyImport.addEventListener('change',async e=>{
 const file=e.target.files?.[0];if(!file)return;
 e.stopImmediatePropagation();
 try{if(file.size>2000000)throw Error('Arquivo maior que 2 MB.');const data=JSON.parse(await file.text());if(data.schemaVersion===2)restoreStudioSnapshot(data);else{applyProject(data);report('Projeto legado importado.')}}
 catch(err){report('Falha na importação: '+err.message)}
 finally{e.target.value=''}
},true);

document.getElementById('apply-component-colors').addEventListener('click',()=>{
 applyComponentColors({body:document.getElementById('cabinet-body-color').value,doors:document.getElementById('cabinet-door-color').value,drawers:document.getElementById('cabinet-drawer-color').value});
 presentationReport('Cores de estrutura, portas e gavetas aplicadas. Gere um novo link 3D.');
});
document.getElementById('align-modules').addEventListener('click',()=>{
 if(!presentationModules.length)return presentationReport('Adicione móveis antes de alinhar.');
 let x=0;
 for(let i=0;i<presentationModules.length;i++){
  const p=placementFor(i);
  presentationPlacements[i]={...p,x:Math.round(x),y:0,z:0,rotation:0};
  x+=Number(presentationModules[i].width)||0;
 }
 renderPresentationList();drawPresentation();
 presentationReport('Módulos alinhados em sequência, sem espaçamento adicional.');
});
document.getElementById('duplicate-selected').addEventListener('click',()=>{
 const i=Number(document.getElementById('placement-module').value);
 if(!presentationModules[i])return presentationReport('Selecione um módulo para duplicar.');
 if(presentationModules.length>=15)return presentationReport('Limite de 15 módulos.');
 presentationModules.push({...presentationModules[i]});
 presentationLabels.push({...presentationLabels[i],name:(presentationLabels[i]?.name||'Módulo')+' cópia'});
 presentationPlacements.push({...placementFor(i),x:(Number(placementFor(i).x)||0)+Number(presentationModules[i].width)});
 renderPresentationList();document.getElementById('placement-module').value=String(presentationModules.length-1);
 drawPresentation();presentationReport('Módulo duplicado.');
});
