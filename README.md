# Cristal Consórcios

Plataforma web da Cristal Consórcios para consulta de cartas contempladas, simulações financeiras, captação de leads e geração de propostas comerciais em PDF.

**Site:** [www.cristalconsorcios.com.br](https://www.cristalconsorcios.com.br/)

## Funcionalidades

- Catálogo de cartas contempladas de imóvel e veículo, com entrada sob consulta.
- Busca por administradora e crédito, limites de crédito e parcela, faixas rápidas e ordenação por valor, parcela ou prazo.
- Simulador com preenchimento guiado, rápido e análise completa, comparação de cenários e compartilhamento por URL.
- Formulários de atendimento com validação, registro de origem da campanha e integração de leads.
- Gerador de propostas de cartas contempladas com até quatro cotas, pagamentos consolidados por período e modelos completo e resumido.
- Propostas de cota nova com parcela normal ou reduzida, faixa de parcelas e composição opcional dos valores.
- Calculadora de entrada e margem para análise comercial da equipe.
- Conteúdo editorial, páginas por segmento e dados estruturados para mecanismos de busca.

## Tecnologias e arquitetura

A interface utiliza HTML, CSS e JavaScript, sem framework de aplicação. As páginas públicas são estáticas, com módulos específicos para catálogo, simuladores e ferramentas comerciais. A geração de PDFs acontece no navegador com jsPDF.

A captação de leads utiliza uma função Node.js na Vercel e um registro em Redis via API REST para controle de reenvios, limitação de requisições e acompanhamento da entrega às integrações configuradas.

O projeto é versionado com Git e publicado na Vercel. O domínio oficial é usado nas URLs canônicas; o endereço de produção da Vercel redireciona para ele.

## Estrutura do projeto

```text
assets/                      Imagens, identidade visual e recursos estáticos
api/                         Endpoint de captação de leads
conteudo/                    Hub editorial e artigos
carta-contemplada-imovel/     Página de cartas de imóvel
carta-contemplada-veiculo/    Página de cartas de veículo
data/cartas.json             Catálogo público
funcoes/                     Central de ferramentas da equipe
funcoes/entrada/             Calculadora de entrada e margem
funcoes/cota-nova/           Propostas de cota nova
propostas/                   Propostas de cartas contempladas
simulador/                   Interface e motores de simulação
scripts/                     Servidor local, geração de páginas e testes
docs/                        Documentação de configuração e manutenção
```

Os dados institucionais ficam em `company-data.js`; os artigos, em `articles-data.js`. As configurações de captura e rastreamento ficam em `lead-config.js`, `lead-capture.js` e `tracking-consent.js`.

## Desenvolvimento local

Com Node.js instalado, execute na raiz do projeto:

```sh
node scripts/serve.js
```

Acesse `http://127.0.0.1:4175`. O servidor local disponibiliza os arquivos estáticos; o endpoint de leads depende do ambiente de execução e das integrações configuradas na hospedagem.

As ferramentas comerciais são acessadas diretamente por `/funcoes/` e `/propostas/`. Essas rotas ficam fora do menu público e do sitemap, com instruções de não indexação. Não possuem autenticação: o acesso por link não constitui controle de acesso.

## Catálogo de cartas

O catálogo é carregado de `data/cartas.json` e validado por `catalogue-data.js`. O formato público é:

```json
{
  "schemaVersion": 1,
  "updatedAt": "2026-10-27T15:30:12Z",
  "letters": [
    {
      "id": "c-exemplo",
      "type": "imovel",
      "admin": "Administradora",
      "credit": 300000,
      "entry": null,
      "term": 150,
      "installment": 2000,
      "observation": ""
    }
  ]
}
```

Os valores do exemplo são ilustrativos. Cada carta precisa de um identificador único, categoria válida, crédito, prazo e parcela positivos. A entrada permanece `null`, exibida como consulta ao atendimento. Custos de aquisição, margens, comissões e identificação dos parceiros não integram o contrato público.

A publicação substitui a lista completa. Na conferência das fontes, devem ser incluídas apenas ofertas disponíveis, excluindo as vendidas ou reservadas e preservando cotas distintas com condições iguais. Planos com parcelas em etapas precisam manter a descrição das etapas e usar a parcela inicial no filtro.

O navegador consulta o catálogo na abertura, ao retornar à janela e a cada minuto enquanto a página estiver visível. Essa atualização reflete o último arquivo publicado; não representa sincronização direta com os sites dos parceiros.

## Propostas e simulações

Os motores financeiros ficam separados das interfaces para permitir validação independente dos cálculos. As propostas consolidadas somam as parcelas simultâneas e reduzem o pagamento mensal conforme cada prazo termina.

O gerador de cartas contempladas oferece comparação com financiamento no modelo completo. O modelo resumido apresenta as condições comerciais sem os totais do cenário. A documentação das premissas e referências está em [propostas/README.md](propostas/README.md).

As simulações são estimativas sujeitas às premissas informadas. Taxas, encargos, reajustes e condições comerciais precisam ser conferidos antes do envio ao cliente; os resultados não representam aprovação de crédito ou garantia de contemplação e rentabilidade.

## Validação

Testes dos cálculos, integrações e estrutura do site:

```sh
node scripts/test-simulator.js
node scripts/test-leverage-simulator.js
node scripts/test-proposals.js
node scripts/test-entry-calculator.js
node scripts/test-new-quota.js
node scripts/test-lead-api.js
node scripts/test-tracking-consent.js
node scripts/test-google-site.js
node scripts/validate-content.js
```

Os testes de interface utilizam Playwright e uma instalação local do Chrome. Com o servidor local em execução e as dependências disponíveis no ambiente Node.js:

```sh
node scripts/test-catalogue-ui.js
node scripts/test-functions-ui.js
node scripts/test-new-quota-ui.js
node scripts/test-simplified-simulator-ui.js
```

## Conteúdo e SEO

Para regenerar o conteúdo editorial e validar os arquivos resultantes:

```sh
node scripts/generate-content.js
node scripts/validate-content.js
```

O domínio padrão do gerador é `https://www.cristalconsorcios.com.br`. O projeto inclui URLs canônicas, Open Graph, dados estruturados em JSON-LD, `sitemap.xml`, `robots.txt` e `llms.txt`.

## Publicação

As alterações são enviadas ao repositório após revisão e validação. A integração com a Vercel publica a branch de produção; a conferência final deve verificar o domínio oficial, os arquivos estáticos, o catálogo e os fluxos afetados pela alteração.

O endpoint de leads requer `KV_REST_API_URL` e `KV_REST_API_TOKEN` no ambiente da hospedagem, além das integrações de destino configuradas. Credenciais devem permanecer nas variáveis de ambiente, fora do código e do histórico Git.
