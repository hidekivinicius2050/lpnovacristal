/* PDF is generated locally. jsPDF is vendored under its MIT license. */
(function (root) {
  'use strict';
  const C={navy:'#061334',gold:'#AF9654',ink:'#17243C',muted:'#5C6778',line:'#DDE3EB',light:'#F2F5F9',white:'#FFFFFF'};
  async function makeProposalPDF(data, logoData) {
    const E=root.ProposalEngine, m=E.money, s=data.summary;
    const doc=new root.jspdf.jsPDF({unit:'pt',format:'a4',compress:true});
    const W=doc.internal.pageSize.getWidth(),H=doc.internal.pageSize.getHeight(),L=42,R=W-42,BW=R-L;
    const count=data.banks.length ? 2 : 1;
    const date=new Date(data.date+'T12:00:00');
    const dateLabel=date.toLocaleDateString('pt-BR',{day:'numeric',month:'long',year:'numeric'});
    const clean=value=>String(value).replace(/[\u0000-\u001f\u007f]/g,' ').trim();
    function text(x,y,value,size=10,color=C.ink,bold=false,align='left',maxWidth) {
      doc.setTextColor(color);doc.setFont('helvetica',bold?'bold':'normal');doc.setFontSize(size);
      let str=clean(value);
      if(maxWidth) {
        while(doc.getTextWidth(str)>maxWidth && size>6) {size-=.25;doc.setFontSize(size);}
      }
      doc.text(str,x,y,{align});
    }
    function box(x,y,w,h,color=C.light,radius=6) {doc.setFillColor(color);doc.roundedRect(x,y,w,h,radius,radius,'F');}
    function rule(y) {doc.setDrawColor(C.line);doc.setLineWidth(.6);doc.line(L,y,R,y);}
    function paragraph(value,y,size=8.2,leading=11,color=C.muted) {
      doc.setFont('helvetica','normal');doc.setFontSize(size);doc.setTextColor(color);
      const lines=doc.splitTextToSize(clean(value),BW);doc.text(lines,L,y,{lineHeightFactor:leading/size});return y+lines.length*leading;
    }
    function header(page,subtitle) {
      doc.setFillColor(C.navy);doc.rect(0,0,W,118,'F');
      doc.addImage(logoData,'PNG',L-8,1.5,225,112.5);
      text(R,46,'PROPOSTA COMERCIAL',10,C.gold,true,'right');text(R,66,dateLabel,9,C.white,false,'right');text(R,86,subtitle,8,C.white,false,'right');
      rule(791);text(L,808,'CRISTAL CONSÓRCIOS',8.5,C.navy,true);text(R,808,`${page} / ${count}`,8.5,C.muted,false,'right');
      text(L,823,'www.cristalconsorcios.com.br  |  (61) 3328-3000',8,C.muted);
    }
    header(1,`Carta contemplada para ${data.asset==='imovel'?'imóvel':'veículo'}`);
    text(L,171,'Sua proposta de crédito.',23,C.navy,true);
    text(L,198,`Cliente: ${data.client}`,12,C.ink,true,'left',BW);
    text(L,217,`Administradora: ${s.administrators}`,9,C.muted,false,'left',BW);
    box(L,233,BW,78);text(L+18,255,'CRÉDITO DISPONÍVEL',9,C.muted,true);text(L+18,294,m(s.credit),30,C.navy,true);
    text(L,338,'ENTRADA DA CARTA',9,C.muted,true);text(L,365,m(s.entry),22,C.navy,true);
    text(L,386,`Taxa de transferência estimada: ${m(s.transfer)}`,9.5,C.muted);rule(400);
    text(L,430,'Como ficam seus pagamentos',15,C.navy,true);text(L,450,'Pagamento mensal total em cada período.',9,C.muted);
    const compact=s.stages.length>2, height=compact?36:47,gap=compact?7:9;
    s.stages.forEach((stage,i)=>{
      const top=468+i*(height+gap);box(L,top,BW,height);
      text(L+15,top+(compact?15:19),`DO ${stage.start}º AO ${stage.end}º MÊS`,9,C.navy,true);
      text(L+15,top+(compact?29:36),`${stage.months} parcelas mensais`,8,C.muted);
      text(R-15,top+(compact?25:31),m(stage.payment),compact?17:20,C.navy,true,'right');
    });
    let y=468+s.stages.length*(height+gap)+(compact?13:21);
    text(L,y,'Prazo total restante',10,C.muted);text(R,y,`${s.months} meses`,11,C.ink,true,'right');
    y+=compact?18:23;text(L,y,'Desembolso inicial: entrada + transferência',10,C.muted);text(R,y,m(s.upfront),11,C.ink,true,'right');
    y+=compact?18:23;text(L,y,'Soma das parcelas pelos valores atuais',10,C.muted);text(R,y,m(s.debt),11,C.ink,true,'right');
    y+=compact?12:18;box(L,y,BW,44,C.navy);text(L+14,y+26,'TOTAL NOMINAL DO CENÁRIO',9,C.white,true);text(R-14,y+30,m(s.total),20,C.white,true,'right');
    paragraph('Valores sujeitos à disponibilidade e reajustes contratuais. Transferência estimada, a confirmar com a administradora.',Math.max(y+63,746),8.5,12);
    if(data.banks.length) {
      doc.addPage();header(2,'Comparativo financeiro ilustrativo');text(L,171,'Carta ou financiamento?',23,C.navy,true);
      paragraph(`Mesmo bem: ${m(s.credit)}. Entrada: ${m(s.entry)}. Prazo: ${s.months} meses.`,195,9.5,14);
      paragraph(`Financiamento de ${m(s.credit-s.entry)} pelo ${data.asset==='imovel'?'SAC. Perfil técnico de 40 anos.':'sistema Price.'}`,213,9.5,14);
      const cols=data.banks.length===2 ? [L+200,L+326,R] : [L+275,R];
      text(L,252,'Condição',9,C.muted,true);
      ['Carta',...data.banks.map(b=>b.name)].forEach((label,i)=>text(cols[i],252,label,8.5,C.navy,true,'right'));
      rule(264);
      const entries=fn=>data.banks.map(fn), dash='Não se aplica';
      const rows=[
        ['Valor do bem',m(s.credit),...entries(()=>m(s.credit))],
        ['Entrada',m(s.entry),...entries(()=>m(s.entry))],
        ['Transferência da carta',m(s.transfer),...entries(()=>dash)],
        ['Prazo de comparação',`${s.months} meses`,...entries(()=>`${s.months} meses`)],
        ['Juros de referência',dash,...entries(b=>b.rateLabel)],
        ['Parcela inicial estimada',m(s.stages[0].payment),...entries(b=>m(b.first))],
        ['Parcela final estimada',m(s.stages.at(-1).payment),...entries(b=>m(b.last))]
      ];
      if(data.asset==='imovel') rows.push(
        ['TR no cenário','Conforme contrato',...entries(()=>data.config.tr.toLocaleString('pt-BR',{maximumFractionDigits:4})+'% a.m.')],
        ['MIP + DFI na 1ª parcela','Conforme contrato',...entries(b=>m(b.insurance))],
        ['Avaliação do imóvel','Não informada',...entries(b=>m(b.fee))],
        ['Administração mensal','Conforme contrato',...entries(b=>m(b.admin))]
      ); else rows.push(['IOF e despesas informados','Não informados',...entries(b=>m(b.fee))]);
      rows.push(['Total de referência¹',m(s.total),...entries(b=>m(b.total+s.entry))],['Base do total','Valores atuais',...entries(()=>data.asset==='imovel'?'Projeção com encargos':'Projeção de referência')]);
      rows.forEach((row,i)=>{
        const top=284+i*26,highlight=row[0]==='Total de referência¹';
        if(highlight)box(L,top-16,BW,26,C.light,2);
        text(L,top,row[0],8.5,highlight?C.navy:C.muted,highlight);
        row.slice(1).forEach((v,j)=>text(cols[j],top,v,8.2,C.ink,highlight,'right'));
      });
      rule(632);box(L,650,BW,48);
      text(L+14,671,'Compromisso inicial mensal',15,C.navy,true);
      text(L+14,689,`Carta: ${m(s.stages[0].payment)}. Financiamento: ${data.banks.map(b=>m(b.first)).join(' / ')}.`,8.4,C.muted);
      const notes=['¹ Carta: total nominal atual, sem reajustes futuros ou despesas não informadas. Não representa economia final garantida. Financiamentos são estimativas, não cotações nem CET.'];
      if(data.asset==='imovel') {
        notes.push(`TR constante como hipótese. Avaliação paga no início. ITBI e registro excluídos das duas opções. Seguros: MIP ${data.config.mip.toLocaleString('pt-BR',{maximumFractionDigits:5})}% do saldo e DFI ${data.config.dfi.toLocaleString('pt-BR',{maximumFractionDigits:5})}% do imóvel por mês; perfil fixo de 40 anos, calibração histórica (2012), não tarifas vigentes.`);
      } else {
        notes.push('Média de mercado BCB (agosto/2026), não oferta específica de Itaú ou Santander. IOF, seguros e tarifas excluídos quando não informados. Prazo meramente comparativo, sujeito aos limites comerciais do banco.');
      }
      if(data.edited||data.reference)notes.push('Cenário informado pela equipe. '+(data.reference||'Taxas e encargos alterados manualmente.'));
      let noteSize=7.4;
      const noteLines=()=>{doc.setFont('helvetica','normal');doc.setFontSize(noteSize);return notes.map(n=>doc.splitTextToSize(clean(n),BW));};
      let lines=noteLines();
      while(lines.reduce((n,p)=>n+p.length,0)*noteSize*1.25+notes.length*2>54 && noteSize>6.2){noteSize-=.2;lines=noteLines();}
      let noteY=714;
      notes.forEach(n=>{noteY=paragraph(n,noteY,noteSize,noteSize*1.25)+2;});
      const sources=data.asset==='imovel' ? [
        ['Juros Itaú','https://www.itau.com.br/emprestimos-financiamentos/credito-imobiliario'],
        ['Juros Santander','https://www.santander.com.br/creditos-e-financiamentos/para-sua-casa/portabilidade-de-financiamento-imobiliario/'],
        ['TR BCB','https://www3.bcb.gov.br/sgspub/consultarvalores/consultarValoresSeries.do?method=consultarSeries&series=7811'],
        ['Seguros históricos','https://ww3.itau.com.br/imobline/pos/contrato/apolices_pdf/4F.pdf'],
        ['Tarifas Itaú','https://www.itau.com.br/media/dam/m/1cb6b49051855b32/original/personnalite-tabela-geral.pdf'],
        ['Tarifas Santander','https://www.santander.com.br/parceiros-imobiliarios']
      ] : [['Juros BCB: série 25471','https://dadosabertos.bcb.gov.br/dataset/25471-taxa-media-mensal-de-juros-das-operacoes-de-credito-com-recursos-livres---pessoas-fisicas---a']];
      let linkX=L;doc.setFont('helvetica','normal');doc.setFontSize(7);doc.setTextColor(C.navy);
      sources.forEach(([label,url])=>{doc.textWithLink(label,linkX,775,{url});linkX+=doc.getTextWidth(label)+14;});
      text(L,785,'Referências consultadas em 20/10/2026. Condições editadas prevalecem no cenário.',6.4,C.muted);
    }
    doc.setProperties({title:`Proposta - ${data.client} - ${m(s.credit)} - ${date.toLocaleDateString('pt-BR')}`,author:'Cristal Consórcios',subject:'Proposta de carta contemplada'});
    const safe=clean(data.client).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9 -]/g,'').replace(/\s+/g,' ').slice(0,65)||'Cliente';
    const fileDate=data.date.split('-').reverse().join('-');
    return {doc,filename:`Proposta - ${safe} - Credito ${s.credit.toFixed(2).replace('.',',')} - ${fileDate}.pdf`};
  }
  root.makeProposalPDF=makeProposalPDF;
})(globalThis);
