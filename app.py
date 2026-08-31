import os
import json
from decimal import Decimal, InvalidOperation
from functools import wraps
from datetime import datetime, timezone
from urllib.parse import quote_plus

from dotenv import load_dotenv
from flask import Flask, render_template, request, redirect, session, flash, jsonify
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import func, desc
from supabase import create_client

# 1. Carrega as variáveis de ambiente do arquivo .env
load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv('FLASK_SECRET_KEY', 'dev-only-change-me')

# 2. Configuração de conexão do Banco de Dados PostgreSQL (Supabase)
DATABASE_URL = os.getenv('DATABASE_URL')
if not DATABASE_URL:
    raise RuntimeError('DATABASE_URL não configurada. Verifique o seu arquivo .env.')

# Tratamento para garantir suporte ao protocolo postgresql:// do SQLAlchemy
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

app.config['SQLALCHEMY_DATABASE_URI'] = DATABASE_URL
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {'pool_pre_ping': True, 'pool_recycle': 280}

db = SQLAlchemy(app)

# 3. Inicialização do Client do Supabase (para autenticação)
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY') or os.getenv('SUPABASE_ANON_KEY')
supabase = create_client(SUPABASE_URL, SUPABASE_KEY) if SUPABASE_URL and SUPABASE_KEY else None

# Configurações padrão
DEFAULT_CONFIGS = {
    'dia_trabalho': 250.0, 'luz_hora': 4.5, 'agua_hora': 1.2,
    'maquina_depreciacao_hora': 3.0, 'parafusos_un': 0.15, 'cola_g': 0.05,
    'fita_borda_m': 2.50, 'desgaste_serra_corte': 0.10, 'gasolina_km': 1.80,
    'custo_hora_3d': 50.0,
}

# --- MODELOS DO BANCO DE DADOS ---

class Cliente(db.Model):
    __tablename__ = 'clientes'
    id = db.Column(db.BigInteger, primary_key=True)
    nome = db.Column(db.String(100), nullable=False)
    telefone = db.Column(db.String(20))
    email = db.Column(db.String(100))
    cep = db.Column(db.String(15))
    endereco = db.Column(db.String(200))
    numero = db.Column(db.String(20))
    cpf = db.Column(db.String(20))
    criado_em = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    orcamentos = db.relationship('Orcamento', back_populates='cliente', lazy=True)

class Orcamento(db.Model):
    __tablename__ = 'orcamentos'
    id = db.Column(db.BigInteger, primary_key=True)
    projeto = db.Column(db.String(150), nullable=False)
    cliente_id = db.Column(db.BigInteger, db.ForeignKey('clientes.id', ondelete='SET NULL'))
    cliente_nome_avulso = db.Column(db.String(100))
    custo_producao = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    valor_lucro = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    preco_final = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    reinvestimento_materiais = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    status = db.Column(db.String(20), nullable=False, default='Pendente')
    data_criacao = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    cliente = db.relationship('Cliente', back_populates='orcamentos')
    itens = db.relationship('OrcamentoItem', back_populates='orcamento', cascade='all, delete-orphan')

class OrcamentoItem(db.Model):
    __tablename__ = 'orcamento_itens'
    id = db.Column(db.BigInteger, primary_key=True)
    orcamento_id = db.Column(db.BigInteger, db.ForeignKey('orcamentos.id', ondelete='CASCADE'), nullable=False)
    categoria = db.Column(db.String(30), nullable=False)
    descricao = db.Column(db.String(200), nullable=False)
    quantidade = db.Column(db.Numeric(12, 3), nullable=False, default=0)
    custo_unitario = db.Column(db.Numeric(12, 4), nullable=False, default=0)
    custo_total = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    orcamento = db.relationship('Orcamento', back_populates='itens')

class ChapaMdf(db.Model):
    __tablename__ = 'chapas_mdf'
    id = db.Column(db.BigInteger, primary_key=True)
    nome_modelo = db.Column(db.String(100), nullable=False)
    marca = db.Column(db.String(50))
    fornecedor = db.Column(db.String(100))
    preco_custo = db.Column(db.Numeric(12, 2), nullable=False, default=0)

