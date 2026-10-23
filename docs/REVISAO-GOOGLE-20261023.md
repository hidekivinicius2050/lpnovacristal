# Revisão do site principal / Google — 23/10/2026

## Estado da entrega

Implementação local na branch `revisao-site-google-20261023`, a partir de `33376dc`. Não houve push, merge, deploy, alteração de domínio ou DNS. A produção continua independente desta revisão.

O contêiner `GTM-WLHD5Q2F` foi encontrado no HTML público do site antigo. Sua ativação continua pendente da confirmação do responsável pelo Google. `lead-config.js` mantém `gtmEnabled: false`. O JSON recebido identifica `GTM-K3R4J649` e outro negócio; não foi importado. Correção de escopo confirmada pelo usuário: o CRM pertence exclusivamente ao Facebook/quiz e não recebe leads do formulário do Google.

## Alterações para revisar

- Home com título, descrição, H1, primeiro parágrafo e H2 sobre carta contemplada em Brasília. Visual e imagens existentes preservados.
- Páginas `/carta-contemplada-imovel/` e `/carta-contemplada-veiculo/`, com catálogo fixado no respectivo tipo, filtros existentes e metadados próprios.
- CTAs comerciais abrem um formulário de nome e WhatsApp; o campo de interesse aparece apenas quando o tipo não está definido. O contexto da carta acompanha o contato. Os resultados dos simuladores mantêm o resumo do cenário, sem alterar seus motores.
- O formulário envia para `/api/leads`, que usa somente o Apps Script da planilha já existente no site principal. O CRM do Facebook não é chamado. O WhatsApp abre na mesma aba somente após confirmação positiva do cadastro. Falhas mantêm os campos preenchidos e não geram conversão de sucesso.
- Identificador de tentativa, bloqueio de envios simultâneos e registro durável por destino evitam reenvios automáticos quando um provedor já confirmou o cadastro. Resposta incerta exige conferência, em vez de tentar novamente às cegas.
- UTMs, inclusive `utm_content`, e identificadores de clique acompanham o cadastro. Landing page e referrer são guardados sem query string. Os eventos comuns do formulário não levam nome, telefone, resumo financeiro ou identificadores de contato.
- Eventos preparados: `form_visto`, `form_iniciado` e `lead_enviado`, com `form_nome` e `page_type`. O JSON recebido usa outros nomes (`open_form`, `form_start`, `form_submit`, `form_name`); o responsável deve validar o contrato de eventos antes de ativar o GTM.
- Canonical, OG, schema, sitemap e robots das páginas públicas revisadas usam `https://www.cristalconsorcios.com.br`. Schema consolidado com empresa/serviço financeiro, WebSite, WebPage, serviços, breadcrumbs e FAQ correspondente ao texto visível. Sem AggregateRating do próprio negócio.
- Menu e rodapé públicos passam a destacar imóvel e veículo; o simulador avançado continua acessível por URL. Preload do hero, dimensões das imagens, lazy loading abaixo da dobra, ícone Apple, foco visível e formulário responsivo acrescentados.
- Política de Privacidade e Termos de Uso locais, com links no rodapé. Textos baseados nas páginas públicas existentes e ajustados ao fluxo implementado.
- O gerador de conteúdo também gera as novas páginas. A execução repetida produziu arquivos idênticos.

## Arquivos principais

- Fluxo de contato: `lead-config.js`, `lead-capture.js`, `api/leads.js`, `commercial.css`, integração pontual em `app.js` e duração da função em `vercel.json`.
- Páginas: `index.html`, novas pastas de imóvel/veículo/privacidade/termos, metadados e navegação de `simulador/index.html`, hub, artigos e 404.
- Geração e dados institucionais: `company-data.js`, `scripts/public-site.js`, `scripts/prepare-google-site.js`, `scripts/generate-content.js`, `assets/image-sizes.json`, `assets/apple-touch-icon.png`.
- Descoberta: `robots.txt`, `sitemap.xml`, `llms.txt`.
- Verificação e prévia: `scripts/validate-content.js`, `scripts/test-google-site.js`, `scripts/test-lead-api.js`, `scripts/serve-review.js`.

## Preservação conferida

O teste compara 24 arquivos protegidos com a base `33376dc`: quiz, agradecimento, propostas, catálogo, dados de artigos, stylesheet original e arquivos dos motores/controles do simulador. Texto é comparado normalizando somente CRLF/LF; binários são comparados por SHA-256 exato.

O quiz do Facebook conserva perguntas, e-mail, tags, contêiner, parâmetros, CRM, vídeos e redirecionamento. O gerador de propostas e seus dois modelos não foram editados. `data/cartas.json` e a integração com Excel não foram alterados: permanecem 502 cartas do catálogo publicado em 15/10/2026, sem afirmar atualização de estoque nesta entrega.

Nenhuma regra do domínio `.com`, redirect, migração ou mudança de DNS foi acrescentada. Essas ações permanecem com o responsável pelo Google. A política de rastreamento de quiz/agradecimento também foi preservada; eles não foram acrescentados ao sitemap.

