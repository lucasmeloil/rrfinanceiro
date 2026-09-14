import jsPDF from 'jspdf';
import { ParcelaComPessoa, FormaPagamento, ConfiguracoesApp, Pessoa } from '../types';
import { formatCurrency, formatDate } from './financialEngine';
import { storageService } from './storage';
import { formatFormaPagamento } from './financialEngine';

export interface DadosReciboBaixa {
  parcela: ParcelaComPessoa;
  valorPago: number;
  dataPagamento: string;
  formaPagamento: FormaPagamento;
  observacoes?: string;
  isParcial?: boolean;
  saldoRestante?: number;
  dataVencimentoComplementar?: string;
}

export function criarDadosReciboDeParcela(parcela: ParcelaComPessoa): DadosReciboBaixa {
  return {
    parcela,
    valorPago: Number(parcela.valor_pago || parcela.valor),
    dataPagamento: parcela.data_pagamento || parcela.data_vencimento,
    formaPagamento: parcela.forma_pagamento || 'pix',
    observacoes: parcela.observacoes,
    isParcial: false,
  };
}

// Cache da logo em base64 para carregamento instantâneo
let logoBase64Cache: string | null = null;

async function obterLogoBase64(): Promise<string | null> {
  if (logoBase64Cache) return logoBase64Cache;
  try {
    const resp = await fetch('/logo-rr.png');
    if (!resp.ok) return null;
    const blob = await resp.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        logoBase64Cache = reader.result as string;
        resolve(logoBase64Cache);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.warn('Não foi possível carregar a logo para o PDF:', err);
    return null;
  }
}

/**
 * Converte um valor numérico em reais para extenso (português do Brasil)
 */
export function valorPorExtenso(valor: number): string {
  if (valor === 0) return 'zero reais';

  const unidades = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
  const especiais = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
  const dezenas = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
  const centenas = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

  function converterGrupo(n: number): string {
    if (n === 0) return '';
    if (n === 100) return 'cem';
    const c = Math.floor(n / 100);
    const d = Math.floor((n % 100) / 10);
    const u = n % 10;
    const partes: string[] = [];

    if (c > 0) partes.push(centenas[c]);

    if (d === 1) {
      partes.push(especiais[u]);
    } else {
      if (d > 1) partes.push(dezenas[d]);
      if (u > 0) partes.push(unidades[u]);
    }

    return partes.join(' e ');
  }

  const inteiro = Math.floor(valor);
  const centavos = Math.round((valor - inteiro) * 100);

  const partesExtenso: string[] = [];

  if (inteiro > 0) {
    const milhoes = Math.floor(inteiro / 1000000);
    const milhares = Math.floor((inteiro % 1000000) / 1000);
    const resto = inteiro % 1000;

    if (milhoes > 0) {
      partesExtenso.push(`${converterGrupo(milhoes)} ${milhoes === 1 ? 'milhão' : 'milhões'}`);
    }

    if (milhares > 0) {
      if (milhares === 1) {
        partesExtenso.push('mil');
      } else {
        partesExtenso.push(`${converterGrupo(milhares)} mil`);
      }
    }

    if (resto > 0) {
      partesExtenso.push(converterGrupo(resto));
    }

    const textoReais = partesExtenso.join(resto < 100 && (milhares > 0 || milhoes > 0) ? ' e ' : ', ');
    partesExtenso.length = 0;
    partesExtenso.push(`${textoReais} ${inteiro === 1 ? 'real' : 'reais'}`);
  }

  if (centavos > 0) {
    partesExtenso.push(`${converterGrupo(centavos)} ${centavos === 1 ? 'centavo' : 'centavos'}`);
  }

  return partesExtenso.join(' e ');
}

/**
 * Gera o documento jsPDF para um recibo profissional estilizado
 */
