const sb = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
const $ = s => document.querySelector(s);
const money = n => Number(n||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const num = n => Number(n||0);
const esc = s => String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));

function toast(msg,type='success'){const t=$('#toast');t.textContent=msg;t.className=`toast show ${type}`;setTimeout(()=>t.className='toast',3000)}
function showError(msg){$('#loginError').textContent=msg||''}

// Estado Global Auxiliar
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
async function fetchCEP(cep, elAddress){
  const clean = cep.replace(/\D/g, '');
  if(clean.length === 8){
    try {
      const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
      const data = await res.json();
      if(!data.erro && elAddress){
        elAddress.value = `${data.logradouro}, ${data.bairro} - ${data.localidade}/${data.uf}`;
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
        <strong>${esc(clienteNome)} — <small>#${x.id} (${esc(x.projeto)})</small></strong>
        <small>${new Date(x.data_criacao).toLocaleDateString('pt-BR')}</small>
      </div>
      <div class="row-right">
        <strong>${money(x.preco_final)}</strong>
        <span class="badge ${x.status.toLowerCase()}">${esc(x.status)}</span>
      </div>
    </div>`;
}

function empty(a,b){return `<div class="empty"><strong>${a}</strong><span>${b}</span></div>`}

// ==================== CLIENTES (CADASTRAR E EDITAR) ====================
async function renderClientes(c){
  const data = await get('clientes', {order:{col:'criado_em'}});
  c.innerHTML = `
    <section class="panel">
      <div class="panel-head">
        <div><p class="eyebrow">CADASTRO</p><h3>Clientes</h3></div>
        <button class="btn primary" id="newClient">+ Novo cliente</button>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Nome</th><th>CPF</th><th>Telefone</th><th>E-mail</th><th>Endereço</th><th>Ações</th></tr></thead>
          <tbody>
            ${data.map(x => `
              <tr>
                <td><strong>${esc(x.nome)}</strong></td>
                <td>${esc(x.cpf || '—')}</td>
                <td>${esc(x.telefone || '—')}</td>
                <td>${esc(x.email || '—')}</td>
                <td>${esc(x.endereco||'')}${x.numero?' nº '+esc(x.numero):''}</td>
                <td><button class="btn ghost btn-sm" onclick="editClient('${x.id}')">Editar</button></td>
              </tr>
            `).join('') || `<tr><td colspan="6">Nenhum cliente cadastrado.</td></tr>`}
          </tbody>
        </table>
      </div>
    </section>`;
  $('#newClient').onclick = () => clientModal();
}

window.editClient = async function(id){
  const [client] = await sb.from('clientes').select('*').eq('id', id);
  if(client) clientModal(client);
};

function clientModal(data = null){
  const isEdit = !!data;
  modal(isEdit ? 'Editar cliente' : 'Novo cliente', `
    <form id="clientForm" class="form-grid">
      <label>Nome *<input name="nome" value="${esc(data?.nome||'')}" required></label>
      <label>CPF<input name="cpf" id="cCPF" value="${esc(data?.cpf||'')}"></label>
      <label>Telefone<input name="telefone" id="cPhone" value="${esc(data?.telefone||'')}"></label>
      <label>E-mail<input name="email" type="email" value="${esc(data?.email||'')}"></label>
      <label>CEP<input name="cep" id="cCEP" value="${esc(data?.cep||'')}"></label>
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
  $('#cCEP').ononchange = e => fetchCEP(e.target.value, $('#cAddress'));
  $('#cCEP').onkeyup = e => fetchCEP(e.target.value, $('#cAddress'));

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

// ==================== MATERIAIS (CADASTRAR E EDITAR) ====================
async function renderMateriais(c){
  const [mf, fe, co, fitas] = await Promise.all([
    get('chapas_mdf', {order:{col:'criado_em'}}),
    get('ferragens', {order:{col:'criado_em'}}),
    get('config_global'),
    get('fitas_borda', {order:{col:'nome_modelo'}}).catch(()=>[]) // Fallback caso tabela exista ou não
  ]);
  const cfg = Object.fromEntries(co.map(x=>[x.chave,x.valor]));

  c.innerHTML = `
    <div class="grid-2">
      <section class="panel">
        <div class="panel-head">
          <div><p class="eyebrow">CATÁLOGO</p><h3>Chapas MDF</h3></div>
          <button class="btn primary" id="newMdf">+ Adicionar</button>
        </div>
        ${mf.map(x=>`
          <div class="row">
            <div><strong>${esc(x.nome_modelo)}</strong><small>${esc(x.marca||'')} · ${esc(x.fornecedor||'')}</small></div>
            <div><strong>${money(x.preco_custo)}</strong> <button class="link" onclick="editMaterial('MDF', '${x.id}')">Editar</button></div>
          </div>
        `).join('') || empty('Sem MDF cadastrado.','')}
      </section>

      <section class="panel">
        <div class="panel-head">
          <div><p class="eyebrow">CATÁLOGO</p><h3>Ferragens</h3></div>
          <button class="btn primary" id="newFerr">+ Adicionar</button>
        </div>
        ${fe.map(x=>`
          <div class="row">
            <div><strong>${esc(x.nome_modelo)}</strong><small>${esc(x.tipo)} · ${esc(x.marca||'')}</small></div>
            <div><strong>${money(x.preco_custo)}</strong> <button class="link" onclick="editMaterial('Ferragem', '${x.id}')">Editar</button></div>
          </div>
        `).join('') || empty('Sem ferragens cadastradas.','')}
      </section>
    </div>

    <section class="panel">
      <div class="panel-head"><div><p class="eyebrow">CUSTOS</p><h3>Parâmetros operacionais e Insumos</h3></div></div>
      <form id="configForm" class="config-grid">
        ${Object.entries(cfg).map(([k,v])=>`<label>${labels[k]||k}<input name="${k}" type="number" step="0.01" value="${v}"></label>`).join('')}
        <div class="form-actions"><button class="btn primary">Salvar parâmetros</button></div>
      </form>
    </section>`;

  $('#newMdf').onclick = () => materialModal('MDF');
  $('#newFerr').onclick = () => materialModal('Ferragem');
  $('#configForm').onsubmit = async e => {
    e.preventDefault();
    for(const [chave,valor] of new FormData(e.target)){
      const {error} = await sb.from('config_global').upsert({chave,valor:num(valor)},{onConflict:'chave'});
      if(error) return toast(error.message,'error');
    }
    toast('Parâmetros atualizados.');
  };
}

const labels = {
  dia_trabalho: 'Dia de trabalho (R$)',
  luz_hora: 'Luz / hora (R$)',
  agua_hora: 'Água / hora (R$)',
  maquina_depreciacao_hora: 'Depreciação máquina / hora (R$)',
  caixa_parafuso_preco: 'Caixa de Parafuso (R$ / caixa 15.00)',
  parafusos_un: 'Parafuso un. (Custo interno)',
  cola_g: 'Cola / g (R$)',
  fita_borda_m: 'Fita de Borda Padrão / m (R$)',
  desgaste_serra_corte: 'Desgaste serra / corte (R$)',
  gasolina_km: 'Gasolina / km (R$)',
  custo_hora_3d: 'Projeto 3D / hora (R$)'
};

window.editMaterial = async function(kind, id){
  const table = kind === 'MDF' ? 'chapas_mdf' : 'ferragens';
  const [item] = await sb.from(table).select('*').eq('id', id);
  if(item) materialModal(kind, item);
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

// ==================== HISTÓRICO COM PESQUISA E PDF ====================
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
      
      <!-- FILTRO DE PESQUISA (Item 9) -->
      <div class="form-grid" style="margin-bottom:1.5rem;">
        <label>Buscar orçamento
          <input id="searchQuote" placeholder="Pesquisar por Nome do Cliente, CPF, Projeto ou Data (AAAA-MM-DD)">
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

  // Ação de Pesquisa em Tempo Real
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
        <td>${esc(x.projeto)} <br><small>#${x.id}</small></td>
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
          <button class="btn ghost btn-sm" onclick="navigate('orcamento', ${x.id})" title="Editar">Editar</button>
          <button class="btn dark btn-sm" onclick="generatePDF(${x.id})" title="Gerar PDF">PDF</button>
          <button class="icon-btn" data-delete="${x.id}" title="Excluir">×</button>
        </td>
      </tr>
    `;
  }).join('') || `<tr><td colspan="6">Nenhum orçamento encontrado.</td></tr>`;
}

function bindTableEvents(c, originalData){
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

// ==================== EDITAR E SALVAR ORÇAMENTO (COM PDF) ====================
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
  if(editId) {
    const [q] = await sb.from('orcamentos').select('*, orcamento_itens(*)').eq('id', editId);
    existingQuote = q;
  }

  c.innerHTML = `
    <form id="quoteForm">
      <div class="grid-2">
        <section class="panel">
          <p class="eyebrow">PROPOSTA</p>
          <h3>${editId ? 'Editar Orçamento #' + editId : 'Dados do projeto'}</h3>
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
              <input id="qMargin" type="number" min="0" max="99" value="30" step="0.5">
            </label>
          </div>
        </section>

        <section class="panel">
          <p class="eyebrow">MDF</p><h3>Material principal</h3>
          <div class="form-grid">
            <label>Chapa
              <select id="qMdf">
                <option value="">Selecione</option>
                ${mf.map(x=>`<option value="${x.id}" data-price="${x.preco_custo}">${esc(x.nome_modelo)} — ${money(x.preco_custo)}</option>`).join('')}
              </select>
            </label>
            <label>Quantidade de chapas
              <input id="qMdfQty" type="number" min="0" step="0.01" value="0">
            </label>
          </div>
        </section>
      </div>

      <section class="panel">
        <div class="panel-head"><div><p class="eyebrow">PRODUÇÃO</p><h3>Custos e processos</h3></div></div>
        <div class="form-grid four">
          <label>Cortes<input id="qCuts" type="number" min="0" value="0"></label>
          <label>Fita de Borda - Tipo/Valor / m
            <select id="qTapePrice">
              <option value="${cfg.fita_borda_m || 2.50}">Fita Padrão — ${money(cfg.fita_borda_m || 2.50)}/m</option>
              <option value="4.50">Fita Especial/PVC — R$ 4,50/m</option>
              <option value="7.00">Fita Premium High-Gloss — R$ 7,00/m</option>
            </select>
          </label>
          <label>Fita de Borda (Metros)<input id="qTape" type="number" min="0" step="0.01" value="0"></label>
          <label>Dias de trabalho<input id="qDays" type="number" min="0" step="0.5" value="0"></label>
          <label>Entrega (km)<input id="qKm" type="number" min="0" step="0.1" value="0"></label>
          <label>Projeto 3D (h)<input id="q3d" type="number" min="0" step="0.5" value="0"></label>
        </div>
      </section>

      <section class="panel">
        <div class="panel-head"><div><p class="eyebrow">FERRAGENS</p><h3>Componentes</h3></div></div>
        <div id="hardwareRows">
          ${['Dobradiça','Corrediça','Puxador','Pistão','Outros'].map((tipo)=>`
            <div class="hardware">
              <select class="f-select" data-type="${tipo}">
                <option value="">${tipo}</option>
                ${fe.filter(x=>x.tipo===tipo).map(x=>`<option value="${x.id}" data-price="${x.preco_custo}">${esc(x.nome_modelo)} — ${money(x.preco_custo)}</option>`).join('')}
              </select>
              <input class="f-qty" type="number" min="0" value="0" placeholder="Qtd.">
            </div>
          `).join('')}
        </div>
      </section>

      <!-- CAMPO DE OBSERVAÇÕES ADICIONAIS DO CLIENTE (Item 7) -->
      <section class="panel">
        <p class="eyebrow">OBSERVAÇÕES DO ORÇAMENTO</p>
        <h3>Informações adicionais para o cliente</h3>
        <textarea id="qObs" rows="3" style="width:100%; border-radius:8px; border:1px solid #ccc; padding:8px;" placeholder="Ex.: O valor das chapas sofreu alteração de R$ 300,00 para R$ 350,00 referente ao último orçamento."></textarea>
      </section>

      <div class="quote-result" id="quoteResult">
        <div><span>Custo total</span><strong id="rCost">R$ 0,00</strong></div>
        <div><span>Lucro</span><strong id="rProfit">R$ 0,00</strong></div>
        <div class="highlight"><span>Preço de venda</span><strong id="rPrice">R$ 0,00</strong></div>
      </div>

      <div class="form-actions">
        <button type="button" class="btn ghost" id="clearQuote">Limpar</button>
        <button type="button" class="btn primary" id="calcQuote">Calcular orçamento</button>
        <button type="submit" class="btn dark">${editId ? 'Atualizar orçamento' : 'Salvar orçamento'}</button>
      </div>
    </form>`;

  const calculate = () => {
    const mdfOpt = $('#qMdf').selectedOptions[0];
    const mdfPrice = num(mdfOpt?.dataset.price);
    const mdfQty = num($('#qMdfQty').value);
    const mdfTotal = mdfPrice * mdfQty;

    let ferr = 0, items = [];
    document.querySelectorAll('.hardware').forEach(r => {
      const o = r.querySelector('.f-select').selectedOptions[0];
      const q = num(r.querySelector('.f-qty').value);
      if(o?.value && q){
        const total = num(o.dataset.price) * q;
        ferr += total;
        items.push({categoria:'Ferragem', descricao:o.textContent.split(' — ')[0], quantidade:q, custo_unitario:num(o.dataset.price), custo_total:total});
      }
    });

    const tapeMeters = num($('#qTape').value);
    const tapeUnitPrice = num($('#qTapePrice').value);
    const days = num($('#qDays').value);
    const cuts = num($('#qCuts').value);
    const km = num($('#qKm').value);
    const h3d = num($('#q3d').value);

    // Parafusos: cálculo em caixa/unidades (Insumos internos de produção)
    const custoCaixaParafuso = num(cfg.caixa_parafuso_preco || 15.00); 
    const parafusosEstimados = mdfQty * 20; 
    const custoParafusos = (parafusosEstimados / 100) * custoCaixaParafuso; // Proporção da caixa

    const ins = custoParafusos + (tapeMeters * 10 * num(cfg.cola_g)) + (tapeMeters * tapeUnitPrice);
    const tool = cuts * num(cfg.desgaste_serra_corte);
    const fixed = days * 8 * (num(cfg.luz_hora) + num(cfg.agua_hora) + num(cfg.maquina_depreciacao_hora));
    const mo = days * num(cfg.dia_trabalho);
    const log = km * num(cfg.gasolina_km);
    const p3d = h3d * num(cfg.custo_hora_3d);

    const cost = mdfTotal + ferr + ins + tool + fixed + mo + log + p3d;
    const margin = Math.min(num($('#qMargin').value)/100, .99);
    const price = cost / (1 - margin);
    const profit = price - cost;
    const reinv = mdfTotal + ferr + ins;

    $('#rCost').textContent = money(cost);
    $('#rProfit').textContent = money(profit);
    $('#rPrice').textContent = money(price);

    return {cost, price, profit, reinv, items, mdfTotal, mdfQty, tapeMeters, days, cuts, km, h3d, ferr, ins, tool, fixed, mo, log, p3d};
  };

  $('#calcQuote').onclick = calculate;
  $('#clearQuote').onclick = () => renderOrcamento(c);

  $('#quoteForm').onsubmit = async e => {
    e.preventDefault();
    const x = calculate();
    const cid = $('#qClient').value || null;

    const payload = {
      projeto: $('#qProject').value,
      cliente_id: cid,
      cliente_nome_avulso: cid ? null : ($('#qClientName').value || 'Cliente avulso'),
      custo_producao: x.cost,
      valor_lucro: x.profit,
      preco_final: x.price,
      reinvestimento_materiais: x.reinv,
      status: existingQuote ? existingQuote.status : 'Pendente',
      observacoes: $('#qObs').value
    };

    let data, error;
    if(editId) {
      ({data, error} = await sb.from('orcamentos').update(payload).eq('id', editId).select().single());
    } else {
      ({data, error} = await sb.from('orcamentos').insert(payload).select().single());
    }

    if(error) return toast(error.message, 'error');

    // Atualização de itens
    if(editId) await sb.from('orcamento_itens').delete().eq('orcamento_id', editId);

    const items = [
      ...x.items,
      {categoria:'MDF', descricao:$('#qMdf').selectedOptions[0]?.textContent.split(' — ')[0] || 'MDF', quantidade: x.mdfQty, custo_unitario: x.mdfTotal / Math.max(x.mdfQty,1), custo_total: x.mdfTotal},
      {categoria:'Resumo', descricao:'Custos operacionais e Insumos', quantidade:1, custo_unitario: x.cost - x.mdfTotal - x.ferr, custo_total: x.cost - x.mdfTotal - x.ferr}
    ].filter(i=>i.custo_total > 0);

    if(items.length) {
      await sb.from('orcamento_itens').insert(items.map(i=>({...i, orcamento_id: data.id})));
    }

    toast(`Orçamento #${data.id} ${editId ? 'atualizado' : 'salvo'}.`);
    navigate('historico');
  };
}

// ==================== GERADOR DE PDF (Item 6) ====================
window.generatePDF = async function(id){
  const { jsPDF } = window.jspdf;
  const [q] = await sb.from('orcamentos').select('*, clientes(*), orcamento_itens(*)').eq('id', id);

  if(!q) return toast('Erro ao carregar dados para o PDF', 'error');

  const doc = new jsPDF();
  const clienteNome = q.clientes?.nome || q.cliente_nome_avulso || 'Cliente';

  // Cabeçalho
  doc.setFontSize(18);
  doc.text("ORÇAMENTO DE MARCENARIA", 14, 20);
  doc.setFontSize(10);
  doc.text(`Orçamento #: ${q.id}`, 14, 28);
  doc.text(`Data: ${new Date(q.data_criacao).toLocaleDateString('pt-BR')}`, 14, 34);

  // Dados do Cliente
  doc.setFontSize(12);
  doc.text("Dados do Cliente", 14, 45);
  doc.setFontSize(10);
  doc.text(`Nome: ${clienteNome}`, 14, 52);
  if(q.clientes?.cpf) doc.text(`CPF: ${q.clientes.cpf}`, 14, 58);
  if(q.clientes?.telefone) doc.text(`Telefone: ${q.clientes.telefone}`, 14, 64);
  if(q.clientes?.endereco) doc.text(`Endereço: ${q.clientes.endereco}`, 14, 70);

  // Tabela de Itens (Sem expor o custo interno individual de parafusos)
  const tableBody = (q.orcamento_itens || [])
    .filter(item => item.categoria !== 'Resumo')
    .map(i => [i.categoria, i.descricao, i.quantidade, money(i.custo_unitario), money(i.custo_total)]);

  doc.autoTable({
    startY: 78,
    head: [['Categoria', 'Descrição', 'Qtd', 'Vlr. Un.', 'Total']],
    body: tableBody,
  });

  let finalY = doc.lastAutoTable.finalY + 10;

  // Observações (Item 7)
  if(q.observacoes) {
    doc.setFontSize(11);
    doc.text("Observações e Avisos:", 14, finalY);
    doc.setFontSize(9);
    doc.text(q.observacoes, 14, finalY + 6);
    finalY += 20;
  }

  // Total Final
  doc.setFontSize(14);
  doc.text(`VALOR TOTAL: ${money(q.preco_final)}`, 14, finalY + 10);

  // Salva o PDF
  doc.save(`Orcamento_${q.id}_${clienteNome.replace(/\s+/g, '_')}.pdf`);
  toast('PDF Gerado com sucesso!');
};

function modal(title,body){
  document.body.insertAdjacentHTML('beforeend',`<div class="modal-backdrop" id="modal"><div class="modal"><div class="panel-head"><h3>${title}</h3><button class="icon-btn" data-close>×</button></div>${body}</div></div>`);
  document.querySelectorAll('[data-close]').forEach(b=>b.onclick=closeModal);
}
function closeModal(){$('#modal')?.remove()}

auth();