## Verificações realizadas

- `node scripts/test-lead-api.js`: validação, contexto e atribuição, destino exclusivo Apps Script, reenvio após rejeição explícita, duplicidade, concorrência, quarentena de resposta incerta e falta de configuração. Nenhum lead real enviado.
- `node scripts/validate-content.js`: 10 artigos e 18 HTMLs, dados cadastrais, links locais, metadados, schema e sitemap.
- `node scripts/test-google-site.js`: preservação dos 24 arquivos, 17 rotas públicas, canonical, FAQ/schema, rotas por tipo e GTM desativado.
- Testes existentes `scripts/test-simulator.js` e `scripts/test-leverage-simulator.js`: passaram; alavancagem com 31/31 cenários.
- Geração repetida: 21 arquivos gerados idênticos entre execuções consecutivas.
- Navegador: home, imóvel, veículo, privacidade, filtros combinados, contexto de carta, formulário genérico e abertura pelo simulador. Eventos locais de visualização/início/sucesso observados em ordem, uma vez por envio bem-sucedido; falha sem evento de sucesso.
- Fluxo de sucesso com respostas simuladas: cadastro confirmado pela API local antes da navegação para a página do WhatsApp. Nenhuma mensagem enviada. Fluxo de falha simulado: permanece na página e preserva os campos.
- Viewport 390 × 844: sem rolagem horizontal; formulário e botão dentro da área visível; menu móvel abre e fecha. Não equivale a teste do teclado em um aparelho físico.
- `git diff --check` e verificação de sintaxe dos arquivos JS.

## Pendências reais antes de publicar

1. Confirmar com o responsável o contêiner e o contrato de eventos/tags. Os IDs de GA4/Ads do JSON de outro negócio não podem ser reaproveitados. Ativação depende de `gtmEnabled` e dos hosts autorizados em `lead-config.js`.
2. Configurar armazenamento durável compatível com Redis REST no hosting, pelas variáveis secretas `KV_REST_API_URL` e `KV_REST_API_TOKEN`. Nenhum recurso foi provisionado. Sem essas variáveis, a API responde 503 e não libera o WhatsApp. Não inserir credenciais em chat, código ou Git.
3. Fazer um envio real autorizado em ambiente de revisão: conferir somente a planilha/Apps Script do site principal, formato de confirmação, contexto, UTMs e IDs de clique. Os testes atuais simulam a resposta; não demonstram que o destino real aceita ou guarda todos os campos. Não é necessário envolver o CRM do Facebook, seu funil ou suas automações para testar o formulário do Google.
4. Em resposta incerta (`REVIEW_REQUIRED`), conferir o cadastro nos destinos antes de resolver o registro técnico da tentativa. Não apagar o registro e reenviar sem essa conferência.
5. Validar Tag Assistant, GA4 DebugView e conversão do Google Ads no ambiente de revisão. Exportação/importação de conversões offline e conversões avançadas dependem da integração externa e não foram ativadas. Nome/telefone não são enviados nos eventos comuns de análise.
6. Executar Lighthouse mobile e Rich Results Test no preview hospedado. Não há pontuação externa comprovada nesta entrega; o schema foi analisado localmente. Conferir também teclado e envio em celular físico.
7. Confirmar coordenadas, horário de sábado e perfis sociais antes de acrescentá-los. Esses dados não foram inventados. Conteúdo jurídico deve ser aprovado pela empresa antes da publicação.

As buscas por URLs antigas e WhatsApp foram limitadas às páginas públicas alteradas. Os arquivos protegidos, testes e lógica de migração podem conservar strings antigas; não foi aplicada substituição indiscriminada ao repositório.

## Reabrir a prévia local com envios simulados

No PowerShell, a partir da pasta do repositório:

```powershell
$env:PORT='4187'
$env:CRISTAL_PREVIEW_SIMULATE='1'
& "$env:USERPROFILE\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" scripts/serve-review.js
```

Abra `http://127.0.0.1:4187/`. Para revisar falha, use também `$env:CRISTAL_PREVIEW_OUTCOME='failure'` antes de iniciar. Esse modo é exclusivo do servidor local: não envia contatos a serviços externos. Use apenas dados fictícios; o sucesso abre a página do WhatsApp com a mensagem preparada, sem enviá-la. Encerre com Ctrl+C. Os servidores usados nos testes foram encerrados ao concluir a revisão.

## Referências utilizadas

- Briefing local `briefing-cristal-consorcios-site-novo.md`, limitado às decisões autorizadas sobre site principal/Google.
- HTML do site antigo: https://cristalconsorcios.com/ — comprova a presença do contêiner, não a configuração das tags publicadas.
- Fontes dos textos institucionais: https://cristalconsorcios.com/politica-de-privacidade e https://cristalconsorcios.com/termos-de-uso, além dos dados visíveis já presentes no repositório.
- Redis REST: https://upstash.com/docs/redis/features/restapi.
- Política de dados pessoais em Analytics: https://support.google.com/analytics/answer/6366371?hl=pt-BR.
