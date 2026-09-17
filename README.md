# Novo site — Cristal Consórcios

Esta entrega é um site estático moderno, responsivo e pronto para publicação. Não depende de framework ou instalação: basta publicar os arquivos desta pasta em uma hospedagem que sirva HTML, CSS e JavaScript.

## O que já funciona

- Layout novo, responsivo e animado;
- Catálogo unificado de cartas de imóvel e veículo;
- Filtros por categoria, texto, faixa de crédito e prazo;
- Exibição progressiva de 6 cartas no desktop, 4 no tablet e 3 no celular;
- Assistente com três modos: consórcio, financiamento e comparação;
- Estimativa de financiamento pelo sistema Price, com custo total do cliente, juros, parcelas e referências configuráveis por banco;
- Sugestão de cartas reais próximas ao valor informado, sem criar condições fictícias de consórcio;
- Modal com detalhes e mensagem personalizada para WhatsApp;
- Formulário com validação, LGPD e a mesma integração de leads do site antigo;
- Conteúdo institucional, FAQ, depoimentos e um hub editorial próprio com 10 artigos internos;
- Simulador com estratégias separadas de alavancagem patrimonial e revenda da cota, comparação de até três cenários e compartilhamento por URL;
- Aviso de cookies e acessibilidade básica.

## Simulador de estratégia

A rota `simulador/` possui interface própria em [`simulador/index.html`](simulador/index.html). A revenda mantém suas regras retrocompatíveis em [`simulador/simulation-engine.js`](simulador/simulation-engine.js) e interações em [`simulador/simulador.js`](simulador/simulador.js). A alavancagem patrimonial usa o motor separado [`simulador/leverage-engine.js`](simulador/leverage-engine.js) e o controlador [`simulador/leverage-simulator.js`](simulador/leverage-simulator.js). Os dois modos compartilham somente componentes visuais e utilitários neutros, sem bibliotecas externas.

Na alavancagem, o crédito estimado é o menor limite entre capital para o lance próprio, capacidade para o maior pagamento bruto projetado ao longo de todo o grupo e limites configurados. O valor discretizado é revalidado pelo motor completo para que arredondamentos não ultrapassem o orçamento. O aluguel começa somente após a contemplação considerada; patrimônio líquido é valor estimado do ativo menos saldo devedor; o cenário à vista aplica a mesma valorização ao capital inicial. Lance embutido nunca é tratado como desembolso próprio. Saldo residual no último mês é exibido como obrigação final, e os testes de variação preservam o mesmo crédito para isolar o efeito das premissas. Saldo, amortização pós-contemplação, correção e início de renda são premissas provisórias isoladas no motor para futura configuração por administradora.

Para executar os testes determinísticos do motor financeiro:

```text
node scripts/test-simulator.js
node scripts/test-leverage-simulator.js
```

## Área de conteúdo

O hub editorial está em `conteudo/` e todas as matérias são páginas HTML estáticas no próprio projeto. Os dados dos 10 artigos ficam centralizados em [`articles-data.js`](articles-data.js), enquanto [`scripts/generate-content.js`](scripts/generate-content.js) mantém um único template para o hub, os artigos, a página 404, o sitemap e o arquivo de regras para buscadores.

Cada artigo possui título e descrição exclusivos, canonical, Open Graph, Twitter Card, `BlogPosting`, `BreadcrumbList`, trilha de navegação, tempo de leitura, data real de atualização, índice, CTA e três conteúdos relacionados. A implementação não depende de CMS ou biblioteca externa.

Para atualizar o conteúdo ou regenerar as páginas:

```text
node scripts/generate-content.js
node scripts/validate-content.js
```

Para abrir uma prévia local em `http://127.0.0.1:4175`, execute `node scripts/serve.js`.

O domínio canônico padrão é `https://lpnovacristal.vercel.app`. Se o domínio oficial mudar, gere novamente definindo `SITE_ORIGIN` no ambiente antes de executar o gerador e atualize também as URLs absolutas de SEO no `<head>` da página inicial.

Os dados empresariais usados nos rodapés e nos schemas das páginas geradas ficam centralizados em [`company-data.js`](company-data.js). A validação automática também confere razão social, nome fantasia, CNPJ, e-mail, endereço, município, UF e CEP em todas as páginas públicas.

## Como publicar ou atualizar cartas

O catálogo usa as **mesmas duas planilhas públicas do site atual**. Portanto, a equipe continua publicando cartas pela planilha de controle que já utiliza; não é preciso editar o código para atualizar o portfólio.

As colunas esperadas em cada aba da planilha são:

