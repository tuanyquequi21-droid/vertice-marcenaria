const sb = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY, {
  auth: {
    jwtSkew: 60 // tolera até 60 segundos de diferença no relógio do usuário
  }
});
const $ = s => document.querySelector(s);
const money = n => Number(n||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const num = n => Number(n||0);
const esc = s => String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));

// Formatação do ID para iniciar a partir de 100 sem '#'
const formatQuoteId = id => Number(id || 0) + 99;

function toast(msg,type='success'){const t=$('#toast');t.textContent=msg;t.className=`toast show ${type}`;setTimeout(()=>t.className='toast',3000)}
function showError(msg){$('#loginError').textContent=msg||''}

let editingQuoteId = null;

const pageNames = {dashboard:'Dashboard',orcamento:'Novo orçamento',historico:'Orçamentos',clientes:'Clientes',materiais:'Materiais'};

async function auth(){
  const {data:{session}} = await sb.auth.getSession(); 
  if(session) enter(session); 
  else $('#loginView').classList.remove('hidden'); 
  sb.auth.onAuthStateChange((_e,s)=>{if(s) enter(s);else leave()});
}

async function enter(session){
  $('#loginView').classList.add('hidden');
  $('#appView').classList.remove('hidden');
  $('#userEmail').textContent = session.user.email||'';
  navigate('dashboard');
}

function leave(){
  $('#appView').classList.add('hidden');
  $('#loginView').classList.remove('hidden');
}

async function navigate(page, param = null){
  document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.page===page));
  $('#pageTitle').textContent = pageNames[page] || 'Gestão';
  const c = $('#pageContent');
  c.innerHTML = '<div class="loading">Carregando…</div>';
  try {
    if(page === 'orcamento') await renderOrcamento(c, param);
    else if(page === 'dashboard') await renderDashboard(c);
    else if(page === 'historico') await renderHistorico(c);
    else if(page === 'clientes') await renderClientes(c);
    else if(page === 'materiais') await renderMateriais(c);
  } catch(e) {
    console.error(e);
    c.innerHTML = `<div class="empty">Erro: ${esc(e.message)}</div>`;
  }
}

document.addEventListener('click', e => {
  const b = e.target.closest('[data-page]');
  if(b) navigate(b.dataset.page);
});

$('#logoutBtn').onclick = async () => { await sb.auth.signOut(); leave(); };
$('#loginForm').onsubmit = async e => {
  e.preventDefault();
  showError('');
  const {error} = await sb.auth.signInWithPassword({email:$('#loginEmail').value, password:$('#loginPassword').value});
  if(error) showError(error.message.includes('Invalid') ? 'E-mail ou senha inválidos.' : error.message);
};

async function get(table, opts={}){
  let q = sb.from(table).select(opts.select||'*');
  if(opts.order) q = q.order(opts.order.col, {ascending: opts.order.asc ?? false});
  const {data, error} = await q;
  if(error) throw error;
  return data || [];
}

// ==================== MÁSCARAS E BUSCA CEP ====================
function formatCPF(v){
  return v.replace(/\D/g,'').replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d{1,2})$/,'$1-$2').substring(0,14);
}
function formatPhone(v){
  v = v.replace(/\D/g,'');
  if(v.length > 10) return v.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3').substring(0,15);
  return v.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3').substring(0,14);
}
async function fetchCEP(cep, elAddress, elCity){
  const clean = cep.replace(/\D/g, '');
  if(clean.length === 8){
    try {
      const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
      const data = await res.json();
      if(!data.erro){
        if(elAddress) elAddress.value = `${data.logradouro}, ${data.bairro}`;
        if(elCity) elCity.value = `${data.localidade} / ${data.uf}`;
      }
    } catch(err){ console.error("Erro ao buscar CEP", err); }
  }
}

// ==================== DASHBOARD ====================
async function renderDashboard(c){
  const [o, cl] = await Promise.all([
    get('orcamentos', {select:'*, clientes(nome)', order:{col:'data_criacao'}}),
    get('clientes')
  ]);
  const approved = o.filter(x => x.status === 'Aprovado');
  const faturamento = approved.reduce((s,x) => s + num(x.preco_final), 0);
  const lucro = approved.reduce((s,x) => s + num(x.valor_lucro), 0);
  
  c.innerHTML = `
    <div class="cards">
      <div class="metric"><span>Orçamentos</span><strong>${o.length}</strong><small>Total registrado</small></div>
      <div class="metric"><span>Clientes</span><strong>${cl.length}</strong><small>Base cadastrada</small></div>
      <div class="metric"><span>Faturamento aprovado</span><strong>${money(faturamento)}</strong><small>Propostas aprovadas</small></div>
      <div class="metric"><span>Lucro estimado</span><strong>${money(lucro)}</strong><small>Sobre aprovados</small></div>
    </div>
    <div class="grid-2">
      <section class="panel">
        <div class="panel-head">
          <div><p class="eyebrow">RECENTES</p><h3>Últimos orçamentos</h3></div>
          <button class="link" data-page="historico">Ver todos</button>
        </div>
        ${o.slice(0,6).map(quoteRow).join('') || empty('Nenhum orçamento ainda.','Crie seu primeiro orçamento.')}
      </section>
      <section class="panel welcome">
        <p class="eyebrow">GESTÃO</p><h3>Seu negócio, mais organizado.</h3>
        <p>Cadastre materiais, monte propostas e acompanhe o status dos seus orçamentos.</p>
        <button class="btn primary" data-page="orcamento">Criar orçamento</button>
      </section>
    </div>`;
}

