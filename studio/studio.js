import {calculateCabinet} from './engine.mjs';
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js';
const scene=new THREE.Scene();scene.background=new THREE.Color('#282828');
const camera=new THREE.PerspectiveCamera(40,1,.1,30);camera.position.set(2.8,2.1,3.8);camera.lookAt(0,0,0);
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));
const host=document.getElementById('scene');host.appendChild(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xffffff,0x777777,2));const light=new THREE.DirectionalLight(0xffffff,2);light.position.set(2,4,5);scene.add(light);
const group=new THREE.Group();scene.add(group);
const material=new THREE.MeshStandardMaterial({color:0xbda889,roughness:.75});
function addBox(x,y,z,w,h,d){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);mesh.position.set(x,y,z);group.add(mesh)}
function draw(p){while(group.children.length){const mesh=group.children[0];group.remove(mesh);mesh.geometry.dispose()}
 const {width:w,height:h,depth:d}=p.dimensions;const t=Number(document.querySelector('[name=thickness]').value),s=Number(document.querySelector('[name=shelves]').value),doors=Number(document.querySelector('[name=doors]').value);
 const W=w/1000,H=h/1000,D=d/1000,T=t/1000;addBox(-W/2+T/2,0,0,T,H,D);addBox(W/2-T/2,0,0,T,H,D);
 addBox(0,-H/2+T/2,0,W-2*T,T,D);addBox(0,H/2-T/2,0,W-2*T,T,D);
 for(let i=1;i<=s;i++)addBox(0,-H/2+i*H/(s+1),0,W-2*T,T,D-.006);
 addBox(0,0,-D/2+.003,W,H,.006);
 for(let i=0;i<doors;i++)addBox(-W/2+(i+.5)*W/doors,0,D/2+.012,W/doors-.006,H-.004,T);
 const max=Math.max(W,H,D);camera.position.set(max*1.3,max*.95,max*1.7);camera.lookAt(0,0,0);render();
}
function render(){const width=host.clientWidth||500,height=host.clientHeight||450;renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();renderer.render(scene,camera)}
new ResizeObserver(render).observe(host);
document.getElementById('form').addEventListener('submit',e=>{e.preventDefault();try{const data=Object.fromEntries(new FormData(e.target));const p=calculateCabinet(data);draw(p);document.getElementById('error').textContent='';document.getElementById('totals').textContent='Área: '+p.areaM2.toFixed(2)+' m² | Fita: '+p.edgeM.toFixed(2)+' m | Materiais estimados: '+p.estimatedMaterialCost.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});document.getElementById('parts').replaceChildren(...p.parts.map(part=>{const tr=document.createElement('tr');for(const value of [part.name,part.qty,part.width.toFixed(1)+' × '+part.height.toFixed(1)+' × '+part.thickness]){const td=document.createElement('td');td.textContent=value;tr.appendChild(td)}return tr}))}catch(err){document.getElementById('error').textContent=err.message}});
document.getElementById('form').requestSubmit();
