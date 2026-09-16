
window.VerticeScore={
 calc(l){let s=0;s+=l.projeto_definido?10:0;s+=l.possui_medidas?10:0;s+=l.imovel_disponivel?10:0;s+=l.prazo_definido?10:0;s+=l.investimento_compativel?20:0;s+=l.solicitou_orcamento?15:0;s+=l.aceitou_medicao?15:0;s+=l.responde_contatos?10:0;s-=l.somente_pesquisa_preco?10:0;return Math.max(0,Math.min(100,s))},
 label(s){return s>=70?"Quente":s>=40?"Morno":"Frio"}
};