function quoteRow(x){
  const clienteNome = x.clientes?.nome || x.cliente_nome_avulso || 'Cliente Geral';
  return `
    <div class="row">
      <div>
        <strong>${esc(clienteNome)} — <small>Orçamento ${formatQuoteId(x.id)} (${esc(x.projeto)})</small></strong>
        <small>${new Date(x.data_criacao).toLocaleDateString('pt-BR')}</small>
      </div>
      <div class="row-right">
        <strong>${money(x.preco_final)}</strong>
        <span class="badge ${x.status.toLowerCase()}">${esc(x.status)}</span>
      </div>
    </div>`;
}

function empty(a,b){return `<div class="empty"><strong>${a}</strong><span>${b}</span></div>`}

// ==================== CLIENTES ====================
async function renderClientes(c){
  const data = await get('clientes', {order:{col:'criado_em'}});
  c.innerHTML = `
    <section class="panel">
      <div class="panel-head">
        <div><p class="eyebrow">CADASTRO</p><h3>Clientes</h3></div>
        <button class="btn primary" id="newClient">+ Novo cliente</button>
      </div>

      <div class="form-grid" style="margin-bottom:1.5rem;">
        <label>Buscar cliente
          <input id="searchClient" placeholder="Pesquisar por Nome, CPF, Telefone, E-mail, Cidade ou Endereço">
        </label>
      </div>

      <div class="table-wrap">
        <table>
          <thead><tr><th>Nome</th><th>CPF</th><th>Telefone</th><th>Cidade / UF</th><th>Endereço</th><th>Ações</th></tr></thead>
          <tbody id="clientTableBody">
            ${renderClientRows(data)}
          </tbody>
        </table>
      </div>
    </section>`;
    
  $('#newClient').onclick = () => clientModal();

  $('#searchClient').oninput = e => {
    const term = e.target.value.toLowerCase().trim();
    const filtered = data.filter(x => {
      const nome = (x.nome || '').toLowerCase();
      const cpf = (x.cpf || '').toLowerCase();
      const tel = (x.telefone || '').toLowerCase();
      const cidade = (x.cidade || '').toLowerCase();
      const end = (x.endereco || '').toLowerCase();
      return nome.includes(term) || cpf.includes(term) || tel.includes(term) || cidade.includes(term) || end.includes(term);
    });
    $('#clientTableBody').innerHTML = renderClientRows(filtered);
    bindClientEvents(c, data);
  };

  bindClientEvents(c, data);
}

function renderClientRows(list){
  return list.map(x => `
    <tr>
      <td><strong>${esc(x.nome)}</strong></td>
      <td>${esc(x.cpf || '—')}</td>
      <td>${esc(x.telefone || '—')}</td>
      <td>${esc(x.cidade || '—')}</td>
      <td>${esc(x.endereco||'')}${x.numero?' nº '+esc(x.numero):''}</td>
      <td>
        <button class="btn ghost btn-sm edit-client-btn" data-id="${x.id}">Editar</button>
        <button class="icon-btn delete-client-btn" data-id="${x.id}" title="Excluir cliente">×</button>
      </td>
    </tr>
  `).join('') || `<tr><td colspan="6">Nenhum cliente encontrado.</td></tr>`;
}

function bindClientEvents(c, originalData){
  c.querySelectorAll('.edit-client-btn').forEach(btn => {
    btn.onclick = async () => {
      const id = btn.dataset.id;
      const { data: client } = await sb.from('clientes').select('*').eq('id', id).single();
      if(client) clientModal(client);
    };
  });

  c.querySelectorAll('.delete-client-btn').forEach(btn => {
    btn.onclick = async () => {
      const id = btn.dataset.id;
      if(!confirm('Deseja realmente excluir este cliente?')) return;
      const { error } = await sb.from('clientes').delete().eq('id', id);
      if(error) return toast(error.message, 'error');
      toast('Cliente excluído com sucesso.');
      renderClientes(c);
    };
  });
}

function clientModal(data = null){
  const isEdit = !!data;
  modal(isEdit ? 'Editar cliente' : 'Novo cliente', `
    <form id="clientForm" class="form-grid">
      <label>Nome *<input name="nome" value="${esc(data?.nome||'')}" required></label>
      <label>CPF<input name="cpf" id="cCPF" value="${esc(data?.cpf||'')}"></label>
      <label>Telefone<input name="telefone" id="cPhone" value="${esc(data?.telefone||'')}"></label>
      <label>E-mail<input name="email" type="email" value="${esc(data?.email||'')}"></label>
      <label>CEP<input name="cep" id="cCEP" value="${esc(data?.cep||'')}"></label>
      <label>Cidade / UF<input name="cidade" id="cCity" value="${esc(data?.cidade||'')}"></label>
      <label>Endereço<input name="endereco" id="cAddress" value="${esc(data?.endereco||'')}"></label>
      <label>Número<input name="numero" value="${esc(data?.numero||'')}"></label>
      <div class="form-actions">
        <button type="button" class="btn ghost" data-close>Cancelar</button>
        <button class="btn primary">${isEdit ? 'Atualizar' : 'Salvar'}</button>
      </div>
    </form>
  `);

  $('#cCPF').oninput = e => e.target.value = formatCPF(e.target.value);
  $('#cPhone').oninput = e => e.target.value = formatPhone(e.target.value);
  $('#cCEP').onchange = e => fetchCEP(e.target.value, $('#cAddress'), $('#cCity'));
  $('#cCEP').onkeyup = e => fetchCEP(e.target.value, $('#cAddress'), $('#cCity'));

  $('#clientForm').onsubmit = async e => {
    e.preventDefault();
    const o = Object.fromEntries(new FormData(e.target));
    let error;
    if(isEdit) {
      ({error} = await sb.from('clientes').update(o).eq('id', data.id));
    } else {
      ({error} = await sb.from('clientes').insert(o));
    }
    if(error) return toast(error.message, 'error');
    closeModal();
    toast(isEdit ? 'Cliente atualizado.' : 'Cliente cadastrado.');
    renderClientes($('#pageContent'));
  };
}

