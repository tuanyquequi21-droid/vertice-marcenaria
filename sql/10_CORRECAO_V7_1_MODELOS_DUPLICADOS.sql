-- Vértice CRM V7.1 — correção de modelos de mensagem duplicados
-- Execute SOMENTE após o 09 da V7.
-- Preserva o registro mais antigo de cada modelo (empresa + canal + nome).
-- Modelos com nomes diferentes, inclusive personalizados, são preservados.

begin;

with ranked as (
  select id,
         row_number() over (
           partition by empresa_id, lower(trim(canal)), lower(trim(nome))
           order by id
         ) as rn
  from public.mensagens_modelo
)
delete from public.mensagens_modelo m
using ranked r
where m.id=r.id and r.rn>1;

create unique index if not exists mensagens_modelo_empresa_canal_nome_unique
on public.mensagens_modelo (
  empresa_id,
  lower(trim(canal)),
  lower(trim(nome))
);

commit;
