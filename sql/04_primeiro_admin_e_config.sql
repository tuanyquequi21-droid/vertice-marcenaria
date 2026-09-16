
-- EXECUTE DEPOIS de criar o primeiro usuário no Supabase Auth.
-- Troque SEU_EMAIL pelo e-mail exato do usuário administrador.
do $$
declare v_empresa uuid; v_user uuid;
begin
 select id into v_user from auth.users where email='SEU_EMAIL' limit 1;
 if v_user is null then raise exception 'Crie o usuário no Auth e altere SEU_EMAIL neste arquivo.'; end if;
 insert into public.empresas(nome) values('Vértice Marcenaria') returning id into v_empresa;
 insert into public.perfis(user_id,empresa_id,nome,papel) values(v_user,v_empresa,'Administrador','admin');
 insert into public.config_global(empresa_id,chave,valor) values
 (v_empresa,'dia_trabalho',250.0),(v_empresa,'luz_hora',4.5),(v_empresa,'agua_hora',1.2),
 (v_empresa,'maquina_depreciacao_hora',3.0),(v_empresa,'parafusos_un',0.15),(v_empresa,'cola_g',0.05),
 (v_empresa,'fita_borda_m',2.50),(v_empresa,'desgaste_serra_corte',0.10),(v_empresa,'gasolina_km',1.80),(v_empresa,'custo_hora_3d',50.0);
insert into public.custos_operacionais(empresa_id,nome,unidade,valor,categoria,incluir_automaticamente,ordem) values
 (v_empresa,'Energia elétrica','hora',4.50,'Estrutura',true,10),
 (v_empresa,'Água','hora',1.20,'Estrutura',true,20),
 (v_empresa,'Depreciação de máquinas','hora',3.00,'Máquinas',true,30),
 (v_empresa,'Parafusos','unidade',0.15,'Insumos',false,40),
 (v_empresa,'Cola','unidade',0.05,'Insumos',false,50),
 (v_empresa,'Fita de borda','metro',2.50,'Insumos',false,60),
 (v_empresa,'Desgaste de serra/corte','unidade',0.10,'Ferramental',false,70),
 (v_empresa,'Gasolina/entrega','km',1.80,'Logística',false,80),
 (v_empresa,'Projeto 3D','hora',50.00,'Projeto',false,90);
end $$;
