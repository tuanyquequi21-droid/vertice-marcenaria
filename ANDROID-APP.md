# Vértice Gestão — aplicativo Android

Este repositório gera um APK Android instalável que abre o Gestão dentro de uma WebView nativa (não encaminha para o Chrome).

## Gerar o APK de teste

1. Abra a aba **Actions** deste repositório no GitHub.
2. Selecione **Build Vértice Gestão APK**.
3. Clique em **Run workflow** e confirme.
4. Quando a execução terminar com sucesso, abra a execução e baixe o artefato **vertice-gestao-android-apk**.
5. Extraia o ZIP e instale o arquivo `app-debug.apk` no Android.

O aplicativo carrega `https://gestao.verticemarcenaria.com.br` dentro dele e precisa de internet para acessar o Gestão e o Supabase. As telas e dados continuam sendo os mesmos do sistema hospedado; atualizações publicadas no Gestão aparecem no app sem precisar gerar outro APK. Uma nova versão do APK será necessária para alterar o invólucro Android, permissões ou identidade visual nativa.

Este primeiro build usa ícone provisório com a letra V. O ícone oficial pode ser aplicado quando o arquivo original da marca estiver disponível no repositório.
