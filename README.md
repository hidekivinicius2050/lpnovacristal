# Novo site — Cristal Consórcios

Esta entrega é um site estático moderno, responsivo e pronto para publicação. Não depende de framework ou instalação: basta publicar os arquivos desta pasta em uma hospedagem que sirva HTML, CSS e JavaScript.

## O que já funciona

- Layout novo, responsivo e animado;
- Catálogo unificado de cartas de imóvel e veículo;
- Filtros por categoria, texto, faixa de crédito e prazo;
- Modal com detalhes e mensagem personalizada para WhatsApp;
- Formulário com validação, LGPD e a mesma integração de leads do site antigo;
- Conteúdo institucional, FAQ, depoimentos e links para os artigos existentes;
- Aviso de cookies e acessibilidade básica.

## Como publicar ou atualizar cartas

O catálogo usa as **mesmas duas planilhas públicas do site atual**. Portanto, a equipe continua publicando cartas pela planilha de controle que já utiliza; não é preciso editar o código para atualizar o portfólio.

As colunas esperadas em cada aba da planilha são:

```text
Administradora | Crédito | Entrada | Saldo a pagar | Parcela | Observação
```

O campo `Saldo a pagar` é exibido como quantidade de parcelas restantes, como acontece no site atual. Para remover uma carta do portal, remova ou oculte a linha correspondente na planilha publicada. Depois da atualização, o Google pode levar alguns minutos para refletir os dados públicos.

As URLs das duas planilhas estão no início de [`app.js`](app.js). Caso a Cristal crie uma nova planilha, basta substituir as URLs em `CRISTAL.sheets`.

## Publicação

1. Envie toda esta pasta, inclusive `assets/`, para a raiz da hospedagem do domínio.
2. Garanta que `index.html` seja o arquivo inicial.
3. Teste o catálogo, os filtros, os botões de WhatsApp e o formulário após publicar.
4. Confirme que o domínio está em HTTPS.

## Antes de publicar oficialmente

- Conferir os dados e as condições das cartas na planilha;
- Confirmar que o endpoint de leads do formulário ainda é o correto;
- Validar a Política de Privacidade e os Termos de Uso com responsável jurídico;
- Adicionar endereço completo no mapa, caso desejado;
- Conectar domínio e configurar métricas/Google Search Console.

Os valores, disponibilidade e condições das cartas são carregados do portfólio em tempo real, mas toda operação continua sujeita à análise cadastral, documentação e administradora.
