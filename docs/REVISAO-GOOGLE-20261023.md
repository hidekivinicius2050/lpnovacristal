# Revisão do site principal / Google — 23/10/2026

## Estado da entrega

Implementação preparada na branch `revisao-site-google-20261023`, a partir de `33376dc`. A revisão inicial ficou somente local. Em 23/10/2026 o usuário autorizou a publicação e, depois, a criação da integração Upstash exclusivamente em plano gratuito. Nenhuma alteração de domínio ou DNS faz parte desta entrega.

O contêiner `GTM-WLHD5Q2F` foi encontrado no HTML público do site antigo. Depois, o usuário informou que o responsável pelo Google indicou o arquivo `Contêiner Padrão.json` como a referência correta. A configuração usa o ID desse arquivo, `GTM-K3R4J649`, e seus nomes de eventos. Após a autorização de publicação, `gtmEnabled` foi habilitado, com carregamento restrito ao host oficial e à aceitação explícita dos cookies opcionais. O script público do Google respondeu 200 e contém os IDs/eventos esperados; isso não comprova recebimento de conversão nas contas. O JSON original não foi alterado ou importado em uma conta do GTM. O CRM pertence exclusivamente ao Facebook/quiz e não recebe leads do formulário do Google.

## Alterações para revisar

- Home com título, descrição, H1, primeiro parágrafo e H2 sobre carta contemplada em Brasília. Visual e imagens existentes preservados.
- Páginas `/carta-contemplada-imovel/` e `/carta-contemplada-veiculo/`, com catálogo fixado no respectivo tipo, filtros existentes e metadados próprios.
- CTAs comerciais abrem um formulário de nome e WhatsApp; o campo de interesse aparece apenas quando o tipo não está definido. O contexto da carta acompanha o contato. Os resultados dos simuladores mantêm o resumo do cenário, sem alterar seus motores.
- O formulário envia para `/api/leads`, que usa somente o Apps Script da planilha já existente no site principal. O CRM do Facebook não é chamado. O WhatsApp abre na mesma aba somente após confirmação positiva do cadastro. Falhas mantêm os campos preenchidos e não geram conversão de sucesso.
- Identificador de tentativa, bloqueio de envios simultâneos e registro durável por destino evitam reenvios automáticos quando um provedor já confirmou o cadastro. Resposta incerta exige conferência, em vez de tentar novamente às cegas.
- UTMs, inclusive `utm_content`, e identificadores de clique acompanham o cadastro. Landing page e referrer são guardados sem query string. Os eventos comuns do formulário não levam nome, telefone, resumo financeiro ou identificadores de contato.
- Eventos preparados conforme os acionadores do JSON: `open_form`, `form_start` e `form_submit`, com `form_name` e `page_type`. O acionador `form_start` dispara uma tag que envia `start_form` ao GA4; são nomes em etapas diferentes, portanto o site deve emitir `form_start`. O campo interno `form_nome` enviado à planilha permanece compatível com o cadastro; somente o parâmetro de analytics passa a `form_name`.
- `tracking-consent.js` inicia o consentimento como negado e carrega o GTM somente após aceite dos cookies opcionais. A escolha fica registrada por até 180 dias e pode ser revista no rodapé. A recusa não bloqueia catálogo, formulário ou WhatsApp. O módulo é excluído das rotas protegidas do Facebook e das propostas.
- O aviso antigo que apresentava somente “Entendi” foi removido do site principal para não duplicar a escolha de cookies. Preferências antigas desse aviso não são tratadas como aceite de análise ou publicidade.
- Canonical, OG, schema, sitemap e robots das páginas públicas revisadas usam `https://www.cristalconsorcios.com.br`. Schema consolidado com empresa/serviço financeiro, WebSite, WebPage, serviços, breadcrumbs e FAQ correspondente ao texto visível. Sem AggregateRating do próprio negócio.
- Menu e rodapé públicos passam a destacar imóvel e veículo; o simulador avançado continua acessível por URL. Preload do hero, dimensões das imagens, lazy loading abaixo da dobra, ícone Apple, foco visível e formulário responsivo acrescentados.
- Política de Privacidade e Termos de Uso locais, com links no rodapé. Textos baseados nas páginas públicas existentes e ajustados ao fluxo implementado.
- O gerador de conteúdo também gera as novas páginas. A execução repetida produziu arquivos idênticos.

## Arquivos principais

