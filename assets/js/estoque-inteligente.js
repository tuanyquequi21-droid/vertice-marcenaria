/* Estoque Inteligente Vértice */
(function(){
const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let items=[],company=null,photo=null,reservas=[];
async function loadStock(){
const u=await sb.auth.getUser();if(!u.data.user)throw Error('Faça login.');
const p=await sb.from('perfis').select('empresa_id').eq('user_id',u.data.user.id).single();if(p.error)throw Error(p.error.message);company=p.data.empresa_id;
const r=await sb.from('estoque_inteligente').select('*').eq('empresa_id',company).order('id',{ascending:false});if(r.error)throw Error(r.error.message);items=r.data||[];const rs=await sb.from('estoque_reservas').select('*').eq('empresa_id',company).eq('status','Reservado');if(rs.error)throw Error(rs.error.message);reservas=rs.data||[];draw();
}
function draw(){
$('#pageTitle').textContent='Estoque Inteligente';
$('#content').innerHTML='<div class="panel"><div class="panel-head"><h3>Estoque Inteligente — sobras, chapas e ferragens</h3><button class="btn gold" id="stockFind">Encontrar sobra</button> <button class="btn gold" id="stockNew">+ Novo item</button></div><div class="panel-body"><p>Cadastre medidas reais em milímetros e fotografe cada sobra para identificá-la.</p><input id="stockSearch" placeholder="Buscar material, cor ou localização"><div id="stockRows"></div></div></div>';
$('#stockNew').onclick=()=>edit();$('#stockFind').onclick=findOffcuts;$('#stockSearch').oninput=renderRows;renderRows();
}
function renderRows(){
const s=($('#stockSearch')?.value||'').toLowerCase();
$('#stockRows').innerHTML='<div class="table-wrap"><table><thead><tr><th>Foto</th><th>Categoria / Material</th><th>Dimensões (mm)</th><th>Qtd. / livre</th><th>Local</th><th>Ações</th></tr></thead><tbody>'+items.filter(x=>[x.nome,x.cor,x.localizacao,x.categoria].join(' ').toLowerCase().includes(s)).map(x=>'<tr><td>'+(x.foto_data?'<img src="'+esc(x.foto_data)+'" style="width:65px;height:55px;object-fit:cover">':'—')+'</td><td><b>'+esc(x.nome)+'</b><br>'+esc(x.categoria)+' · '+esc(x.cor||'')+'</td><td>'+esc(x.largura_mm||'—')+' × '+esc(x.comprimento_mm||'—')+' / '+esc(x.espessura_mm||'—')+'</td><td>'+esc(x.quantidade)+'</td><td>'+esc(x.localizacao||'—')+'</td><td><button class="btn small" data-edit="'+x.id+'">Editar</button> <button class="btn small" data-move="'+x.id+'">Movimentar</button> <button class="btn small" data-reserve="'+x.id+'">Reservar</button> <button class="btn small" data-label="'+x.id+'">Etiqueta</button></td></tr>').join('')+'</tbody></table></div>';
document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>edit(Number(b.dataset.edit)));
document.querySelectorAll('[data-move]').forEach(b=>b.onclick=()=>move(Number(b.dataset.move)));document.querySelectorAll('[data-reserve]').forEach(b=>b.onclick=()=>reserve(Number(b.dataset.reserve)));document.querySelectorAll('[data-label]').forEach(b=>b.onclick=()=>label(Number(b.dataset.label)));
}
function reserved(id){return reservas.filter(r=>r.estoque_id===id).reduce((s,r)=>s+Number(r.quantidade),0)}
async function reserve(id){
 const x=items.find(z=>z.id===id),free=Number(x.quantidade)-reserved(id);
 const active=reservas.filter(r=>r.estoque_id===id);
 modal('Reservar material: '+esc(x.nome),'<p>Disponível para reservar: <b>'+free+'</b></p><label>Projeto / cliente<input id="st_project" required></label><label>Quantidade<input id="st_resqty" type="number" min="0.01" step="any" value="1"></label><label>Observações<input id="st_resobs"></label><h4>Reservas ativas</h4><div id="st_existing">'+(active.length?active.map(r=>'<p>'+esc(r.projeto_nome||'Projeto')+' — '+esc(r.quantidade)+' <button class="btn small" data-release="'+r.id+'">Liberar</button></p>').join(''):'Nenhuma reserva')+'</div>',async()=>{
 const qtd=Number($('#st_resqty').value),name=$('#st_project').value.trim();
 if(!name||!(qtd>0)||qtd>free)return alert('Informe o projeto e uma quantidade disponível.');
 const res=await sb.from('estoque_reservas').insert({empresa_id:company,estoque_id:id,projeto_nome:name,quantidade:qtd,observacoes:$('#st_resobs').value});
 if(res.error)return alert(res.error.message);closeModal();await loadStock();
 });
 document.querySelectorAll('[data-release]').forEach(b=>b.onclick=async()=>{if(!confirm('Liberar esta reserva?'))return;const q=await sb.from('estoque_reservas').update({status:'Liberado'}).eq('id',Number(b.dataset.release));if(q.error)return alert(q.error.message);closeModal();await loadStock()});
}
function label(id){
 const x=items.find(z=>z.id===id);
 const text='VÉRTICE MARCENARIA | ESTOQUE #'+x.id+' | '+x.nome+' | '+(x.cor||'')+' | '+(x.largura_mm||'-')+' × '+(x.comprimento_mm||'-')+' × '+(x.espessura_mm||'-')+' mm | '+(x.localizacao||'');
 const w=window.open('','_blank','width=650,height=450');if(!w)return alert('Permita a abertura de janelas para imprimir.');
 w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>Etiqueta estoque</title><style>body{font:16px Arial;padding:30px}section{border:2px solid #222;padding:20px;max-width:440px}h2{margin:0 0 12px}</style></head><body><section><h2>VÉRTICE MARCENARIA</h2><p>'+esc(text)+'</p></section><p><button onclick="window.print()">Imprimir etiqueta</button></p></body></html>');w.document.close();
}

function findOffcuts(){
modal('Encontrar sobra de MDF','<p>Informe as dimensões da peça que precisa cortar. O resultado considera a folga da serra e o sentido do veio, mas deve ser confirmado antes de cortar.</p><div class="form-grid three"><label>Largura da peça (mm)<input id="sf_w" type="number" min="1" step="1" value="600"></label><label>Comprimento da peça (mm)<input id="sf_l" type="number" min="1" step="1" value="400"></label><label>Espessura (mm)<input id="sf_t" type="number" min="1" step="0.1" value="18"></label><label>Cor / acabamento<input id="sf_color" placeholder="Ex.: Branco TX"></label><label>Folga de corte (mm)<input id="sf_kerf" type="number" min="0" step="0.1" value="4"></label><label>Sentido do veio<select id="sf_grain"><option>Indiferente</option><option>No comprimento</option><option>Na largura</option></select></label></div><button class="btn gold" id="sf_search" type="button">Buscar compatíveis</button><div id="sf_results" style="margin-top:16px"></div>',()=>closeModal(),'Fechar');
$('#sf_search').onclick=()=>{
const w=Number($('#sf_w').value),l=Number($('#sf_l').value),t=Number($('#sf_t').value),kerf=Number($('#sf_kerf').value),color=$('#sf_color').value.trim().toLowerCase(),grain=$('#sf_grain').value;
if(!(w>0&&l>0&&t>0)||kerf<0)return alert('Informe medidas válidas.');
const options=items.filter(x=>['Sobra MDF','Chapa MDF'].includes(x.categoria)&&Number(x.quantidade)-reserved(x.id)>0&&Number(x.espessura_mm)===t&&(!color||String(x.cor||'').trim().toLowerCase()===color)).map(x=>{
const a=Number(x.largura_mm),b=Number(x.comprimento_mm);
const natural=a>=w+kerf&&b>=l+kerf;
const rotated=a>=l+kerf&&b>=w+kerf;
const stockGrain=x.veio||'Indiferente';
const matchingGrain=grain==='Indiferente'||stockGrain==='Indiferente'||stockGrain===grain;
const canRotate=grain==='Indiferente'&&stockGrain==='Indiferente';
if(!matchingGrain||!(natural||(rotated&&canRotate)))return null;
const rotatedOnly=!natural&&rotated;
const loss=(a*b-w*l)/(a*b)*100;
return {x,loss,rotatedOnly,area:a*b};
}).filter(Boolean).sort((a,b)=>a.area-b.area);
$('#sf_results').innerHTML=options.length?'<p><b>'+options.length+' opção(ões) compatível(is)</b> — ordenadas pela menor área de chapa.</p><div class="table-wrap"><table><thead><tr><th>Material</th><th>Medidas</th><th>Disponível</th><th>Aproveitamento teórico</th><th>Localização</th></tr></thead><tbody>'+options.map(o=>'<tr><td>'+esc(o.x.nome)+'<br>'+esc(o.x.cor||'')+'</td><td>'+esc(o.x.largura_mm)+' × '+esc(o.x.comprimento_mm)+' mm'+(o.rotatedOnly?' (girar 90°)':'')+'</td><td>'+esc(Number(o.x.quantidade)-reserved(o.x.id))+'</td><td>'+esc((100-o.loss).toFixed(1))+'%</td><td>'+esc(o.x.localizacao||'—')+'</td></tr>').join('')+'</tbody></table></div>':'<p>Nenhuma sobra cadastrada atende aos filtros. Confira a cor, espessura, dimensões e reservas.</p>';
};
}
function edit(id){
const x=items.find(z=>z.id===id)||{};photo=x.foto_data||null;
const fields=[['nome','Nome *','text'],['cor','Cor / acabamento','text'],['espessura_mm','Espessura mm','number'],['largura_mm','Largura mm','number'],['comprimento_mm','Comprimento mm','number'],['marca','Marca','text'],['modelo','Modelo / referência','text'],['quantidade','Quantidade','number'],['estoque_minimo','Estoque mínimo','number'],['localizacao','Localização física','text'],['valor_unitario','Custo unitário','number']];
const form='<div class="form-grid three"><label>Categoria<select id="st_categoria">'+['Sobra MDF','Chapa MDF','Ferragem','Insumo'].map(t=>'<option '+(x.categoria===t?'selected':'')+'>'+t+'</option>').join('')+'</select></label>'+fields.map(([k,label,type])=>'<label>'+label+'<input id="st_'+k+'" type="'+type+'" '+(type==='number'?'min="0" step="any"':'')+' value="'+esc(x[k]??(k==='quantidade'?1:''))+'"></label>').join('')+'<label>Sentido do veio<select id="st_veio">'+['Indiferente','No comprimento','Na largura'].map(t=>'<option '+(x.veio===t?'selected':'')+'>'+t+'</option>').join('')+'</select></label></div><label>Observações<textarea id="st_observacoes">'+esc(x.observacoes||'')+'</textarea></label><label>Foto<input id="st_foto" type="file" accept="image/*" capture="environment"></label><small>Confira as medidas com trena: a foto não mede o MDF.</small>';
modal(id?'Editar estoque':'Novo item do estoque',form,async()=>{
const p={empresa_id:company,categoria:$('#st_categoria').value,veio:$('#st_veio').value,observacoes:$('#st_observacoes').value};
for(const [k,,type] of fields)p[k]=type==='number'?Number($('#st_'+k).value)||0:$('#st_'+k).value.trim();
if(!p.nome)return alert('Informe o nome.');
if(['Sobra MDF','Chapa MDF'].includes(p.categoria)&&(!p.largura_mm||!p.comprimento_mm))return alert('Informe largura e comprimento.');
if(photo)p.foto_data=photo;
const r=id?await sb.from('estoque_inteligente').update(p).eq('id',id):await sb.from('estoque_inteligente').insert(p);
if(r.error)return alert(r.error.message);closeModal();await loadStock();
});
$('#st_foto').onchange=e=>{const f=e.target.files[0];if(!f)return;if(f.size>12000000)return alert('Foto muito grande.');const im=new Image(),url=URL.createObjectURL(f);im.onload=()=>{const c=document.createElement('canvas'),scale=Math.min(1,800/Math.max(im.width,im.height));c.width=Math.round(im.width*scale);c.height=Math.round(im.height*scale);c.getContext('2d').drawImage(im,0,0,c.width,c.height);photo=c.toDataURL('image/jpeg',.65);URL.revokeObjectURL(url)};im.src=url};
}
function move(id){
const x=items.find(z=>z.id===id);
modal('Movimentar: '+esc(x.nome),'<p>Saldo atual: '+esc(x.quantidade)+'</p><label>Tipo<select id="st_tipo"><option>Entrada</option><option>Saída</option><option>Ajuste</option></select></label><label>Quantidade<input id="st_q" type="number" min="0.01" step="any" value="1"></label><label>Motivo<input id="st_motivo"></label>',async()=>{
const qtd=Number($('#st_q').value),tipo=$('#st_tipo').value,old=Number(x.quantidade);if(!(qtd>0))return alert('Quantidade inválida.');
const next=tipo==='Entrada'?old+qtd:tipo==='Saída'?old-qtd:qtd;if(next<reserved(id))return alert('Saldo insuficiente: existem '+reserved(id)+' unidades reservadas para projetos.');
const r=await sb.from('estoque_inteligente').update({quantidade:next}).eq('id',id).eq('quantidade',old).select('id');if(r.error||!r.data?.length)return alert(r.error?.message||'Saldo alterado. Atualize.');
const m=await sb.from('estoque_movimentos').insert({empresa_id:company,estoque_id:id,tipo,quantidade:qtd,saldo_anterior:old,saldo_novo:next,observacoes:$('#st_motivo').value});
if(m.error)alert('Saldo atualizado, mas falhou o histórico: '+m.error.message);closeModal();await loadStock();
});
}
const prev=page;page=function(name){if(name!=='estoque-inteligente')return prev(name);document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('active',b.dataset.page===name));$('#content').innerHTML='Carregando estoque...';loadStock().catch(e=>$('#content').textContent='Erro: '+e.message)};
})();