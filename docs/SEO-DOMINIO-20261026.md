# Domínio oficial nos resultados de busca — 26/10/2026

## Diagnóstico verificado

`https://lpnovacristal.vercel.app/` respondia HTTP 200 com a mesma home do domínio oficial. O canonical já indicava `https://www.cristalconsorcios.com.br/`, mas o endereço alternativo continuava servindo uma cópia da página. Não houve acesso ao Search Console para verificar a URL canônica escolhida pelo Google ou a situação específica de seu índice.

## Correção

Uma regra permanente em `vercel.json` redireciona exclusivamente o host `lpnovacristal.vercel.app` para `https://www.cristalconsorcios.com.br`, conservando o caminho e a query string. A Vercel aplica HTTP 308 para esse tipo de regra. Links antigos de artigos, campanhas, quiz e ferramentas chegam à mesma rota no domínio oficial.

A condição usa o nome completo do host, com pontos escapados. O domínio oficial, as URLs de preview e o domínio `.com` ficam fora da regra. A função de cadastro mantém sua configuração. Os HTMLs, scripts do quiz/agradecimento/propostas, estoque, motores e integrações não foram editados nesta correção.

Canonical, OG e sitemap públicos já apontam para o domínio oficial. O robots.txt permanece permitindo que o Google encontre o redirecionamento; não foi acrescentado noindex ao site oficial nem uma solicitação de remoção de resultados.

## Validação

- Teste de configuração: regra restrita ao host antigo, destino/caminho corretos, domínio oficial e previews fora da condição, função de cadastro preservada.
- Teste de preservação: 24 arquivos protegidos comparados com a base; 17 páginas públicas e seus metadados conferidos.
- Após o deployment: conferir home, artigo, caminho de campanha e query string no host antigo; verificar destino sem loop e com canonical correto. Os resultados ao vivo devem ser registrados separadamente da validação local.

## Atualização no Google

O redirecionamento é um sinal forte de domínio preferido, mas não muda imediatamente os resultados já indexados. O Google precisa rastrear novamente os endereços. O responsável pelo Search Console pode inspecionar `https://www.cristalconsorcios.com.br/`, solicitar indexação e conferir o sitemap `https://www.cristalconsorcios.com.br/sitemap.xml`. A solicitação não garante prazo ou exibição imediata.

Não usar a ferramenta de remoção do Google para escolher a URL canônica; isso pode ocultar versões que deveriam continuar aparecendo.

## Referências

- https://vercel.com/docs/routing/redirects#redirect-the-production-vercelapp-hostname
- https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls
- https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl
