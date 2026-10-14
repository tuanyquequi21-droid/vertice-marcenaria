/* Vértice Studio → Gestão: integração opt-in, sem alterar o salvamento original. */
(function(){
 'use strict';
 const KEY='vertice:studio:quote-transfer:v1';
 let noticeDismissed=false;
 function getDraft(){
  try{const d=JSON.parse(localStorage.getItem(KEY)||'null');
   if(!d||d.schemaVersion!==1||d.source!=='vertice-studio'||!Array.isArray(d.sheets))return null;
   return d;
  }catch{return null}
 }
 let routePending=location.hash==='#studio-import',routeBusy=false;
 async function routeToQuotes(){
  if(!routePending||routeBusy||!getDraft())return;
  const app=document.getElementById('app');
  if(!app||app.classList.contains('hidden')||typeof page!=='function')return;
  routeBusy=true;
  try{
   await page('orcamentos');
   if(document.getElementById('pageTitle')?.textContent==='Orçamentos'){
    routePending=false;
    history.replaceState(null,'',location.pathname+location.search);
    // Abre a edição de um novo orçamento para revisar os materiais recebidos.
    if(typeof openQuote==='function'){
     await openQuote();
     const importButton=document.getElementById('studio-quote-import');
     if(importButton)importButton.click();
    }
   }
  }catch(e){console.warn('Studio: não foi possível abrir Orçamentos',e)}
  finally{routeBusy=false}
 }
 function installNotice(){
  const draft=getDraft(),title=document.getElementById('pageTitle');
  if(!title)return;
  let banner=document.getElementById('studio-pending-import');
  if(!draft){if(banner)banner.remove();return}
  if(banner||noticeDismissed)return;
  banner=document.createElement('div');banner.id='studio-pending-import';
  banner.style.cssText='background:#fff8e7;border:1px solid #c6a65d;color:#40341e;padding:12px 14px;margin:12px 0;border-radius:8px;display:flex;gap:10px;align-items:center;flex-wrap:wrap';
  const message=document.createElement('span');message.textContent='Materiais do Studio aguardando importação. Abra ou crie um orçamento e clique em “Importar materiais do Studio”.';
  const go=document.createElement('button');go.type='button';go.className='btn small';go.textContent='Ir para Orçamentos';
  go.onclick=()=>{routePending=true;routeToQuotes()};
  const dismiss=document.createElement('button');dismiss.type='button';dismiss.className='btn small';dismiss.textContent='Ocultar aviso';
  dismiss.onclick=()=>{noticeDismissed=true;banner.remove()};
  banner.append(message,go,dismiss);
  title.insertAdjacentElement('afterend',banner);
 }
 function install(){
  if(routePending)queueMicrotask(routeToQuotes);
  installNotice();
  const materialLines=document.getElementById('materialLines');
  if(!materialLines||document.getElementById('studio-quote-import'))return;
  const button=document.createElement('button');
  button.type='button';button.id='studio-quote-import';button.className='btn small';
  button.textContent='Importar materiais do Studio';
  materialLines.insertAdjacentElement('beforebegin',button);
  button.addEventListener('click',()=>{
   const draft=getDraft();if(!draft)return alert('Nenhuma estimativa do Studio disponível. Abra o Studio e clique em Enviar estimativa ao Gestão.');
   if(typeof C==='undefined'||typeof addMaterial!=='function')return alert('Formulário de materiais indisponível.');
   const catalog=C.materiais.filter(m=>m.ativo!==false);
   if(!catalog.length)return alert('Cadastre os materiais no catálogo do Gestão antes de importar.');
   const rows=[...draft.sheets.map((s,i)=>({s,i,label:'Chapa MDF '+s.thickness+' mm',quantity:s.quantity,unit:'un'})),...(Array.isArray(draft.hardware)?draft.hardware:[]).map((h,i)=>({s:h,i,label:h.label,quantity:h.quantity,unit:h.unit}))];
   const root=document.createElement('div');
   const warning=document.createElement('p');warning.textContent=draft.warning;root.append(warning);
   const choices=[];
   for(const {s,i} of rows){
    const wrap=document.createElement('div');wrap.style.cssText='display:grid;grid-template-columns:1fr 90px;gap:8px;margin:12px 0';
    const label=document.createElement('label');label.textContent=rows.find(x=>x.s===s)?.label+' ('+(rows.find(x=>x.s===s)?.unit||'un')+')';
    const select=document.createElement('select');select.className='studio-material-select';select.style.width='100%';
    const empty=document.createElement('option');empty.value='';empty.textContent='Selecionar material cadastrado';select.append(empty);
    for(const m of catalog){const option=document.createElement('option');option.value=m.id;option.textContent=m.nome+' ('+(m.unidade||'un')+')';select.append(option)}
    const qty=document.createElement('input');qty.type='number';qty.min='0';qty.step='any';qty.value=rows.find(x=>x.s===s)?.quantity??0;qty.style.width='90px';qty.setAttribute('aria-label','Quantidade do material');
    label.append(select);wrap.append(label,qty);root.append(wrap);choices.push({select,qty,s});
   }
   const hint=document.createElement('p');hint.textContent='Selecione o material do catálogo e ajuste as quantidades. Depois, revise os valores no orçamento e inclua outros materiais, mão de obra e custos normalmente.';root.append(hint);
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
    if(items.some(x=>!Number.isFinite(x.quantity)||x.quantity<0))return alert('Informe quantidades válidas.');if(items.some(x=>x.quantity>0&&!x.material))return alert('Selecione um material cadastrado para cada item com quantidade maior que zero. Use zero para não importar um item.');
    if(!confirm('Adicionar estes materiais ao orçamento atual? Os itens existentes serão preservados. Verifique se já foram importados para evitar duplicações.'))return;
    for(const {material,quantity} of items){if(!quantity)continue;addMaterial({material_id:material.id,quantidade:quantity,valor_unitario:Number(material.preco_custo)||0,unidade:material.unidade||'unidade'});}
    if(typeof calcQuote==='function')calcQuote();
    overlay.remove();
    localStorage.removeItem(KEY);
    document.getElementById('studio-pending-import')?.remove();
   };
  });
 }
 new MutationObserver(install).observe(document.documentElement,{subtree:true,childList:true});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
