# Vértice Marcenaria — versão Supabase

Migração do sistema original Flask + SQLite para PostgreSQL no Supabase, com catálogo, clientes, orçamento, histórico e autenticação via Supabase Auth.

## 1. Banco
No Supabase, abra **SQL Editor**, cole o conteúdo de `schema.sql` e execute.

## 2. Auth
Em **Authentication > Users**, crie o usuário administrador com e-mail e senha. Não existe mais usuário/senha fixa dentro do código.

## 3. Configuração local
Copie `.env.example` para `.env` e preencha:
- `DATABASE_URL`: conexão PostgreSQL do Supabase, de preferência a Connection String apropriada ao seu ambiente.
- `SUPABASE_URL`: URL do projeto.
- `SUPABASE_ANON_KEY`: chave anon/public do projeto.
- `FLASK_SECRET_KEY`: segredo aleatório longo.

## 4. Instalação e execução
```bash
python -m venv .venv
# Windows: .venv\Scripts\activate
# Linux/macOS: source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

Abra `http://localhost:5000`.

## Observações
- O cálculo original foi preservado, mas o armazenamento agora é PostgreSQL/Supabase.
- Orçamentos ganharam `orcamento_itens` para permitir guardar a composição detalhada.
- A criação de pastas locais de clientes foi removida. Para anexos/projetos, o próximo passo recomendado é integrar Supabase Storage.
- Não coloque `service_role` no navegador nem no repositório.
