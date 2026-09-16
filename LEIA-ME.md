# Vértice Gestão V3
Versão revisada do CRM integrado ao orçamento da Vértice.

O módulo de orçamento mantém a lógica central do sistema anterior e acrescenta:
- dias de trabalho;
- quantidade de pessoas;
- valor diário por pessoa;
- custo de montagem;
- custos operacionais cadastráveis/editáveis;
- dados completos do cliente;
- informações comerciais;
- impressão limpa para o cliente sem custos internos;
- vínculo do orçamento com lead e histórico do CRM.

Segurança: Supabase Auth + RLS + empresa/perfil. O frontend usa somente Publishable Key.


## V3.1
- editar orçamento salvo e recalcular após correções;
- excluir orçamento com confirmação;
- máscara automática de CPF, CEP e telefone/celular;
- preenchimento automático de endereço pelo CEP via ViaCEP;
- preenchimento manual continua disponível.
