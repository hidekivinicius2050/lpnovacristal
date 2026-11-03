# Manutenção de segurança — 03/11/2026

## Escopo preservado

Quiz, agradecimento, CRM de campanha e GTM dessas páginas não foram editados. Cabeçalhos Vercel estão limitados a rotas explícitas, sem uma regra global. A CSP é somente Report-Only: precisa de verificação no navegador em preview antes de eventual aplicação efetiva. Não foram alterados cálculos financeiros ou propostas.

## Destino escolhido pelo usuário: CRM do quiz

O usuário autorizou enviar os contatos do formulário principal ao mesmo CRM que recebe o quiz. O Apps Script deixou de ser necessário neste fluxo. A variável privada `LEADS_CRM_URL` foi cadastrada na Vercel para Production, sem alterar a integração da campanha.

O adaptador usa os campos públicos já utilizados pelo quiz: `name`, `phone`, `email`, `subject`, `origin`, `source`, `funnel`, `tags` e `respostas`. Para o site, a origem é `Site Cristal`, a etapa solicitada é `NOVO LEAD` e `automsg` fica vazio: não solicita a automação de vídeo do quiz. Não fabrica pontuação, respostas ou classificação de diagnóstico. As UTMs e o contexto da carta são preservados. O formulário não coleta e-mail; o campo é enviado vazio, aceito no teste do receptor.

O receptor confirmou HTTP 200 com o texto exato `OK - Webhook recebido com sucesso`. Um cadastro técnico, identificado como não contatar e usando o contato comercial da própria Cristal, foi conferido no quadro SDR IA, etapa NOVO LEAD, registro #250. Um segundo cadastro técnico verificou o corpo HTTP exato; não foi uma repetição automática de envio ambíguo. Os testes internos não solicitam a automação de mensagens do quiz. Regras adicionais de automação configuradas na conta do CRM não foram modificadas.

O endpoint aceita somente o host e caminho do provedor existente e só considera confirmação textual exata ou JSON positivo como sucesso. Respostas ambíguas seguem em quarentena; não há reenvio cego. O registro Redis preserva a chave e o estado antigo: contatos já confirmados no Apps Script não são reenviados ao CRM na migração.

O endereço antigo do Apps Script permanece no histórico e deve ser desativado pelo responsável após a troca validada. O webhook do quiz já é público por configuração anterior; usar uma variável privada no formulário principal não remove essa exposição preexistente. O quiz e suas credenciais de integração não foram rotacionados.

## Conferência antes da publicação

1. `LEADS_CRM_URL`, `KV_REST_API_URL` e `KV_REST_API_TOKEN` precisam existir em Production. Preview só recebe o destino real se houver autorização para cadastros reais nesse ambiente; os testes automatizados usam mocks.
2. Rodar `npm test`, `npm run build:check` e os testes de interface afetados.
3. Após a publicação, conferir domínio, retorno da função e recebimento de um cadastro interno antes de considerar o envio em produção validado.

## Proteções locais implementadas

Textos livres enviados à planilha recebem prefixo de texto para neutralizar fórmulas. O telefone E.164 já validado mantém seu formato. A origem é obrigatória; isso reduz abuso simples, mas não autentica um bot. O UUID precisa ser v4. Novos IDs exigem data dentro de dez minutos; repetições já registradas continuam preservando a idempotência.

Contadores Redis usam incremento e expiração em uma operação Lua atômica. Janela fixa de dez minutos: 30 tentativas/IP, 5 tentativas de entrega/telefone e 300 globais. Não são limites diários. Repetições salvas não consomem o contador de telefone. Em produção Vercel usa-se `x-vercel-forwarded-for`, conforme a documentação oficial; em desenvolvimento usa-se o socket local. Origin e IP não substituem autenticação do receptor nem CAPTCHA. Os limites devem ser acompanhados no tráfego real.

Logs incluem apenas o evento e código, sem nome, telefone, URL de integração ou corpo de erro. `REVIEW_REQUIRED` exige conferência da entrega no receptor: não gerar um novo ID para reenviar cegamente. `STORAGE_UNAVAILABLE` exige verificar Redis e os logs. Não foi instalado um serviço de alertas.

O servidor de preview simulado usa destino fictício e nunca envia leads reais. Servidores locais bloqueiam dotfiles, caminhos internos e links para fora da raiz.

## Fontes técnicas

- https://vercel.com/docs/headers/request-headers
- https://vercel.com/docs/project-configuration/vercel-json
