import {calculateCabinet} from './engine.mjs';
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js';
const scene=new THREE.Scene();scene.background=new THREE.Color('#282828');
const camera=new THREE.PerspectiveCamera(40,1,.1,30);camera.position.set(2.8,2.1,3.8);camera.lookAt(0,0,0);
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));
const host=document.getElementById('scene');host.appendChild(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xffffff,0x777777,2));const light=new THREE.DirectionalLight(0xffffff,2);light.position.set(2,4,5);scene.add(light);
const group=new THREE.Group();scene.add(group);
let project=null,rotation={x:0,y:0},drag=null,showFront=true,doorsOpened=false,doorMeta=[];
let viewDistance=3,viewTarget=new THREE.Vector3(),viewAzimuth=.48,viewElevation=.22,modelSize=2;
const fronts=[];
const material=new THREE.MeshStandardMaterial({color:0xbda889,roughness:.75});
function addBox(x,y,z,w,h,d){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);mesh.position.set(x,y,z);group.add(mesh)}
function draw(p){fronts.length=0;doorMeta=[];doorsOpened=false;while(group.children.length){const mesh=group.children[0];group.remove(mesh);mesh.geometry.dispose()}
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
 modelSize=Math.sqrt(W*W+H*H+D*D);resetCamera();document.getElementById('previewDoors').textContent='Simular abertura das portas';render();
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
 return Math.max(modelSize/(2*Math.sin(vfov/2)),modelSize/(2*Math.sin(hfov/2)))*1.25;
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
 const right=new THREE.Vector3().setFromMatrixColumn(camera.matrix,0);
 const up=new THREE.Vector3().setFromMatrixColumn(camera.matrix,1);
 const scale=2*viewDistance*Math.tan(THREE.MathUtils.degToRad(camera.fov)/2)/(host.clientHeight||450);
 viewTarget.addScaledVector(right,-dx*scale).addScaledVector(up,dy*scale);updateCamera();
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
canvas.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY,mode:e.shiftKey||e.button===2?'pan':'orbit'};canvas.setPointerCapture(e.pointerId)});
canvas.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(drag.mode==='pan')panCamera(dx,dy);else{viewAzimuth-=dx*.005;viewElevation+=dy*.005;updateCamera()}drag.x=e.clientX;drag.y=e.clientY});
canvas.addEventListener('pointerup',()=>{drag=null});canvas.addEventListener('pointercancel',()=>{drag=null});
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
