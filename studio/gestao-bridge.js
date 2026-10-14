/* Vértice Studio → Gestão: integração opt-in, sem alterar o salvamento original. */
(function(){
 'use strict';
 const KEY='vertice:studio:quote-transfer:v1';
 function getDraft(){
  try{const d=JSON.parse(localStorage.getItem(KEY)||'null');
   if(!d||d.schemaVersion!==1||d.source!=='vertice-studio'||!Array.isArray(d.sheets))return null;
   return d;
  }catch{return null}
 }
 function install(){
  const materialLines=document.getElementById('materialLines');
  if(!materialLines||document.getElementById('studio-quote-import'))return;
  const button=document.createElement('button');
  button.type='button';button.id='studio-quote-import';button.className='btn small';
  button.textContent='Importar chapas do Studio';
  materialLines.insertAdjacentElement('beforebegin',button);
  button.addEventListener('click',()=>{
   const draft=getDraft();if(!draft)return alert('Nenhuma estimativa do Studio disponível. Abra o Studio e clique em Enviar estimativa ao Gestão.');
   if(typeof C==='undefined'||typeof addMaterial!=='function')return alert('Formulário de materiais indisponível.');
   const catalog=C.materiais.filter(m=>m.ativo!==false);
   if(!catalog.length)return alert('Cadastre as chapas MDF em Materiais antes de importar.');
   const rows=draft.sheets.map((s,i)=>({s,i}));
   const root=document.createElement('div');
   const warning=document.createElement('p');warning.textContent=draft.warning;root.append(warning);
   const choices=[];
   for(const {s,i} of rows){
    const wrap=document.createElement('div');wrap.style.cssText='display:grid;grid-template-columns:1fr 90px;gap:8px;margin:12px 0';
    const label=document.createElement('label');label.textContent='MDF '+s.thickness+' mm — '+s.areaM2.toFixed(2)+' m²';
    const select=document.createElement('select');select.className='studio-material-select';select.style.width='100%';
    const empty=document.createElement('option');empty.value='';empty.textContent='Selecionar chapa cadastrada';select.append(empty);
    for(const m of catalog){const option=document.createElement('option');option.value=m.id;option.textContent=m.nome+' ('+(m.unidade||'un')+')';select.append(option)}
    const qty=document.createElement('input');qty.type='number';qty.min='0';qty.step='1';qty.value=s.quantity;qty.style.width='90px';qty.setAttribute('aria-label','Quantidade de chapas');
    label.append(select);wrap.append(label,qty);root.append(wrap);choices.push({select,qty,s});
   }
   const hint=document.createElement('p');hint.textContent='Selecione o material do catálogo e ajuste as quantidades. Depois, revise os valores no orçamento e inclua ferragens, fitas, mão de obra e demais itens normalmente.';root.append(hint);
   const actions=document.createElement('div');actions.className='toolbar';
   const cancel=document.createElement('button');cancel.className='btn';cancel.textContent='Cancelar';
   const apply=document.createElement('button');apply.className='btn gold';apply.textContent='Adicionar materiais';
   actions.append(cancel,apply);root.append(actions);
   const overlay=document.createElement('div');overlay.style.cssText='position:fixed;inset:0;background:#0008;z-index:99999;display:grid;place-items:center;padding:16px';
   const dialog=document.createElement('div');dialog.style.cssText='background:#fff;color:#222;padding:22px;border-radius:10px;max-width:560px;width:100%;max-height:85vh;overflow:auto';
   const title=document.createElement('h3');title.textContent='Importar estimativa do Studio';dialog.append(title,root);overlay.append(dialog);document.body.append(overlay);
   cancel.onclick=()=>overlay.remove();
   apply.onclick=()=>{
    const items=choices.map(({select,qty,s})=>({material:C.materiais.find(m=>String(m.id)===select.value),quantity:Number(qty.value),s}));
    if(items.some(x=>!x.material||!Number.isFinite(x.quantity)||x.quantity<0))return alert('Selecione um material para cada espessura e informe quantidades válidas.');
    if(!confirm('Adicionar as chapas ao orçamento atual? Os itens existentes serão preservados.'))return;
    for(const {material,quantity} of items){if(!quantity)continue;addMaterial({material_id:material.id,quantidade:quantity,valor_unitario:Number(material.preco_custo)||0,unidade:material.unidade||'unidade'});}
    if(typeof calcQuote==='function')calcQuote();
    overlay.remove();
   };
  });
 }
 new MutationObserver(install).observe(document.documentElement,{subtree:true,childList:true});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