- Fluxo de contato: `lead-config.js`, `lead-capture.js`, `tracking-consent.js`, `api/leads.js`, `commercial.css`, integração pontual em `app.js` e duração da função em `vercel.json`.
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
- `node scripts/test-google-site.js`: preservação dos 24 arquivos, 17 rotas públicas, canonical, FAQ/schema, rotas por tipo, ID/eventos do GTM e módulo de consentimento.
- `node scripts/test-tracking-consent.js`: nenhum carregamento antes do aceite ou após recusa, carregamento único, revogação, escolha lembrada/expirada, hosts de revisão sem requisições ao Google e exclusão das rotas protegidas.
- Testes existentes `scripts/test-simulator.js` e `scripts/test-leverage-simulator.js`: passaram; alavancagem com 31/31 cenários.
- Geração repetida: 21 arquivos gerados idênticos entre execuções consecutivas.
- Navegador: home, imóvel, veículo, privacidade, filtros combinados, contexto de carta, formulário genérico e abertura pelo simulador. Eventos locais de visualização/início/sucesso observados em ordem, uma vez por envio bem-sucedido; falha sem evento de sucesso.
- Fluxo de sucesso com respostas simuladas: cadastro confirmado pela API local antes da navegação para a página do WhatsApp. Nenhuma mensagem enviada. Fluxo de falha simulado: permanece na página e preserva os campos.
- Viewport 390 × 844: sem rolagem horizontal; formulário e botão dentro da área visível; menu móvel abre e fecha. Não equivale a teste do teclado em um aparelho físico.
- `git diff --check` e verificação de sintaxe dos arquivos JS.

## Integrações configuradas para publicação

- Upstash `cristal-leads-journal`: plano Free, 500.000 comandos mensais, região iad1, eviction desativada. Integração criada após autorização expressa dos termos e da restrição ao plano gratuito.
- Projeto `lpnovacristal`: variáveis secretas `KV_REST_API_URL` e `KV_REST_API_TOKEN` vinculadas automaticamente aos ambientes Production e Preview. Nenhum valor de segredo foi exibido, copiado ou salvo localmente.
- Teste técnico único no Apps Script existente: telefone fictício, nome identificado como teste, resposta HTTP 200 `{"ok":true}`. A leitura das colunas da planilha não foi realizada; o teste verifica a confirmação do endpoint, não a retenção de cada campo.
- Prévia hospedada `https://lpnovacristal-96gbaygly-vinicius-projects-da14f17f.vercel.app/`, commit `549720b`: Vercel Ready. Um formulário identificado como `TESTE TECNICO CRISTAL PREVIA - IGNORAR`, com telefone fictício, confirmou o cadastro usando a API e o banco reais, depois navegou à página do WhatsApp da Cristal. Nenhuma mensagem foi enviada. As tags do Google não carregam no host de preview.

## Verificações externas que permanecem necessárias

1. Revisar as tags antes de ativar o contêiner indicado pelo responsável. O arquivo define `GTM-K3R4J649`, GA4 `G-TGY8ZMWK6T`, Ads `AW-17534137999` e rótulo `JQHtCKzi95QbEI_t9qhB`. Seu nome cadastrado é `[WEB] rodriguesrefrigeracaomk.com.br/geladeiras`; a indicação do arquivo veio do responsável, relatada pelo usuário, e não equivale à verificação do vínculo dessas contas ou da versão publicada. Há ajustes concretos: a tag GA4 de `form_submit` mapeia `utm_content` para `UTM - Campaign` (deve usar `UTM - Content`) e inclui `lead_nome` entre parâmetros comuns do GA4 (remover esse mapeamento; o site não envia nome/telefone aos eventos). O JSON também contém Consent Mode com estado padrão negado e espera a chave local `consent_v1`: esse fluxo deve ser validado, sem conceder consentimento automaticamente. Ativação depende de `gtmEnabled` e dos hosts autorizados em `lead-config.js`.
2. Acompanhar o consumo do plano gratuito e conferir as variáveis em futuros deployments. Sem o armazenamento, a API responde 503 e não libera o WhatsApp. Não inserir credenciais em chat, código ou Git.
3. Conferir na planilha as colunas de contexto, UTMs e IDs de clique. O endpoint real já confirmou o teste técnico com `ok:true`; essa confirmação não demonstra que todos os campos adicionais foram retidos. Não é necessário envolver o CRM do Facebook, seu funil ou suas automações para testar o formulário do Google.
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
