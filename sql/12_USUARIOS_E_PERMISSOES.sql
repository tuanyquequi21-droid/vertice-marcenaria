-- ============================================================
-- VÉRTICE GESTÃO
-- MIGRATION 12 - USUÁRIOS, PERFIS E PERMISSÕES - CONSOLIDADA
-- ============================================================

begin;

-- ============================================================
-- 1. PERFIS
-- ============================================================

alter table public.perfis
drop constraint if exists perfis_papel_check;

alter table public.perfis
add constraint perfis_papel_check
check (
    papel in (
        'admin',
        'comercial',
        'producao',
        'financeiro',
        'personalizado'
    )
);

alter table public.perfis
add column if not exists email text;

alter table public.perfis
add column if not exists atualizado_em timestamptz default now();


-- ============================================================
-- 2. CATÁLOGO DE PERMISSÕES
-- ============================================================

create table if not exists public.permissoes (
    codigo text primary key,
    modulo text not null,
    nome text not null,
    descricao text,
    criado_em timestamptz not null default now()
);


-- ============================================================
-- 3. PERMISSÕES POR USUÁRIO
-- ============================================================

create table if not exists public.usuario_permissoes (
    user_id uuid not null
        references public.perfis(user_id)
        on delete cascade,

    permissao_codigo text not null
        references public.permissoes(codigo)
        on delete cascade,

    permitido boolean not null default true,

    criado_em timestamptz not null default now(),

    primary key (user_id, permissao_codigo)
);


-- ============================================================
-- 4. CATÁLOGO
-- ============================================================

insert into public.permissoes
(codigo, modulo, nome, descricao)
values

('dashboard.ver','Dashboard','Visualizar dashboard',
 'Acessar o painel principal'),

-- CRM
('crm.ver','CRM','Visualizar leads','Consultar leads e oportunidades'),
('crm.criar','CRM','Criar leads','Cadastrar novos leads'),
('crm.editar','CRM','Editar leads','Alterar leads e oportunidades'),
('crm.excluir','CRM','Excluir leads','Excluir leads'),

-- CLIENTES
('clientes.ver','Clientes','Visualizar clientes','Consultar clientes'),
('clientes.criar','Clientes','Criar clientes','Cadastrar clientes'),
('clientes.editar','Clientes','Editar clientes','Alterar clientes'),
('clientes.excluir','Clientes','Excluir clientes','Excluir clientes'),

-- ORÇAMENTOS
('orcamentos.ver','Orçamentos','Visualizar orçamentos','Consultar orçamentos'),
('orcamentos.criar','Orçamentos','Criar orçamentos','Criar propostas'),
('orcamentos.editar','Orçamentos','Editar orçamentos','Alterar propostas'),
('orcamentos.excluir','Orçamentos','Excluir orçamentos','Excluir propostas'),

('orcamentos.ver_custos','Orçamentos',
 'Visualizar custos internos',
 'Visualizar materiais, mão de obra e demais custos internos'),

('orcamentos.ver_lucro','Orçamentos',
 'Visualizar lucro e margem',
 'Visualizar lucro estimado e percentual de margem'),

('orcamentos.alterar_margem','Orçamentos',
 'Alterar margem',
 'Permite alterar a margem comercial'),

-- AGENDA
('agenda.ver','Agenda','Visualizar agenda','Consultar tarefas e retornos'),
('agenda.criar','Agenda','Criar tarefas','Criar tarefas e retornos'),
('agenda.editar','Agenda','Editar tarefas','Alterar ou concluir tarefas'),
('agenda.excluir','Agenda','Excluir tarefas','Excluir tarefas'),

-- PRODUÇÃO
('producao.ver','Produção','Visualizar produção','Consultar produção'),
('producao.criar','Produção','Criar produção','Criar registros de produção'),
('producao.editar','Produção','Editar produção','Atualizar produção'),
('producao.excluir','Produção','Excluir produção','Excluir produção'),

-- MATERIAIS
('materiais.ver','Materiais','Visualizar materiais','Consultar materiais'),
('materiais.criar','Materiais','Criar materiais','Cadastrar materiais'),
('materiais.editar','Materiais','Editar materiais','Alterar materiais'),
('materiais.excluir','Materiais','Excluir materiais','Excluir materiais'),

-- FUNCIONÁRIOS
('funcionarios.ver','Funcionários','Visualizar funcionários',
 'Consultar funcionários'),

('funcionarios.criar','Funcionários','Criar funcionários',
 'Cadastrar funcionários'),

('funcionarios.editar','Funcionários','Editar funcionários',
 'Alterar funcionários'),

('funcionarios.excluir','Funcionários','Excluir funcionários',
 'Excluir funcionários'),

-- FINANCEIRO
('financeiro.ver','Financeiro','Visualizar financeiro',
 'Visualizar entradas, saídas e saldos'),

('financeiro.criar','Financeiro','Criar lançamentos',
 'Criar lançamentos financeiros'),

('financeiro.editar','Financeiro','Editar lançamentos',
 'Alterar lançamentos financeiros'),

('financeiro.excluir','Financeiro','Excluir lançamentos',
 'Excluir lançamentos financeiros'),

-- RELATÓRIOS
('relatorios.ver','Relatórios','Visualizar relatórios',
 'Acessar relatórios gerenciais'),

-- CONFIGURAÇÕES
('configuracoes.ver','Configurações','Visualizar configurações',
 'Consultar configurações'),

('configuracoes.editar','Configurações','Alterar configurações',
 'Modificar configurações, custos e parâmetros'),

-- DOCUMENTOS
('documentos.ver','Documentos','Visualizar documentos',
 'Consultar documentos de clientes'),

('documentos.criar','Documentos','Enviar documentos',
 'Anexar documentos'),

('documentos.excluir','Documentos','Excluir documentos',
 'Excluir documentos'),

-- PÓS-VENDA
('posvenda.ver','Pós-venda','Visualizar pós-venda',
 'Consultar acompanhamento pós-venda'),

('posvenda.criar','Pós-venda','Criar pós-venda',
 'Criar acompanhamento pós-venda'),

('posvenda.editar','Pós-venda','Editar pós-venda',
 'Alterar acompanhamento pós-venda'),

('posvenda.excluir','Pós-venda','Excluir pós-venda',
 'Excluir acompanhamento pós-venda'),

-- USUÁRIOS
('usuarios.ver','Usuários','Visualizar usuários',
 'Consultar usuários da empresa'),

('usuarios.criar','Usuários','Criar usuários',
 'Criar novos acessos'),

('usuarios.editar','Usuários','Editar usuários',
 'Alterar dados de usuários'),

('usuarios.permissoes','Usuários','Gerenciar permissões',
 'Alterar permissões de outros usuários'),

('usuarios.desativar','Usuários','Desativar usuários',
 'Bloquear ou reativar acessos')

