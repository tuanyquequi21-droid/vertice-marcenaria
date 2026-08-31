import os
from datetime import datetime
from flask import Flask, render_template, request, redirect, session, flash

# Se o seu projeto usa Flask-SQLAlchemy, certifique-se de que está instalado
from flask_sqlalchemy import SQLAlchemy

app = Flask(__name__)
app.secret_key = "vertice_marcenaria_secret_key"

# Configuração do Banco de Dados SQLite
basedir = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'database.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# ==========================================
# MODELOS DO BANCO DE DADOS (DATABASE)
# ==========================================

class Cliente(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False)
    telefone = db.Column(db.String(20))
    email = db.Column(db.String(100))
    cep = db.Column(db.String(15))
    endereco = db.Column(db.String(200))
    numero = db.Column(db.String(20))
    cpf = db.Column(db.String(20))
    pasta_local = db.Column(db.String(200))
    # Relacionamento ajustado para permitir que o cliente_id seja opcional (nullable=True)
    orcamentos = db.relationship('Orcamento', backref='cliente', lazy=True)

class Orcamento(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    projeto = db.Column(db.String(150), nullable=False)
    custo_producao = db.Column(db.Float, nullable=False)
    valor_lucro = db.Column(db.Float, nullable=False)
    preco_final = db.Column(db.Float, nullable=False)
    reinvestimento_materials = db.Column(db.Float, default=0.0)
    status = db.Column(db.String(20), default='Pendente') # Pendente, Aprovado, Recusado
    data_criacao = db.Column(db.DateTime, default=datetime.utcnow)
    
    # CHAVES MODIFICADAS PARA O NOVO FLUXO FLEXÍVEL:
    cliente_id = db.Column(db.Integer, db.ForeignKey('cliente.id'), nullable=True) # Opcional agora
    cliente_nome_avulso = db.Column(db.String(100), nullable=True) # Guarda o nome se não for cadastrado

class ChapaMdf(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nome_modelo = db.Column(db.String(100), nullable=False)
    marca = db.Column(db.String(50))
    fornecedor = db.Column(db.String(100))
    preco_custo = db.Column(db.Float, nullable=False)

class Ferragem(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    tipo = db.Column(db.String(50), nullable=False) # Dobradiça, Corrediça, Puxador, etc.
    nome_modelo = db.Column(db.String(100), nullable=False)
    marca = db.Column(db.String(50))
    fornecedor = db.Column(db.String(100))
    preco_custo = db.Column(db.Float, nullable=False)

class ConfigGlobal(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    chave = db.Column(db.String(50), unique=True, nullable=False)
    valor = db.Column(db.Float, nullable=False)

# Helper para buscar configurações rápidas
def obter_configs():
    valores_padrao = {
        'dia_trabalho': 250.0, 'luz_hora': 4.5, 'agua_hora': 1.2,
        'maquina_depreciacao_hora': 3.0, 'parafusos_un': 0.15, 'cola_g': 0.05,
        'fita_borda_m': 2.50, 'desgaste_serra_corte': 0.10, 'gasolina_km': 1.80,
        'custo_hora_3d': 50.0
    }
    configs = {}
    for chave, val_padrao in valores_padrao.items():
        item = ConfigGlobal.query.filter_by(chave=chave).first()
        if not item:
            item = ConfigGlobal(chave=chave, valor=val_padrao)
            db.session.add(item)
            db.session.commit()
        configs[chave] = item.valor
    return configs

# ==========================================
# ROTAS DO SISTEMA
# ==========================================

@app.route('/', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        if username == 'admin' and password == 'vertice123':
            session['username'] = username
            return redirect('/dashboard')
        return render_template('login.html', erro="Utilizador ou senha operacionais incorretos.")
    return render_template('login.html')

@app.route('/logout')
def logout():
    session.clear()
    return redirect('/')

@app.route('/dashboard')
def dashboard():
    if 'username' not in session: return redirect('/')
    orcamentos = Orcamento.query.all()
    faturamento = sum(o.preco_final for o in orcamentos if o.status == 'Aprovado')
    lucro_estimado = sum(o.valor_lucro for o in orcamentos if o.status == 'Aprovado')
    reinvestimento = sum(o.reinvestimento_materials for o in orcamentos if o.status == 'Aprovado')
    
    # Tratamento para exibir o nome correto na tabela de pendências da Home
    for o in orcamentos:
        if not o.cliente_id:
            o.nome_exibicao = o.cliente_nome_avulso
        else:
            o.nome_exibicao = o.cliente.nome if o.cliente else "Excluído"

    return render_template('dashboard.html', orcamentos=orcamentos, faturamento=faturamento,
                           lucro_estimado=lucro_estimado, reinvestimento=reinvestimento, total_orcamentos=len(orcamentos))

@app.route('/clientes', methods=['GET', 'POST'])
def clientes():
    if 'username' not in session: return redirect('/')
    if request.method == 'POST':
        nome = request.form.get('nome')
        # Lógica automática para criar pasta física simulada
        pasta = os.path.join(basedir, 'static', 'uploads', nome.replace(" ", "_").lower())
        os.makedirs(pasta, exist_ok=True)
        
        novo_c = Cliente(
            nome=nome, cpf=request.form.get('cpf'), telefone=request.form.get('telefone'),
            email=request.form.get('email'), cep=request.form.get('cep'),
            endereco=request.form.get('endereco'), numero=request.form.get('numero'), pasta_local=pasta
        )
        db.session.add(novo_c)
        db.session.commit()
        flash('Cliente registado e pasta física estruturada com sucesso!', 'success')
    
    lista_clientes = Cliente.query.all()
    return render_template('clientes.html', clientes=lista_clientes)

@app.route('/orcamento', methods=['GET', 'POST'])
def orcamento():
    if 'username' not in session: return redirect('/')
    configs = obter_configs()
    resumo = None

    if request.method == 'POST':
        # VERIFICA SE É O CLIQUE DE SALVAMENTO NO HISTÓRICO
        if request.form.get('salvar_banco'):
            cliente_input = request.form.get('b_cliente_nome')
            
            # Tenta encontrar se esse nome já possui registo oficial
            cliente_cadastrado = Cliente.query.filter_by(nome=cliente_input).first()
            
            novo_o = Orcamento(
                projeto=request.form.get('b_projeto'),
                custo_producao=float(request.form.get('b_custo_prod')),
                valor_lucro=float(request.form.get('b_lucro')),
                preco_final=float(request.form.get('b_preco_final')),
                reinvestimento_materials=float(request.form.get('b_reinvestimento')),
                status='Pendente',
                cliente_id=cliente_cadastrado.id if cliente_cadastrado else None,
                cliente_nome_avulso=cliente_input if not cliente_cadastrado else None
            )
            db.session.add(novo_o)
            db.session.commit()
            flash('Orçamento guardado com sucesso no histórico!', 'success')
            return redirect('/historico_orcamentos')

        # ENGENHARIA DE CÁLCULO (Primeiro clique - Calcular)
        cliente_nome = request.form.get('cliente_nome')
        projeto = request.form.get('projeto')
        
        # Obter custos de MDF
        chapa = ChapaMdf.query.get(request.form.get('chapa_id'))
        qtd_chapas = float(request.form.get('qtd_chapas', 0))
        custo_mdf = chapa.preco_custo * qtd_chapas if chapa else 0.0

        # Processar Custos Fixos, Processos, Logística e Margem
        qtd_cortes = int(request.form.get('qtd_cortes', 0))
        qtd_fita = float(request.form.get('qtd_fita', 0))
        dias_trab = float(request.form.get('dias_trabalho', 0))
        km_entrega = float(request.form.get('km_entrega', 0))
        horas_3d = float(request.form.get('horas_3d', 0))
        margem_lucro = float(request.form.get('lucro', 30)) / 100

        custo_ferramental = qtd_cortes * configs['desgaste_serra_corte']
        custo_insumos = (qtd_chapas * 20 * configs['parafusos_un']) + (qtd_fita * 10 * configs['cola_g']) + (qtd_fita * configs['fita_borda_m'])
        custo_fixo = (dias_trab * 8 * configs['luz_hora']) + (dias_trab * 8 * configs['agua_hora']) + (dias_trab * 8 * configs['maquina_depreciacao_hora'])
        custo_mo = dias_trab * configs['dia_trabalho']
        custo_logistica = km_entrega * configs['gasolina_km']
        
        # Inteligência 3D invisível agregada internamente
        custo_projeto_3d = horas_3d * configs['custo_hora_3d']

        # Somatório de Ferragens selecionadas dinamicamente
        total_ferragens = 0.0
        detalhes_f = []
        for tipo in ['Dobradiça', 'Corrediça', 'Puxador', 'Pistão', 'Outros']:
            f_id = request.form.get(f'id_{tipo.lower()}')
            qtd_f = int(request.form.get(f'qtd_{tipo.lower()}', 0))
            if f_id and qtd_f > 0:
                item_f = Ferragem.query.get(f_id)
                if item_f:
                    v_total = item_f.preco_custo * qtd_f
                    total_ferragens += v_total
                    detalhes_f.append({'txt': f'{tipo}: {qtd_f}x {item_f.nome_modelo}', 'valor': f'{v_total:.2f}'})

        # Custo Bruto de Fábrica
        custo_producao_bruto = (custo_mdf + total_ferragens + custo_insumos + custo_ferramental + custo_fixo + custo_mo + custo_logistica + custo_projeto_3d)
        
        # Cálculo do Preço de Venda por Mark-up sobre o custo bruto
        preco_venda = custo_producao_bruto / (1 - margem_lucro) if margem_lucro < 1 else custo_producao_bruto
        lucro_liquido = preco_venda - custo_producao_bruto
        reinvestimento_caixa = custo_mdf + total_ferragens + custo_insumos

        resumo = {
            'cliente_nome': cliente_nome, 'projeto': projeto, 'chapa_name': chapa.nome_modelo if chapa else 'N/A',
            'custo_chapas': f'{custo_mdf:.2f}', 'custo_ferragens': f'{total_ferragens:.2f}', 'detalhe_ferragens': detalhes_f,
            'custo_insumos': f'{custo_insumos:.2f}', 'custo_ferramental': f'{custo_ferramental:.2f}', 'custo_fixo': f'{custo_fixo:.2f}',
            'custo_mao_de_obra': f'{custo_mo:.2f}', 'custo_logistica': f'{custo_logistica:.2f}',
            'custo_total_producao': f'{custo_producao_bruto:.2f}', 'valor_lucro': f'{lucro_liquido:.2f}',
            'preco_final': f'{preco_venda:.2f}', 'reinvestimento_materials': f'{reinvestimento_caixa:.2f}'
        }

    # Agrupamento de componentes para renderizar na tela
    ferragens_registradas = Ferragem.query.all()
    f_tipo = {}
    for f in ferragens_registradas:
        f_tipo.setdefault(f.tipo, []).append(f)

    return render_template('orcamento.html', clientes=Cliente.query.all(), chapas=ChapaMdf.query.all(), f_tipo=f_tipo, resumo=resumo)

@app.route('/historico_orcamentos')
def historico_orcamentos():
    if 'username' not in session: return redirect('/')
    lista = Orcamento.query.all()
    for o in lista:
        o.nome_cliente = o.cliente.nome if o.cliente else o.cliente_nome_avulso
    return render_template('historico.html', orcamentos=lista)

@app.route('/mudar_status_orcamento/<int:id>/<string:status>')
def mudar_status_orcamento(id, status):
    if 'username' not in session: return redirect('/')
    o = Orcamento.query.get_or_40004(id) if hasattr(Orcamento.query, 'get_or_40004') else Orcamento.query.get(id)
    if o:
        o.status = status
        db.session.commit()
        flash(f'Status do orçamento #{id} alterado para {status}!', 'success')
    return redirect(request.referrer or '/historico_orcamentos')

@app.route('/materiais', methods=['GET', 'POST'])
def materiais():
    if 'username' not in session: return redirect('/')
    if request.method == 'POST':
        # Atualizar parâmetros operacionais globais
        if 'dia_trabalho' in request.form:
            for chave in request.form.keys():
                item = ConfigGlobal.query.filter_by(chave=chave).first()
                if item: item.valor = float(request.form.get(chave))
            db.session.commit()
            flash('Custos fixos e taxas operacionais globais atualizados!', 'success')
        
        # Novo MDF
        elif 'nova_chapa_nome' in request.form:
            nova = ChapaMdf(nome_modelo=request.form.get('nova_chapa_nome'), marca=request.form.get('nova_chapa_marca'),
                            fornecedor=request.form.get('nova_chapa_fornecedor'), preco_custo=float(request.form.get('nova_chapa_preco')))
            db.session.add(nova)
            db.session.commit()
            flash('Painel MDF adicionado ao catálogo!', 'success')
            
        # Nova Ferragem
        elif 'ferragem_nome' in request.form:
            nova_f = Ferragem(tipo=request.form.get('ferragem_tipo'), nome_modelo=request.form.get('ferragem_nome'),
                              marca=request.form.get('ferragem_marca'), fornecedor=request.form.get('ferragem_fornecedor'),
                              preco_custo=float(request.form.get('ferragem_preco')))
            db.session.add(nova_f)
            db.session.commit()
            flash('Componente/Ferragem integrada ao almoxarifado!', 'success')

    return render_template('materiais.html', configs=obter_configs(), chapas=ChapaMdf.query.all(), ferragens=Ferragem.query.all())

@app.route('/excluir_chapa/<int:id>')
def excluir_chapa(id):
    c = ChapaMdf.query.get(id)
    if c: db.session.delete(c); db.session.commit()
    return redirect('/materiais')

@app.route('/excluir_ferragem/<int:id>')
def excluir_ferragem(id):
    f = Ferragem.query.get(id)
    if f: db.session.delete(f); db.session.commit()
    return redirect('/materiais')

if __name__ == '__main__':
    with app.app_context():
        db.create_all() # Cria as tabelas estruturadas se não existirem
    app.run(debug=True)