// ==================== MATERIAIS ====================
async function renderMateriais(c){
  const [mf, fe, co] = await Promise.all([
    get('chapas_mdf', {order:{col:'criado_em'}}),
    get('ferragens', {order:{col:'criado_em'}}),
    get('config_global')
  ]);
  const cfg = Object.fromEntries(co.map(x=>[x.chave,x.valor]));

  delete cfg.parafusos_un;
  delete cfg.gasolina_km;

  c.innerHTML = `
    <div class="panel" style="margin-bottom: 1.5rem;">
      <p class="eyebrow">PESQUISA DE MATERIAIS</p>
      <h3>Filtro no catálogo</h3>
      <input id="searchMaterial" placeholder="Digite o nome, marca, tipo ou fornecedor do MDF ou Ferragem..." style="width:100%; border-radius:8px; border:1px solid #ccc; padding:10px;">
    </div>

    <div class="grid-2">
      <section class="panel">
        <div class="panel-head">
          <div><p class="eyebrow">CATÁLOGO</p><h3>Chapas MDF</h3></div>
          <button class="btn primary" id="newMdf">+ Adicionar</button>
        </div>
        <div id="mdfContainer">
          ${renderMDFList(mf)}
        </div>
      </section>

      <section class="panel">
        <div class="panel-head">
          <div><p class="eyebrow">CATÁLOGO</p><h3>Ferragens</h3></div>
          <button class="btn primary" id="newFerr">+ Adicionar</button>
        </div>
        <div id="ferrContainer">
          ${renderFerrList(fe)}
        </div>
      </section>
    </div>

    <section class="panel" style="margin-top: 1.5rem;">
      <div class="panel-head"><div><p class="eyebrow">CUSTOS</p><h3>Parâmetros operacionais e Insumos</h3></div></div>
      <form id="configForm" class="config-grid">
        ${Object.entries(cfg).map(([k,v])=>`<label>${labels[k]||k}<input name="${k}" type="number" step="0.01" value="${v}"></label>`).join('')}
        <div class="form-actions"><button class="btn primary">Salvar parâmetros</button></div>
      </form>
    </section>`;

  $('#newMdf').onclick = () => materialModal('MDF');
  $('#newFerr').onclick = () => materialModal('Ferragem');

  $('#searchMaterial').oninput = e => {
    const term = e.target.value.toLowerCase().trim();
    const filteredMdf = mf.filter(x => (x.nome_modelo||'').toLowerCase().includes(term) || (x.marca||'').toLowerCase().includes(term) || (x.fornecedor||'').toLowerCase().includes(term));
    const filteredFerr = fe.filter(x => (x.nome_modelo||'').toLowerCase().includes(term) || (x.marca||'').toLowerCase().includes(term) || (x.tipo||'').toLowerCase().includes(term) || (x.fornecedor||'').toLowerCase().includes(term));

    $('#mdfContainer').innerHTML = renderMDFList(filteredMdf);
    $('#ferrContainer').innerHTML = renderFerrList(filteredFerr);
    bindMaterialEvents(c);
  };

  bindMaterialEvents(c);

  $('#configForm').onsubmit = async e => {
    e.preventDefault();
    for(const [chave,valor] of new FormData(e.target)){
      const {error} = await sb.from('config_global').upsert({chave,valor:num(valor)},{onConflict:'chave'});
      if(error) return toast(error.message,'error');
    }
    toast('Parâmetros atualizados.');
  };
}

function renderMDFList(list){
  return list.map(x=>`
    <div class="row">
      <div><strong>${esc(x.nome_modelo)}</strong><small>${esc(x.marca||'')} · ${esc(x.fornecedor||'')}</small></div>
      <div><strong>${money(x.preco_custo)}</strong> <button class="link edit-mat-btn" data-kind="MDF" data-id="${x.id}">Editar</button></div>
    </div>
  `).join('') || empty('Nenhum MDF encontrado.','');
}

function renderFerrList(list){
  return list.map(x=>`
    <div class="row">
      <div><strong>${esc(x.nome_modelo)}</strong><small>${esc(x.tipo)} · ${esc(x.marca||'')}</small></div>
      <div><strong>${money(x.preco_custo)}</strong> <button class="link edit-mat-btn" data-kind="Ferragem" data-id="${x.id}">Editar</button></div>
    </div>
  `).join('') || empty('Nenhuma ferragem encontrada.','');
}

function bindMaterialEvents(c){
  c.querySelectorAll('.edit-mat-btn').forEach(btn => {
    btn.onclick = async () => {
      const kind = btn.dataset.kind;
      const id = btn.dataset.id;
      const table = kind === 'MDF' ? 'chapas_mdf' : 'ferragens';
      const { data: item } = await sb.from(table).select('*').eq('id', id).single();
      if(item) materialModal(kind, item);
    };
  });
}

