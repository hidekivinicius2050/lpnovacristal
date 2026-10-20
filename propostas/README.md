# Gerador da equipe

Rota direta `/propostas/`, sem links na navegação pública ou sitemap. A página tem `noindex, nofollow, noarchive`. Não possui autenticação (opção solicitada); qualquer pessoa com o endereço pode abri-la. O formulário não envia dados de cliente nem os persiste em servidor ou localStorage. O PDF é construído localmente com jsPDF 4.2.1 (MIT), incluído em vendor/ com a licença.

## Uso

Preencher cliente, data e tipo. Uma carta é o padrão. “Mais de uma carta” permite até quatro, cada uma com crédito, entrada, administradora, transferência em percentual ou reais, prazo e parcela. Todos os fluxos iniciam juntos. O resumo e o PDF somam crédito, entrada, transferência e parcelas; prazos iguais são agrupados. O PDF mostra pagamentos mensais por período sem identificar a quantidade de cartas.

O botão baixa um PDF A4 com nome do cliente, crédito e data. Sem comparativo: uma página. Com comparativo: duas. Não há gravação nem URL compartilhável contendo dados pessoais. O exemplo é fictício e seu carregamento não substitui campos já preenchidos.

## Comparativo: limites e fontes

Mesmos valor do bem, entrada e prazo máximo das cartas. Principal bancário = crédito menos entrada. Transferência paga no início da carta; avaliação/despesas pagas no início do financiamento. Os totais da carta são nominais atuais e não incorporam reajustes futuros. Não se anuncia uma diferença entre totais como economia garantida.

Imóvel: SAC com juros efetivos anuais convertidos em mensais. Atualização hipotética mensal do saldo e amortização pela TR; seguros sobre saldo atualizado e valor inicial do imóvel, sem projeção de mudança de idade. Arredondamento a centavos de prestação, seguros e encargos. Valores iniciais de referência consultados em 20/10/2026:

- Itaú: 13,85% a.a. + TR, a partir, https://www.itau.com.br/emprestimos-financiamentos/credito-imobiliario . Avaliação R$ 3.420 e administração R$ 25/mês: tabela Personnalité (não universal), https://www.itau.com.br/media/dam/m/1cb6b49051855b32/original/personnalite-tabela-geral.pdf .
- Santander: 11,69% a.a. + TR, exemplo público de aquisição, https://www.santander.com.br/creditos-e-financiamentos/para-sua-casa/portabilidade-de-financiamento-imobiliario/ . Avaliação R$ 3.300 https://www.santander.com.br/parceiros-imobiliarios ; administração SFH R$ 25/mês https://www.santander.com.br/blog/para-voce/sfh . Não usar CET do exemplo público em outro caso.
- TR 0,1616% a.m.: BCB série 7811, observação 01/10/2026. Mantê-la constante é hipótese, não previsão. https://www3.bcb.gov.br/sgspub/consultarvalores/consultarValoresSeries.do?method=consultarSeries&series=7811 .
- MIP 0,03073% do saldo e DFI 0,00899% do imóvel/mês: calibração histórica perfil de 40 anos em apólice de 2012 fora do SFH, https://ww3.itau.com.br/imobline/pos/contrato/apolices_pdf/4F.pdf . **Não são taxas vigentes das ofertas, nem média estatística ou cotação atual.** Idade constante é proxy uniforme para comparação, não reprodução da apólice histórica. Deve-se substituir pelas condições cotadas quando disponíveis.

Veículo: Price com referência geral de mercado BCB série 25471, observação agosto/2026, 1,97% a.m. Obtida em 20/10/2026 de https://api.bcb.gov.br/dados/serie/bcdata.sgs.25471/dados/ultimos/1?formato=json . Não atribuir essa taxa a Itaú ou Santander. IOF e despesas não informados ficam excluídos; nenhum seguro ou encargo imobiliário é aplicado a veículos. Prazo é hipótese matemática, não oferta comercial. Não é cálculo de CET.

Taxas/encargos são editáveis, com identificação de cenário ajustado no PDF; a referência livre informada acompanha o cenário. Não se calcula aprovação, renda mínima, elegibilidade nem promessa de economia. ITBI e registro não entram em nenhuma opção.

## Verificação

`node scripts/test-proposals.js` valida fluxos simultâneos, quatro cartas, prazos iguais, centavos, dados inválidos, SAC contra cálculo Decimal independente do modelo aprovado, Price e juros zero. O fluxo de download e o layout A4 devem ser verificados no navegador e renderizados após mudanças em pdf.js. Mantenha as referências datadas e revise-as ao atualizar condições.