class Ferragem(db.Model):
    __tablename__ = 'ferragens'
    id = db.Column(db.BigInteger, primary_key=True)
    tipo = db.Column(db.String(50), nullable=False)
    nome_modelo = db.Column(db.String(100), nullable=False)
    marca = db.Column(db.String(50))
    fornecedor = db.Column(db.String(100))
    preco_custo = db.Column(db.Numeric(12, 2), nullable=False, default=0)

class ConfigGlobal(db.Model):
    __tablename__ = 'config_global'
    id = db.Column(db.BigInteger, primary_key=True)
    chave = db.Column(db.String(50), unique=True, nullable=False)
    valor = db.Column(db.Numeric(12, 4), nullable=False)

# --- FUNÇÕES AUXILIARES ---

def money(v):
    try:
        if v is None or v == '': return Decimal('0')
        return Decimal(str(v).replace('.', '').replace(',', '.')) if isinstance(v, str) and ',' in v else Decimal(str(v))
    except (InvalidOperation, ValueError):
        return Decimal('0')

def obter_configs():
    configs = {}
    rows = ConfigGlobal.query.all()
    existing = {r.chave: float(r.valor) for r in rows}
    changed = False
    for chave, default in DEFAULT_CONFIGS.items():
        if chave not in existing:
            db.session.add(ConfigGlobal(chave=chave, valor=default))
            existing[chave] = default
            changed = True
    if changed: db.session.commit()
    return existing

def login_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if 'user' not in session:
            return redirect('/')
        return fn(*args, **kwargs)
    return wrapper

@app.context_processor
def inject_globals():
    return {'current_user': session.get('user')}

# --- ROTAS DA APLICAÇÃO ---

