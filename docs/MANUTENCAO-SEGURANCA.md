# Manutenção de segurança — 03/11/2026

## Escopo preservado

Quiz, agradecimento, CRM de campanha e GTM dessas páginas não foram editados. Cabeçalhos Vercel estão limitados a rotas explícitas, sem uma regra global. A CSP é somente Report-Only: precisa de verificação no navegador em preview antes de eventual aplicação efetiva. Não foram alterados cálculos financeiros ou propostas.

## Bloqueio de publicação: destino do formulário principal

1. O responsável pelo Apps Script deve conferir o código real do `doPost`, suas permissões e a gravação da planilha. Não foi possível verificar esse serviço somente pelo repositório.
2. Implementar no receptor autenticação servidor-servidor com assinatura, timestamp e nonce, além de neutralização das células. Não ativar assinatura no remetente antes de o receptor suportá-la. A implementação atual não afirma proteção contra chamadas diretas ao Apps Script.
3. Criar um novo deployment, configurar sua URL em `LEADS_APPS_SCRIPT_URL` no painel da Vercel, para os ambientes necessários, e testar em planilha de homologação. Não colocar URL ou segredo em mensagens, arquivos versionados ou logs.
4. Configurar `KV_REST_API_URL` e `KV_REST_API_TOKEN`. Nenhum valor real está nos exemplos do projeto. O endpoint retorna `CONFIGURATION_REQUIRED` sem essas configurações.
5. Conferir o aceite da planilha, origem/campanha, duplicidade e redirecionamento somente após `saved:true`. Após a troca validada, desativar a URL antiga e verificar que deixou de aceitar escrita. Remover a URL do código não remove versões do histórico.

A configuração e a rotação externas estão pendentes; não foi feito deploy desta manutenção.

## Proteções locais implementadas

Textos livres enviados à planilha recebem prefixo de texto para neutralizar fórmulas. O telefone E.164 já validado mantém seu formato. A origem é obrigatória; isso reduz abuso simples, mas não autentica um bot. O UUID precisa ser v4. Novos IDs exigem data dentro de dez minutos; repetições já registradas continuam preservando a idempotência.

Contadores Redis usam incremento e expiração em uma operação Lua atômica. Janela fixa de dez minutos: 30 tentativas/IP, 5 tentativas de entrega/telefone e 300 globais. Não são limites diários. Repetições salvas não consomem o contador de telefone. Em produção Vercel usa-se `x-vercel-forwarded-for`, conforme a documentação oficial; em desenvolvimento usa-se o socket local. Origin e IP não substituem autenticação do receptor nem CAPTCHA. Os limites devem ser acompanhados no tráfego real.

Logs incluem apenas o evento e código, sem nome, telefone, URL de integração ou corpo de erro. `REVIEW_REQUIRED` exige conferência da entrega no receptor: não gerar um novo ID para reenviar cegamente. `STORAGE_UNAVAILABLE` exige verificar Redis e os logs. Não foi instalado um serviço de alertas.

O servidor de preview simulado usa destino fictício e nunca envia leads reais. Servidores locais bloqueiam dotfiles, caminhos internos e links para fora da raiz.

## Fontes técnicas

- https://vercel.com/docs/headers/request-headers
- https://vercel.com/docs/project-configuration/vercel-json