const labels = {
  dia_trabalho: 'Dia de trabalho (R$ / max 8h)',
  luz_hora: 'Luz / hora (R$)',
  agua_hora: 'Água / hora (R$)',
  maquina_depreciacao_hora: 'Depreciação máquina / hora (R$)',
  caixa_parafuso_preco: 'Caixa de Parafuso (R$ / caixa)',
  cola_g: 'Cola / g (R$)',
  fita_borda_m: 'Fita de Borda Padrão / m (R$)',
  desgaste_serra_corte: 'Desgaste da Serra / Projeto (R$)',
  custo_hora_3d: 'Projeto 3D / hora (R$)'
};

function materialModal(kind, data = null){
  const isM = kind === 'MDF';
  const isEdit = !!data;
  modal(`${isEdit ? 'Editar' : 'Novo'} ${kind}`, `
    <form id="materialForm" class="form-grid">
      <label>Nome/modelo *<input name="nome_modelo" value="${esc(data?.nome_modelo||'')}" required></label>
      ${isM 
        ? `<label>Marca<input name="marca" value="${esc(data?.marca||'')}"></label>`
        : `<label>Tipo
             <select name="tipo">
               <option ${data?.tipo==='Dobradiça'?'selected':''}>Dobradiça</option>
               <option ${data?.tipo==='Corrediça'?'selected':''}>Corrediça</option>
               <option ${data?.tipo==='Puxador'?'selected':''}>Puxador</option>
               <option ${data?.tipo==='Pistão'?'selected':''}>Pistão</option>
               <option ${data?.tipo==='Outros'?'selected':''}>Outros</option>
             </select>
           </label>
           <label>Marca<input name="marca" value="${esc(data?.marca||'')}"></label>`
      }
      <label>Fornecedor<input name="fornecedor" value="${esc(data?.fornecedor||'')}"></label>
      <label>Preço de custo *<input name="preco_custo" type="number" step="0.01" value="${data?.preco_custo||''}" required></label>
      <div class="form-actions">
        <button type="button" class="btn ghost" data-close>Cancelar</button>
        <button class="btn primary">${isEdit ? 'Atualizar' : 'Salvar'}</button>
      </div>
    </form>
  `);

  $('#materialForm').onsubmit = async e => {
    e.preventDefault();
    let o = Object.fromEntries(new FormData(e.target));
    o.preco_custo = num(o.preco_custo);
    const table = isM ? 'chapas_mdf' : 'ferragens';
    
    let error;
    if(isEdit) {
      ({error} = await sb.from(table).update(o).eq('id', data.id));
    } else {
      ({error} = await sb.from(table).insert(o));
    }

    if(error) return toast(error.message,'error');
    closeModal();
    toast(`${kind} ${isEdit ? 'atualizado' : 'cadastrado'}.`);
    renderMateriais($('#pageContent'));
  };
}

// ==================== HISTÓRICO DE ORÇAMENTOS ====================
async function renderHistorico(c){
  const o = await get('orcamentos', {
    select: '*, clientes(*)',
    order: {col:'data_criacao'}
  });

  c.innerHTML = `
    <section class="panel">
      <div class="panel-head">
        <div><p class="eyebrow">HISTÓRICO</p><h3>Orçamentos</h3></div>
        <button class="btn primary" data-page="orcamento">+ Novo orçamento</button>
      </div>
      
      <div class="form-grid" style="margin-bottom:1.5rem;">
        <label>Buscar orçamento
          <input id="searchQuote" placeholder="Pesquisar por Nome do Cliente, CPF, Projeto ou Data (DD/MM/AAAA)">
        </label>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>Cliente</th><th>Projeto</th><th>Data</th><th>Preço</th><th>Status</th><th>Ações</th></tr>
          </thead>
          <tbody id="quoteTableBody">
            ${renderQuoteRows(o)}
          </tbody>
        </table>
      </div>
    </section>`;

  $('#searchQuote').oninput = e => {
    const term = e.target.value.toLowerCase().trim();
    const filtered = o.filter(x => {
      const cName = (x.clientes?.nome || x.cliente_nome_avulso || '').toLowerCase();
      const cCPF = (x.clientes?.cpf || '').toLowerCase();
      const proj = (x.projeto || '').toLowerCase();
      const date = new Date(x.data_criacao).toLocaleDateString('pt-BR');
      return cName.includes(term) || cCPF.includes(term) || proj.includes(term) || date.includes(term);
    });
    $('#quoteTableBody').innerHTML = renderQuoteRows(filtered);
    bindTableEvents(c, o);
  };

  bindTableEvents(c, o);
}

function renderQuoteRows(list){
  return list.map(x => {
    const clienteNome = x.clientes?.nome || x.cliente_nome_avulso || 'Cliente Não Identificado';
    return `
      <tr>
        <td><strong>${esc(clienteNome)}</strong> ${x.clientes?.cpf ? `<br><small>CPF: ${esc(x.clientes.cpf)}</small>` : ''}</td>
        <td>${esc(x.projeto)} <br><small>Orçamento ${formatQuoteId(x.id)}</small></td>
        <td>${new Date(x.data_criacao).toLocaleDateString('pt-BR')}</td>
        <td>${money(x.preco_final)}</td>
        <td>
          <select class="status-select" data-id="${x.id}">
            <option ${x.status==='Pendente'?'selected':''}>Pendente</option>
            <option ${x.status==='Aprovado'?'selected':''}>Aprovado</option>
            <option ${x.status==='Recusado'?'selected':''}>Recusado</option>
          </select>
        </td>
        <td>
          <button class="btn ghost btn-sm edit-quote-btn" data-id="${x.id}" title="Editar">Editar</button>
          <button class="btn dark btn-sm pdf-quote-btn" data-id="${x.id}" title="Gerar PDF">PDF</button>
          <button class="icon-btn" data-delete="${x.id}" title="Excluir">×</button>
        </td>
      </tr>
    `;
  }).join('') || `<tr><td colspan="6">Nenhum orçamento encontrado.</td></tr>`;
}

