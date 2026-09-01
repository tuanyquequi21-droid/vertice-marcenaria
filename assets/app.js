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

  // 2. Definir o Base64 do Logo
  const LOGO_BASE64 = `data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAYGBgYHBgcICAcKCwoLCg8ODAwODxYQERAREBYiFRkVFRkVIh4kHhweJB42KiYmKjY+NDI0PkxERExfWl98fKcBBgYGBgcGBwgIBwoLCgsKDw4MDA4PFhAREBEQFiIVGRUVGRUiHiQeHB4kHjYqJiYqNj40MjQ+TERETF9aX3x8p//CABEIBAAEAAMBIgACEQEDEQH/xAAwAAEBAAMBAQAAAAAAAAAAAAAAAQIFBgQDAQEAAwEAAAAAAAAAAAAAAAAAAQIDBP/aAAwDAQACEAMQAAAC50AAFIUgsoAAKRYZJSSwyAAShYLKAALKQFSksolhYFBYACwUEAqEzxyLjYTLHISwsuJQSyiyksAFAlhYApCAAAAAhQASygFgJYAAWAAQAYAAFJZRLBYLAoACwyiklhkQoJZRLC2UAAWACwFlEACgAAKCUgAFlLLiMsciAsuJSmNgtQAAssAAKQgBCywoAIBQiwJSgJRLCUAAAIADCUAALKJRFgBQFgBbKSWGUBZSAsC2UAAAAFJZSFIsFlAALALAQoFlEyxFlBDLGwsUlgoACUsABKLLCASwsBZQCWBZSAAWUASwJQQoEogAMJYUACwWWAFlAFlgBVEmUBSWUiiLCgAssKACywFIUgFlEoAAssEsKBZkJYSyiWFlEspLKAEpLKWWAAFgQDGiywWUSwAWAUlgoAEsJQAAiwAAwlAAAFBAUhQUEBkCAUJZSWUAAFEsKACwFlJZSAWCwKACwEsGUCzISwIFgssFlJZQCWZGKiywASwsyxAEsLLBQAiwWUgAKABLABFAEsBSAwBKAAFlgBSFKJYAWhjQoJUBSUAFAQoALLBZSWUgALKAALASwtxyJZSywllIUgABQQtgllBSAASiAASiUABCgSwsCgASwAiwoEolgAwiksoABZYAUhShKQGQMaFBCkBQAWUJQABUCwLAAKCFAABFgsospYgsABYEosoABLKAAWABCFQWBQAAEoICGRCkLAJSLCpQCLAD5qJZQAAAACgFIDIEBUCykBUoBYFlhQAAAACFsAFAAAlxLZRljS45YiykBccoAAUBKSygAAAEBCiWFBLKSygEBcaKAQssIUgKgoAID52UJQAAUgAKCwAMgQAAAAoABYFBKAAgsyIQtgFEsKABLAC5YZFxyhLKQFgEoBQEpLBQAJQIShKgWFAIVBSAFgLKARYQAFAlhZRAfOyksoABUpAAUAAGQJLCgsAACgAssFAABLClIBcciWCkKABLAC5YZCUQBYFgSkyxyAJZSWUAASgQSwALCpQgWBYAAFgWUSwgBQBLAAD52UllAAKCAKALLADIEBMoAAAKACwKAABLCgIKlBSAoAEsAGWORcbAQoBABljkICyksoAgLKICWAAFSkWACykAAAsolxAFgWUSwAA+dlJZQABZSEKsKAACrAQoBCgAqUAsBQSgQAqUgKAACgAiwAZY5CWAAhYBKMsaCksAFSkAKQEAAAsAAAEoAALAmWISgAAABKfOwLKCCyiykAKSgABlAAASiUAFAACoBRLCwFlIsFACwFlAIAlGWOQlEABAALKAAAAKgABAEoWAogALABZYACklhLKALKRYAAfMCwWWCyiykAKAAEGSiAAAAAsCgAUJQSwsBZRLCpQAsFlAIABZSggAEsIUWUAAAWCwBCghCgEKACUAJQAAFIQllAFlEsABDAAApLKLASiwUAEoUAACwSoLKAUAFlgBZYALKQCwUBYLKEpAALKWAAgFxALZQAAAABLCkACCkKAsAAALLBLC3GiWAAAFgACGAAAFgtglAUAWCAzlgAAsCKQFBSFAAAAAspCFsFlhQAACFSizIgAJQY5YgFSlBKpAEFAgWAIAWWFBYCWFAspAQCyiBALKAFEBAYAAAWUAllAKAlIDIAEsFBJlBZQACgAJQAlBSSgCywoAAIsALlhkAJQAlhEospSFAAlhUpAEogALKSwUhZYLKEoSkAKQEAKSylgAQGAAAFlAAFlCUAgMgCCwUCWAoABQASgILKACFAAsCygCWADLHIAAILjliAKFBLKAIFBJRAAAAAWWFgLKSyiWAhQAQAoAABAYJQBKAKlAAKlAIDICWFlhZQlgWFAKSygEsolgsoAlhQAWUSgAlgAyxyAAJYCjEoSlAABFgspisBSAJRLCgsUgFlJYLLAAAQAWUAAllID52CrAAUllABSUEogMgQFlACWFgVKAAUEsogLBUo+/m2FJ+922XNrqG4Gpbio07dU0jeDR3eU0TfZTGhu/sufdAOfnQIc/egHPt+Ofb+Ggu9RPH+fY63qysLKlIBYEsAAJZRKAAAFlJZSVTGWFSiWAAFAikspAfMFlCKAKBKLBYFISymSACygg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IolCgShAAllJZQCywAAllLAAAJSWBZQBLBZSWUxAAAAASgCgBFhQEoAAQUAAFAgAAAUEABZQlgsoAAAsoAAAlhLKAALAoJYVKSwAJYALKSwUAAEsoAlhQRYAALKJYLAspiAAAACAoKAQLCgJSWCkAKAQWUWUSwAAAoIAUELLBZQAAlFlAEsKgssIsKAsFlAIBZSAASwAWUgLKAAJZQQsAAAAAUiwWUgIAAQqCgRQAAACgllICkAKAAlFlEsAAFlJZSAWACywWUAAllFlAAJZSLBFACwAoICywAAQAAAKQssKgWCgSwAAAAWUgAAIABLACgllAAAAKCWUSwoICgSiUFgsAAgoKlIAUgAFlAIollFlBCglgssJZQAABZSAssAAIAAABQSwAAqUSwAAAAAAAAgAEsAKCWCgAAAWBYLLCyiAoEsKBYAAICgAAAsABYKlIUllFlEsAAAJYFAAAAAAACAAAAAsAABYLLAAAAAAAACAllEsFgsACgAAAAAApACoLLCgAAAgKgoBCgAAJRZSWAC3GllgAABALKAAAJYUAAgAASgAAAAAoxsKlACUAAAAAksKlEsACwAqUAAlABYAAAKlEsKAAACAWUASwoAEollFlIABZkJYAAJRALKAEoAlgWAAEBQSgIUAAACwASygEsoASgEsoBiBZQCAKICkKlAAAAABSAoEsFlAAEABZQAQoAEsFlAAAGWNLAllAEsAFlBBZRKAAIACLCgJSAqUAAEKACWUAhQlAAJQEJYFgoJZQCAssFlAAAAAFgAAAWCpQCAAAqUgKlAECpQAABccgCWUASwAAAFBCkLLAABAoJYALAqUAgKlEollEolgsCgAllEoxABQSwWWAACygBKAAAAAAAAKEspAAALKQCwLKICygAAC45AgsFAgEoAAsAAAAAgAAAAAsCykAoASwWAABUBYAKGIAFCAsAABYKCAoAAAJQAAAsBUAAJZQAAAAABQAAXHISwAsACWCpQAlAAAAIAQoBSAAAWUgFgoIAAAAAAAsIABZSAAAAAAAoBCgAAAAAAFIAlJZQAAAAACpQBAWULAUgEsCiWCpSWURQACAFIAAAAAAAAAsAAAAFlIAACAAAAAAAALACpSLCgAllAAAABSAllJQAAAALBZQQAAWUAJQCKJQlgWUllEoASwAAAAAAAAAAAsAAAAU9Tajn1gABAAAAAAAAWAAKIFAAAASgAAAEspKACWFSgAAFgAAVKCFAABLAAAsolhZQlgAAAAAAAAAAAAAAB6ttqdsfeynn1W11R5AAQAAAABKAAWABZRAKBKICykoAAARRKCUAJYLKAAAAAALKJYLKCFlgAAAAAAsAACWCwVKAAAAAAAACFAsHQNUPLAAAgAAAACCgAAAoICkKCAAsBZQgWUILLBYKBAWUSgAAAABZRLBYALLAAACywAssAAAEABZQlAAAAAAAEsKAAAAgqUgAAAJQiwoAAAKCAssKgLCywAsoigCLCxSAoIBZRKAAAAAALLBZRAAAALAAAAAACLCwFlCUAAAJSUAAAAAABAAD//xAAC/9oADAMBAAIAAwAAACEBDQQSgCTjBjyhxzDhSijwiARgRzywDCSBxBQTyiizyDAjgSgDyAQQCAAjQBxxghwDxihSxwDyBjiRAjSgAgTxyBzhDBDAgABQQDATCSTxhSgASwxRQDzTRhQhDQDyiyhBRyhDTwTSiyhyhRyAABTziDiCgARzQQRzRCxxgTBQhyzhSBhzgCyDwTgAQgTBCzRRDyxTxABSjCDAjDTzxRRxTDCghDTxRARgQhRiiigyhTwAABgTxTwzgQChzABDTwBBTzwDwzwDwDCDygCThRRxygighwBRwSRgAyxSigDjBTzzQARTQjSjzgSzgxgQTjwDCzxTwThTiCQiTCByARzxSiizRADxxQjQCjDjDgQSjiwjiADDSQQhQgABSTRBCzhiiCwDgRAjgCADBQBBBBCQwQwBgQjzyDhQyzjAjBxQjTQgAQxxQABwSwQRxjQgDTjDjijyjxDigCQwBwjRzRACBzQQTwBRQTwRSChgRRBzhRSAADhQCihTxgARTjwwADSggADizQBwADjzyjijxxTQgTgQThRRSTQxCBwxhQByxABASATAAQwTAigDRTwBRDCjwAAwDxTxBjzxyjRTgDACRTAAgQRABRQzjzCAigCyjQBATTSAgyyyDySgBThBTwCihAAQDABQAAiCABQAQwQBBxQxzjhCABThyyiDChzCgRzhjASgjTyCTzSARCShDwCigACgTRCgDQQgwAAhgjBAyhzxRTxQCARzwgQgyzgRQjzjixSyzzTzSgAzQgTyzwiygSggDiCgBwADiBSAzwzjQyiTRxigCwiDixSgCzRRTSTCChiDBBSzAQBDyhSj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DCiCwAwChDyzihQxDzxQCBTxwgDygDzzzTwBRTwCwADzyyRRDwBQATQDxTShRzwQjigBTTziyDzzyjxAjgBQTxzTSwACgDjzBTwChSxzQBDwBRTwSgxQAAACgxSRSiByizwxRRyDyCDzDSAAQABwDCgQDhwgAiDQBTxQhTzRwgDCDwTzywhQAAQCihRQSBDyjxzhRShjSABwBTTzjwCAQCAAAQCgCgAgDzzygDzDwQgBTzTzjQBSgChyCBAQABTjzRwxiihTygTxAACwDQAjwgAQQADwDggADCSywAgDRSgADxDyzTziwgDwBQjwgBwjxCByiABRzTzgQRTwBwCTxwhDwhDhCxwAChDzQCxQTyhAjADzxTyDyCgwBSjyyhygAABiwShygACTDjzyTDxTziyjyCCRzzwzTyDxSDxwDywDwADjTDyjhyTADzyDzyjSAAAjRRyiwgBwCDyDwTxDyjSjyQBTzTDzzzTxChTwDzzzwASgADwADzgAijwDQihQgBzzBChTCwihgDDzgjRSADzzxzTzwASjyjzwTzzwDzzTwjSQChQADhCCjTwAQCAATzzyhwDCCyihCBTzygBAATzzjRzyABRByjjxTzzgDTxzzhwAAAAgChQCiDhQiChRzzxywAgCzzyhRBSjwAAAAzhCBzygACigCACxTziAhTxyBDzAhyiAABDCBABSgihTzzCRyQRTxzzzjyzjRSwgAABADwAAQBADgADhTygAxDzyADwQDzxygygxSwByhCBDAABDwTxDxDxTRTygBzyggAAABAABQAAAAwihDyiDRzTyADxQzRTxDADRjwTyhAAAABBxQBjxATSxTjwgDRyggAAAiAAAAAAATzz/xAAC/9oADAMBAAIAAwAAABDyxwQzyxjCQzTDAiiQBRRAhzAxBACxQwDxCxCTjSAThgQCgTThTSRiAjBCjSBywyygDChSxzxzRyQwTBASjSwBwhgQQyRAhjRCDyyhgQRDTCwDTCRCDiijQwAgyBSAiDyjjCDjSxTDDjQwSwhgDAADgjADjzBzQxCDxxQBwTzxghAAByAjSwRyhSwjBhxzBAjCigBShDyRzDDjTDRCRwSBRhiShABDQhyDQiCgARDihQAxyAxAjRDTigQSCCjTwzxCABCDyQAAiAwCgCwhBQDQwCBSRjSzxCTBRxTgjwDjBCwRDjwiADwx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`;

  // 3. Adicionar o Logótipo ao PDF
  try {
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