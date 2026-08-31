# Vértice Marcenaria — versão HTML + Supabase

Aplicação estática em HTML/CSS/JavaScript, sem Flask, Python ou banco local. O frontend pode ser versionado e hospedado pelo GitHub Pages; os dados ficam no Supabase.

## 1. Supabase

1. Abra o SQL Editor do seu projeto.
2. Execute `schema.sql`.
3. Em Authentication > Users, crie o usuário que entrará no sistema.
4. Copie a URL e a chave anon/publishable do projeto.
5. Abra `assets/config.js` e substitua os dois placeholders.

**Nunca coloque a chave `service_role` no HTML/JavaScript.**

## 2. Rodar localmente

Como o navegador pode bloquear módulos/arquivos locais, use um servidor simples:

```bash
python -m http.server 8000
```

Depois abra `http://localhost:8000`.

## 3. GitHub Pages

No GitHub: Settings > Pages > Deploy from a branch > `main` > `/ (root)`.

## 4. Estrutura

- `index.html`: aplicação inteira.
- `assets/style.css`: identidade visual responsiva.
- `assets/app.js`: autenticação, CRUD e cálculo dos orçamentos.
- `assets/config.js`: somente URL e chave pública do Supabase.
- `schema.sql`: tabelas e políticas RLS.
