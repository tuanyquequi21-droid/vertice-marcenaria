/* Estoque Inteligente Vértice */
(function(){
const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let items=[],company=null,photo=null;
async function loadStock(){
const u=await sb.auth.getUser();if(!u.data.user)throw Error('Faça login.');
const p=await sb.from('perfis').select('empresa_id').eq('user_id',u.data.user.id).single();if(p.error)throw Error(p.error.message);company=p.data.empresa_id;
const r=await sb.from('estoque_inteligente').select('*').eq('empresa_id',company).order('id',{ascending:false});if(r.error)throw Error(r.error.message);items=r.data||[];draw();
}
function draw(){
$('#pageTitle').textContent='Estoque Inteligente';
$('#content').innerHTML='<div class="panel"><div class="panel-head"><h3>Estoque Inteligente — sobras, chapas e ferragens</h3><button class="btn gold" id="stockNew">+ Novo item</button></div><div class="panel-body"><p>Cadastre medidas reais em milímetros e fotografe cada sobra para identificá-la.</p><input id="stockSearch" placeholder="Buscar material, cor ou localização"><div id="stockRows"></div></div></div>';
$('#stockNew').onclick=()=>edit();$('#stockSearch').oninput=renderRows;renderRows();
}
function renderRows(){
const s=($('#stockSearch')?.value||'').toLowerCase();
$('#stockRows').innerHTML='<div class="table-wrap"><table><thead><tr><th>Foto</th><th>Categoria / Material</th><th>Dimensões (mm)</th><th>Qtd.</th><th>Local</th><th>Ações</th></tr></thead><tbody>'+items.filter(x=>[x.nome,x.cor,x.localizacao,x.categoria].join(' ').toLowerCase().includes(s)).map(x=>'<tr><td>'+(x.foto_data?'<img src="'+esc(x.foto_data)+'" style="width:65px;height:55px;object-fit:cover">':'—')+'</td><td><b>'+esc(x.nome)+'</b><br>'+esc(x.categoria)+' · '+esc(x.cor||'')+'</td><td>'+esc(x.largura_mm||'—')+' × '+esc(x.comprimento_mm||'—')+' / '+esc(x.espessura_mm||'—')+'</td><td>'+esc(x.quantidade)+'</td><td>'+esc(x.localizacao||'—')+'</td><td><button class="btn small" data-edit="'+x.id+'">Editar</button> <button class="btn small" data-move="'+x.id+'">Movimentar</button></td></tr>').join('')+'</tbody></table></div>';
document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>edit(Number(b.dataset.edit)));
document.querySelectorAll('[data-move]').forEach(b=>b.onclick=()=>move(Number(b.dataset.move)));
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
const next=tipo==='Entrada'?old+qtd:tipo==='Saída'?old-qtd:qtd;if(next<0)return alert('Saldo insuficiente.');
const r=await sb.from('estoque_inteligente').update({quantidade:next}).eq('id',id).eq('quantidade',old).select('id');if(r.error||!r.data?.length)return alert(r.error?.message||'Saldo alterado. Atualize.');
const m=await sb.from('estoque_movimentos').insert({empresa_id:company,estoque_id:id,tipo,quantidade:qtd,saldo_anterior:old,saldo_novo:next,observacoes:$('#st_motivo').value});
if(m.error)alert('Saldo atualizado, mas falhou o histórico: '+m.error.message);closeModal();await loadStock();
});
}
const prev=page;page=function(name){if(name!=='estoque-inteligente')return prev(name);document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('active',b.dataset.page===name));$('#content').innerHTML='Carregando estoque...';loadStock().catch(e=>$('#content').textContent='Erro: '+e.message)};
})();