```text
Administradora | Crédito | Entrada | Saldo a pagar | Parcela | Observação
```

O campo `Saldo a pagar` é exibido como quantidade de parcelas restantes, como acontece no site atual. Para remover uma carta do portal, remova ou oculte a linha correspondente na planilha publicada. Depois da atualização, o Google pode levar alguns minutos para refletir os dados públicos.

As URLs das duas planilhas estão no início de [`app.js`](app.js). Caso a Cristal crie uma nova planilha, basta substituir as URLs em `CRISTAL.sheets`.

## Simulador e referências financeiras

Os perfis usados no financiamento ficam centralizados no bloco `FINANCE_SIMULATION_PROFILES`, no início de [`app.js`](app.js). Há quatro perfis didáticos por categoria: CAIXA, Santander, Bradesco e Itaú. O Banco Inter não faz parte da fonte atual. Para revisar um cenário, altere o `monthlyRate` (taxa mensal em formato decimal) do banco correspondente.

Essas taxas são **perfis demonstrativos configurados no site**. Elas não são ofertas comerciais, cotações em tempo real ou promessas das instituições citadas. A CAIXA foi mantida como o cenário mais competitivo, e os demais bancos formam níveis distintos para facilitar uma comparação didática.

O cálculo usa o sistema Price e mantém precisão interna até a exibição final. Para cada banco, o site apresenta valor do bem, entrada, valor financiado, prazo, taxa mensal, taxa anual equivalente, parcela mensal, soma das parcelas, juros totais, total pago pelo cliente e custo adicional sobre o valor do bem. As identidades usadas são:

```text
total pago pelo cliente = entrada + soma das parcelas
juros totais = soma das parcelas - valor financiado
```

Uma taxa igual a zero também é tratada corretamente, dividindo o principal pelo prazo. Entradas negativas, iguais ou superiores ao valor do bem e prazos inválidos são bloqueados. CET, seguros, tarifas e indexadores não são projetados; essa limitação aparece junto ao resultado.

No modo consórcio, o assistente consulta somente os campos reais da planilha e ordena oportunidades do mesmo tipo pela proximidade do crédito desejado. Um total aritmético só é exibido quando a carta publicada contém entrada, parcela e prazo numéricos; nesse caso, ele corresponde a `entrada + parcela publicada × prazo restante`. Esse número não é tratado como total contratual nem como promessa de economia, pois reajustes, fundo de reserva, seguros, taxa administrativa e outras condições podem não estar separados nos dados públicos. Quando faltam dados — como ocorre nas cartas de imóvel cuja entrada está “Sob consulta” — o site informa claramente que o total não é calculável.

Os prazos disponíveis ficam em `SIMULATION_TERMS`. A data de nascimento é validada somente no navegador e descartada antes da montagem dos resultados e da mensagem do WhatsApp.

### Pontos para integração futura

- Substituir as taxas de referência por uma API oficial ou rotina interna de atualização;
- Incluir CET, tarifas, seguros e indexadores somente quando houver uma fonte contratual confiável;
- Adicionar regras de elegibilidade por instituição, caso sejam formalmente fornecidas;
- Levar a busca de cartas para uma API própria se as planilhas deixarem de ser públicas;
- Versionar data e fonte de cada taxa para facilitar auditoria comercial.

### Limitações da arquitetura atual

O site é estático e faz a leitura das planilhas diretamente no navegador. Se o Google alterar permissões, formato ou disponibilidade dos CSVs, a categoria afetada pode ficar temporariamente indisponível. O carregamento foi preparado para manter a outra categoria ativa quando apenas uma planilha falhar.

As taxas são mantidas manualmente no código. Elas devem ser revisadas pela equipe antes da publicação e periodicamente depois disso. O resultado é informativo e não substitui proposta, análise de crédito ou documento contratual.

## Publicação

1. Envie toda esta pasta, inclusive `assets/`, para a raiz da hospedagem do domínio.
2. Garanta que `index.html` seja o arquivo inicial.
3. Teste o catálogo, os filtros, os botões de WhatsApp e o formulário após publicar.
4. Confirme que o domínio está em HTTPS.

## Antes de publicar oficialmente

- Conferir os dados e as condições das cartas na planilha;
- Confirmar que o endpoint de leads do formulário ainda é o correto;
- Validar a Política de Privacidade e os Termos de Uso com responsável jurídico;
- Conferir periodicamente se os dados cadastrais continuam iguais aos registros oficiais;
- Conectar domínio e configurar métricas/Google Search Console.

Os valores, disponibilidade e condições das cartas são carregados do portfólio em tempo real, mas toda operação continua sujeita à análise cadastral, documentação e administradora.
