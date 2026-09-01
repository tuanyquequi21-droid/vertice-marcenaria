const sb = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY, {
  auth: { jwtSkew: 60 }
});
const $ = s => document.querySelector(s);
const money = n => Number(n||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const num = n => Number(n||0);
const esc = s => String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));

const formatQuoteId = id => Number(id || 0) + 99;

function toast(msg, type='success'){
  const t = $('#toast');
  if(t){
    t.textContent = msg;
    t.className = `toast show ${type}`;
    setTimeout(() => t.className = 'toast', 3000);
  }
}
function showError(msg){
  const e = $('#loginError');
  if(e) e.textContent = msg || '';
}

// ==================== SISTEMA DE MODAL ====================
function modal(title, htmlContent) {
  let m = $('#appModal');
  if (!m) {
    m = document.createElement('div');
    m.id = 'appModal';
    m.className = 'modal-backdrop';
    document.body.appendChild(m);
  }
  m.innerHTML = `
    <div class="modal-card">
      <div class="modal-head">
        <h3>${title}</h3>
        <button type="button" class="icon-btn" onclick="closeModal()">×</button>
      </div>
      <div class="modal-body">${htmlContent}</div>
    </div>
  `;
  m.classList.add('active');
  m.querySelectorAll('[data-close]').forEach(b => b.onclick = closeModal);
}

function closeModal() {
  const m = $('#appModal');
  if (m) m.classList.remove('active');
}

let editingQuoteId = null;
const pageNames = {dashboard:'Dashboard', orcamento:'Novo orçamento', historico:'Orçamentos', clientes:'Clientes', materiais:'Materiais'};