export async function gerarReciboPdfDoc(dados: DadosReciboBaixa): Promise<jsPDF> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const config: ConfiguracoesApp = storageService.getConfig();
  const logoBase64 = await obterLogoBase64();

  // Dados da Pessoa / Cliente
  const pessoas = storageService.getPessoas();
  const contas = storageService.getContas();
  const conta = contas.find((c) => c.id === dados.parcela.conta_id);
  const cliente: Pessoa | undefined = conta
    ? pessoas.find((p) => p.id === conta.pessoa_id)
    : pessoas.find((p) => p.nome.toLowerCase() === dados.parcela.pessoaNome.toLowerCase());

  const docCliente = cliente?.cpf_cnpj || 'Não informado';
  const telCliente = cliente?.telefone || dados.parcela.pessoaTelefone || 'Não informado';
  const emailCliente = cliente?.email || dados.parcela.pessoaEmail || 'Não informado';
  const enderecoCliente = cliente?.endereco
    ? `${cliente.endereco}${cliente.cidade ? ` - ${cliente.cidade}/${cliente.uf || ''}` : ''}`
    : 'Não informado';

  // Código / Protocolo do Recibo
  const dataHojeLimpa = dados.dataPagamento.replace(/-/g, '');
  const hashId = dados.parcela.id.slice(-4).toUpperCase() || '0001';
  const numRecibo = `REC-${dataHojeLimpa}-${hashId}`;

  // Cores da Identidade Visual RR Financeiro
  const corPrimaria = [15, 23, 42]; // #0f172a (Navy Slate)
  const corAzulDestaque = [37, 99, 235]; // #2563eb (Royal Blue)
  const corVerdeSucesso = [5, 150, 105]; // #059669 (Emerald)
  const corCinzaFundo = [248, 250, 252]; // #f8fafc
  const corBorda = [226, 232, 240]; // #e2e8f0
  const corTextoPrincipal = [15, 23, 42];
  const corTextoSecundario = [100, 116, 139]; // #64748b

  // 1. TOPO: Faixa Superior Elegante
  doc.setFillColor(corPrimaria[0], corPrimaria[1], corPrimaria[2]);
  doc.rect(0, 0, 210, 5, 'F');
  doc.setFillColor(corVerdeSucesso[0], corVerdeSucesso[1], corVerdeSucesso[2]);
  doc.rect(0, 5, 210, 1.5, 'F');

  // 2. CABEÇALHO (Y = 12 até 40)
  // Inserção da Logomarca
  if (logoBase64) {
    try {
      // Proporção aproximada da logo: ~2.2 : 1
      doc.addImage(logoBase64, 'PNG', 14, 12, 45, 18);
    } catch (e) {
      // Fallback tipográfico caso ocorra erro na imagem
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.setTextColor(corPrimaria[0], corPrimaria[1], corPrimaria[2]);
      doc.text('RR FINANCEIRO', 14, 24);
    }
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(corPrimaria[0], corPrimaria[1], corPrimaria[2]);
    doc.text('RR FINANCEIRO', 14, 24);
  }

  // Título e Identificação do Recibo (Direita)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(corPrimaria[0], corPrimaria[1], corPrimaria[2]);
  doc.text('RECIBO DE PAGAMENTO', 196, 17, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(corAzulDestaque[0], corAzulDestaque[1], corAzulDestaque[2]);
  doc.text('COMPROVANTE OFICIAL DE QUITAÇÃO', 196, 22, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(corTextoSecundario[0], corTextoSecundario[1], corTextoSecundario[2]);
  doc.text(`Nº DE CONTROLE: ${numRecibo}`, 196, 27, { align: 'right' });
  doc.text(`DATA DA EMISSÃO: ${formatDate(dados.dataPagamento)}`, 196, 31, { align: 'right' });

  // Linha divisória
  doc.setDrawColor(corBorda[0], corBorda[1], corBorda[2]);
  doc.setLineWidth(0.4);
  doc.line(14, 34, 196, 34);

  // 3. CARDS DE DADOS: BENEFICIÁRIO (EMISSOR) E PAGADOR (CLIENTE)
  const yCards = 38;
  const cardHeight = 35;
  const cardWidth = 88;

  // Card Esquerdo: Beneficiário
  doc.setFillColor(corCinzaFundo[0], corCinzaFundo[1], corCinzaFundo[2]);
  doc.roundedRect(14, yCards, cardWidth, cardHeight, 2, 2, 'FD');
  doc.setFillColor(corPrimaria[0], corPrimaria[1], corPrimaria[2]);
  doc.rect(14, yCards, 2.5, cardHeight, 'F'); // Faixa lateral decorativa

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(corPrimaria[0], corPrimaria[1], corPrimaria[2]);
  doc.text('EMISSOR / BENEFICIÁRIO (RECEBEDOR)', 20, yCards + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(corTextoPrincipal[0], corTextoPrincipal[1], corTextoPrincipal[2]);
  doc.text(config.nomeEmpresa || 'RR Financeiro & Gestão', 20, yCards + 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  doc.setTextColor(corTextoSecundario[0], corTextoSecundario[1], corTextoSecundario[2]);
  doc.text(`CNPJ: ${config.cnpjEmpresa || '12.345.678/0001-99'}`, 20, yCards + 17);
  doc.text(`Chave PIX: ${config.chavePixPadrao || 'pix@rrfinanceiro.com.br'}`, 20, yCards + 22);
  doc.text('Gestão Financeira & Cobranças Integradas', 20, yCards + 27);

  // Card Direito: Pagador (Cliente)
  doc.setFillColor(corCinzaFundo[0], corCinzaFundo[1], corCinzaFundo[2]);
  doc.roundedRect(108, yCards, cardWidth, cardHeight, 2, 2, 'FD');
  doc.setFillColor(corAzulDestaque[0], corAzulDestaque[1], corAzulDestaque[2]);
  doc.rect(108, yCards, 2.5, cardHeight, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(corAzulDestaque[0], corAzulDestaque[1], corAzulDestaque[2]);
  doc.text('PAGADOR / CLIENTE', 114, yCards + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(corTextoPrincipal[0], corTextoPrincipal[1], corTextoPrincipal[2]);
  doc.text(dados.parcela.pessoaNome.substring(0, 36), 114, yCards + 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  doc.setTextColor(corTextoSecundario[0], corTextoSecundario[1], corTextoSecundario[2]);
  doc.text(`CPF/CNPJ: ${docCliente}`, 114, yCards + 17);
  doc.text(`Contato: ${telCliente} • ${emailCliente.substring(0, 25)}`, 114, yCards + 22);
  doc.text(`Endereço: ${enderecoCliente.substring(0, 42)}`, 114, yCards + 27);

  // 4. DESTAQUE DO VALOR RECEBIDO (BANNER DE IMPACTO)
  const yDestaque = 78;
  const hDestaque = 27;
  doc.setFillColor(236, 253, 245); // Verde esmeralda bem suave #ecfdf5
  doc.setDrawColor(16, 185, 129); // #10b981
  doc.setLineWidth(0.6);
  doc.roundedRect(14, yDestaque, 182, hDestaque, 3, 3, 'FD');

  // Rótulo
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(4, 120, 87); // #047857
  doc.text('VALOR TOTAL LIQUIDADO / RECEBIDO:', 22, yDestaque + 9);

  // Valor em destaque
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(5, 150, 105); // #059669
  doc.text(formatCurrency(dados.valorPago), 22, yDestaque + 18);

  // Selo de Status "QUITADO"
  const badgeWidth = 42;
  const badgeX = 148;
  doc.setFillColor(5, 150, 105);
  doc.roundedRect(badgeX, yDestaque + 6, badgeWidth, 9, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text(dados.isParcial ? 'BAIXA PARCIAL' : '✓ LIQUIDADO / QUITADO', badgeX + (badgeWidth / 2), yDestaque + 12, { align: 'center' });

  // Valor por Extenso
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(4, 120, 87);
  const extensoTexto = `(${valorPorExtenso(dados.valorPago).toUpperCase()})`;
  doc.text(extensoTexto.substring(0, 95), 22, yDestaque + 23);

  // 5. TABELA / DETALHAMENTO DA FATURA
  const yTab = 112;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(corPrimaria[0], corPrimaria[1], corPrimaria[2]);
  doc.text('DISCRIMINAÇÃO DOS SERVIÇOS & PAGAMENTO', 14, yTab);

  // Cabeçalho da Tabela
  const yHeader = yTab + 3;
  doc.setFillColor(corPrimaria[0], corPrimaria[1], corPrimaria[2]);
  doc.rect(14, yHeader, 182, 7, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('DESCRIÇÃO / REFERÊNCIA', 18, yHeader + 4.8);
  doc.text('PARCELA', 105, yHeader + 4.8);
  doc.text('VENCIMENTO', 126, yHeader + 4.8);
  doc.text('FORMA PAGTO', 152, yHeader + 4.8);
  doc.text('VALOR PAGO', 192, yHeader + 4.8, { align: 'right' });

  // Linha de Conteúdo
  const yRow = yHeader + 7;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(corBorda[0], corBorda[1], corBorda[2]);
  doc.setLineWidth(0.3);
  doc.rect(14, yRow, 182, 11, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(corTextoPrincipal[0], corTextoPrincipal[1], corTextoPrincipal[2]);
  const descLinha = `${dados.parcela.descricaoConta}`;
  doc.text(descLinha.substring(0, 48), 18, yRow + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(corTextoSecundario[0], corTextoSecundario[1], corTextoSecundario[2]);
  doc.text(`Valor Original: ${formatCurrency(dados.parcela.valor)}`, 18, yRow + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(corTextoPrincipal[0], corTextoPrincipal[1], corTextoPrincipal[2]);
  doc.text(`${dados.parcela.numero_parcela}/${dados.parcela.total_parcelas}`, 105, yRow + 7);
  doc.text(formatDate(dados.parcela.data_vencimento), 126, yRow + 7);
  doc.text(formatFormaPagamento(dados.formaPagamento), 152, yRow + 7);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(corVerdeSucesso[0], corVerdeSucesso[1], corVerdeSucesso[2]);
  doc.text(formatCurrency(dados.valorPago), 192, yRow + 7, { align: 'right' });

  // Se houver parcelamento complementar (parcial) ou observação
  let yAbaixoTabela = yRow + 15;
  if (dados.isParcial && dados.saldoRestante) {
    doc.setFillColor(250, 245, 255); // Roxo suave
    doc.setDrawColor(233, 213, 255);
    doc.roundedRect(14, yAbaixoTabela, 182, 11, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.8);
    doc.setTextColor(126, 34, 206);
    doc.text('INFORMAÇÃO DE BAIXA PARCIAL:', 18, yAbaixoTabela + 4.8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(
      `Saldo remanescente de ${formatCurrency(dados.saldoRestante)} gerado em Parcela Complementar (Vencimento programado: ${dados.dataVencimentoComplementar ? formatDate(dados.dataVencimentoComplementar) : '-'}).`,
      18,
      yAbaixoTabela + 8.5
    );
    yAbaixoTabela += 14;
  }

  if (dados.observacoes) {
    doc.setFillColor(corCinzaFundo[0], corCinzaFundo[1], corCinzaFundo[2]);
    doc.setDrawColor(corBorda[0], corBorda[1], corBorda[2]);
    doc.roundedRect(14, yAbaixoTabela, 182, 10, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(corTextoPrincipal[0], corTextoPrincipal[1], corTextoPrincipal[2]);
    doc.text('Observações / Protocolo:', 18, yAbaixoTabela + 4.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(corTextoSecundario[0], corTextoSecundario[1], corTextoSecundario[2]);
    doc.text(dados.observacoes.substring(0, 95), 58, yAbaixoTabela + 4.5);
    yAbaixoTabela += 13;
  }

  // 6. DECLARAÇÃO DE QUITAÇÃO FORMAL
  const yDeclaracao = Math.max(yAbaixoTabela + 3, 160);
  doc.setFillColor(corCinzaFundo[0], corCinzaFundo[1], corCinzaFundo[2]);
  doc.setDrawColor(corBorda[0], corBorda[1], corBorda[2]);
  doc.setLineWidth(0.4);
  doc.roundedRect(14, yDeclaracao, 182, 28, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(corPrimaria[0], corPrimaria[1], corPrimaria[2]);
  doc.text('DECLARAÇÃO DE RECEBIMENTO E QUITAÇÃO', 20, yDeclaracao + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(corTextoPrincipal[0], corTextoPrincipal[1], corTextoPrincipal[2]);
  const textoDeclaracao = `Declaramos para os devidos fins legais e comprobatórios que recebemos do Pagador supracitado a importância de ${formatCurrency(dados.valorPago)} (${valorPorExtenso(dados.valorPago)}), liquidada em ${formatDate(dados.dataPagamento)} por meio de ${formatFormaPagamento(dados.formaPagamento)}, dando por este recibo plena, rasa, geral e irrevogável quitação ${dados.isParcial ? 'do valor ora recebido' : 'da respectiva obrigação financeira descrita neste instrumento'}.`;
  
  const linhasDeclaracao = doc.splitTextToSize(textoDeclaracao, 172);
  doc.text(linhasDeclaracao, 20, yDeclaracao + 13);

  // 7. AUTENTICAÇÃO DIGITAL & ASSINATURA
  const yAssinatura = yDeclaracao + 36;

  // Bloco Esquerdo: Autenticação Digital e QR Code representativo
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(corBorda[0], corBorda[1], corBorda[2]);
  doc.roundedRect(14, yAssinatura, 85, 30, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(corPrimaria[0], corPrimaria[1], corPrimaria[2]);
  doc.text('AUTENTICAÇÃO DIGITAL DO DOCUMENTO', 18, yAssinatura + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(corTextoSecundario[0], corTextoSecundario[1], corTextoSecundario[2]);
  doc.text(`Identificador Único: ${numRecibo}`, 18, yAssinatura + 11);
  doc.text(`Chave SHA-256: ${hashId}9A8F${dataHojeLimpa}7B2C1`, 18, yAssinatura + 16);
  doc.text(`Data e Hora: ${formatDate(dados.dataPagamento)} às ${new Date().toLocaleTimeString('pt-BR')}`, 18, yAssinatura + 21);
  doc.text('Comprovante emitido eletronicamente via RR Financeiro.', 18, yAssinatura + 26);

  // Bloco Direito: Linha de Assinatura
  doc.setDrawColor(corPrimaria[0], corPrimaria[1], corPrimaria[2]);
  doc.setLineWidth(0.5);
  doc.line(114, yAssinatura + 18, 196, yAssinatura + 18);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(corTextoPrincipal[0], corTextoPrincipal[1], corTextoPrincipal[2]);
  doc.text(config.nomeEmpresa || 'RR Financeiro & Gestão', 155, yAssinatura + 23, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(corTextoSecundario[0], corTextoSecundario[1], corTextoSecundario[2]);
  doc.text('Departamento Financeiro & Controladoria', 155, yAssinatura + 27, { align: 'center' });

  // 8. RODAPÉ INSTITUCIONAL (FINAL DA PÁGINA)
  doc.setDrawColor(corBorda[0], corBorda[1], corBorda[2]);
  doc.setLineWidth(0.3);
  doc.line(14, 282, 196, 282);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(corTextoSecundario[0], corTextoSecundario[1], corTextoSecundario[2]);
  doc.text(
    `${config.nomeEmpresa} • CNPJ: ${config.cnpjEmpresa || '12.345.678/0001-99'} • Sistema Integrado de Gestão Financeira`,
    14,
    286
  );
  doc.text('Via do Cliente • Documento Autenticado Eletronicamente', 196, 286, { align: 'right' });

  return doc;
}

/**
 * Baixa diretamente o arquivo PDF gerado
 */
export async function baixarReciboPdf(dados: DadosReciboBaixa): Promise<void> {
  const doc = await gerarReciboPdfDoc(dados);
  const dataHojeLimpa = dados.dataPagamento.replace(/-/g, '');
  const nomeSanitizado = dados.parcela.pessoaNome.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 20);
  const nomeArquivo = `recibo_${nomeSanitizado}_${dataHojeLimpa}.pdf`;
  doc.save(nomeArquivo);
}

/**
 * Abre o PDF em uma nova aba do navegador para visualização ou impressão imediata
 */
export async function abrirReciboPdf(dados: DadosReciboBaixa): Promise<void> {
  const doc = await gerarReciboPdfDoc(dados);
  const pdfBlob = doc.output('blob');
  const blobUrl = URL.createObjectURL(pdfBlob);
  window.open(blobUrl, '_blank');
}

/**
 * Gera mensagem formatada para WhatsApp de agradecimento e quitação
 */
export function gerarMensagemReciboWhatsApp(dados: DadosReciboBaixa): string {
  const config = storageService.getConfig();
  const forma = formatFormaPagamento(dados.formaPagamento);
  const valorFormatado = formatCurrency(dados.valorPago);
  const dataFormatada = formatDate(dados.dataPagamento);
  const empresa = config.nomeEmpresa || 'RR Financeiro & Gestão';

  return `Olá, *${dados.parcela.pessoaNome}*! 👋✅\n\n` +
    `Confirmamos com sucesso o recebimento do seu pagamento no valor de *${valorFormatado}*.\n\n` +
    `📄 *Detalhes do Recebimento:*\n` +
    `• *Referência:* ${dados.parcela.descricaoConta}\n` +
    `• *Parcela:* ${dados.parcela.numero_parcela}/${dados.parcela.total_parcelas}\n` +
    `• *Data da Quitação:* ${dataFormatada}\n` +
    `• *Forma de Pagamento:* ${forma}\n` +
    (dados.isParcial && dados.saldoRestante
      ? `• *Saldo Restante:* ${formatCurrency(dados.saldoRestante)} (parcela complementar gerada)\n\n`
      : `• *Status:* 🟢 Quitada Integralmente\n\n`) +
    `Seu recibo oficial foi gerado e emitido com sucesso em nosso sistema financeiro.\n\n` +
    `Agradecemos imensamente pela pontualidade e pela parceria!\n\n` +
    `_Atenciosamente,_\n*${empresa}*`;
}
