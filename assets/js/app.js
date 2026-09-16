
const STAGES=["Novo Lead","Qualificação","Contato realizado","Aguardando informações","Visita/Medição","Orçamento em elaboração","Orçamento enviado","Follow-up","Negociação","Fechado"];
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const money=n=>(Number(n)||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const val=id=>document.getElementById(id)?.value?.trim()||"";
const num=id=>Number(val(id)||0);
const ck=id=>!!document.getElementById(id)?.checked;
let cache={leads:[],clientes:[],tarefas:[],interacoes:[],orcamentos:[],chapas:[],ferragens:[],configs:{}};

function showAuth(show){$("#auth").classList.toggle("hidden",!show);$("#app").classList.toggle("hidden",show)}
function toast(m){alert(m)}
async function login(e){e.preventDefault();if(!sb)return toast("Configure config.js.");let {error}=await sb.auth.signInWithPassword({email:val("loginEmail"),password:val("loginPass")});if(error)return toast(error.message);await boot()}
async function logout(){if(sb)await sb.auth.signOut();showAuth(true)}
async function boot(){
 if(!sb){showAuth(true);return}
 let {data:{session}}=await sb.auth.getSession(); if(!session){showAuth(true);return}
 showAuth(false);$("#who").textContent=session.user.email;await loadAll()
}
async function q(table,select="*"){let {data,error}=await sb.from(table).select(select);if(error){console.error(table,error);return []}return data||[]}
async function loadAll(){
 cache.leads=await q("crm_leads");cache.clientes=await q("clientes");cache.tarefas=await q("crm_tarefas");cache.interacoes=await q("crm_interacoes");
 cache.orcamentos=await q("orcamentos");cache.chapas=await q("chapas_mdf");cache.ferragens=await q("ferragens");cache.custos=await q("custos_operacionais");
 let cs=await q("config_global");cache.configs=Object.fromEntries(cs.map(x=>[x.chave,Number(x.valor)]));render()
}
function navigate(p){$$(".page,.side a").forEach(x=>x.classList.remove("active"));$("#page-"+p).classList.add("active");$(`[data-page="${p}"]`).classList.add("active");$("#side").classList.remove("open")}
function modal(title,html,save){$("#modalTitle").textContent=title;$("#modalBody").innerHTML=html;$("#modal").style.display="flex";$("#modalSave").onclick=save}
function closeModal(){$("#modal").style.display="none"}
const field=(l,id,t="text",v="")=>`<div class=form-group><label>${l}</label><input id=${id} type=${t} value="${esc(v)}"></div>`;
const select=(l,id,arr)=>`<div class=form-group><label>${l}</label><select id=${id}>${arr.map(x=>`<option>${esc(x)}</option>`).join("")}</select></div>`;
const check=(l,id)=>`<label><input id=${id} type=checkbox> ${l}</label>`;

function render(){
 let active=cache.leads.filter(x=>!["Fechado","Perdido"].includes(x.etapa)), hot=active.filter(x=>VerticeScore.label(VerticeScore.calc(x))==="Quente");
 let overdue=cache.tarefas.filter(x=>x.status!=="Concluído"&&x.vencimento&&x.vencimento.slice(0,10)<new Date().toISOString().slice(0,10));
 $("#kpis").innerHTML=[["Leads ativos",active.length],["🔥 Leads quentes",hot.length],["Retornos atrasados",overdue.length],["Orçamentos",cache.orcamentos.length]].map(x=>`<div class=kpi>${x[0]}<b>${x[1]}</b></div>`).join("");
 $("#attention").innerHTML=active.filter(x=>!x.proxima_acao||!x.proximo_contato_em).map(x=>`<div class=alert><b>${esc(x.nome)}</b> · ${esc(x.etapa)} · sem próxima ação</div>`).join("")||"<p>Nenhum lead esquecido.</p>";
 $("#overdue").innerHTML=overdue.map(x=>`<div class=alert><b>${esc(x.titulo)}</b> · ${esc(x.vencimento?.slice(0,10))}</div>`).join("")||"<p>Nenhum retorno atrasado.</p>";
 $("#leadRows").innerHTML=cache.leads.map(l=>{let s=VerticeScore.calc(l),cl=VerticeScore.label(s);return`<tr><td><b>${esc(l.nome)}</b><br><small>${esc(l.telefone)}</small></td><td>${esc(l.origem)}</td><td>${esc(l.ambiente_interesse)}</td><td><span class="badge ${cl==="Quente"?"hot":cl==="Morno"?"warm":"cold"}">${cl} ${s}</span></td><td>${esc(l.etapa)}</td><td>${esc(l.proximo_contato_em?.slice(0,10)||"—")}<br>${esc(l.proxima_acao||"")}</td><td><button class="btnx ghost" onclick="openLead(${l.id})">Abrir</button></td></tr>`}).join("");
 $("#board").innerHTML=STAGES.map(st=>`<div class=col><b>${st}</b>${cache.leads.filter(l=>l.etapa===st).map(l=>`<div class=deal onclick="openLead(${l.id})"><b>${esc(l.nome)}</b><br><small>${esc(l.ambiente_interesse||"Projeto")}</small></div>`).join("")}</div>`).join("");
 $("#clientRows").innerHTML=cache.clientes.map(c=>`<tr><td><b>${esc(c.nome)}</b></td><td>${esc(c.telefone)}<br>${esc(c.email)}</td><td>${esc(c.cpf)}</td><td>${esc(c.endereco)} ${esc(c.numero)}</td></tr>`).join("");
 $("#taskRows").innerHTML=cache.tarefas.map(t=>`<tr><td>${esc(t.vencimento?.slice(0,16).replace("T"," "))}</td><td>${esc(t.titulo)}</td><td>${esc(t.tipo)}</td><td>${esc(t.status)}</td></tr>`).join("");
 $("#history").innerHTML=cache.interacoes.slice().sort((a,b)=>String(b.data_interacao).localeCompare(String(a.data_interacao))).map(i=>`<div class=cardx><small>${esc(i.data_interacao?.slice(0,16).replace("T"," "))} · ${esc(i.canal)}</small><br><b>${esc(i.resultado||"Contato")}</b><p>${esc(i.descricao||"")}</p></div>`).join("")||"Sem interações.";
 $("#quoteRows").innerHTML=cache.orcamentos.map(o=>`<tr><td>#${o.id}</td><td>${esc(o.projeto)}</td><td>${money(o.custo_producao)}</td><td>${money(o.valor_lucro)}</td><td><b>${money(o.preco_final)}</b></td><td>${esc(o.status)}</td><td><div class="toolbar"><button class="btnx ghost" onclick="editQuote(${o.id})">Editar</button><button class="btnx ghost" onclick="printQuote(${o.id})">Imprimir</button><button class="btnx danger" onclick="deleteQuote(${o.id})">Excluir</button></div></td></tr>`).join("");
 $("#mdfRows").innerHTML=cache.chapas.map(x=>`<tr><td>${esc(x.nome_modelo)}</td><td>${esc(x.marca)}</td><td>${esc(x.fornecedor)}</td><td>${money(x.preco_custo)}</td></tr>`).join("");
 $("#hardwareRows").innerHTML=cache.ferragens.map(x=>`<tr><td>${esc(x.tipo)}</td><td>${esc(x.nome_modelo)}</td><td>${esc(x.marca)}</td><td>${money(x.preco_custo)}</td></tr>`).join("");
 $("#configRows").innerHTML=(cache.custos||[]).map(c=>`<tr><td><b>${esc(c.nome)}</b><br><small>${esc(c.categoria||"")}</small></td><td>${esc(c.unidade)}</td><td>${money(c.valor)}</td><td>${c.ativo?"Ativo":"Inativo"}</td><td><button class="btnx ghost" onclick="editCost(${c.id})">Editar</button></td></tr>`).join("");
 let won=cache.leads.filter(x=>x.etapa==="Fechado").length;$("#reports").innerHTML=`<div class=kpi>Conversão<b>${cache.leads.length?Math.round(won/cache.leads.length*100):0}%</b></div><div class=kpi>Vendas fechadas<b>${won}</b></div><div class=kpi>Pipeline potencial<b>${money(active.reduce((s,x)=>s+Number(x.valor_potencial||0),0))}</b></div>`;
}
async function newLead(){
 modal("Novo lead",`<div class=formgrid>${field("Nome","ln")}${field("WhatsApp","lt")}${field("E-mail","le","email")}${select("Origem","lo",["WhatsApp","Instagram","Indicação","Google","Site","Cliente antigo","Outro"])}${field("Ambiente / projeto","la")}${field("Valor potencial","lv","number")}${field("Próximo contato","lr","datetime-local")}${field("Próxima ação","lx")}</div><h3>Qualificação</h3><div class=checks>${check("Projeto definido","q1")}${check("Possui medidas/planta","q2")}${check("Imóvel disponível","q3")}${check("Prazo definido","q4")}${check("Investimento compatível","q5")}${check("Solicitou orçamento","q6")}${check("Aceitou medição","q7")}${check("Responde contatos","q8")}${check("Somente pesquisa preço","q9")}</div>`,async()=>{
  let payload={nome:val("ln"),telefone:val("lt"),email:val("le"),origem:val("lo"),ambiente_interesse:val("la"),valor_potencial:num("lv"),etapa:"Novo Lead",proximo_contato_em:val("lr")||null,proxima_acao:val("lx"),projeto_definido:ck("q1"),possui_medidas:ck("q2"),imovel_disponivel:ck("q3"),prazo_definido:ck("q4"),investimento_compativel:ck("q5"),solicitou_orcamento:ck("q6"),aceitou_medicao:ck("q7"),responde_contatos:ck("q8"),somente_pesquisa_preco:ck("q9")};
  if(!payload.nome)return toast("Informe o nome.");let {error}=await sb.from("crm_leads").insert(payload);if(error)return toast(error.message);closeModal();await loadAll()
 })}
async function openLead(id){
 let l=cache.leads.find(x=>x.id===id),s=VerticeScore.calc(l);
 modal(l.nome,`<div class=grid2><div><h3>Ficha 360º</h3><p><b>Telefone:</b> ${esc(l.telefone)}</p><p><b>E-mail:</b> ${esc(l.email)}</p><p><b>Origem:</b> ${esc(l.origem)}</p><p><b>Projeto:</b> ${esc(l.ambiente_interesse)}</p><p><b>Potencial:</b> ${money(l.valor_potencial)}</p></div><div><h3>Avaliação</h3><p class="badge ${VerticeScore.label(s)==="Quente"?"hot":VerticeScore.label(s)==="Morno"?"warm":"cold"}">${VerticeScore.label(s)} · ${s}/100</p>${select("Etapa","stage",STAGES.concat(["Perdido","Adiado"]))}${field("Próximo contato","next","datetime-local",l.proximo_contato_em?.slice(0,16)||"")}${field("Próxima ação","action","text",l.proxima_acao||"")}</div></div><div class=toolbar><button class="btnx ghost" onclick="closeModal();newInteraction(${id})">Registrar contato</button><button class="btnx primary" onclick="closeModal();newQuote(${id})">Criar orçamento</button></div>`,async()=>{let {error}=await sb.from("crm_leads").update({etapa:val("stage"),proximo_contato_em:val("next")||null,proxima_acao:val("action")}).eq("id",id);if(error)return toast(error.message);closeModal();await loadAll()});$("#stage").value=l.etapa
}
async function newInteraction(id=null){
 modal("Registrar contato",`${select("Canal","ic",["WhatsApp","Ligação","Instagram","E-mail","Presencial","Visita técnica","Medição","Orçamento","Observação interna"])}${select("Resultado","ir",["Respondeu","Não respondeu","Aguardando cliente","Interessado","Pediu retorno","Orçamento enviado","Negociação","Outro"])}<div class=form-group><label>Descrição</label><textarea id=idc></textarea></div>`,async()=>{let {error}=await sb.from("crm_interacoes").insert({lead_id:id,canal:val("ic"),resultado:val("ir"),descricao:val("idc")});if(error)return toast(error.message);closeModal();await loadAll()})
}

const digits=v=>String(v||"").replace(/\D/g,"");
function maskCPF(v){v=digits(v).slice(0,11);return v.replace(/(\d{3})(\d)/,"$1.$2").replace(/(\d{3})(\d)/,"$1.$2").replace(/(\d{3})(\d{1,2})$/,"$1-$2")}
function maskCEP(v){v=digits(v).slice(0,8);return v.replace(/(\d{5})(\d)/,"$1-$2")}
function maskPhone(v){v=digits(v).slice(0,11);if(v.length<=10)return v.replace(/^(\d{2})(\d)/,"($1) $2").replace(/(\d{4})(\d)/,"$1-$2");return v.replace(/^(\d{2})(\d)/,"($1) $2").replace(/(\d{5})(\d)/,"$1-$2")}
function applyQuoteMasks(){
 let cpf=$("#qcpf"),cep=$("#qcep"),tel=$("#qtel");
 if(cpf){cpf.value=maskCPF(cpf.value);cpf.oninput=()=>cpf.value=maskCPF(cpf.value)}
 if(cep){cep.value=maskCEP(cep.value);cep.oninput=()=>cep.value=maskCEP(cep.value);cep.onblur=lookupCEP}
 if(tel){tel.value=maskPhone(tel.value);tel.oninput=()=>tel.value=maskPhone(tel.value)}
}
async function lookupCEP(){
 let cep=digits(val("qcep")); if(cep.length!==8)return;
 try{
   let r=await fetch(`https://viacep.com.br/ws/${cep}/json/`),d=await r.json();
   if(d.erro)return toast("CEP não encontrado.");
   $("#qend").value=d.logradouro||"";$("#qcity").value=d.localidade||"";$("#quf").value=d.uf||"";
   $("#qnum")?.focus();
 }catch(e){console.error(e);toast("Não foi possível consultar o CEP agora. Você pode preencher o endereço manualmente.")}
}
function quoteForm(leadId,existing=null){
 let lead=cache.leads.find(x=>x.id===leadId),o=existing||{},d=o.detalhes_calculo||{};
 return `<h3>Cliente</h3><div class=formgrid>${field("Nome completo","qc","text",o.cliente_nome||lead?.nome||"")}${field("CPF","qcpf","text",o.cliente_cpf||"")}${field("Telefone","qtel","text",o.cliente_telefone||lead?.telefone||"")}${field("E-mail","qemail","email",o.cliente_email||lead?.email||"")}${field("CEP","qcep","text",o.cliente_cep||"")}${field("Endereço","qend","text",o.cliente_endereco||"")}${field("Número","qnum","text",o.cliente_numero||"")}${field("Cidade","qcity","text",o.cliente_cidade||"")}${field("UF","quf","text",o.cliente_uf||"")}</div>
 <h3>Projeto</h3><div class=formgrid>${field("Projeto / ambiente","qp","text",o.projeto||lead?.ambiente_interesse||"")}${field("Prazo informado ao cliente (dias)","qprazo","number",o.prazo_entrega_dias||"")}${field("Validade da proposta (dias)","qvalid","number",o.validade_dias||15)}${field("Condições de pagamento","qpag","text",o.condicoes_pagamento||"")}</div><div class=form-group><label>Descrição que aparecerá ao cliente</label><textarea id=qdesc>${esc(o.descricao_cliente||"")}</textarea></div>
 <h3>Produção interna</h3><div class=formgrid>${select("Chapa MDF","qm",[""].concat(cache.chapas.map(x=>`${x.id} | ${x.nome_modelo} | ${x.preco_custo}`)))}${field("Qtd. chapas","qq","number",d.qtdChapas||"")}${field("Qtd. cortes","qcut","number",d.cortes||"")}${field("Metros fita","qf","number",d.fita||"")}${field("Dias de trabalho","qd","number",o.dias_trabalho||"")}${field("Quantidade de pessoas","qpeople","number",o.quantidade_pessoas||1)}${field("Valor diário por pessoa","qday","number",o.valor_dia_pessoa||cache.configs.dia_trabalho||250)}${field("Valor de montagem","qmount","number",o.valor_montagem||"")}${field("Km entrega","qkm","number",o.km_entrega||"")}${field("Horas projeto 3D","q3d","number",o.horas_3d||"")}${field("Margem de lucro (%)","ql","number",o.margem_lucro??30)}</div>
 <h3>Ferragens</h3>${cache.ferragens.map(x=>`<div class=formgrid><div>${esc(x.tipo)} · ${esc(x.nome_modelo)} (${money(x.preco_custo)})</div>${field("Quantidade","hf"+x.id,"number",(d.ferragensQtd||{})[x.id]||"")}</div>`).join("")}
 <h3>Custos adicionais deste orçamento</h3>${(cache.custos||[]).filter(x=>x.ativo).map(x=>`<div class=formgrid><div>${esc(x.nome)} · ${money(x.valor)}/${esc(x.unidade)}</div>${field("Quantidade","coq"+x.id,"number",(d.custosQtd||{})[x.id]||"")}</div>`).join("")}
 <div class=form-group><label>Observações internas (não aparecem ao cliente)</label><textarea id=qinternal>${esc(o.observacoes_internas||"")}</textarea></div><div class=form-group><label>Observações ao cliente</label><textarea id=qobs>${esc(o.observacoes_cliente||"")}</textarea></div>
 <div class=toolbar><button type=button class="btnx ghost" onclick="calculateQuote()">Recalcular orçamento</button><span class=muted>Corrija qualquer campo e recalcule quantas vezes precisar antes de salvar.</span></div><div id=quoteCalc></div><input type=hidden id=qLead value="${leadId||o.lead_id||""}">`
}
function calculateQuote(){
 let mdfId=Number((val("qm").split("|")[0]||0).trim()),chapa=cache.chapas.find(x=>x.id===mdfId),qtd=num("qq"),custoMdf=(chapa?.preco_custo||0)*qtd;
 let ferragensQtd={},ferr=cache.ferragens.reduce((s,x)=>{let q=Number(document.getElementById("hf"+x.id)?.value)||0;ferragensQtd[x.id]=q;return s+q*Number(x.preco_custo||0)},0);
 let dias=num("qd"),pessoas=Math.max(1,num("qpeople")),valorDia=num("qday"),maoObra=dias*pessoas*valorDia,montagem=num("qmount");
 let custosQtd={},extras=(cache.custos||[]).filter(x=>x.ativo).reduce((s,x)=>{let q=Number(document.getElementById("coq"+x.id)?.value)||0;custosQtd[x.id]=q;return s+q*Number(x.valor||0)},0);
 let fita=num("qf"),cortes=num("qcut"),km=num("qkm"),h3=num("q3d"),cfg=cache.configs,margem=num("ql")/100;
 let ins=(qtd*20*(cfg.parafusos_un||0))+(fita*10*(cfg.cola_g||0))+(fita*(cfg.fita_borda_m||0));
 let ferramenta=cortes*(cfg.desgaste_serra_corte||0),log=km*(cfg.gasolina_km||0),p3=h3*(cfg.custo_hora_3d||0);
 let custo=custoMdf+ferr+ins+ferramenta+maoObra+montagem+log+p3+extras,preco=margem<1?custo/(1-margem):custo,lucro=preco-custo,reinv=custoMdf+ferr+ins;
 window.quoteResult={custo,preco,lucro,reinv,custoMdf,ferr,ins,ferramenta,maoObra,montagem,log,p3,extras,margem:margem*100,mdfId,qtdChapas:qtd,cortes,fita,ferragensQtd,custosQtd};
 $("#quoteCalc").innerHTML=`<div class=calc-summary><div>Custo produção<br><b>${money(custo)}</b></div><div>Mão de obra interna<br><b>${money(maoObra)}</b></div><div>Montagem interna<br><b>${money(montagem)}</b></div><div>Lucro previsto<br><b>${money(lucro)}</b></div><div>Preço final<br><b class=bigmoney>${money(preco)}</b></div></div>`
}
function quotePayload(r,leadId){
 return {lead_id:leadId||null,cliente_nome:val("qc"),cliente_cpf:maskCPF(val("qcpf")),cliente_telefone:maskPhone(val("qtel")),cliente_email:val("qemail"),cliente_cep:maskCEP(val("qcep")),cliente_endereco:val("qend"),cliente_numero:val("qnum"),cliente_cidade:val("qcity"),cliente_uf:val("quf").toUpperCase(),
 projeto:val("qp"),descricao_cliente:val("qdesc"),observacoes_internas:val("qinternal"),observacoes_cliente:val("qobs"),dias_trabalho:num("qd"),quantidade_pessoas:num("qpeople"),valor_dia_pessoa:num("qday"),valor_montagem:num("qmount"),km_entrega:num("qkm"),horas_3d:num("q3d"),prazo_entrega_dias:num("qprazo")||null,validade_dias:num("qvalid")||15,condicoes_pagamento:val("qpag"),
 custo_producao:r.custo,valor_lucro:r.lucro,preco_final:r.preco,reinvestimento_materials:r.reinv,margem_lucro:r.margem,detalhes_calculo:r}
}
async function newQuote(leadId=null){
 window.quoteResult=null;
 modal("Novo orçamento",quoteForm(leadId),async()=>{if(!window.quoteResult)return toast("Clique em Recalcular orçamento antes de salvar.");let r=window.quoteResult,payload={...quotePayload(r,leadId),status:"Rascunho"};
 let {data,error}=await sb.from("orcamentos").insert(payload).select().single();if(error)return toast(error.message);
 if(leadId){await sb.from("crm_leads").update({etapa:"Orçamento em elaboração",solicitou_orcamento:true}).eq("id",leadId);await sb.from("crm_interacoes").insert({lead_id:leadId,orcamento_id:data.id,canal:"Orçamento",resultado:"Orçamento criado",descricao:`Orçamento #${data.id} no valor de ${money(r.preco)}`})}
 closeModal();window.quoteResult=null;await loadAll()
 });applyQuoteMasks()
}
async function editQuote(id){
 let o=cache.orcamentos.find(x=>x.id===id);if(!o)return;
 window.quoteResult=null;
 modal(`Editar orçamento #${id}`,quoteForm(o.lead_id,o),async()=>{if(!window.quoteResult)return toast("Após alterar, clique em Recalcular orçamento antes de salvar.");let payload=quotePayload(window.quoteResult,o.lead_id);payload.status=o.status;
 let {error}=await sb.from("orcamentos").update(payload).eq("id",id);if(error)return toast(error.message);
 if(o.lead_id)await sb.from("crm_interacoes").insert({lead_id:o.lead_id,orcamento_id:id,canal:"Orçamento",resultado:"Orçamento recalculado",descricao:`Orçamento #${id} atualizado para ${money(window.quoteResult.preco)}`});
 closeModal();window.quoteResult=null;await loadAll()
 });
 applyQuoteMasks();
 if(o.detalhes_calculo?.mdfId){let opt=[...$("#qm").options].find(x=>Number((x.value.split("|")[0]||0).trim())===Number(o.detalhes_calculo.mdfId));if(opt)$("#qm").value=opt.value}
 calculateQuote()
}
async function deleteQuote(id){
 let o=cache.orcamentos.find(x=>x.id===id);if(!o)return;
 if(!confirm(`Excluir definitivamente o orçamento #${id} - ${o.projeto}?`))return;
 let {error}=await sb.from("orcamentos").delete().eq("id",id);if(error)return toast("Não foi possível excluir: "+error.message);
 await loadAll()
}
async function newClient(){
 modal("Novo cliente",`<div class=formgrid>${field("Nome","cn")}${field("CPF","ccpf")}${field("Telefone","ct")}${field("E-mail","ce","email")}${field("CEP","cz")}${field("Endereço","ca")}${field("Número","cnum")}</div>`,async()=>{let {error}=await sb.from("clientes").insert({nome:val("cn"),cpf:val("ccpf"),telefone:val("ct"),email:val("ce"),cep:val("cz"),endereco:val("ca"),numero:val("cnum")});if(error)return toast(error.message);closeModal();await loadAll()})
}
async function newMaterial(kind){
 if(kind==="mdf")modal("Nova chapa MDF",field("Modelo","mn")+field("Marca","mm")+field("Fornecedor","mf")+field("Preço de custo","mp","number"),async()=>{let {error}=await sb.from("chapas_mdf").insert({nome_modelo:val("mn"),marca:val("mm"),fornecedor:val("mf"),preco_custo:num("mp")});if(error)return toast(error.message);closeModal();await loadAll()});
 else modal("Nova ferragem",select("Tipo","ft",["Dobradiça","Corrediça","Puxador","Pistão","Outros"])+field("Modelo","fn")+field("Marca","fm")+field("Fornecedor","ff")+field("Preço de custo","fp","number"),async()=>{let {error}=await sb.from("ferragens").insert({tipo:val("ft"),nome_modelo:val("fn"),marca:val("fm"),fornecedor:val("ff"),preco_custo:num("fp")});if(error)return toast(error.message);closeModal();await loadAll()})
}
$$(".side a").forEach(a=>a.onclick=()=>navigate(a.dataset.page));$("#loginForm").onsubmit=login;$("#logout").onclick=logout;$("#menu").onclick=()=>$("#side").classList.toggle("open");boot();

async function newCost(){
 modal("Novo custo operacional",`${field("Nome","con")}${select("Unidade","cou",["hora","dia","unidade","km","metro","fixo","percentual"])}${field("Valor","cov","number")}${field("Categoria","cocat")}`,async()=>{
  let {error}=await sb.from("custos_operacionais").insert({nome:val("con"),unidade:val("cou"),valor:num("cov"),categoria:val("cocat"),ativo:true});
  if(error)return toast(error.message);closeModal();await loadAll()
 })
}
async function editCost(id){
 let c=cache.custos.find(x=>x.id===id);
 modal("Editar custo",`${field("Nome","con","text",c.nome)}${select("Unidade","cou",["hora","dia","unidade","km","metro","fixo","percentual"])}${field("Valor","cov","number",c.valor)}${field("Categoria","cocat","text",c.categoria||"")}<label><input id=coactive type=checkbox ${c.ativo?"checked":""}> Ativo</label>`,async()=>{
  let {error}=await sb.from("custos_operacionais").update({nome:val("con"),unidade:val("cou"),valor:num("cov"),categoria:val("cocat"),ativo:ck("coactive")}).eq("id",id);
  if(error)return toast(error.message);closeModal();await loadAll()
 });$("#cou").value=c.unidade
}
function printQuote(id){
 let o=cache.orcamentos.find(x=>x.id===id); if(!o)return;
 let w=window.open("","_blank");
 w.document.write(`<!doctype html><html><head><meta charset=utf-8><title>Orçamento #${o.id}</title><style>body{font-family:Arial;max-width:850px;margin:40px auto;color:#222}h1{border-bottom:2px solid #222;padding-bottom:10px}.box{border:1px solid #ddd;padding:16px;margin:16px 0}.total{font-size:24px;font-weight:bold;text-align:right}@media print{button{display:none}}</style></head><body>
 <h1>Vértice Marcenaria</h1><h2>Orçamento #${o.id}</h2><div class=box><b>Cliente:</b> ${esc(o.cliente_nome||"")}<br><b>CPF:</b> ${esc(o.cliente_cpf||"")}<br><b>Telefone:</b> ${esc(o.cliente_telefone||"")}<br><b>E-mail:</b> ${esc(o.cliente_email||"")}<br><b>Endereço:</b> ${esc([o.cliente_endereco,o.cliente_numero,o.cliente_cidade,o.cliente_uf].filter(Boolean).join(", "))}</div>
 <div class=box><h3>${esc(o.projeto)}</h3><p>${esc(o.descricao_cliente||"")}</p><p><b>Prazo estimado:</b> ${o.prazo_entrega_dias||"a combinar"} dias</p><p><b>Validade:</b> ${o.validade_dias||15} dias</p><p><b>Condições de pagamento:</b> ${esc(o.condicoes_pagamento||"A combinar")}</p></div>
 <p class=total>Valor do orçamento: ${money(o.preco_final)}</p><p>${esc(o.observacoes_cliente||"")}</p><button onclick=print()>Imprimir / Salvar PDF</button>
 </body></html>`);w.document.close()
}