// ==================== AUTENTICAÇÃO E NAVEGAÇÃO ====================
async function auth(){
  const {data:{session}} = await sb.auth.getSession(); 
  if(session) enter(session); 
  else $('#loginView').classList.remove('hidden'); 
  sb.auth.onAuthStateChange((_e,s)=>{if(s) enter(s); else leave()});
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
  document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active', b.dataset.page===page));
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

// ==================== IMPRESSÃO E PDF ====================
function generatePDFFromData(data) {
  const win = window.open('', '_blank');
  
  win.document.write(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Orçamento ${data.id ? formatQuoteId(data.id) : ''}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap');
        * { box-sizing: border-box; }
        body { 
          font-family: 'Roboto', Arial, sans-serif; 
          margin: 0; 
          padding: 40px; 
          color: #222; 
          background: #fff;
          font-size: 14px;
        }

        .header {
          position: relative;
          text-align: center;
          margin-bottom: 20px;
        }

        .header h1 {
          margin: 0;
          font-size: 24px;
          font-weight: 700;
          color: #111;
          letter-spacing: 0.5px;
        }

        .header p {
          margin: 4px 0 0;
          color: #666;
          font-size: 13px;
        }

        .quote-info {
          position: absolute;
          right: 0;
          top: 0;
          text-align: right;
        }

        .quote-info h2 {
          margin: 0;
          font-size: 18px;
          color: #c59b27;
          font-weight: 700;
        }

        .quote-info p {
          margin: 3px 0 0;
          color: #555;
          font-size: 12px;
        }

        hr.divider {
          border: none;
          border-top: 1px solid #e0e0e0;
          margin: 25px 0;
        }

        .client-box {
          background-color: #f9f9f9;
          padding: 18px 24px;
          border-radius: 4px;
          margin-bottom: 25px;
        }

        .client-box h3 {
          margin: 0 0 12px 0;
          font-size: 13px;
          font-weight: 700;
          text-transform: uppercase;
          color: #111;
          letter-spacing: 0.5px;
        }

        .grid-info {
          display: grid;
          grid-template-columns: 1fr 1fr;
          row-gap: 8px;
          column-gap: 20px;
        }

        .grid-info div {
          color: #333;
          font-size: 13px;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
        }

        th {
          background-color: #1a1a1a;
          color: #ffffff;
          text-align: left;
          padding: 12px 16px;
          font-weight: 700;
          font-size: 13px;
        }

        td {
          padding: 12px 16px;
          border-bottom: 1px solid #e0e0e0;
          border-right: 1px solid #e0e0e0;
          border-left: 1px solid #e0e0e0;
          color: #333;
          font-size: 13px;
        }

        td.val {
          text-align: right;
          font-weight: 700;
        }

        @media print {
          body { padding: 0; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>VÉRTICE MARCENARIA</h1>
        <p>Móveis Planejados & Marcenaria Sob Medida</p>
        
        <div class="quote-info">
          <h2>ORÇAMENTO ${data.id ? formatQuoteId(data.id) : ''}</h2>
          <p>Data: ${new Date().toLocaleDateString('pt-BR')}</p>
        </div>
      </div>

      <hr class="divider">

      <div class="client-box">
        <h3>DADOS DO CLIENTE & PROJETO</h3>
        <div class="grid-info">
          <div><strong>Cliente:</strong> ${esc(data.clienteNome)}</div>
          <div><strong>Projeto:</strong> ${esc(data.projeto)}</div>
          <div><strong>CPF:</strong> ${esc(data.cpf || '—')}</div>
          <div><strong>Cidade / UF:</strong> ${esc(data.cidade || '—')}</div>
          <div><strong>Telefone:</strong> ${esc(data.telefone || '—')}</div>
          <div><strong>Endereço:</strong> ${esc(data.endereco || '—')}</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width: 25%;">Item / Serviço</th>
            <th style="width: 50%;">Descrição</th>
            <th style="width: 25%; text-align: right;">Valor Total</th>
          </tr>
        </thead>
        <tbody>
          ${(data.breakdown || []).map(row => `
            <tr>
              <td><strong>${esc(row.item)}</strong></td>
              <td>${esc(row.desc)}</td>
              <td class="val">${money(row.val)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <script>
        window.onload = function() {
          setTimeout(() => { window.print(); }, 400);
        };
      </script>
    </body>
    </html>
  `);
  win.document.close();
}

async function generatePDF(id) {
  try {
    const { data: q, error } = await sb.from('orcamentos').select('*, clientes(*), orcamento_itens(*)').eq('id', id).single();
    if(error || !q) return toast('Erro ao carregar orçamento para PDF.', 'error');

    let mdfDesc = "Conforme projeto";
    let mdfVal = 0;
    let insumosVal = 0;

    if(q.orcamento_itens && q.orcamento_itens.length > 0) {
      q.orcamento_itens.forEach(item => {
        if(item.categoria === 'MDF') {
          mdfDesc = item.descricao;
          mdfVal += num(item.preco_total);
        } else {
          insumosVal += num(item.preco_total);
        }
      });
    }

    const c = q.clientes || {};
    const breakdown = [];

    const precoFinal = num(q.preco_final);
    const custoProd = num(q.custo_producao);
    const margem = custoProd > 0 ? (precoFinal / custoProd) : 1;

    if(mdfVal > 0) breakdown.push({ item: 'MDF', desc: mdfDesc, val: mdfVal * margem });
    if(insumosVal > 0) breakdown.push({ item: 'Materiais Diversos', desc: 'Componentes, Ferragens e Insumos', val: insumosVal * margem });
    
    if(breakdown.length === 0) {
      breakdown.push({ item: 'Móveis Planejados', desc: q.projeto || 'Projeto Sob Medida', val: precoFinal });
    }

    generatePDFFromData({
      id: q.id,
      clienteNome: c.nome || q.cliente_nome_avulso || 'Cliente Geral',
      cpf: c.cpf,
      telefone: c.telefone,
      cidade: c.cidade,
      endereco: c.endereco ? `${c.endereco}${c.numero ? ' nº '+c.numero : ''}` : '',
      projeto: q.projeto,
      breakdown: breakdown
    });
  } catch(err) {
    console.error(err);
    toast('Não foi possível gerar o PDF.', 'error');
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
        <span class="badge ${(x.status||'').toLowerCase()}">${esc(x.status)}</span>
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

  c.innerHTML = `
    <div class="panel" style="margin-bottom: 1.5rem;">
      <p class="eyebrow">PESQUISA DE MATERIAIS</p>
      <h3>Filtro no catálogo</h3>
      <input id="searchMaterial" placeholder="Digite o nome, marca ou tipo..." style="width:100%; border-radius:8px; border:1px solid #ccc; padding:10px;">
    </div>

    <div class="grid-2">
      <section class="panel">
        <div class="panel-head">
          <div><p class="eyebrow">CATÁLOGO</p><h3>Chapas MDF</h3></div>
          <button class="btn primary" id="newMdf">+ Adicionar</button>
        </div>
        <div id="mdfContainer">${renderMDFList(mf)}</div>
      </section>

      <section class="panel">
        <div class="panel-head">
          <div><p class="eyebrow">CATÁLOGO</p><h3>Ferragens</h3></div>
          <button class="btn primary" id="newFerr">+ Adicionar</button>
        </div>
        <div id="ferrContainer">${renderFerrList(fe)}</div>
      </section>
    </div>`;

  $('#newMdf').onclick = () => materialModal('MDF');
  $('#newFerr').onclick = () => materialModal('Ferragem');
  bindMaterialEvents(c);
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

function materialModal(kind, data = null){
  const isM = kind === 'MDF';
  const isEdit = !!data;
  modal(`${isEdit ? 'Editar' : 'Novo'} ${kind}`, `
    <form id="materialForm" class="form-grid">
      <label>Nome/modelo *<input name="nome_modelo" value="${esc(data?.nome_modelo||'')}" required></label>
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
    toast(`${kind} salvo.`);
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
          <input id="searchQuote" placeholder="Pesquisar por Nome do Cliente, CPF ou Projeto">
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
      const proj = (x.projeto || '').toLowerCase();
      const date = new Date(x.data_criacao).toLocaleDateString('pt-BR');
      return cName.includes(term) || proj.includes(term) || date.includes(term);
    });
    $('#quoteTableBody').innerHTML = renderQuoteRows(filtered);
    bindTableEvents(c, o);
  };

  bindTableEvents(c, o);
}

function renderQuoteRows(list){
  return list.map(x => {
    const clienteNome = x.clientes?.nome || x.cliente_nome_avulso || 'Cliente Geral';
    return `
      <tr>
        <td><strong>${esc(clienteNome)}</strong></td>
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

// ==================== CRIAR E EDITAR ORÇAMENTO ====================
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
        <div id="hardwareListContainer" style="margin-top: 1rem;"></div>
      </section>

      <section class="panel" style="background:#fafafa;">
        <p class="eyebrow">DETALHAMENTO DO ORÇAMENTO</p>
        <h3>Composição dos Custos</h3>
        
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; font-size: 0.95rem;">
          <div>• Chapas MDF: <strong id="dMdf">R$ 0,00</strong></div>
          <div>• Materiais Diversos: <strong id="dIns">R$ 0,00</strong></div>
          <div>• Mão de Obra: <strong id="dMo">R$ 0,00</strong></div>
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
        <button type="submit" class="btn primary">${editId ? 'Atualizar orçamento' : 'Salvar orçamento'}</button>
      </div>
    </form>`;

  const hwContainer = $('#hardwareListContainer');

  const addHardwareRow = (selectedId = '', qty = 0) => {
    const div = document.createElement('div');
    div.innerHTML = buildHardwareRowHtml(selectedId, qty);
    const rowEl = div.firstElementChild;
    hwContainer.appendChild(rowEl);
    rowEl.querySelector('.remove-hw-btn').onclick = () => rowEl.remove();
  };

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

    const custoCaixaParafuso = num(cfg.caixa_parafuso_preco || 15.00); 
    const parafusosEstimados = mdfQty * 20; 
    const custoParafusos = (parafusosEstimados / 100) * custoCaixaParafuso; 

    const insumosBordaCola = custoParafusos + (tapeMeters * 10 * num(cfg.cola_g||0.05)) + (tapeMeters * tapeUnitPrice);
    const desgasteSerra = num(cfg.desgaste_serra_corte || 25.00); 
    const custosFixosEnergia = days * 8 * (num(cfg.luz_hora||0) + num(cfg.agua_hora||0) + num(cfg.maquina_depreciacao_hora||0));
    
    const materiaisDiversos = ferragensTotal + insumosBordaCola + desgasteSerra + custosFixosEnergia;
    const maoDeObra = days * num(cfg.dia_trabalho||150);
    const projeto3D = h3d * num(cfg.custo_hora_3d||30);

    const custoTotal = mdfTotal + materiaisDiversos + maoDeObra + montagem + frete + projeto3D;
    const marginPercent = num($('#qMargin').value);
    const precoFinal = marginPercent < 100 ? custoTotal / (1 - (marginPercent / 100)) : custoTotal;
    const lucro = precoFinal - custoTotal;

    $('#dMdf').textContent = money(mdfTotal);
    $('#dIns').textContent = money(materiaisDiversos);
    $('#dMo').textContent = money(maoDeObra);
    $('#dMontagem').textContent = money(montagem);
    $('#dFrete').textContent = money(frete);

    $('#rCost').textContent = money(custoTotal);
    $('#rProfit').textContent = money(lucro);
    $('#rPrice').textContent = money(precoFinal);

    return { custoTotal, lucro, precoFinal, mdfTotal, materiaisDiversos, maoDeObra, montagem, frete };
  };

  $('#calcQuote').onclick = () => calculate();

  $('#quoteForm').onsubmit = async e => {
    e.preventDefault();
    const calc = calculate();
    const clienteId = $('#qClient').value || null;
    const clienteNomeAvulso = $('#qClientName').value || null;
    const projeto = $('#qProject').value;

    const payload = {
      cliente_id: clienteId,
      cliente_nome_avulso: clienteNomeAvulso,
      projeto: projeto,
      custo_producao: calc.custoTotal,
      valor_lucro: calc.lucro,
      preco_final: calc.precoFinal,
      status: existingQuote?.status || 'Pendente'
    };

    let quoteId = editId;
    let error;

    if(editId) {
      ({ error } = await sb.from('orcamentos').update(payload).eq('id', editId));
    } else {
      const { data: newQ, error: err } = await sb.from('orcamentos').insert(payload).select().single();
      error = err;
      if(newQ) quoteId = newQ.id;
    }

    if(error) return toast(error.message, 'error');

    if(editId) {
      await sb.from('orcamento_itens').delete().eq('orcamento_id', editId);
    }

    const itemsToInsert = [];
    const mdfOpt = $('#qMdf').selectedOptions[0];
    const mdfQty = num($('#qMdfQty').value);
    
    if(mdfOpt?.value && mdfQty > 0) {
      itemsToInsert.push({
        orcamento_id: quoteId,
        categoria: 'MDF',
        descricao: mdfOpt.textContent,
        quantidade: mdfQty,
        preco_unitario: num(mdfOpt.dataset.price),
        preco_total: num(mdfOpt.dataset.price) * mdfQty
      });
    }

    document.querySelectorAll('.hardware-row').forEach(r => {
      const o = r.querySelector('.f-select').selectedOptions[0];
      const q = num(r.querySelector('.f-qty').value);
      if(o?.value && q > 0){
        itemsToInsert.push({
          orcamento_id: quoteId,
          categoria: 'Ferragem',
          descricao: o.textContent.split('—')[0].trim(),
          quantidade: q,
          preco_unitario: num(o.dataset.price),
          preco_total: num(o.dataset.price) * q
        });
      }
    });

    if(itemsToInsert.length > 0) {
      await sb.from('orcamento_itens').insert(itemsToInsert);
    }

    toast(editId ? 'Orçamento atualizado!' : 'Orçamento salvo!');
    navigate('historico');
  };
}

auth();