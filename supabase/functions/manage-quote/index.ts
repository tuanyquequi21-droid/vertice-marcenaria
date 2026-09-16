import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json"}});
const num=(v:unknown,d=0)=>Number.isFinite(Number(v))?Number(v):d;
const clean=(v:unknown)=>String(v??"").trim();

const BASE:Record<string,string[]>= {
  comercial:["dashboard.ver","crm.ver","crm.criar","crm.editar","clientes.ver","clientes.criar","clientes.editar","orcamentos.ver","orcamentos.criar","orcamentos.editar","agenda.ver","agenda.criar","agenda.editar"],
  producao:["dashboard.ver","clientes.ver","agenda.ver","agenda.editar","producao.ver","producao.criar","producao.editar","materiais.ver"],
  financeiro:["dashboard.ver","clientes.ver","financeiro.ver","financeiro.criar","financeiro.editar","relatorios.ver"], personalizado:[]
};

Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(req.method!=="POST")return json({error:"Método não permitido."},405);
 try{
  const url=Deno.env.get("SUPABASE_URL")!, anon=Deno.env.get("SUPABASE_ANON_KEY")!, service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const auth=req.headers.get("Authorization")||""; if(!auth.startsWith("Bearer "))return json({error:"Não autenticado."},401);
  const token=auth.slice(7);
  const userClient=createClient(url,anon,{global:{headers:{Authorization:`Bearer ${token}`}}});
  const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:ud,error:ue}=await userClient.auth.getUser(token); if(ue||!ud.user)return json({error:"Sessão inválida."},401);
  const uid=ud.user.id;
  const {data:profile,error:pe}=await admin.from("perfis").select("user_id,empresa_id,papel,ativo").eq("user_id",uid).single();
  if(pe||!profile||!profile.ativo)return json({error:"Usuário sem perfil ativo."},403);
  const {data:ovs}=await admin.from("usuario_permissoes").select("permissao_codigo,permitido").eq("user_id",uid);
  const overrides=new Map((ovs||[]).map((x:any)=>[x.permissao_codigo,!!x.permitido]));
  const can=(code:string)=>profile.papel==="admin"?true:(overrides.has(code)?overrides.get(code)!:(BASE[profile.papel]||[]).includes(code));
  const body=await req.json().catch(()=>({})); const action=body.action||"catalog";

  if(action==="catalog"){
   if(!can("orcamentos.ver"))return json({error:"Sem permissão para visualizar orçamentos."},403);
   const [mr,fr,er]=await Promise.all([
    admin.from("materiais").select("id,nome,categoria,unidade,ativo").eq("empresa_id",profile.empresa_id).eq("ativo",true).order("nome"),
    admin.from("mao_obra_funcoes").select("id,nome,unidade,ativo").eq("empresa_id",profile.empresa_id).eq("ativo",true).order("nome"),
    admin.from("funcionarios").select("id,nome,funcao_id,ativo").eq("empresa_id",profile.empresa_id).eq("ativo",true).order("nome")
   ]);
   let detail:any={projects:[],materials:[],labor:[]};
   const qid=num(body.quote_id,0);
   if(qid){
    const {data:q}=await admin.from("orcamentos").select("id").eq("id",qid).eq("empresa_id",profile.empresa_id).maybeSingle();
    if(!q)return json({error:"Orçamento não encontrado."},404);
    const [pr,ir,lr]=await Promise.all([
     admin.from("orcamento_projetos").select("nome,descricao_cliente,ordem").eq("orcamento_id",qid).eq("empresa_id",profile.empresa_id).order("ordem"),
     admin.from("orcamento_itens").select("material_id,quantidade,unidade").eq("orcamento_id",qid).eq("empresa_id",profile.empresa_id),
     admin.from("orcamento_mao_obra").select("funcionario_id,funcao_id,unidade,quantidade_pessoas,quantidade_tempo").eq("orcamento_id",qid).eq("empresa_id",profile.empresa_id)
    ]);
    detail={projects:pr.data||[],materials:ir.data||[],labor:lr.data||[]};
   }
   return json({materials:mr.data||[],functions:fr.data||[],employees:er.data||[],detail});
  }

  if(action!=="preview"&&action!=="save")return json({error:"Ação inválida."},400);
  const qid=num(body.quote_id,0), editing=qid>0;
  if(!can(editing?"orcamentos.editar":"orcamentos.criar"))return json({error:"Sem permissão para salvar este orçamento."},403);
  const projects=Array.isArray(body.projects)?body.projects.filter((x:any)=>clean(x.nome)):[]; if(!projects.length)return json({error:"Inclua pelo menos um projeto."},400);
  const mats=Array.isArray(body.materials)?body.materials:[], labs=Array.isArray(body.labor)?body.labor:[];
  const matIds=[...new Set(mats.map((x:any)=>num(x.material_id)).filter(Boolean))];
  const funIds=[...new Set(labs.map((x:any)=>num(x.funcao_id)).filter(Boolean))];
  const [mr,fr]=await Promise.all([
   matIds.length?admin.from("materiais").select("id,nome,categoria,unidade,preco_custo").eq("empresa_id",profile.empresa_id).in("id",matIds):Promise.resolve({data:[],error:null}),
   funIds.length?admin.from("mao_obra_funcoes").select("id,nome,unidade,valor").eq("empresa_id",profile.empresa_id).in("id",funIds):Promise.resolve({data:[],error:null})
  ]);
  if((mr as any).error||(fr as any).error)return json({error:"Não foi possível consultar os custos internos."},500);
  const matMap=new Map(((mr as any).data||[]).map((x:any)=>[Number(x.id),x])), funMap=new Map(((fr as any).data||[]).map((x:any)=>[Number(x.id),x]));
  let materiais=0,mao=0;
  const matRows=mats.map((x:any)=>{const m:any=matMap.get(num(x.material_id));if(!m)return null;const q=Math.max(0,num(x.quantidade));const p=num(m.preco_custo);materiais+=q*p;return{empresa_id:profile.empresa_id,tipo:"Material",descricao:m.nome,material_id:m.id,nome_material:m.nome,categoria_material:m.categoria||"",unidade:m.unidade||"unidade",quantidade:q,valor_unitario:p,subtotal:q*p};}).filter(Boolean);
  const labRows=labs.map((x:any)=>{const f:any=funMap.get(num(x.funcao_id));if(!f)return null;const pe=Math.max(1,num(x.quantidade_pessoas,1)),t=Math.max(0,num(x.quantidade_tempo));const p=num(f.valor);mao+=pe*t*p;return{empresa_id:profile.empresa_id,funcionario_id:num(x.funcionario_id)||null,funcionario_nome:clean(x.funcionario_nome),funcao_id:f.id,funcao_nome:f.nome,unidade:f.unidade,quantidade_pessoas:pe,quantidade_tempo:t,valor_unitario:p,subtotal:pe*t*p};}).filter(Boolean);
  let old:any=null;if(editing){const r=await admin.from("orcamentos").select("*").eq("id",qid).eq("empresa_id",profile.empresa_id).single();if(r.error)return json({error:"Orçamento não encontrado."},404);old=r.data;}
  const margem=can("orcamentos.alterar_margem")?Math.max(0,num(body.margem,old?.margem_lucro??30)):num(old?.margem_lucro,30);
  const mont=can("orcamentos.ver_custos")?Math.max(0,num(body.montagem,old?.valor_montagem||0)):num(old?.valor_montagem,0);
  const frete=can("orcamentos.ver_custos")?Math.max(0,num(body.frete,old?.detalhes_calculo?.freteCliente||0)):num(old?.detalhes_calculo?.freteCliente,0);
  const op=can("orcamentos.ver_custos")?Math.max(0,num(body.outros,old?.detalhes_calculo?.operacionais||0)):num(old?.detalhes_calculo?.operacionais,0);
  const custo=materiais+mao+mont+frete+op, m=margem/100, avista=m<1?custo/(1-m):custo;
  const pay=clean(body.forma_pagamento)||old?.forma_pagamento||"Pix", parc=Math.max(1,Math.round(num(body.numero_parcelas,old?.numero_parcelas||1)));
  const taxa=can("orcamentos.ver_custos")?Math.max(0,num(body.taxa,old?.taxa_parcelamento??9)):num(old?.taxa_parcelamento,9);
  const valorTaxa=(pay==="Parcelado"&&parc>1)?avista*(taxa/100):0, final=avista+valorTaxa, lucro=avista-custo;
  if(action==="preview")return json({preco_final:final,numero_parcelas:parc,valor_parcela:final/parc,forma_pagamento:pay});
  const p:any={empresa_id:profile.empresa_id,lead_id:num(body.lead_id)||old?.lead_id||null,cliente_nome:clean(body.cliente_nome),cliente_cpf:clean(body.cliente_cpf),cliente_telefone:clean(body.cliente_telefone),cliente_email:clean(body.cliente_email),cliente_cep:clean(body.cliente_cep),cliente_endereco:clean(body.cliente_endereco),cliente_numero:clean(body.cliente_numero),cliente_cidade:clean(body.cliente_cidade),cliente_uf:clean(body.cliente_uf).toUpperCase(),projeto:projects.map((x:any)=>clean(x.nome)).join(" + "),observacoes_internas:clean(body.observacoes_internas),observacoes_cliente:clean(body.observacoes_cliente),valor_montagem:mont,prazo_entrega_dias:num(body.prazo_entrega_dias)||null,validade_dias:num(body.validade_dias,15),custo_producao:custo,valor_sem_margem:custo,valor_antes_parcelamento:avista,valor_lucro:lucro,preco_final:final,valor_final_parcelado:final,reinvestimento_materials:materiais,margem_lucro:margem,forma_pagamento:pay,numero_parcelas:parc,taxa_parcelamento:taxa,condicoes_pagamento:pay==="Parcelado"?`${parc}x de ${(final/parc).toFixed(2)}`:pay,detalhes_calculo:{materiais,maoObra:mao,freteCliente:frete,operacionais:op,valorTaxa,lucro}};
  const qr=editing?await admin.from("orcamentos").update(p).eq("id",qid).eq("empresa_id",profile.empresa_id).select("id,preco_final,status").single():await admin.from("orcamentos").insert({...p,status:"Rascunho"}).select("id,preco_final,status").single();
  if(qr.error)return json({error:qr.error.message},400);const oid=qr.data.id;
  await Promise.all([admin.from("orcamento_itens").delete().eq("orcamento_id",oid).eq("empresa_id",profile.empresa_id),admin.from("orcamento_mao_obra").delete().eq("orcamento_id",oid).eq("empresa_id",profile.empresa_id),admin.from("orcamento_projetos").delete().eq("orcamento_id",oid).eq("empresa_id",profile.empresa_id)]);
  if(projects.length){const r=await admin.from("orcamento_projetos").insert(projects.map((x:any,i:number)=>({empresa_id:profile.empresa_id,orcamento_id:oid,nome:clean(x.nome),descricao_cliente:clean(x.descricao_cliente),ordem:i})));if(r.error)return json({error:r.error.message},400)}
  if(matRows.length){const r=await admin.from("orcamento_itens").insert(matRows.map((x:any)=>({...x,orcamento_id:oid})));if(r.error)return json({error:r.error.message},400)}
  if(labRows.length){const r=await admin.from("orcamento_mao_obra").insert(labRows.map((x:any)=>({...x,orcamento_id:oid})));if(r.error)return json({error:r.error.message},400)}
  return json({id:oid,preco_final:qr.data.preco_final,status:qr.data.status});
 }catch(e){console.error(e);return json({error:e instanceof Error?e.message:"Erro interno."},500)}
});