function bindTableEvents(c, originalData){
  c.querySelectorAll('.edit-quote-btn').forEach(b => {
    b.onclick = () => navigate('orcamento', b.dataset.id);
  });
  c.querySelectorAll('.pdf-quote-btn').forEach(b => {
    b.onclick = () => generatePDF(b.dataset.id);
  });
  c.querySelectorAll('.status-select').forEach(s=>s.onchange=async()=>{
    const {error} = await sb.from('orcamentos').update({status:s.value}).eq('id',s.dataset.id);
    if(error) toast(error.message,'error'); else toast('Status atualizado.');
  });
  c.querySelectorAll('[data-delete]').forEach(b=>b.onclick=async()=>{
    if(!confirm('Excluir este orçamento?')) return;
    const {error} = await sb.from('orcamentos').delete().eq('id',b.dataset.delete);
    if(error) toast(error.message,'error'); else { toast('Orçamento excluído.'); renderHistorico(c); }
  });
}

// ==================== CRIAR/EDITAR ORÇAMENTO ====================
async function renderOrcamento(c, editId = null){
  editingQuoteId = editId;
  const [clients, mf, fe, co] = await Promise.all([
    get('clientes', {order:{col:'nome', asc:true}}),
    get('chapas_mdf', {order:{col:'nome_modelo', asc:true}}),
    get('ferragens', {order:{col:'nome_modelo', asc:true}}),
    get('config_global')
  ]);
  const cfg = Object.fromEntries(co.map(x=>[x.chave,x.valor]));

  let existingQuote = null;
  let savedHardwareItems = [];
  let mdfItem = null;

  if(editId) {
    const { data: q, error } = await sb.from('orcamentos').select('*, orcamento_itens(*)').eq('id', editId).single();
    if(!error && q) {
      existingQuote = q;
      if(q.orcamento_itens) {
        q.orcamento_itens.forEach(item => {
          if(item.categoria === 'MDF') mdfItem = item;
          else if(item.categoria === 'Ferragem') savedHardwareItems.push(item);
        });
      }
    }
  }

  let selectedMdfId = "";
  if(mdfItem) {
    const foundMdf = mf.find(m => mdfItem.descricao.includes(m.nome_modelo));
    if(foundMdf) selectedMdfId = foundMdf.id;
  }

  let margemCalculada = 30;
  if(existingQuote && existingQuote.custo_producao > 0) {
    margemCalculada = Math.round((1 - (existingQuote.custo_producao / existingQuote.preco_final)) * 100 * 10) / 10;
  }

  let defaultObs = existingQuote?.observacoes || '';

  // Função auxiliar para renderizar a linha de um componente/ferragem
  const buildHardwareRowHtml = (selectedId = '', qty = 0) => {
    return `
      <div class="hardware-row" style="display:flex; gap:10px; align-items:center; margin-bottom:10px;">
        <select class="f-select" style="flex:1;">
          <option value="">Selecione o componente...</option>
          ${fe.map(x=>`<option value="${x.id}" data-price="${x.preco_custo}" ${selectedId === x.id ? 'selected':''}>${esc(x.tipo)} - ${esc(x.nome_modelo)} — ${money(x.preco_custo)}</option>`).join('')}
        </select>
        <input class="f-qty" type="number" min="0" value="${qty}" placeholder="Qtd." style="width:100px;">
        <button type="button" class="icon-btn remove-hw-btn" title="Remover componente" style="color:#d9534f; font-weight:bold; font-size:18px;">×</button>
      </div>
    `;
  };

  c.innerHTML = `
    <form id="quoteForm">
      <div class="grid-2">
        <section class="panel">
          <p class="eyebrow">PROPOSTA</p>
          <h3>${editId ? 'Editar Orçamento ' + formatQuoteId(editId) : 'Dados do projeto'}</h3>
          <div class="form-grid">
            <label>Cliente
              <select id="qClient">
                <option value="">Cliente avulso</option>
                ${clients.map(x=>`<option value="${x.id}" ${existingQuote?.cliente_id === x.id ? 'selected':''}>${esc(x.nome)} ${x.cpf ? ' - '+x.cpf:''}</option>`).join('')}
              </select>
            </label>
            <label>Nome do cliente (Avulso)
              <input id="qClientName" value="${esc(existingQuote?.cliente_nome_avulso||'')}" placeholder="Preencha se não estiver cadastrado">
            </label>
            <label>Projeto *
              <input id="qProject" value="${esc(existingQuote?.projeto||'')}" required placeholder="Ex.: Cozinha planejada">
            </label>
            <label>Prazo de Entrega (em dias)
              <input id="qDeliveryDays" type="number" min="1" value="15" placeholder="Ex.: 15">
            </label>
            <label>Margem de lucro (%)
              <input id="qMargin" type="number" min="0" max="99" value="${margemCalculada}" step="0.5">
            </label>
          </div>
        </section>

        <section class="panel">
          <p class="eyebrow">MDF</p><h3>Material principal</h3>
          <div class="form-grid">
            <label>Chapa
              <select id="qMdf">
                <option value="">Selecione</option>
                ${mf.map(x=>`<option value="${x.id}" data-price="${x.preco_custo}" ${selectedMdfId === x.id ? 'selected':''}>${esc(x.nome_modelo)}</option>`).join('')}
              </select>
            </label>
            <label>Quantidade de chapas
              <input id="qMdfQty" type="number" min="0" step="0.01" value="${mdfItem?.quantidade || 0}">
            </label>
          </div>
        </section>
      </div>

      <section class="panel">
        <div class="panel-head"><div><p class="eyebrow">PRODUÇÃO</p><h3>Custos e Processos</h3></div></div>
        <div class="form-grid four">
          <label>Fita de Borda - Tipo/Valor / m
            <select id="qTapePrice">
              <option value="${cfg.fita_borda_m || 2.50}">Fita Padrão — ${money(cfg.fita_borda_m || 2.50)}/m</option>
              <option value="4.50">Fita Especial/PVC — R$ 4,50/m</option>
              <option value="7.00">Fita Premium High-Gloss — R$ 7,00/m</option>
            </select>
          </label>
          <label>Fita de Borda (Metros)<input id="qTape" type="number" min="0" step="0.01" value="0"></label>
          <label>Dias trabalhados oficina<input id="qDays" type="number" min="0" step="0.5" value="0"></label>
          <label>Frete Terceirizado (R$)<input id="qFrete" type="number" min="0" step="0.01" value="0" placeholder="R$ 0,00"></label>
          <label>Serviço de Montagem (R$)<input id="qMontagem" type="number" min="0" step="0.01" value="0" placeholder="R$ 0,00"></label>
          <label>Projeto 3D (h)<input id="q3d" type="number" min="0" step="0.5" value="0"></label>
        </div>
      </section>

      <section class="panel">
        <div class="panel-head">
          <div><p class="eyebrow">FERRAGENS & COMPONENTES</p><h3>Componentes Internos</h3></div>
          <button type="button" class="btn primary" id="addHardwareBtn">+ Adicionar Componente</button>
        </div>
        <div id="hardwareListContainer" style="margin-top: 1rem;">
          </div>
      </section>

      <section class="panel">
        <p class="eyebrow">OBSERVAÇÕES DO ORÇAMENTO</p>
        <h3>Informações adicionais para o cliente</h3>
        <textarea id="qObs" rows="4" style="width:100%; border-radius:8px; border:1px solid #ccc; padding:10px;" placeholder="Ex.: Condições de pagamento, garantias, etc.">${esc(defaultObs)}</textarea>
      </section>

      <section class="panel" style="background:#fafafa;">
        <p class="eyebrow">DETALHAMENTO DO ORÇAMENTO</p>
        <h3>Composição dos Custos</h3>
        
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; font-size: 0.95rem;">
          <div>• Chapas MDF: <strong id="dMdf">R$ 0,00</strong></div>
          <div>• Materiais Diversos (Ferragens, Cola, Fita, Parafusos...): <strong id="dIns">R$ 0,00</strong></div>
          <div>• Mão de Obra (Oficina): <strong id="dMo">R$ 0,00</strong></div>
          <div>• Serviço de Montagem: <strong id="dMontagem">R$ 0,00</strong></div>
          <div>• Frete Terceirizado: <strong id="dFrete">R$ 0,00</strong></div>
        </div>

        <div class="quote-result" id="quoteResult">
          <div><span>Custo Total de Produção</span><strong id="rCost">${money(existingQuote?.custo_producao||0)}</strong></div>
          <div><span>Lucro (${margemCalculada}%)</span><strong id="rProfit">${money(existingQuote?.valor_lucro||0)}</strong></div>
          <div class="highlight"><span>Preço Final de Venda</span><strong id="rPrice">${money(existingQuote?.preco_final||0)}</strong></div>
        </div>
      </section>

      <div class="form-actions" style="margin-top:1.5rem;">
        <button type="button" class="btn ghost" id="clearQuote">Limpar</button>
        <button type="button" class="btn primary" id="calcQuote">Calcular orçamento</button>
        <button type="submit" class="btn dark">${editId ? 'Atualizar orçamento' : 'Salvar orçamento'}</button>
      </div>
    </form>`;

  const hwContainer = $('#hardwareListContainer');

  // Adiciona item dinamicamente
  const addHardwareRow = (selectedId = '', qty = 0) => {
    const div = document.createElement('div');
    div.innerHTML = buildHardwareRowHtml(selectedId, qty);
    const rowEl = div.firstElementChild;
    hwContainer.appendChild(rowEl);

    rowEl.querySelector('.remove-hw-btn').onclick = () => {
      rowEl.remove();
    };
  };

  // Carrega itens existentes ou adiciona 1 linha vazia por padrão
  if(savedHardwareItems.length > 0) {
    savedHardwareItems.forEach(item => {
      const foundFe = fe.find(f => f.nome_modelo === item.descricao);
      addHardwareRow(foundFe ? foundFe.id : '', item.quantidade || 0);
    });
  } else {
    addHardwareRow();
  }

  $('#addHardwareBtn').onclick = () => addHardwareRow();

  const calculate = () => {
    const mdfOpt = $('#qMdf').selectedOptions[0];
    const mdfPrice = num(mdfOpt?.dataset.price);
    const mdfQty = num($('#qMdfQty').value);
    const mdfTotal = mdfPrice * mdfQty;

    let ferragensTotal = 0;
    document.querySelectorAll('.hardware-row').forEach(r => {
      const o = r.querySelector('.f-select').selectedOptions[0];
      const q = num(r.querySelector('.f-qty').value);
      if(o?.value && q){
        ferragensTotal += num(o.dataset.price) * q;
      }
    });

    const tapeMeters = num($('#qTape').value);
    const tapeUnitPrice = num($('#qTapePrice').value);
    const days = num($('#qDays').value);
    const frete = num($('#qFrete').value);
    const montagem = num($('#qMontagem').value);
    const h3d = num($('#q3d').value);

    // Custo de parafusos baseado na caixa
    const custoCaixaParafuso = num(cfg.caixa_parafuso_preco || 15.00); 
    const parafusosEstimados = mdfQty * 20; 
    const custoParafusos = (parafusosEstimados / 100) * custoCaixaParafuso; 

    const insumosBordaCola = custoParafusos + (tapeMeters * 10 * num(cfg.cola_g)) + (tapeMeters * tapeUnitPrice);
    const desgasteSerra = num(cfg.desgaste_serra_corte || 25.00); // Fixo por projeto
    const custosFixosEnergia = days * 8 * (num(cfg.luz_hora) + num(cfg.agua_hora) + num(cfg.maquina_depreciacao_hora));
    
    // Materiais Diversos (Unificação de Ferragens + Insumos + Parafusos + Fita + Serra + Custos Operacionais)
    const materiaisDiversos = ferragensTotal + insumosBordaCola + desgasteSerra + custosFixosEnergia;

    const maoDeObra = days * num(cfg.dia_trabalho);
    const projeto3D = h3d * num(cfg.custo_hora_3d);

    const cost = mdfTotal + materiaisDiversos + maoDeObra + montagem + frete + projeto3D;
    const margin = Math.min(num($('#qMargin').value)/100, .99);
    const price = margin === 1 ? cost : cost / (1 - margin);
    const profit = price - cost;
    const reinv = mdfTotal + materiaisDiversos;

    $('#dMdf').textContent = money(mdfTotal);
    $('#dIns').textContent = money(materiaisDiversos);
    $('#dMo').textContent = money(maoDeObra);
    $('#dMontagem').textContent = money(montagem);
    $('#dFrete').textContent = money(frete);

    $('#rCost').textContent = money(cost);
    $('#rProfit').textContent = money(profit);
    $('#rPrice').textContent = money(price);

    return {cost, price, profit, reinv, mdfTotal, mdfQty, materiaisDiversos, maoDeObra, montagem, frete, prazoEntrega: $('#qDeliveryDays').value};
  };

  $('#calcQuote').onclick = calculate;
  $('#clearQuote').onclick = () => renderOrcamento(c);

  $('#quoteForm').onsubmit = async e => {
    e.preventDefault();
    const x = calculate();
    const cid = $('#qClient').value || null;

    let obsFinal = $('#qObs').value;
    if(x.prazoEntrega && !obsFinal.includes('Prazo de Entrega')) {
      obsFinal = `Prazo de Entrega estimado: ${x.prazoEntrega} dias.\n` + obsFinal;
    }

    const payload = {
      projeto: $('#qProject').value,
      cliente_id: cid,
      cliente_nome_avulso: cid ? null : ($('#qClientName').value || 'Cliente avulso'),
      custo_producao: x.cost,
      valor_lucro: x.profit,
      preco_final: x.price,
      reinvestimento_materiais: x.reinv,
      status: existingQuote ? existingQuote.status : 'Pendente',
      observacoes: obsFinal
    };

    let data, error;
    if(editId) {
      ({data, error} = await sb.from('orcamentos').update(payload).eq('id', editId).select().single());
    } else {
      ({data, error} = await sb.from('orcamentos').insert(payload).select().single());
    }

    if(error) return toast(error.message, 'error');

    if(editId) await sb.from('orcamento_itens').delete().eq('orcamento_id', editId);

    // Salva os componentes selecionados dinamicamente
    const itemsHardwareToSave = [];
    document.querySelectorAll('.hardware-row').forEach(r => {
      const o = r.querySelector('.f-select').selectedOptions[0];
      const q = num(r.querySelector('.f-qty').value);
      if(o?.value && q > 0) {
        const found = fe.find(item => item.id === o.value);
        if(found) {
          itemsHardwareToSave.push({
            categoria: 'Ferragem',
            descricao: found.nome_modelo,
            quantidade: q,
            custo_unitario: num(found.preco_custo),
            custo_total: num(found.preco_custo) * q
          });
        }
      }
    });

    // Itens unificados para o PDF
    const items = [
      {categoria:'MDF', descricao:$('#qMdf').selectedOptions[0]?.textContent || 'Chapas MDF', quantidade: x.mdfQty, custo_unitario: x.mdfTotal / Math.max(x.mdfQty,1), custo_total: x.mdfTotal},
      ...itemsHardwareToSave,
      {categoria:'Materiais Diversos', descricao:'Materiais diversos', quantidade:1, custo_unitario: x.materiaisDiversos - itemsHardwareToSave.reduce((s,i)=>s+i.custo_total,0), custo_total: x.materiaisDiversos - itemsHardwareToSave.reduce((s,i)=>s+i.custo_total,0)},
      {categoria:'Mão de Obra', descricao:'Serviço de Marcenaria', quantidade:1, custo_unitario: x.maoDeObra, custo_total: x.maoDeObra},
      {categoria:'Montagem', descricao:'Serviço de Montagem no local', quantidade:1, custo_unitario: x.montagem, custo_total: x.montagem},
      {categoria:'Frete', descricao:'Frete', quantidade:1, custo_unitario: x.frete, custo_total: x.frete}
    ].filter(i=>i.custo_total > 0);

    if(items.length) {
      await sb.from('orcamento_itens').insert(items.map(i=>({...i, orcamento_id: data.id})));
    }

    toast(`Orçamento ${formatQuoteId(data.id)} ${editId ? 'atualizado' : 'salvo'}.`);
    navigate('historico');
  };
}

