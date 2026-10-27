(function(root){
  'use strict';
  const C={navy:'#061334',gold:'#AF9654',ink:'#17243C',muted:'#5C6778',line:'#DDE3EB',light:'#F2F5F9',white:'#FFFFFF'};
  function makeNewQuotaPDF(data,logo){
    const E=root.NewQuotaEngine,s=E.calculate(data.input),m=E.money,doc=new root.jspdf.jsPDF({unit:'pt',format:'a4',compress:true});
    const W=doc.internal.pageSize.getWidth(),L=42,R=W-42,BW=R-L;
    const clean=v=>String(v??'').replace(/[\u0000-\u001f\u007f]/g,' ').trim();
    function text(x,y,value,size=10,color=C.ink,bold=false,align='left',width){doc.setTextColor(color);doc.setFont('helvetica',bold?'bold':'normal');doc.setFontSize(size);const str=clean(value);if(width)while(doc.getTextWidth(str)>width&&size>7){size-=.25;doc.setFontSize(size);}doc.text(str,x,y,{align});}
    function box(x,y,w,h,color=C.light){doc.setFillColor(color);doc.roundedRect(x,y,w,h,7,7,'F');}
    function paragraph(value,x,y,width,size=9,leading=13){doc.setFont('helvetica','normal');doc.setFontSize(size);doc.setTextColor(C.muted);const lines=doc.splitTextToSize(clean(value),width);doc.text(lines,x,y,{lineHeightFactor:leading/size});return y+lines.length*leading;}
    const date=new Date(data.date+'T12:00:00').toLocaleDateString('pt-BR');
    doc.setFillColor(C.navy);doc.rect(0,0,W,111,'F');doc.addImage(logo,'PNG',L-8,-2,225,112.5);text(R,45,'PROPOSTA DE COTA NOVA',10,C.gold,true,'right');text(R,66,date,9,C.white,false,'right');text(R,86,'Consórcio para '+(data.asset==='imovel'?'imóvel':'veículo'),9,C.white,false,'right');
    text(L,153,'Seu próximo passo começa com um plano.',21,C.navy,true,'left',BW);text(L,182,'Preparado para '+data.client,12,C.ink,true,'left',BW);text(L,204,'Administradora: '+data.admin,9,C.muted,false,'left',BW);
    box(L,225,BW,87);text(L+18,248,'CRÉDITO DO PLANO',9,C.muted,true);text(L+18,288,m(s.credit),30,C.navy,true,'left',BW*.59);text(L+BW*.67,248,'PRAZO RESTANTE',9,C.muted,true);text(L+BW*.67,285,s.term+' meses',22,C.navy,true);
    const y=332,h=120,gap=12,cw=(BW-gap)/2;
    if(s.reducedEnabled){
      box(L,y,cw,h);text(L+16,y+25,'PARCELA REDUZIDA'+(s.reduction?' · '+s.reduction.toLocaleString('pt-BR')+'%':''),9,C.muted,true,'left',cw-32);text(L+16,y+68,m(s.reducedPayment),27,C.navy,true,'left',cw-32);text(L+16,y+99,'Condição inicial do plano',8.5,C.muted);
      box(L+cw+gap,y,cw,h);text(L+cw+gap+16,y+25,'PARCELA CHEIA',9,C.muted,true);text(L+cw+gap+16,y+67,s.paymentLabel,s.paymentMin===s.paymentMax?24:16,C.navy,true,'left',cw-32);text(L+cw+gap+16,y+99,s.insuranceIncluded?'Valores com seguro':'Valores sem seguro',8.5,C.muted);
    }else{
      box(L,y,BW,h);text(L+18,y+27,'PARCELA MENSAL',9,C.muted,true);text(L+18,y+72,s.paymentLabel,s.paymentMin===s.paymentMax?32:25,C.navy,true,'left',BW-36);text(L+18,y+100,s.insuranceIncluded?'Valores com seguro':'Valores sem seguro',9,C.muted);
    }
    let row=479;text(L,row,'Vencimento das parcelas',9,C.muted);text(R,row,'Todo dia '+s.dueDay,10,C.ink,true,'right');row+=22;
    if(s.code){text(L,row,'Código do bem',9,C.muted);text(R,row,s.code,10,C.ink,true,'right',BW*.6);row+=22;}
    if(s.plan){text(L,row,'Plano / bem de referência',9,C.muted);row=paragraph(s.plan,L,row+16,BW,9.5,12)+6;}
    if(s.condition){row=paragraph(s.condition,L,row,BW,8.5,11)+6;}
    if(s.details.length){doc.setDrawColor(C.line);doc.line(L,row,R,row);row+=16;text(L,row,'COMPOSIÇÃO INFORMADA DA PARCELA',8.5,C.muted,true);row+=16;const col=BW/s.details.length;s.details.forEach((d,i)=>{text(L+i*col,row,d.label,8,C.muted,false,'left',col-10);text(L+i*col,row+19,m(d.value),10,C.navy,true);});row+=29;}
    const ctaY=Math.max(670,Math.min(690,row+10));box(L,ctaY,BW,43,C.navy);text(L+15,ctaY+26,'Vamos escolher seu próximo passo?',12,C.white,true);doc.setFontSize(9);doc.setTextColor(C.gold);doc.textWithLink('Fale com a Cristal',R-15,ctaY+26,{align:'right',url:'https://wa.me/556133283000'});
    paragraph('Condições informadas pela administradora, sujeitas a confirmação, disponibilidade e reajustes contratuais. Contemplação não tem data garantida. A referência de prazo apresentada não é promessa de contemplação.',L,ctaY+64,BW,8,11);
    doc.setDrawColor(C.line);doc.line(L,799,R,799);text(L,815,'CRISTAL CONSÓRCIOS',8.5,C.navy,true);text(R,815,'(61) 3328-3000',8.5,C.navy,true,'right');text(L,830,'www.cristalconsorcios.com.br',8,C.muted);
    const safe=clean(data.client).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9 -]/g,'').replace(/\s+/g,' ').slice(0,65)||'Cliente';
    doc.setProperties({title:'Proposta de cota nova - '+data.client+' - '+m(s.credit)+' - '+date,author:'Cristal Consórcios',subject:'Proposta de contratação de consórcio'});
    return {doc,summary:s,filename:'Proposta Cota Nova - '+safe+' - Credito '+s.credit.toFixed(2).replace('.',',')+' - '+data.date.split('-').reverse().join('-')+'.pdf'};
  }
  root.makeNewQuotaPDF=makeNewQuotaPDF;
})(globalThis);
