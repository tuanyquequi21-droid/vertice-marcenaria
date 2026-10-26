/* Vértice: orçamento progressivo + consulta não destrutiva de estoque */
(function(){
'use strict';
const escapeHTML=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const css=document.createElement('style');
css.textContent='.vq-steps{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:0 0 12px;padding:4px 0}.vq-steps button{min-width:0;min-height:44px;border:1px solid #ded7c7;border-radius:10px;padding:10px 8px;background:#f8f7f3;color:#49443a;font-size:13px;font-weight:600;line-height:1.25;text-align:center;cursor:pointer;white-space:normal;overflow-wrap:anywhere}.vq-steps button.vq-active{background:#24231f;border-color:#b99b56;color:#f1d58e;box-shadow:inset 0 -3px #b99b56}.vq-steps button:focus-visible{outline:2px solid #b99b56;outline-offset:2px}.vq-hidden{display:none!important}.vq-help{font-size:12px;opacity:.75;margin:8px 0;line-height:1.45}.vq-stock{margin:12px 0;padding:12px;border:1px solid #c5ae75;border-radius:9px}.vq-stock table{width:100%;font-size:12px}.vq-stock td,.vq-stock th{padding:6px;text-align:left;border-bottom:1px solid #7773}@media(min-width:700px){.vq-steps{grid-template-columns:repeat(4,minmax(0,1fr))}}';
document.head.appendChild(css);
function setup(){
const root=document.querySelector('#modalBody');if(!root||!root.querySelector('#qn')||root.querySelector('.vq-steps'))return;
const sections=[...root.querySelectorAll('.section-title')];
if(!sections.length)return;
const buckets=[[],[],[],[]];
let group=0;
for(const heading of sections){
const t=(heading.textContent||'').toLowerCase();
if(t.includes('cliente'))group=0;
else if(t.includes('projeto')||t.includes('móve'))group=1;
else if(t.includes('materiais')||t.includes('mão de obra'))group=2;
else group=3;
let n=heading;while(n&&n!==root){buckets[group].push(n);n=n.nextElementSibling;if(n&&n.classList.contains('section-title'))break}
}
const unique=arr=>[...new Set(arr)];
const nodes=buckets.map(unique);
const top=document.createElement('div');top.className='vq-steps';
const names=['1 · Cliente','2 · Projeto','3 · Materiais e serviços','4 · Valores e pagamento'];
names.forEach((name,i)=>{const b=document.createElement('button');b.type='button';b.textContent=name;b.onclick=()=>show(i);top.appendChild(b)});
root.insertBefore(top,root.firstChild);
const tip=document.createElement('p');tip.className='vq-help';tip.textContent='Preencha por etapas. Os dados permanecem no formulário ao navegar; o salvamento continua sendo feito pelo botão original.';top.after(tip);
// Não ocultar campos do cliente: todos devem permanecer acessíveis e editáveis no celular.
const projectSection=nodes[1].find(x=>x.classList?.contains('section-title'));
if(projectSection){const p=document.createElement('p');p.className='vq-help';p.textContent='Descreva os móveis. Depois informe materiais e mão de obra para calcular a proposta.';projectSection.after(p);nodes[1].push(p)}
const stock=document.createElement('div');stock.className='vq-stock';
stock.innerHTML='<strong>Consulta rápida ao estoque</strong><p class="vq-help">Verifique sobras e ferragens disponíveis antes de comprar. A consulta não altera custos nem reservas.</p><button type="button" class="btn small" id="vq-stock-button">Consultar estoque</button><div id="vq-stock-results"></div>';
const matSection=nodes[2].find(x=>(x.textContent||'').toLowerCase().includes('materiais'));
if(matSection){matSection.after(stock);nodes[2].push(stock)}
stock.querySelector('button').onclick=async()=>{
const out=stock.querySelector('#vq-stock-results');out.textContent='Consultando...';
try{
const auth=await sb.auth.getUser();if(!auth.data?.user)throw Error('Faça login novamente.');
const p=await sb.from('perfis').select('empresa_id').eq('user_id',auth.data.user.id).eq('ativo',true).single();if(p.error)throw Error(p.error.message);
const [a,b]=await Promise.all([sb.from('estoque_inteligente').select('id,categoria,nome,cor,espessura_mm,largura_mm,comprimento_mm,quantidade,localizacao').eq('empresa_id',p.data.empresa_id).gt('quantidade',0).limit(100),sb.from('estoque_reservas').select('estoque_id,quantidade').eq('empresa_id',p.data.empresa_id).eq('status','Reservado')]);
if(a.error||b.error)throw Error(a.error?.message||b.error?.message);
const reserved=new Map();(b.data||[]).forEach(r=>reserved.set(r.estoque_id,(reserved.get(r.estoque_id)||0)+Number(r.quantidade)));
const list=(a.data||[]).map(x=>({...x,livre:Number(x.quantidade)-Number(reserved.get(x.id)||0)})).filter(x=>x.livre>0);
out.innerHTML=list.length?'<div style="max-height:240px;overflow:auto"><table><thead><tr><th>Material</th><th>Medidas (mm)</th><th>Livre</th><th>Local</th></tr></thead><tbody>'+list.map(x=>'<tr><td>'+escapeHTML(x.nome)+'<br>'+escapeHTML(x.cor||'')+'</td><td>'+escapeHTML(x.largura_mm||'—')+' × '+escapeHTML(x.comprimento_mm||'—')+' × '+escapeHTML(x.espessura_mm||'—')+'</td><td>'+escapeHTML(x.livre)+'</td><td>'+escapeHTML(x.localizacao||'—')+'</td></tr>').join('')+'</tbody></table></div>':'Nenhum material livre cadastrado.';
}catch(e){out.textContent='Não foi possível consultar o estoque: '+e.message}
};
function show(index){nodes.forEach((list,i)=>list.forEach(n=>{if(n&&n.isConnected)n.classList.toggle('vq-hidden',i!==index)}));[...top.children].forEach((b,i)=>b.classList.toggle('vq-active',i===index));const actions=document.querySelector('#modalActions');if(actions)actions.style.display=index===3?'':'none';}
show(0);
const modal=document.querySelector('#modal');const observer=new MutationObserver(()=>{if(modal?.classList.contains('hidden')){observer.disconnect();return}for(const n of nodes[2])if(n?.classList?.contains('section-title')){}});
observer.observe(root,{childList:true});
}
const old=openQuote;
openQuote=async function(...args){const result=await old(...args);if(document.querySelector('#modalBody #qn'))setup();return result};
})();