@app.route('/', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form.get('email', '').strip()
        password = request.form.get('password', '')
        try:
            if not supabase:
                raise RuntimeError('Supabase Auth não configurado. Verifique as chaves SUPABASE_URL e SUPABASE_KEY no .env.')
            response = supabase.auth.sign_in_with_password({'email': email, 'password': password})
            if not response.user:
                raise RuntimeError('Login não autorizado.')
            session['user'] = {'id': response.user.id, 'email': response.user.email}
            return redirect('/dashboard')
        except Exception as exc:
            app.logger.warning('Falha de login: %s', exc)
            flash('E-mail ou senha inválidos.', 'error')
    if 'user' in session:
        return redirect('/dashboard')
    return render_template('login.html')

@app.route('/logout')
def logout():
    session.clear()
    return redirect('/')

@app.route('/dashboard')
@login_required
def dashboard():
    orcamentos = Orcamento.query.order_by(desc(Orcamento.data_criacao)).all()
    faturamento = sum((money(o.preco_final) for o in orcamentos if o.status == 'Aprovado'), Decimal('0'))
    lucro = sum((money(o.valor_lucro) for o in orcamentos if o.status == 'Aprovado'), Decimal('0'))
    reinvest = sum((money(o.reinvestimento_materiais) for o in orcamentos if o.status == 'Aprovado'), Decimal('0'))
    return render_template('dashboard.html', orcamentos=orcamentos, faturamento=faturamento, lucro_estimado=lucro,
                           reinvestimento=reinvest, total_orcamentos=len(orcamentos))

@app.route('/clientes', methods=['GET', 'POST'])
@login_required
def clientes():
    if request.method == 'POST':
        nome = request.form.get('nome', '').strip()
        if not nome:
            flash('Informe o nome do cliente.', 'error')
        else:
            db.session.add(Cliente(nome=nome, cpf=request.form.get('cpf'), telefone=request.form.get('telefone'),
                                   email=request.form.get('email'), cep=request.form.get('cep'),
                                   endereco=request.form.get('endereco'), numero=request.form.get('numero')))
            db.session.commit()
            flash('Cliente cadastrado com sucesso.', 'success')
            return redirect('/clientes')
    return render_template('clientes.html', clientes=Cliente.query.order_by(Cliente.nome).all())

@app.route('/clientes/excluir/<int:id>', methods=['POST'])
@login_required
def excluir_cliente(id):
    cliente = db.get_or_404(Cliente, id)
    db.session.delete(cliente)
    db.session.commit()
    flash('Cliente excluído.', 'success')
    return redirect('/clientes')

@app.route('/orcamento', methods=['GET', 'POST'])
@login_required
def orcamento():
    configs = obter_configs()
    resumo = None
    if request.method == 'POST' and request.form.get('acao') == 'calcular':
        chapa = db.session.get(ChapaMdf, int(request.form.get('chapa_id'))) if request.form.get('chapa_id') else None
        qtd_chapas = money(request.form.get('qtd_chapas'))
        qtd_cortes = int(request.form.get('qtd_cortes') or 0)
        qtd_fita = money(request.form.get('qtd_fita'))
        dias_trab = money(request.form.get('dias_trabalho'))
        km_entrega = money(request.form.get('km_entrega'))
        horas_3d = money(request.form.get('horas_3d'))
        margem = money(request.form.get('lucro') or 30) / 100

        custo_mdf = money(chapa.preco_custo) * qtd_chapas if chapa else Decimal('0')
        custo_ferramental = Decimal(qtd_cortes) * money(configs['desgaste_serra_corte'])
        custo_insumos = (qtd_chapas * 20 * money(configs['parafusos_un'])) + (qtd_fita * 10 * money(configs['cola_g'])) + (qtd_fita * money(configs['fita_borda_m']))
        custo_fixo = dias_trab * 8 * (money(configs['luz_hora']) + money(configs['agua_hora']) + money(configs['maquina_depreciacao_hora']))
        custo_mo = dias_trab * money(configs['dia_trabalho'])
        custo_logistica = km_entrega * money(configs['gasolina_km'])
        custo_3d = horas_3d * money(configs['custo_hora_3d'])

        total_ferragens = Decimal('0')
        detalhes_f = []
        for tipo in ['Dobradiça', 'Corrediça', 'Puxador', 'Pistão', 'Outros']:
            fid = request.form.get(f'id_{tipo.lower()}')
            qtd = int(request.form.get(f'qtd_{tipo.lower()}') or 0)
            if fid and qtd > 0:
                item = db.session.get(Ferragem, int(fid))
                if item:
                    total = money(item.preco_custo) * qtd
                    total_ferragens += total
                    detalhes_f.append({'txt': f'{tipo}: {qtd}x {item.nome_modelo}', 'valor': total})

        custo_total = custo_mdf + total_ferragens + custo_insumos + custo_ferramental + custo_fixo + custo_mo + custo_logistica + custo_3d
        preco_venda = custo_total / (1 - margem) if margem < 1 else custo_total
        lucro_liquido = preco_venda - custo_total
        reinvestimento = custo_mdf + total_ferragens + custo_insumos
        resumo = {
            'cliente_nome': request.form.get('cliente_nome'), 'projeto': request.form.get('projeto'),
            'chapa_name': chapa.nome_modelo if chapa else 'N/A', 'custo_chapas': custo_mdf,
            'custo_ferragens': total_ferragens, 'detalhe_ferragens': detalhes_f,
            'custo_insumos': custo_insumos, 'custo_ferramental': custo_ferramental,
            'custo_fixo': custo_fixo, 'custo_mao_de_obra': custo_mo, 'custo_logistica': custo_logistica,
            'custo_3d': custo_3d, 'custo_total_producao': custo_total, 'valor_lucro': lucro_liquido,
            'preco_final': preco_venda, 'reinvestimento_materiais': reinvestimento,
        }
    return render_template('orcamento.html', clientes=Cliente.query.order_by(Cliente.nome).all(),
                           chapas=ChapaMdf.query.order_by(ChapaMdf.nome_modelo).all(),
                           ferragens=Ferragem.query.order_by(Ferragem.tipo, Ferragem.nome_modelo).all(),
                           resumo=resumo, configs=configs)

@app.route('/orcamento/salvar', methods=['POST'])
@login_required
def salvar_orcamento():
    cliente_input = request.form.get('cliente_nome', '').strip()
    cliente = Cliente.query.filter(func.lower(Cliente.nome) == cliente_input.lower()).first() if cliente_input else None
    o = Orcamento(projeto=request.form.get('projeto', 'Projeto sem nome'),
                  cliente_id=cliente.id if cliente else None,
                  cliente_nome_avulso=None if cliente else cliente_input,
                  custo_producao=money(request.form.get('custo_producao')),
                  valor_lucro=money(request.form.get('valor_lucro')),
                  preco_final=money(request.form.get('preco_final')),
                  reinvestimento_materiais=money(request.form.get('reinvestimento_materiais')),
                  status='Pendente')
    db.session.add(o)
    db.session.flush()

    itens = request.form.getlist('item_json')
    for raw in itens:
        try:
            item = json.loads(raw)
            db.session.add(OrcamentoItem(orcamento_id=o.id, categoria=item['categoria'], descricao=item['descricao'],
                                         quantidade=item['quantidade'], custo_unitario=item['custo_unitario'], custo_total=item['custo_total']))
        except Exception:
            continue
    db.session.commit()
    flash(f'Orçamento #{o.id} salvo no histórico.', 'success')
    return redirect('/historico_orcamentos')

@app.route('/historico_orcamentos')
@login_required
def historico_orcamentos():
    lista = Orcamento.query.order_by(desc(Orcamento.data_criacao)).all()
    return render_template('historico.html', orcamentos=lista)

@app.route('/mudar_status_orcamento/<int:id>/<string:status>', methods=['POST'])
@login_required
def mudar_status_orcamento(id, status):
    if status not in {'Pendente', 'Aprovado', 'Recusado'}:
        return jsonify({'error': 'Status inválido'}), 400
    o = db.get_or_404(Orcamento, id)
    o.status = status
    db.session.commit()
    flash(f'Status do orçamento #{id} alterado para {status}.', 'success')
    return redirect(request.referrer or '/historico_orcamentos')

@app.route('/materiais', methods=['GET', 'POST'])
@login_required
def materiais():
    if request.method == 'POST':
        if request.form.get('form') == 'configs':
            for chave in DEFAULT_CONFIGS:
                if chave in request.form:
                    item = ConfigGlobal.query.filter_by(chave=chave).first()
                    if item: item.valor = money(request.form[chave])
            db.session.commit(); flash('Custos operacionais atualizados.', 'success')
        elif request.form.get('form') == 'chapa':
            db.session.add(ChapaMdf(nome_modelo=request.form.get('nome_modelo'), marca=request.form.get('marca'),
                                    fornecedor=request.form.get('fornecedor'), preco_custo=money(request.form.get('preco_custo'))))
            db.session.commit(); flash('MDF adicionado ao catálogo.', 'success')
        elif request.form.get('form') == 'ferragem':
            db.session.add(Ferragem(tipo=request.form.get('tipo'), nome_modelo=request.form.get('nome_modelo'),
                                    marca=request.form.get('marca'), fornecedor=request.form.get('fornecedor'), preco_custo=money(request.form.get('preco_custo'))))
            db.session.commit(); flash('Ferragem adicionada ao catálogo.', 'success')
        return redirect('/materiais')
    return render_template('materiais.html', configs=obter_configs(), chapas=ChapaMdf.query.order_by(ChapaMdf.nome_modelo).all(),
                           ferragens=Ferragem.query.order_by(Ferragem.tipo, Ferragem.nome_modelo).all())

@app.route('/materiais/chapa/<int:id>/excluir', methods=['POST'])
@login_required
def excluir_chapa(id):
    item = db.get_or_404(ChapaMdf, id); db.session.delete(item); db.session.commit(); return redirect('/materiais')

@app.route('/materiais/ferragem/<int:id>/excluir', methods=['POST'])
@login_required
def excluir_ferragem(id):
    item = db.get_or_404(Ferragem, id); db.session.delete(item); db.session.commit(); return redirect('/materiais')

# --- FILTROS TEMPLATE FLASK ---

@app.template_filter('brl')
def brl(value):
    return f'R$ {money(value):,.2f}'.replace(',', 'X').replace('.', ',').replace('X', '.')

@app.template_filter('date_br')
def date_br(value):
    return value.strftime('%d/%m/%Y %H:%M') if value else '-'

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=int(os.getenv('PORT', 5000)))