on conflict (codigo) do update
set modulo = excluded.modulo,
    nome = excluded.nome,
    descricao = excluded.descricao;


-- ============================================================
-- 5. FUNÇÕES DE AUTORIZAÇÃO
-- ============================================================

create or replace function public.sou_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1
        from public.perfis
        where user_id = auth.uid()
          and ativo = true
          and papel = 'admin'
    );
$$;


create or replace function public.tem_permissao(p_codigo text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
    v_papel text;
    v_ativo boolean;
    v_override boolean;
begin

    select papel, ativo
      into v_papel, v_ativo
      from public.perfis
     where user_id = auth.uid()
     limit 1;

    -- Usuário inexistente ou desativado.
    if coalesce(v_ativo, false) = false then
        return false;
    end if;

    -- Administrador possui acesso total.
    if v_papel = 'admin' then
        return true;
    end if;

    -- --------------------------------------------------------
    -- PERMISSÃO PERSONALIZADA
    -- --------------------------------------------------------
    -- Se houver uma configuração individual para o usuário,
    -- ela prevalece sobre o perfil-base.
    -- --------------------------------------------------------

    select permitido
      into v_override
      from public.usuario_permissoes
     where user_id = auth.uid()
       and permissao_codigo = p_codigo
     limit 1;

    if found then
        return coalesce(v_override, false);
    end if;


    -- --------------------------------------------------------
    -- PERFIL COMERCIAL / VENDAS
    -- --------------------------------------------------------

    if v_papel = 'comercial' then
        return p_codigo = any(array[
            'dashboard.ver',

            'crm.ver',
            'crm.criar',
            'crm.editar',

            'clientes.ver',
            'clientes.criar',
            'clientes.editar',

            'orcamentos.ver',
            'orcamentos.criar',
            'orcamentos.editar',

            'agenda.ver',
            'agenda.criar',
            'agenda.editar'
        ]);
    end if;


    -- --------------------------------------------------------
    -- PERFIL PRODUÇÃO
    -- --------------------------------------------------------

    if v_papel = 'producao' then
        return p_codigo = any(array[
            'dashboard.ver',

            'clientes.ver',

            'agenda.ver',
            'agenda.editar',

            'producao.ver',
            'producao.criar',
            'producao.editar',

            'materiais.ver'
        ]);
    end if;


    -- --------------------------------------------------------
    -- PERFIL FINANCEIRO
    -- --------------------------------------------------------

    if v_papel = 'financeiro' then
        return p_codigo = any(array[
            'dashboard.ver',

            'clientes.ver',

            'financeiro.ver',
            'financeiro.criar',
            'financeiro.editar',

            'relatorios.ver'
        ]);
    end if;


    -- --------------------------------------------------------
    -- PERFIL PERSONALIZADO
    -- --------------------------------------------------------
    -- Não recebe nenhuma permissão automaticamente.
    -- Tudo será definido em usuario_permissoes.
    -- --------------------------------------------------------

    return false;

end;
$$;

-- ============================================================
-- 5.1 ISOLAMENTO DE USUÁRIOS POR EMPRESA
-- ============================================================

create or replace function public.usuario_da_minha_empresa(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1
        from public.perfis p
        where p.user_id = p_user_id
          and p.empresa_id = public.minha_empresa()
    );
$$;


-- ============================================================
-- 6. RLS DAS TABELAS DE PERMISSÃO
-- ============================================================

alter table public.permissoes enable row level security;
alter table public.usuario_permissoes enable row level security;

drop policy if exists permissoes_select on public.permissoes;

create policy permissoes_select
on public.permissoes
for select
to authenticated
using (true);


drop policy if exists usuario_permissoes_select
on public.usuario_permissoes;

create policy usuario_permissoes_select
on public.usuario_permissoes
for select
to authenticated
using (
    user_id = auth.uid()
    or (
        public.tem_permissao('usuarios.ver')
        and public.usuario_da_minha_empresa(user_id)
    )
);


drop policy if exists usuario_permissoes_insert
on public.usuario_permissoes;

create policy usuario_permissoes_insert
on public.usuario_permissoes
for insert
to authenticated
with check (
    public.tem_permissao('usuarios.permissoes')
    and public.usuario_da_minha_empresa(user_id)
);


drop policy if exists usuario_permissoes_update
on public.usuario_permissoes;

create policy usuario_permissoes_update
on public.usuario_permissoes
for update
to authenticated
using (
    public.tem_permissao('usuarios.permissoes')
    and public.usuario_da_minha_empresa(user_id)
)
with check (
    public.tem_permissao('usuarios.permissoes')
    and public.usuario_da_minha_empresa(user_id)
);


drop policy if exists usuario_permissoes_delete
on public.usuario_permissoes;

create policy usuario_permissoes_delete
on public.usuario_permissoes
for delete
to authenticated
using (
    public.tem_permissao('usuarios.permissoes')
    and public.usuario_da_minha_empresa(user_id)
);


-- ============================================================
-- 7. PERFIS / USUÁRIOS
-- ============================================================

drop policy if exists perfil_select on public.perfis;
drop policy if exists perfil_admin_update on public.perfis;

create policy perfil_select
on public.perfis
for select
to authenticated
using (
    empresa_id = public.minha_empresa()
    and (
        user_id = auth.uid()
        or public.tem_permissao('usuarios.ver')
    )
);

create policy perfil_admin_update
on public.perfis
for update
to authenticated
using (
    empresa_id = public.minha_empresa()
    and public.tem_permissao('usuarios.editar')
)
with check (
    empresa_id = public.minha_empresa()
    and public.tem_permissao('usuarios.editar')
);


-- ============================================================
-- 7.1 PROTEÇÃO DO ADMINISTRADOR E DA EMPRESA DO PERFIL
-- ============================================================

create or replace function public.proteger_perfil_usuario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    v_outros_admins integer;
begin
    if tg_op = 'UPDATE' then
        if new.empresa_id is distinct from old.empresa_id then
            raise exception 'Não é permitido transferir um usuário entre empresas.';
        end if;

        -- Em chamadas autenticadas normais, somente Admin pode promover,
        -- rebaixar ou alterar outro Admin.
        if auth.uid() is not null
           and (new.papel is distinct from old.papel)
           and (old.papel = 'admin' or new.papel = 'admin')
           and not public.sou_admin() then
            raise exception 'Somente um administrador pode alterar o perfil Admin.';
        end if;

        if old.papel = 'admin'
           and old.ativo = true
           and (new.papel <> 'admin' or new.ativo = false) then
            select count(*)
              into v_outros_admins
              from public.perfis p
             where p.empresa_id = old.empresa_id
               and p.user_id <> old.user_id
               and p.papel = 'admin'
               and p.ativo = true;

            if v_outros_admins = 0 then
                raise exception 'Não é permitido desativar ou rebaixar o último administrador da empresa.';
            end if;
        end if;

        new.atualizado_em := now();
        return new;
    end if;

    if tg_op = 'DELETE' then
        if old.papel = 'admin' and old.ativo = true then
            select count(*)
              into v_outros_admins
              from public.perfis p
             where p.empresa_id = old.empresa_id
               and p.user_id <> old.user_id
               and p.papel = 'admin'
               and p.ativo = true;

            if v_outros_admins = 0 then
                raise exception 'Não é permitido excluir o último administrador da empresa.';
            end if;
        end if;
        return old;
    end if;

    return null;
end;
$$;

drop trigger if exists trg_proteger_perfil_usuario on public.perfis;
create trigger trg_proteger_perfil_usuario
before update or delete on public.perfis
for each row execute function public.proteger_perfil_usuario();


-- ============================================================
-- 8. CLIENTES
-- ============================================================

drop policy if exists clientes_select on public.clientes;
drop policy if exists clientes_insert on public.clientes;
drop policy if exists clientes_update on public.clientes;
drop policy if exists clientes_delete on public.clientes;

create policy clientes_select
on public.clientes
for select to authenticated
using (
    empresa_id = public.minha_empresa()
    and public.tem_permissao('clientes.ver')
);

create policy clientes_insert
on public.clientes
for insert to authenticated
with check (
    empresa_id = public.minha_empresa()
    and public.tem_permissao('clientes.criar')
);

create policy clientes_update
on public.clientes
for update to authenticated
using (
    empresa_id = public.minha_empresa()
    and public.tem_permissao('clientes.editar')
)
with check (
    empresa_id = public.minha_empresa()
    and public.tem_permissao('clientes.editar')
);

create policy clientes_delete
on public.clientes
for delete to authenticated
using (
    empresa_id = public.minha_empresa()
    and public.tem_permissao('clientes.excluir')
);


-- ============================================================
-- 9. LEADS / CRM
-- ============================================================

drop policy if exists leads_select on public.crm_leads;
drop policy if exists leads_insert on public.crm_leads;
drop policy if exists leads_update on public.crm_leads;
drop policy if exists leads_delete on public.crm_leads;

create policy leads_select
on public.crm_leads
for select to authenticated
using (
    empresa_id = public.minha_empresa()
    and public.tem_permissao('crm.ver')
);

create policy leads_insert
on public.crm_leads
for insert to authenticated
with check (
    empresa_id = public.minha_empresa()
    and public.tem_permissao('crm.criar')
);

create policy leads_update
on public.crm_leads
for update to authenticated
using (
    empresa_id = public.minha_empresa()
    and public.tem_permissao('crm.editar')
)
with check (
    empresa_id = public.minha_empresa()
    and public.tem_permissao('crm.editar')
);

create policy leads_delete
on public.crm_leads
for delete to authenticated
using (
    empresa_id = public.minha_empresa()
    and public.tem_permissao('crm.excluir')
);


-- ============================================================
-- 10. ORÇAMENTOS
-- ============================================================

drop policy if exists orc_select on public.orcamentos;
drop policy if exists orc_insert on public.orcamentos;
drop policy if exists orc_update on public.orcamentos;
drop policy if exists orcamentos_delete on public.orcamentos;

create policy orc_select
on public.orcamentos
for select to authenticated
using (
    empresa_id = public.minha_empresa()
    and public.tem_permissao('orcamentos.ver')
);

create policy orc_insert
on public.orcamentos
for insert to authenticated
with check (
    empresa_id = public.minha_empresa()
    and public.tem_permissao('orcamentos.criar')
);

create policy orc_update
on public.orcamentos
for update to authenticated
using (
    empresa_id = public.minha_empresa()
    and public.tem_permissao('orcamentos.editar')
)
with check (
    empresa_id = public.minha_empresa()
    and public.tem_permissao('orcamentos.editar')
);

create policy orcamentos_delete
on public.orcamentos
for delete to authenticated
using (
    empresa_id = public.minha_empresa()
    and public.tem_permissao('orcamentos.excluir')
);


-- ============================================================
-- 10.1 LEITURA SEGURA DE ORÇAMENTOS POR NÍVEL DE PERMISSÃO
-- ============================================================
-- A tabela-base contém custos e lucro. O acesso direto fica limitado às
-- colunas comerciais; custos e lucro são lidos somente pelas views abaixo.

create or replace view public.orcamentos_comerciais
with (security_barrier = true)
as
select
    id, empresa_id, lead_id, cliente_id,
    cliente_nome, cliente_cpf, cliente_telefone, cliente_email,
    cliente_cep, cliente_endereco, cliente_numero, cliente_cidade, cliente_uf,
    projeto, ambiente, descricao_cliente, observacoes_internas, observacoes_cliente,
    prazo_entrega_dias, validade_dias, condicoes_pagamento,
    preco_final, status, criado_por, data_criacao, atualizado_em,
    forma_pagamento, numero_parcelas, valor_final_parcelado,
    desconto_percentual, versao_atual, aprovado_em,
    public_token, aceite_nome, aceite_em
from public.orcamentos
where empresa_id = public.minha_empresa()
  and public.tem_permissao('orcamentos.ver');

create or replace view public.orcamentos_custos
with (security_barrier = true)
as
select
    id, empresa_id,
    dias_trabalho, quantidade_pessoas, valor_dia_pessoa, valor_montagem,
    km_entrega, horas_3d,
    custo_producao, reinvestimento_materials, detalhes_calculo,
    taxa_parcelamento, valor_sem_margem, valor_antes_parcelamento
from public.orcamentos
where empresa_id = public.minha_empresa()
  and public.tem_permissao('orcamentos.ver')
  and public.tem_permissao('orcamentos.ver_custos');

create or replace view public.orcamentos_lucro
with (security_barrier = true)
as
select
    id, empresa_id, valor_lucro, margem_lucro, margem_minima_alerta
from public.orcamentos
where empresa_id = public.minha_empresa()
  and public.tem_permissao('orcamentos.ver')
  and public.tem_permissao('orcamentos.ver_lucro');

create or replace view public.orcamento_versoes_comerciais
with (security_barrier = true)
as
select id, empresa_id, orcamento_id, versao, preco_final, status, criado_em
from public.orcamento_versoes
where empresa_id = public.minha_empresa()
  and public.tem_permissao('orcamentos.ver');

create or replace view public.orcamento_versoes_custos
with (security_barrier = true)
as
select id, empresa_id, orcamento_id, versao, custo_producao
from public.orcamento_versoes
where empresa_id = public.minha_empresa()
  and public.tem_permissao('orcamentos.ver')
  and public.tem_permissao('orcamentos.ver_custos');

create or replace view public.orcamento_versoes_lucro
with (security_barrier = true)
as
select id, empresa_id, orcamento_id, versao, valor_lucro, margem_lucro
from public.orcamento_versoes
where empresa_id = public.minha_empresa()
  and public.tem_permissao('orcamentos.ver')
  and public.tem_permissao('orcamentos.ver_lucro');

revoke all on public.orcamentos_comerciais,
              public.orcamentos_custos,
              public.orcamentos_lucro,
              public.orcamento_versoes_comerciais,
              public.orcamento_versoes_custos,
              public.orcamento_versoes_lucro
from anon;

grant select on public.orcamentos_comerciais,
                public.orcamentos_custos,
                public.orcamentos_lucro,
                public.orcamento_versoes_comerciais,
                public.orcamento_versoes_custos,
                public.orcamento_versoes_lucro
to authenticated;


-- ============================================================
-- 10.2 PROTEÇÃO DE ALTERAÇÕES EM CUSTOS, LUCRO E MARGEM
-- ============================================================

create or replace function public.proteger_campos_internos_orcamento()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    if tg_op = 'INSERT' then
        if not public.tem_permissao('orcamentos.ver_custos') and (
            coalesce(new.dias_trabalho,0) <> 0
            or coalesce(new.quantidade_pessoas,1) <> 1
            or coalesce(new.valor_dia_pessoa,0) <> 0
            or coalesce(new.valor_montagem,0) <> 0
            or coalesce(new.km_entrega,0) <> 0
            or coalesce(new.horas_3d,0) <> 0
            or coalesce(new.custo_producao,0) <> 0
            or coalesce(new.reinvestimento_materials,0) <> 0
            or coalesce(new.detalhes_calculo,'{}'::jsonb) <> '{}'::jsonb
            or coalesce(new.taxa_parcelamento,9) <> 9
            or coalesce(new.valor_sem_margem,0) <> 0
            or coalesce(new.valor_antes_parcelamento,0) <> 0
        ) then
            raise exception 'Sem permissão para informar custos internos do orçamento.';
        end if;

        if not public.tem_permissao('orcamentos.alterar_margem')
           and new.margem_lucro is not null then
            raise exception 'Sem permissão para definir a margem do orçamento.';
        end if;

        if not public.tem_permissao('orcamentos.ver_lucro')
           and coalesce(new.valor_lucro,0) <> 0 then
            raise exception 'Sem permissão para informar lucro do orçamento.';
        end if;

        return new;
    end if;

    if tg_op = 'UPDATE' then
        if not public.tem_permissao('orcamentos.ver_custos') and (
            new.dias_trabalho is distinct from old.dias_trabalho
            or new.quantidade_pessoas is distinct from old.quantidade_pessoas
            or new.valor_dia_pessoa is distinct from old.valor_dia_pessoa
            or new.valor_montagem is distinct from old.valor_montagem
            or new.km_entrega is distinct from old.km_entrega
            or new.horas_3d is distinct from old.horas_3d
            or new.custo_producao is distinct from old.custo_producao
            or new.reinvestimento_materials is distinct from old.reinvestimento_materials
            or new.detalhes_calculo is distinct from old.detalhes_calculo
            or new.taxa_parcelamento is distinct from old.taxa_parcelamento
            or new.valor_sem_margem is distinct from old.valor_sem_margem
            or new.valor_antes_parcelamento is distinct from old.valor_antes_parcelamento
        ) then
            raise exception 'Sem permissão para alterar custos internos do orçamento.';
        end if;

        if not public.tem_permissao('orcamentos.alterar_margem')
           and new.margem_lucro is distinct from old.margem_lucro then
            raise exception 'Sem permissão para alterar a margem do orçamento.';
        end if;

        if not public.tem_permissao('orcamentos.ver_lucro')
           and new.valor_lucro is distinct from old.valor_lucro then
            raise exception 'Sem permissão para alterar o lucro do orçamento.';
        end if;

        return new;
    end if;

    return new;
end;
$$;

drop trigger if exists trg_proteger_campos_internos_orcamento on public.orcamentos;
create trigger trg_proteger_campos_internos_orcamento
before insert or update on public.orcamentos
for each row execute function public.proteger_campos_internos_orcamento();


-- Protege os campos internos das versões de orçamento.
create or replace function public.proteger_campos_internos_orcamento_versao()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    if tg_op = 'INSERT' then
        if not public.tem_permissao('orcamentos.ver_custos')
           and (coalesce(new.custo_producao,0) <> 0
                or coalesce(new.dados,'{}'::jsonb) <> '{}'::jsonb) then
            raise exception 'Sem permissão para gravar custos na versão do orçamento.';
        end if;

        if not public.tem_permissao('orcamentos.ver_lucro')
           and (coalesce(new.valor_lucro,0) <> 0 or new.margem_lucro is not null) then
            raise exception 'Sem permissão para gravar lucro ou margem na versão do orçamento.';
        end if;
        return new;
    end if;

    if tg_op = 'UPDATE' then
        if not public.tem_permissao('orcamentos.ver_custos')
           and (new.custo_producao is distinct from old.custo_producao
                or new.dados is distinct from old.dados) then
            raise exception 'Sem permissão para alterar custos na versão do orçamento.';
        end if;

        if not public.tem_permissao('orcamentos.ver_lucro')
           and (new.valor_lucro is distinct from old.valor_lucro
                or new.margem_lucro is distinct from old.margem_lucro) then
            raise exception 'Sem permissão para alterar lucro ou margem na versão do orçamento.';
        end if;
        return new;
    end if;

    return new;
end;
$$;

drop trigger if exists trg_proteger_campos_internos_orcamento_versao
on public.orcamento_versoes;

create trigger trg_proteger_campos_internos_orcamento_versao
before insert or update on public.orcamento_versoes
for each row execute function public.proteger_campos_internos_orcamento_versao();


-- ============================================================
-- 11. AGENDA / TAREFAS
-- ============================================================

drop policy if exists tarefa_select on public.crm_tarefas;
drop policy if exists tarefa_insert on public.crm_tarefas;
drop policy if exists tarefa_update on public.crm_tarefas;
drop policy if exists tarefa_delete on public.crm_tarefas;

create policy tarefa_select
on public.crm_tarefas
for select to authenticated
using (
    empresa_id = public.minha_empresa()
    and public.tem_permissao('agenda.ver')
);

create policy tarefa_insert
on public.crm_tarefas
for insert to authenticated
with check (
    empresa_id = public.minha_empresa()
    and public.tem_permissao('agenda.criar')
);

create policy tarefa_update
on public.crm_tarefas
for update to authenticated
using (
    empresa_id = public.minha_empresa()
    and public.tem_permissao('agenda.editar')
)
with check (
    empresa_id = public.minha_empresa()
    and public.tem_permissao('agenda.editar')
);

create policy tarefa_delete
on public.crm_tarefas
for delete to authenticated
using (
    empresa_id = public.minha_empresa()
    and public.tem_permissao('agenda.excluir')
);


-- ============================================================
-- 12. INTERAÇÕES CRM
-- ============================================================

drop policy if exists inter_select on public.crm_interacoes;
drop policy if exists inter_insert on public.crm_interacoes;

create policy inter_select
on public.crm_interacoes
for select to authenticated
using (
    empresa_id = public.minha_empresa()
    and public.tem_permissao('crm.ver')
);

create policy inter_insert
on public.crm_interacoes
for insert to authenticated
with check (
    empresa_id = public.minha_empresa()
    and public.tem_permissao('crm.editar')
);


-- ============================================================
-- 13. MATERIAIS
-- ============================================================

drop policy if exists materiais_select on public.materiais;
drop policy if exists materiais_insert on public.materiais;
drop policy if exists materiais_update on public.materiais;
drop policy if exists materiais_delete on public.materiais;

create policy materiais_select
on public.materiais
for select to authenticated
using (
    empresa_id = public.minha_empresa()
    and public.tem_permissao('materiais.ver')
);

create policy materiais_insert
on public.materiais
for insert to authenticated
with check (
    empresa_id = public.minha_empresa()
    and public.tem_permissao('materiais.criar')
);

create policy materiais_update
on public.materiais
for update to authenticated
using (
    empresa_id = public.minha_empresa()
    and public.tem_permissao('materiais.editar')
)
with check (
    empresa_id = public.minha_empresa()
    and public.tem_permissao('materiais.editar')
);

create policy materiais_delete
on public.materiais
for delete to authenticated
using (
    empresa_id = public.minha_empresa()
    and public.tem_permissao('materiais.excluir')
);


-- ============================================================
-- 14. PRODUÇÃO
-- ============================================================

drop policy if exists producao_select on public.producao;
drop policy if exists producao_insert on public.producao;
drop policy if exists producao_update on public.producao;
drop policy if exists producao_delete on public.producao;

create policy producao_select
on public.producao
for select to authenticated
using (
    empresa_id = public.minha_empresa()
    and public.tem_permissao('producao.ver')
);

create policy producao_insert
on public.producao
for insert to authenticated
with check (
    empresa_id = public.minha_empresa()
    and public.tem_permissao('producao.criar')
);

create policy producao_update
on public.producao
for update to authenticated
using (
    empresa_id = public.minha_empresa()
    and public.tem_permissao('producao.editar')
)
with check (
    empresa_id = public.minha_empresa()
    and public.tem_permissao('producao.editar')
);

create policy producao_delete
on public.producao
for delete to authenticated
using (
    empresa_id = public.minha_empresa()
    and public.tem_permissao('producao.excluir')
);


-- ============================================================
-- 15. FUNCIONÁRIOS
-- ============================================================

drop policy if exists funcionarios_select on public.funcionarios;
drop policy if exists funcionarios_insert on public.funcionarios;
drop policy if exists funcionarios_update on public.funcionarios;
drop policy if exists funcionarios_delete on public.funcionarios;

create policy funcionarios_select
on public.funcionarios
for select to authenticated
using (
    empresa_id = public.minha_empresa()
    and public.tem_permissao('funcionarios.ver')
);

create policy funcionarios_insert
on public.funcionarios
for insert to authenticated
with check (
    empresa_id = public.minha_empresa()
    and public.tem_permissao('funcionarios.criar')
);

create policy funcionarios_update
on public.funcionarios
for update to authenticated
using (
    empresa_id = public.minha_empresa()
    and public.tem_permissao('funcionarios.editar')
)
with check (
    empresa_id = public.minha_empresa()
    and public.tem_permissao('funcionarios.editar')
);

create policy funcionarios_delete
on public.funcionarios
for delete to authenticated
using (
    empresa_id = public.minha_empresa()
    and public.tem_permissao('funcionarios.excluir')
);


-- ============================================================
-- 16. FINANCEIRO
-- ============================================================

drop policy if exists transacoes_select_v6 on public.transacoes;
drop policy if exists transacoes_insert_v6 on public.transacoes;
drop policy if exists transacoes_update_v6 on public.transacoes;
drop policy if exists transacoes_delete_v6 on public.transacoes;

create policy transacoes_select_v6
on public.transacoes
for select to authenticated
using (
    empresa_id = public.minha_empresa()
    and public.tem_permissao('financeiro.ver')
);

create policy transacoes_insert_v6
on public.transacoes
for insert to authenticated
with check (
    empresa_id = public.minha_empresa()
    and public.tem_permissao('financeiro.criar')
);

create policy transacoes_update_v6
on public.transacoes
for update to authenticated
using (
    empresa_id = public.minha_empresa()
    and public.tem_permissao('financeiro.editar')
)
with check (
    empresa_id = public.minha_empresa()
    and public.tem_permissao('financeiro.editar')
);

create policy transacoes_delete_v6
on public.transacoes
for delete to authenticated
using (
    empresa_id = public.minha_empresa()
    and public.tem_permissao('financeiro.excluir')
);


-- ============================================================
-- 17. CONFIGURAÇÕES E CUSTOS OPERACIONAIS
-- ============================================================

drop policy if exists cfg_select on public.config_global;
drop policy if exists cfg_write on public.config_global;

create policy cfg_select
on public.config_global
for select to authenticated
using (
    empresa_id = public.minha_empresa()
    and public.tem_permissao('configuracoes.ver')
);

create policy cfg_write
on public.config_global
for all to authenticated
using (
    empresa_id = public.minha_empresa()
    and public.tem_permissao('configuracoes.editar')
)
with check (
    empresa_id = public.minha_empresa()
    and public.tem_permissao('configuracoes.editar')
);


drop policy if exists custos_select on public.custos_operacionais;
drop policy if exists custos_write on public.custos_operacionais;

create policy custos_select
on public.custos_operacionais
for select to authenticated
using (
    empresa_id = public.minha_empresa()
    and (
        public.tem_permissao('configuracoes.ver')
        or public.tem_permissao('orcamentos.ver_custos')
    )
);

create policy custos_write
on public.custos_operacionais
for all to authenticated
using (
    empresa_id = public.minha_empresa()
    and public.tem_permissao('configuracoes.editar')
)
with check (
    empresa_id = public.minha_empresa()
    and public.tem_permissao('configuracoes.editar')
);


-- ============================================================
-- 18. DOCUMENTOS DO CLIENTE
-- A tabela é protegida por empresa.
-- Storage será refinado na etapa da interface/Edge Function.
-- ============================================================

drop policy if exists cliente_documentos_sel
on public.cliente_documentos;

drop policy if exists cliente_documentos_ins
on public.cliente_documentos;

drop policy if exists cliente_documentos_upd
on public.cliente_documentos;

drop policy if exists cliente_documentos_del
on public.cliente_documentos;

create policy cliente_documentos_sel
on public.cliente_documentos
for select to authenticated
using (
    empresa_id = public.minha_empresa()
    and public.tem_permissao('documentos.ver')
);

create policy cliente_documentos_ins
on public.cliente_documentos
for insert to authenticated
with check (
    empresa_id = public.minha_empresa()
    and public.tem_permissao('documentos.criar')
);

create policy cliente_documentos_upd
on public.cliente_documentos
for update to authenticated
using (
    empresa_id = public.minha_empresa()
    and public.tem_permissao('documentos.criar')
)
with check (
    empresa_id = public.minha_empresa()
    and public.tem_permissao('documentos.criar')
);

create policy cliente_documentos_del
on public.cliente_documentos
for delete to authenticated
using (
    empresa_id = public.minha_empresa()
    and public.tem_permissao('documentos.excluir')
);


-- ============================================================
-- 19. PÓS-VENDA
-- ============================================================

drop policy if exists pos_venda_sel on public.pos_venda;
drop policy if exists pos_venda_ins on public.pos_venda;
drop policy if exists pos_venda_upd on public.pos_venda;
drop policy if exists pos_venda_del on public.pos_venda;

create policy pos_venda_sel
on public.pos_venda
for select to authenticated
using (
    empresa_id = public.minha_empresa()
    and public.tem_permissao('posvenda.ver')
);

create policy pos_venda_ins
on public.pos_venda
for insert to authenticated
with check (
    empresa_id = public.minha_empresa()
    and public.tem_permissao('posvenda.criar')
);

create policy pos_venda_upd
on public.pos_venda
for update to authenticated
using (
    empresa_id = public.minha_empresa()
    and public.tem_permissao('posvenda.editar')
)
with check (
    empresa_id = public.minha_empresa()
    and public.tem_permissao('posvenda.editar')
);

create policy pos_venda_del
on public.pos_venda
for delete to authenticated
using (
    empresa_id = public.minha_empresa()
    and public.tem_permissao('posvenda.excluir')
);


-- ============================================================
-- 19.1 TABELAS AUXILIARES DE ORÇAMENTO
-- ============================================================

-- FUNÇÕES DE MÃO DE OBRA
drop policy if exists mao_obra_funcoes_select on public.mao_obra_funcoes;
drop policy if exists mao_obra_funcoes_insert on public.mao_obra_funcoes;
drop policy if exists mao_obra_funcoes_update on public.mao_obra_funcoes;
drop policy if exists mao_obra_funcoes_delete on public.mao_obra_funcoes;

create policy mao_obra_funcoes_select
on public.mao_obra_funcoes
for select to authenticated
using (
    empresa_id = public.minha_empresa()
    and (
        public.tem_permissao('orcamentos.ver')
        or public.tem_permissao('configuracoes.ver')
    )
);

create policy mao_obra_funcoes_insert
on public.mao_obra_funcoes
for insert to authenticated
with check (
    empresa_id = public.minha_empresa()
    and public.tem_permissao('configuracoes.editar')
);

create policy mao_obra_funcoes_update
on public.mao_obra_funcoes
for update to authenticated
using (
    empresa_id = public.minha_empresa()
    and public.tem_permissao('configuracoes.editar')
)
with check (
    empresa_id = public.minha_empresa()
    and public.tem_permissao('configuracoes.editar')
);

create policy mao_obra_funcoes_delete
on public.mao_obra_funcoes
for delete to authenticated
using (
    empresa_id = public.minha_empresa()
    and public.tem_permissao('configuracoes.editar')
);


-- ORIGENS DE LEAD
drop policy if exists origens_lead_select on public.origens_lead;
drop policy if exists origens_lead_insert on public.origens_lead;
drop policy if exists origens_lead_update on public.origens_lead;
drop policy if exists origens_lead_delete on public.origens_lead;

create policy origens_lead_select
on public.origens_lead
for select to authenticated
using (
    empresa_id = public.minha_empresa()
    and (
        public.tem_permissao('crm.ver')
        or public.tem_permissao('configuracoes.ver')
    )
);

create policy origens_lead_insert
on public.origens_lead
for insert to authenticated
with check (
    empresa_id = public.minha_empresa()
    and public.tem_permissao('configuracoes.editar')
);

create policy origens_lead_update
on public.origens_lead
for update to authenticated
using (
    empresa_id = public.minha_empresa()
    and public.tem_permissao('configuracoes.editar')
)
with check (
    empresa_id = public.minha_empresa()
    and public.tem_permissao('configuracoes.editar')
);

create policy origens_lead_delete
on public.origens_lead
for delete to authenticated
using (
    empresa_id = public.minha_empresa()
    and public.tem_permissao('configuracoes.editar')
);


-- PROJETOS DO ORÇAMENTO
drop policy if exists orcamento_projetos_select on public.orcamento_projetos;
drop policy if exists orcamento_projetos_insert on public.orcamento_projetos;
drop policy if exists orcamento_projetos_update on public.orcamento_projetos;
drop policy if exists orcamento_projetos_delete on public.orcamento_projetos;

create policy orcamento_projetos_select
on public.orcamento_projetos
for select to authenticated
using (
    empresa_id = public.minha_empresa()
    and public.tem_permissao('orcamentos.ver')
);

create policy orcamento_projetos_insert
on public.orcamento_projetos
for insert to authenticated
with check (
    empresa_id = public.minha_empresa()
    and public.tem_permissao('orcamentos.criar')
);

create policy orcamento_projetos_update
on public.orcamento_projetos
for update to authenticated
using (
    empresa_id = public.minha_empresa()
    and public.tem_permissao('orcamentos.editar')
)
with check (
    empresa_id = public.minha_empresa()
    and public.tem_permissao('orcamentos.editar')
);

create policy orcamento_projetos_delete
on public.orcamento_projetos
for delete to authenticated
using (
    empresa_id = public.minha_empresa()
    and public.tem_permissao('orcamentos.excluir')
);


-- MÃO DE OBRA DO ORÇAMENTO
drop policy if exists orcamento_mao_obra_select on public.orcamento_mao_obra;
drop policy if exists orcamento_mao_obra_insert on public.orcamento_mao_obra;
drop policy if exists orcamento_mao_obra_update on public.orcamento_mao_obra;
drop policy if exists orcamento_mao_obra_delete on public.orcamento_mao_obra;

create policy orcamento_mao_obra_select
on public.orcamento_mao_obra
for select to authenticated
using (
    empresa_id = public.minha_empresa()
    and public.tem_permissao('orcamentos.ver_custos')
);

create policy orcamento_mao_obra_insert
on public.orcamento_mao_obra
for insert to authenticated
with check (
    empresa_id = public.minha_empresa()
    and public.tem_permissao('orcamentos.criar')
);

create policy orcamento_mao_obra_update
on public.orcamento_mao_obra
for update to authenticated
using (
    empresa_id = public.minha_empresa()
    and public.tem_permissao('orcamentos.editar')
)
with check (
    empresa_id = public.minha_empresa()
    and public.tem_permissao('orcamentos.editar')
);

create policy orcamento_mao_obra_delete
on public.orcamento_mao_obra
for delete to authenticated
using (
    empresa_id = public.minha_empresa()
    and public.tem_permissao('orcamentos.excluir')
);


-- ============================================================
-- 19.2 RECURSOS AVANÇADOS DO CRM / V7
-- ============================================================

-- MODELOS DE MENSAGEM
drop policy if exists mensagens_modelo_sel on public.mensagens_modelo;
drop policy if exists mensagens_modelo_ins on public.mensagens_modelo;
drop policy if exists mensagens_modelo_upd on public.mensagens_modelo;
drop policy if exists mensagens_modelo_del on public.mensagens_modelo;

create policy mensagens_modelo_sel
on public.mensagens_modelo
for select to authenticated
using (
    empresa_id = public.minha_empresa()
    and public.tem_permissao('crm.ver')
);

create policy mensagens_modelo_ins
on public.mensagens_modelo
for insert to authenticated
with check (
    empresa_id = public.minha_empresa()
    and public.tem_permissao('configuracoes.editar')
);

create policy mensagens_modelo_upd
on public.mensagens_modelo
for update to authenticated
using (
    empresa_id = public.minha_empresa()
    and public.tem_permissao('configuracoes.editar')
)
with check (
    empresa_id = public.minha_empresa()
    and public.tem_permissao('configuracoes.editar')
);

create policy mensagens_modelo_del
on public.mensagens_modelo
for delete to authenticated
using (
    empresa_id = public.minha_empresa()
    and public.tem_permissao('configuracoes.editar')
);


-- AUTOMAÇÕES DO CRM

drop policy if exists automacoes_crm_sel
on public.automacoes_crm;

drop policy if exists automacoes_crm_ins
on public.automacoes_crm;

drop policy if exists automacoes_crm_upd
on public.automacoes_crm;

drop policy if exists automacoes_crm_del
on public.automacoes_crm;


create policy automacoes_crm_sel
on public.automacoes_crm
for select
to authenticated
using (
    empresa_id = public.minha_empresa()
    and public.tem_permissao('crm.ver')
);


create policy automacoes_crm_ins
on public.automacoes_crm
for insert
to authenticated
with check (
    empresa_id = public.minha_empresa()
    and public.tem_permissao('configuracoes.editar')
);


create policy automacoes_crm_upd
on public.automacoes_crm
for update
to authenticated
using (
    empresa_id = public.minha_empresa()
    and public.tem_permissao('configuracoes.editar')
)
with check (
    empresa_id = public.minha_empresa()
    and public.tem_permissao('configuracoes.editar')
);


create policy automacoes_crm_del
on public.automacoes_crm
for delete
to authenticated
using (
    empresa_id = public.minha_empresa()
    and public.tem_permissao('configuracoes.editar')
);


-- VERSÕES DE ORÇAMENTO
drop policy if exists orcamento_versoes_sel on public.orcamento_versoes;
drop policy if exists orcamento_versoes_ins on public.orcamento_versoes;
drop policy if exists orcamento_versoes_upd on public.orcamento_versoes;
drop policy if exists orcamento_versoes_del on public.orcamento_versoes;

create policy orcamento_versoes_sel
on public.orcamento_versoes
for select to authenticated
using (
    empresa_id = public.minha_empresa()
    and public.tem_permissao('orcamentos.ver')
);

create policy orcamento_versoes_ins
on public.orcamento_versoes
for insert to authenticated
with check (
    empresa_id = public.minha_empresa()
    and public.tem_permissao('orcamentos.criar')
);

create policy orcamento_versoes_upd
on public.orcamento_versoes
for update to authenticated
using (
    empresa_id = public.minha_empresa()
    and public.tem_permissao('orcamentos.editar')
)
with check (
    empresa_id = public.minha_empresa()
    and public.tem_permissao('orcamentos.editar')
);

create policy orcamento_versoes_del
on public.orcamento_versoes
for delete to authenticated
using (
    empresa_id = public.minha_empresa()
    and public.tem_permissao('orcamentos.excluir')
);


-- OPÇÕES DE ORÇAMENTO
drop policy if exists orcamento_opcoes_sel on public.orcamento_opcoes;
drop policy if exists orcamento_opcoes_ins on public.orcamento_opcoes;
drop policy if exists orcamento_opcoes_upd on public.orcamento_opcoes;
drop policy if exists orcamento_opcoes_del on public.orcamento_opcoes;

create policy orcamento_opcoes_sel
on public.orcamento_opcoes
for select to authenticated
using (
    empresa_id = public.minha_empresa()
    and public.tem_permissao('orcamentos.ver')
);

create policy orcamento_opcoes_ins
on public.orcamento_opcoes
for insert to authenticated
with check (
    empresa_id = public.minha_empresa()
    and public.tem_permissao('orcamentos.criar')
);

create policy orcamento_opcoes_upd
on public.orcamento_opcoes
for update to authenticated
using (
    empresa_id = public.minha_empresa()
    and public.tem_permissao('orcamentos.editar')
)
with check (
    empresa_id = public.minha_empresa()
    and public.tem_permissao('orcamentos.editar')
);

create policy orcamento_opcoes_del
on public.orcamento_opcoes
for delete to authenticated
using (
    empresa_id = public.minha_empresa()
    and public.tem_permissao('orcamentos.excluir')
);

-- ============================================================
-- 19.3 CUSTOS INTERNOS DOS ORÇAMENTOS
-- ============================================================

-- ITENS / MATERIAIS UTILIZADOS NO ORÇAMENTO

drop policy if exists itens_select
on public.orcamento_itens;

drop policy if exists itens_insert
on public.orcamento_itens;

drop policy if exists itens_update
on public.orcamento_itens;

drop policy if exists itens_delete
on public.orcamento_itens;


create policy itens_select
on public.orcamento_itens
for select
to authenticated
using (
    empresa_id = public.minha_empresa()
    and public.tem_permissao('orcamentos.ver_custos')
);


create policy itens_insert
on public.orcamento_itens
for insert
to authenticated
with check (
    empresa_id = public.minha_empresa()
    and public.tem_permissao('orcamentos.criar')
);


create policy itens_update
on public.orcamento_itens
for update
to authenticated
using (
    empresa_id = public.minha_empresa()
    and public.tem_permissao('orcamentos.editar')
)
with check (
    empresa_id = public.minha_empresa()
    and public.tem_permissao('orcamentos.editar')
);


create policy itens_delete
on public.orcamento_itens
for delete
to authenticated
using (
    empresa_id = public.minha_empresa()
    and public.tem_permissao('orcamentos.excluir')
);


-- CUSTOS ADICIONAIS DO ORÇAMENTO

drop policy if exists custos_orc_select
on public.orcamento_custos;

drop policy if exists custos_orc_insert
on public.orcamento_custos;

drop policy if exists custos_orc_update
on public.orcamento_custos;

drop policy if exists custos_orc_delete
on public.orcamento_custos;


create policy custos_orc_select
on public.orcamento_custos
for select
to authenticated
using (
    empresa_id = public.minha_empresa()
    and public.tem_permissao('orcamentos.ver_custos')
);


create policy custos_orc_insert
on public.orcamento_custos
for insert
to authenticated
with check (
    empresa_id = public.minha_empresa()
    and public.tem_permissao('orcamentos.criar')
);


create policy custos_orc_update
on public.orcamento_custos
for update
to authenticated
using (
    empresa_id = public.minha_empresa()
    and public.tem_permissao('orcamentos.editar')
)
with check (
    empresa_id = public.minha_empresa()
    and public.tem_permissao('orcamentos.editar')
);


create policy custos_orc_delete
on public.orcamento_custos
for delete
to authenticated
using (
    empresa_id = public.minha_empresa()
    and public.tem_permissao('orcamentos.excluir')
);

-- ============================================================
-- CHAPAS MDF E FERRAGENS
-- Proteção das tabelas legadas de materiais
-- ============================================================

drop policy if exists mdf_select on public.chapas_mdf;
drop policy if exists mdf_write on public.chapas_mdf;

create policy mdf_select
on public.chapas_mdf
for select
to authenticated
using (
    empresa_id = public.minha_empresa()
    and public.tem_permissao('materiais.ver')
);

create policy mdf_write
on public.chapas_mdf
for all
to authenticated
using (
    empresa_id = public.minha_empresa()
    and public.tem_permissao('materiais.editar')
)
with check (
    empresa_id = public.minha_empresa()
    and public.tem_permissao('materiais.editar')
);


drop policy if exists ferr_select on public.ferragens;
drop policy if exists ferr_write on public.ferragens;

create policy ferr_select
on public.ferragens
for select
to authenticated
using (
    empresa_id = public.minha_empresa()
    and public.tem_permissao('materiais.ver')
);

create policy ferr_write
on public.ferragens
for all
to authenticated
using (
    empresa_id = public.minha_empresa()
    and public.tem_permissao('materiais.editar')
)
with check (
    empresa_id = public.minha_empresa()
    and public.tem_permissao('materiais.editar')
);

-- ============================================================
-- 20. AUDITORIA
-- ============================================================

drop policy if exists audit_select on public.auditoria;

create policy audit_select
on public.auditoria
for select to authenticated
using (
    empresa_id = public.minha_empresa()
    and public.sou_admin()
);


-- ============================================================
-- 21. GRANTS
-- ============================================================

-- ============================================================
-- GRANTS DO SISTEMA DE PERMISSÕES
-- A autorização individual continua sendo controlada pelo RLS.
-- ============================================================

grant select on public.permissoes to authenticated;

grant select, insert, update, delete
on public.usuario_permissoes
to authenticated;

grant select, update
on public.perfis
to authenticated;


-- CRM / CLIENTES / AGENDA

grant select, insert, update, delete
on public.clientes
to authenticated;

grant select, insert, update, delete
on public.crm_leads
to authenticated;

grant select, insert
on public.crm_interacoes
to authenticated;

grant select, insert, update, delete
on public.crm_tarefas
to authenticated;


-- ORÇAMENTOS

-- A tabela orcamentos possui colunas internas. O SELECT de tabela inteira
-- é removido e apenas as colunas comerciais recebem acesso direto.
revoke select on public.orcamentos from authenticated;

grant select (
    id, empresa_id, lead_id, cliente_id,
    cliente_nome, cliente_cpf, cliente_telefone, cliente_email,
    cliente_cep, cliente_endereco, cliente_numero, cliente_cidade, cliente_uf,
    projeto, ambiente, descricao_cliente, observacoes_internas, observacoes_cliente,
    prazo_entrega_dias, validade_dias, condicoes_pagamento,
    preco_final, status, criado_por, data_criacao, atualizado_em,
    forma_pagamento, numero_parcelas, valor_final_parcelado,
    desconto_percentual, versao_atual, aprovado_em,
    public_token, aceite_nome, aceite_em
) on public.orcamentos to authenticated;

grant insert, update, delete
on public.orcamentos
to authenticated;

grant select, insert, update, delete
on public.orcamento_itens
to authenticated;

grant select, insert, update, delete
on public.orcamento_custos
to authenticated;

grant select, insert, update, delete
on public.orcamento_projetos
to authenticated;

grant select, insert, update, delete
on public.orcamento_mao_obra
to authenticated;

revoke select on public.orcamento_versoes from authenticated;

grant select (
    id, empresa_id, orcamento_id, versao, preco_final, status, criado_em
) on public.orcamento_versoes to authenticated;

grant insert, update, delete
on public.orcamento_versoes
to authenticated;

grant select, insert, update, delete
on public.orcamento_opcoes
to authenticated;


-- MATERIAIS / PRODUÇÃO

grant select, insert, update, delete
on public.materiais
to authenticated;

grant select, insert, update, delete
on public.chapas_mdf
to authenticated;

grant select, insert, update, delete
on public.ferragens
to authenticated;

grant select, insert, update, delete
on public.producao
to authenticated;


-- FUNCIONÁRIOS / FINANCEIRO

grant select, insert, update, delete
on public.funcionarios
to authenticated;

grant select, insert, update, delete
on public.transacoes
to authenticated;


-- CONFIGURAÇÕES

grant select, insert, update, delete
on public.config_global
to authenticated;

grant select, insert, update, delete
on public.custos_operacionais
to authenticated;

grant select, insert, update, delete
on public.mao_obra_funcoes
to authenticated;

grant select, insert, update, delete
on public.origens_lead
to authenticated;

grant select, insert, update, delete
on public.mensagens_modelo
to authenticated;

grant select, insert, update, delete
on public.automacoes_crm
to authenticated;


-- DOCUMENTOS / PÓS-VENDA

grant select, insert, update, delete
on public.cliente_documentos
to authenticated;

grant select, insert, update, delete
on public.pos_venda
to authenticated;


-- AUDITORIA
-- Somente SELECT no nível SQL.
-- O RLS restringe a leitura ao administrador.

grant select
on public.auditoria
to authenticated;

-- ============================================================
-- 22. REGISTRO DA MIGRATION
-- ============================================================

insert into public.sistema_migrations
(versao, descricao)
values (
    '12-v7.3-consolidada',
    'Usuarios, perfis, permissoes, isolamento por empresa e protecao de dados internos de orcamentos'
)
on conflict (versao) do nothing;

commit;