// ==================== GERADOR DE PDF PROFISSIONAL ====================
async function generatePDF(id) {
  const { jsPDF } = window.jspdf;
  
  // 1. Busca os dados do orçamento no Supabase
  const { data: q, error } = await sb
    .from('orcamentos')
    .select('*, clientes(*), orcamento_itens(*)')
    .eq('id', id)
    .single();

  if (error || !q) return toast('Erro ao carregar dados para o PDF', 'error');

  const doc = new jsPDF();
  const cliente = q.clientes || {};
  const clienteNome = cliente.nome || q.cliente_nome_avulso || 'Cliente';

  // 2. Definir o Base64 do Logo usando CRASES (`) em vez de aspas (")
  const LOGO_BASE64 = `SEU_BASE64_COMPLETO_AQUI`;

  // 3. Adicionar o Logótipo ao PDF
  try {
    // Parâmetros: (imagem, formato, x, y, largura, altura)
    doc.addImage(LOGO_BASE64, 'JPEG', 14, 12, 28, 28);
  } catch (e) {
    console.error("Erro ao inserir imagem no PDF:", e);
  }

  // 4. Cabeçalho / Informações da Empresa
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(26, 26, 26);
  doc.text("VÉRTICE MARCENARIA", 46, 22);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text("Orçamento de Marcenaria", 46, 28);

  // 5. Salvar / Fazer Download do PDF
  doc.save(`Orcamento_${id}_${clienteNome}.pdf`);
}
  // Restante da geração do PDF...
}

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(26, 26, 26);
  doc.text("VÉRTICE MARCENARIA", 46, 22);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text("Móveis Planejados & Marcenaria Sob Medida", 46, 28);

  // Número do Orçamento e Data
  const numOrc = formatQuoteId(q.id);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(184, 148, 63); // Cor dourada
  doc.text(`ORÇAMENTO ${numOrc}`, 196, 22, { align: 'right' });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(`Data: ${new Date(q.data_criacao).toLocaleDateString('pt-BR')}`, 196, 28, { align: 'right' });

  // Linha Divisória Elegante
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.5);
  doc.line(14, 44, 196, 44);

  // Bloco de Dados do Cliente e Projeto
  doc.setFillColor(248, 249, 250);
  doc.rect(14, 48, 182, 34, 'F');

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(40, 40, 40);
  doc.text("DADOS DO CLIENTE & PROJETO", 18, 55);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  doc.text(`Cliente: ${clienteNome}`, 18, 62);
  doc.text(`CPF: ${cliente.cpf || 'Não informado'}`, 18, 68);
  doc.text(`Telefone: ${cliente.telefone || 'Não informado'}`, 18, 74);

  doc.text(`Projeto: ${q.projeto}`, 110, 62);
  doc.text(`Cidade / UF: ${cliente.cidade || 'Não informado'}`, 110, 68);
  doc.text(`Endereço: ${cliente.endereco || 'Não informado'} ${cliente.numero ? 'nº ' + cliente.numero : ''}`, 110, 74);

  // Tabela de Itens Simplificada e Profissional
  const tableBody = (q.orcamento_itens || []).map(i => [
    i.categoria,
    i.descricao,
    money(i.custo_total)
  ]);

  doc.autoTable({
    startY: 88,
    head: [['Item / Serviço', 'Descrição', 'Valor Total']],
    body: tableBody,
    theme: 'grid',
    headStyles: { fillColor: [30, 30, 30], textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 4 },
    columnStyles: {
      0: { cellWidth: 50, fontStyle: 'bold' },
      1: { cellWidth: 95 },
      2: { cellWidth: 37, halign: 'right', fontStyle: 'bold' }
    }
  });

  let finalY = doc.lastAutoTable.finalY + 10;

  // Bloco de Observações
  if(q.observacoes) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(40, 40, 40);
    doc.text("OBSERVAÇÕES E CONDIÇÕES:", 14, finalY);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    
    const lines = doc.splitTextToSize(q.observacoes, 182);
    doc.text(lines, 14, finalY + 6);
    finalY += (lines.length * 5) + 8;
  }

  // Bloco do Valor Final
  doc.setFillColor(30, 30, 30);
  doc.rect(14, finalY, 182, 16, 'F');

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text("VALOR TOTAL DA PROPOSTA:", 20, finalY + 10.5);

  doc.setFontSize(13);
  doc.setTextColor(212, 175, 55); // Dourado
  doc.text(money(q.preco_final), 190, finalY + 10.5, { align: 'right' });

  // Assinatura / Rodapé
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text("Vértice Marcenaria — Qualidade e Compromisso Sob Medida", 105, 285, { align: 'center' });

  doc.save(`Orcamento_${numOrc}_${clienteNome.replace(/\s+/g, '_')}.pdf`);
  toast('PDF Gerado com sucesso!');
}

function modal(title,body){
  document.body.insertAdjacentHTML('beforeend',`<div class="modal-backdrop" id="modal"><div class="modal"><div class="panel-head"><h3>${title}</h3><button class="icon-btn" data-close>×</button></div>${body}</div></div>`);
  document.querySelectorAll('[data-close]').forEach(b=>b.onclick=closeModal);
}
function closeModal(){$('#modal')?.remove()}

auth();