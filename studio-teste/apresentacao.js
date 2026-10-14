import {calculateCabinet} from './engine.mjs';
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js';

const host=document.getElementById('scene'),error=document.getElementById('error');
// Bordas discretamente arredondadas simulam a quina real do MDF com fita de borda.
const cabinetGeometryCache=new Map();
function cabinetGeometry(w,h,d){
 const key=[w,h,d].map(v=>v.toFixed(5)).join('|');
 if(!cabinetGeometryCache.has(key)){
  const radius=Math.min(.0015,Math.min(w,h,d)*.18);
  cabinetGeometryCache.set(key,new THREE.BoxGeometry(w,h,d));
 }
 return cabinetGeometryCache.get(key);
}
// Textura microgranulada procedural para quebrar a aparência artificial de superfícies lisas.
const grainCanvas=document.createElement('canvas');grainCanvas.width=128;grainCanvas.height=128;
const grainContext=grainCanvas.getContext('2d'),grainPixels=grainContext.createImageData(128,128);
for(let y=0;y<128;y++)for(let x=0;x<128;x++){
 const i=(y*128+x)*4;
 const v=192+Math.floor(14*Math.sin(y*.83+x*.12)+12*Math.sin(y*.17)+8*Math.sin(x*1.7+y*.21));
 grainPixels.data[i]=grainPixels.data[i+1]=grainPixels.data[i+2]=Math.max(0,Math.min(255,v));
 grainPixels.data[i+3]=255;
}
grainContext.putImageData(grainPixels,0,0);
const microBump=new THREE.CanvasTexture(grainCanvas);microBump.wrapS=microBump.wrapT=THREE.RepeatWrapping;microBump.repeat.set(3,3);
function finishSurface(mat){mat.bumpMap=microBump;mat.bumpScale=.00018;mat.roughness=.62;mat.metalness=0;mat.needsUpdate=true}
const scene=new THREE.Scene();scene.background=new THREE.Color('#34383d');
const camera=new THREE.PerspectiveCamera(42,1,.05,100);
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.setPixelRatio(Math.min(devicePixelRatio,2.5));host.append(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xffffff,0x666666,2.4));const light=new THREE.DirectionalLight(0xffffff,2);light.position.set(3,6,5);light.castShadow=true;light.shadow.mapSize.set(2048,2048);light.shadow.camera.left=-8;light.shadow.camera.right=8;light.shadow.camera.top=8;light.shadow.camera.bottom=-8;light.shadow.bias=-.00015;scene.add(light);const fill=new THREE.DirectionalLight(0xc9d8ff,.6);fill.position.set(-4,2,-3);scene.add(fill);
const root=new THREE.Group();scene.add(root);let distance=4,azimuth=.55,elevation=.22,target=new THREE.Vector3(),extent=2;
const material=new THREE.MeshStandardMaterial({color:0xbda889,roughness:.58,metalness:.015});
const bodyMaterial=material.clone(),doorMaterial=material.clone(),drawerMaterial=material.clone();
for(const mat of [material,bodyMaterial,doorMaterial,drawerMaterial])finishSurface(mat);
let independentColors=false;
function box(g,x,y,z,w,h,d,part='body'){if(w<=0||h<=0||d<=0)return;const m=new THREE.Mesh(cabinetGeometry(w,h,d),independentColors?(part==='door'?doorMaterial:part==='drawer'?drawerMaterial:bodyMaterial):material);m.position.set(x,y,z);m.userData.partType=part;m.castShadow=true;m.receiveShadow=true;g.add(m)}
function furniture(params,offset){const p=calculateCabinet(params),w=p.dimensions.width/1000,h=p.dimensions.height/1000,d=p.dimensions.depth/1000,t=Number(params.thickness||18)/1000;
 const g=new THREE.Group();g.position.x=offset;root.add(g);
 box(g,-w/2+t/2,0,0,t,h,d);box(g,w/2-t/2,0,0,t,h,d);box(g,0,-h/2+t/2,0,w-2*t,t,d);box(g,0,h/2-t/2,0,w-2*t,t,d);box(g,0,0,-d/2+.003,w,h,.006);
 for(let i=1;i<=Number(params.shelves||0);i++)box(g,0,-h/2+i*h/(Number(params.shelves)+1),0,w-2*t,t,d-.006);
 const div=Number(params.dividers||0);for(let i=1;i<=div;i++)box(g,-w/2+t+i*p.layout.bayWidth/1000+(i-.5)*t,0,0,t,h-2*t,d-.006);
 const doors=Number(params.doors||0),dh=p.layout.drawerHeight/1000,ph=p.layout.doorHeight/1000,stack=p.layout.doorType==='flap-down'&&p.layout.flapLayout!=='horizontal';
 for(let i=0;i<doors;i++)box(g,stack?0:-w/2+(i+.5)*w/doors,stack?dh/2-ph/2+(i+.5)*ph/doors:dh/2,d/2+.012,stack?w-.006:w/doors-.006,stack?ph/doors-.004:ph-.004,t,'door');
 const drawers=Number(params.drawers||0),bayX=-w/2+t+(p.layout.drawerBay-.5)*p.layout.bayWidth/1000+(p.layout.drawerBay-1)*t;
 for(let i=0;i<drawers;i++)box(g,bayX,-h/2+(i+.5)*dh/drawers,d/2+.012,p.layout.bayWidth/1000-.006,dh/drawers-.004,t,'drawer');
 if(params._colors){for(const mesh of g.children){const key=mesh.userData.partType==='door'?'doors':mesh.userData.partType==='drawer'?'drawers':'body';if(/^#[0-9a-fA-F]{6}$/.test(params._colors[key]||'')){mesh.material=mesh.material.clone();mesh.material.map=null;mesh.material.color.set(params._colors[key]);}}}
 return {w,h};
}
function update(){camera.position.set(target.x+distance*Math.sin(azimuth)*Math.cos(elevation),target.y+distance*Math.sin(elevation),target.z+distance*Math.cos(azimuth)*Math.cos(elevation));camera.lookAt(target);render()}
function render(){const w=host.clientWidth||600,h=host.clientHeight||450;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();renderer.render(scene,camera)}
function fit(){azimuth=.55;elevation=.22;if(root.children.length)target.copy(new THREE.Box3().setFromObject(root).getCenter(new THREE.Vector3()));distance=extent*1.65;update()}
function zoom(f){distance=THREE.MathUtils.clamp(distance*f,extent*.65,extent*10);update()}
function decode(){const token=location.hash.slice(1);if(!token||token.length>15000)throw Error('Link inválido ou incompleto.');const binary=atob(token.replace(/-/g,'+').replace(/_/g,'/'));const bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));const obj=JSON.parse(new TextDecoder().decode(bytes));if(obj.version!==1||!Array.isArray(obj.modules)||!obj.modules.length||obj.modules.length>15)throw Error('Projeto incompatível.');return obj}
try{const data=decode();if(data.componentColors){const colors=data.componentColors;for(const [key,mat] of [['body',bodyMaterial],['doors',doorMaterial],['drawers',drawerMaterial]]){if(/^#[0-9a-fA-F]{6}$/.test(colors[key]||''))mat.color.set(colors[key]);else throw Error('Cor de componente inválida.')}independentColors=true}if(data.finish){if(/^#[0-9a-fA-F]{6}$/.test(data.finish.color||''))material.color.set(data.finish.color);if(typeof data.finish.image==='string'&&/^data:image\/(jpeg|png|webp);base64,/.test(data.finish.image)&&data.finish.image.length<12000){new THREE.TextureLoader().load(data.finish.image,tex=>{tex.colorSpace=THREE.SRGBColorSpace;material.color.set('#ffffff');material.map=tex;material.needsUpdate=true;render()})}}document.getElementById('title').textContent=String(data.title||'Projeto de móveis planejados').slice(0,100);let total=0,maxH=0;const sizes=data.modules.map(m=>{const p=calculateCabinet(m);total+=p.dimensions.width/1000;maxH=Math.max(maxH,p.dimensions.height/1000);return p.dimensions.width/1000});total+=Math.max(0,data.modules.length-1)*.06;let x=-total/2;data.modules.forEach((m,i)=>{const w=sizes[i];const before=root.children.length;furniture(m,x+w/2);const g=root.children[before];const pos=Array.isArray(data.placements)?data.placements[i]:null;if(pos&&g){for(const k of ['x','y','z','rotation'])if(!Number.isFinite(Number(pos[k]))||Math.abs(Number(pos[k]))>100000)throw Error('Posição inválida.');g.position.x+=Number(pos.x||0)/1000;g.position.y=Number(pos.y||0)/1000;g.position.z=Number(pos.z||0)/1000;g.rotation.y=THREE.MathUtils.degToRad(Number(pos.rotation||0));}x+=w+.06});const bounds=new THREE.Box3().setFromObject(root);target.copy(bounds.getCenter(new THREE.Vector3()));extent=bounds.getSize(new THREE.Vector3()).length();azimuth=.55;elevation=.22;distance=extent*1.65;update();document.getElementById('details').textContent=data.modules.length+' módulo(s) · Largura total aproximada: '+Math.round(total*1000)+' mm · Visualização não editável.'}catch(e){error.textContent=e.message}
document.getElementById('front').onclick=()=>{azimuth=0;elevation=0;update()};
document.getElementById('iso').onclick=()=>{azimuth=.55;elevation=.22;update()};
document.getElementById('reset').onclick=fit;
document.getElementById('plus').onclick=()=>zoom(.8);
document.getElementById('minus').onclick=()=>zoom(1.25);
let drag=null;const pointers=new Map(),canvas=renderer.domElement;canvas.style.touchAction='none';
canvas.addEventListener('pointerdown',e=>{pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===1)drag={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId)});
canvas.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;const prev=pointers.get(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===2){const other=[...pointers].find(([id])=>id!==e.pointerId)?.[1];if(other){const before=Math.hypot(prev.x-other.x,prev.y-other.y),after=Math.hypot(e.clientX-other.x,e.clientY-other.y);if(before>8)zoom(before/after)}}else if(drag){azimuth-=(e.clientX-drag.x)*.005;elevation=THREE.MathUtils.clamp(elevation+(e.clientY-drag.y)*.005,-1.25,1.25);drag={x:e.clientX,y:e.clientY};update()}});
canvas.addEventListener('pointerup',e=>{pointers.delete(e.pointerId);drag=null});canvas.addEventListener('pointercancel',e=>{pointers.delete(e.pointerId);drag=null});
canvas.addEventListener('wheel',e=>{e.preventDefault();zoom(Math.exp(THREE.MathUtils.clamp(e.deltaY,-120,120)*.002))},{passive:false});new ResizeObserver(render).observe(host);
