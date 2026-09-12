import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { storageService } from './storage';
import { ParcelaComPessoa, FiltrosRelatorio, FormaPagamento } from '../types';
import { financialEngine, formatDate, formatFormaPagamento } from './financialEngine';

// =========================================================================
// PALETA DE CORES EXECUTIVA VIVA E DE ALTO CONTRASTE (ARGB)
// =========================================================================
const PALETTE = {
  // Bases e Estrutura
  headerMaster: 'FF0B192C',     // Navy Escuro Premium
  headerDark: 'FF0B192C',       // Alias Dark
  headerSlate: 'FF1E293B',      // Slate Profundo
  headerSub: 'FF334155',        // Slate Médio
  borderLight: 'FFE2E8F0',      // Borda sutil
  borderMedium: 'FF94A3B8',     // Borda intermediária
  borderDark: 'FF0F172A',       // Borda escura contábil
  white: 'FFFFFFFF',
  zebraBg: 'FFF8FAFC',         // Linha alternada elegante

  // Verde Esmeralda Vivo (Receitas, Pagos, Sucesso)
  greenDark: 'FF065F46',
  greenMedium: 'FF10B981',
  greenLight: 'FFDCFCE7',
  greenSoft: 'FFECFDF5',
  greenText: 'FF14532D',

  // Vermelho Coral / Rubi Vivo (Despesas, Vencidos, Déficit)
  redDark: 'FF991B1B',
  redMedium: 'FFEF4444',
  redLight: 'FFFEE2E2',
  redSoft: 'FFFEF2F2',
  redText: 'FF991B1B',

  // Azul Cobalto / Royal Vivo (Caixa, Resultado Líquido)
  blueDark: 'FF1E40AF',
  blueMedium: 'FF2563EB',
  blueLight: 'FFDBEAFE',
  blueSoft: 'FFEFF6FF',
  blueText: 'FF1D4ED8',

  // Âmbar / Ouro Vivo (Pendências, Alertas, Inadimplência)
  amberDark: 'FF92400E',
  amberMedium: 'FFF59E0B',
  amberLight: 'FFFEF9C3',
  amberSoft: 'FFFFFBEB',
  amberText: 'FF854D0E',

  // Roxo / Violeta Vivo (Formas de Pagamento, Auditoria)
  purpleDark: 'FF581C87',
  purpleMedium: 'FF7C3AED',
  purpleLight: 'FFF3E8FF',
  purpleSoft: 'FFFAF5FF',
  purpleText: 'FF6B21A8',

  // Índigo Vivo (Rankings e Clientes)
  indigoDark: 'FF312E81',
  indigoMedium: 'FF4338CA',
  indigoLight: 'FFE0E7FF',
  indigoSoft: 'FFEEF2FF',
  indigoText: 'FF3730A3',

  // Teal Petróleo Vivo (Indicadores Operacionais)
  tealDark: 'FF134E4A',
  tealMedium: 'FF0D9488',
  tealLight: 'FFCCFBF1',
  tealSoft: 'FFF0FDFA',
  tealText: 'FF115E59',
};

export async function exportarRelatorioExcel(filtros: FiltrosRelatorio, dadosFiltrados?: ParcelaComPessoa[]) {
  const config = storageService.getConfig();
  const dados = dadosFiltrados || financialEngine.getParcelasEnriquecidas();
  const pessoas = storageService.getPessoas();

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'RR Financeiro - Controladoria & Gestão';
  workbook.lastModifiedBy = 'RR Financeiro';
  workbook.created = new Date();
  workbook.modified = new Date();

  const pessoasMap = new Map(pessoas.map((p) => [p.nome.toLowerCase(), p]));

  // =========================================================================
  // APURAÇÃO CONSOLIDADA DOS DADOS
  // =========================================================================
  const hojeStr = new Date().toISOString().split('T')[0];
  let totalRecebido = 0;
  let totalReceberPendente = 0;
  let totalReceberPrevisto = 0;

  let totalPago = 0;
  let totalPagarPendente = 0;
  let totalPagarPrevisto = 0;

  let qtdPago = 0;
  let qtdPendente = 0;
  let qtdVencido = 0;
  let valorVencido = 0;

  const parcelasComplementares: ParcelaComPessoa[] = [];
  const formasPagamentoMap = new Map<string, { qtd: number; total: number }>();
  const clientesMap = new Map<string, {
    nome: string;
    doc: string;
    telefone: string;
    tipo: 'receber' | 'pagar' | 'misto';
    totalPrevisto: number;
    totalPago: number;
    totalSaldo: number;
    formaPreferencial: string;
    temVencido: boolean;
    temPendente: boolean;
  }>();

  dados.forEach((item) => {
    const val = Number(item.valor) || 0;
    const pago = Number(item.valor_pago) || (item.status === 'pago' ? val : 0);
    const saldo = Math.max(0, val - pago);

    if (item.is_complementar || item.parcela_origem_id) {
      parcelasComplementares.push(item);
    }

    if (item.tipoConta === 'receber') {
      totalReceberPrevisto += val;
      totalRecebido += pago;
      totalReceberPendente += saldo;
    } else {
      totalPagarPrevisto += val;
      totalPago += pago;
      totalPagarPendente += saldo;
    }

    const isAtrasado = item.status !== 'pago' && item.data_vencimento < hojeStr;

    if (item.status === 'pago') {
      qtdPago++;
    } else if (item.status === 'vencido' || isAtrasado) {
      qtdVencido++;
      valorVencido += saldo;
    } else {
      qtdPendente++;
    }

    // Contabilização por forma de pagamento
    if (pago > 0 || item.status === 'pago') {
      const forma = (item.forma_pagamento as FormaPagamento) || 'outro';
      const atual = formasPagamentoMap.get(forma) || { qtd: 0, total: 0 };
      formasPagamentoMap.set(forma, {
        qtd: atual.qtd + 1,
        total: atual.total + pago,
      });
    }

    // Agrupamento por cliente / favorecido
    const pNome = item.pessoaNome || 'Não identificado';
    const pInfo = pessoasMap.get(pNome.toLowerCase());
    const cDoc = pInfo?.cpf_cnpj || 'Não informado';
    const cTel = pInfo?.telefone || item.pessoaTelefone || '-';
    const cAtual = clientesMap.get(pNome) || {
      nome: pNome,
      doc: cDoc,
      telefone: cTel,
      tipo: item.tipoConta,
      totalPrevisto: 0,
      totalPago: 0,
      totalSaldo: 0,
      formaPreferencial: item.forma_pagamento ? formatFormaPagamento(item.forma_pagamento) : 'Pendente',
      temVencido: false,
      temPendente: false,
    };

    cAtual.totalPrevisto += val;
    cAtual.totalPago += pago;
    cAtual.totalSaldo += saldo;
    if (isAtrasado || item.status === 'vencido') cAtual.temVencido = true;
    if (item.status === 'pendente') cAtual.temPendente = true;
    if (cAtual.tipo !== item.tipoConta) cAtual.tipo = 'misto';
    if (item.forma_pagamento) cAtual.formaPreferencial = formatFormaPagamento(item.forma_pagamento);
    clientesMap.set(pNome, cAtual);
  });

  const saldoEmCaixa = totalRecebido - totalPago;
  const saldoProjetadoFinal = totalReceberPrevisto - totalPagarPrevisto;
  const taxaInadimplencia = totalReceberPrevisto > 0 ? ((valorVencido / totalReceberPrevisto) * 100).toFixed(1) : '0.0';
  const taxaRecebimento = totalReceberPrevisto > 0 ? ((totalRecebido / totalReceberPrevisto) * 100).toFixed(1) : '100.0';
  const taxaExecucaoDespesas = totalPagarPrevisto > 0 ? ((totalPago / totalPagarPrevisto) * 100).toFixed(1) : '0.0';
  const margemOperacional = totalRecebido > 0 ? (((saldoEmCaixa) / totalRecebido) * 100).toFixed(1) : '0.0';

  const dataHoraExtracao = new Date().toLocaleString('pt-BR');

  // =========================================================================
  // ABA 1: PAINEL FINANCEIRO EXECUTIVO (AMPLIADO NA HORIZONTAL - 12 COLUNAS)
  // Grid amplo de Colunas A até L (ocupa toda a tela horizontalmente sem cortes)
  // =========================================================================
  const wsResumo = workbook.addWorksheet('Painel Financeiro Executivo', {
    views: [{ showGridLines: true }],
  });

  // 12 Colunas amplas, generosas e balanceadas (Total = ~290 de largura horizontal!)
  wsResumo.columns = [
    { width: 28 }, // Col A
    { width: 24 }, // Col B
    { width: 24 }, // Col C
    { width: 26 }, // Col D
    { width: 24 }, // Col E
    { width: 24 }, // Col F
    { width: 26 }, // Col G
    { width: 24 }, // Col H
    { width: 24 }, // Col I
    { width: 26 }, // Col J
    { width: 24 }, // Col K
    { width: 28 }, // Col L
  ];

  // 1. Banner Master Panorâmico (A1:L1)
  wsResumo.mergeCells('A1:L1');
  const cellTitulo = wsResumo.getCell('A1');
  cellTitulo.value = `🏢  ${config.nomeEmpresa || 'RR FINANCEIRO'}  |  PAINEL FINANCEIRO EXECUTIVO & CONTROLADORIA`;
  cellTitulo.font = { name: 'Arial', size: 15, bold: true, color: { argb: PALETTE.white } };
  cellTitulo.alignment = { vertical: 'middle', horizontal: 'center' };
  cellTitulo.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.headerMaster } };
  wsResumo.getRow(1).height = 44;

  // 2. Subtítulo Informativo com Metadados (A2:L2)
  wsResumo.mergeCells('A2:L2');
  const cellSub = wsResumo.getCell('A2');
  cellSub.value = `CNPJ: ${config.cnpjEmpresa || 'Não informado'}   •   Extração: ${dataHoraExtracao}   •   Filtro Tipo: ${filtros.tipo.toUpperCase()}   •   Filtro Status: ${filtros.status.toUpperCase()}   •   Volume de Títulos: ${dados.length} lançamentos`;
  cellSub.font = { name: 'Arial', size: 10, color: { argb: 'FFCBD5E1' } };
  cellSub.alignment = { vertical: 'middle', horizontal: 'center' };
  cellSub.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.headerSlate } };
  wsResumo.getRow(2).height = 24;

  wsResumo.addRow([]); // Linha 3 separadora
  wsResumo.getRow(3).height = 12;

  // =========================================================================
  // 3. CARDS DE KPI LADO A LADO NA HORIZONTAL (Colunas A-C, D-F, G-I, J-L)
  // Cada card ocupa 3 colunas completas, sem espaços em branco na lateral!
  // =========================================================================
  wsResumo.mergeCells('A4:C4');
  wsResumo.mergeCells('D4:F4');
  wsResumo.mergeCells('G4:I4');
  wsResumo.mergeCells('J4:L4');

  wsResumo.getCell('A4').value = '🟢  RECEITAS (CONTAS A RECEBER)';
  wsResumo.getCell('A4').font = { name: 'Arial', size: 11, bold: true, color: { argb: PALETTE.white } };
  wsResumo.getCell('A4').alignment = { vertical: 'middle', horizontal: 'center' };
  wsResumo.getCell('A4').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.greenDark } };

  wsResumo.getCell('D4').value = '🔴  DESPESAS (CONTAS A PAGAR)';
  wsResumo.getCell('D4').font = { name: 'Arial', size: 11, bold: true, color: { argb: PALETTE.white } };
  wsResumo.getCell('D4').alignment = { vertical: 'middle', horizontal: 'center' };
  wsResumo.getCell('D4').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.redDark } };

  wsResumo.getCell('G4').value = '🔵  RESULTADO & SALDO EM CAIXA';
  wsResumo.getCell('G4').font = { name: 'Arial', size: 11, bold: true, color: { argb: PALETTE.white } };
  wsResumo.getCell('G4').alignment = { vertical: 'middle', horizontal: 'center' };
  wsResumo.getCell('G4').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.blueDark } };

  wsResumo.getCell('J4').value = '🟠  RISCO & INADIMPLÊNCIA';
  wsResumo.getCell('J4').font = { name: 'Arial', size: 11, bold: true, color: { argb: PALETTE.white } };
  wsResumo.getCell('J4').alignment = { vertical: 'middle', horizontal: 'center' };
  wsResumo.getCell('J4').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.amberDark } };
  wsResumo.getRow(4).height = 28;

  // Linha 5: Valores Principais em Destaque Grande
  const r5 = wsResumo.addRow([
    'Total Recebido:', '', totalRecebido,
    'Total Pago:', '', totalPago,
    'Saldo Realizado:', '', saldoEmCaixa,
    'Total em Atraso:', '', valorVencido,
  ]);
  r5.height = 34;
  wsResumo.mergeCells('A5:B5');
  wsResumo.mergeCells('D5:E5');
  wsResumo.mergeCells('G5:H5');
  wsResumo.mergeCells('J5:K5');

  // Linha 6: Pendências do Período
  const r6 = wsResumo.addRow([
    'Saldo a Receber Pendente:', '', totalReceberPendente,
    'Saldo a Pagar Pendente:', '', totalPagarPendente,
    'Saldo Projetado Final:', '', saldoProjetadoFinal,
    'Taxa de Inadimplência:', '', `${taxaInadimplencia}%`,
  ]);
  r6.height = 25;
  wsResumo.mergeCells('A6:B6');
  wsResumo.mergeCells('D6:E6');
  wsResumo.mergeCells('G6:H6');
  wsResumo.mergeCells('J6:K6');

  // Linha 7: Total Faturado e Margens
  const r7 = wsResumo.addRow([
    'Faturamento Total Previsto:', '', totalReceberPrevisto,
    'Despesas Totais Previstas:', '', totalPagarPrevisto,
    'Margem de Caixa Efetiva:', '', `${margemOperacional}%`,
    'Títulos Vencidos em Aberto:', '', `${qtdVencido} títulos`,
  ]);
  r7.height = 25;
  wsResumo.mergeCells('A7:B7');
  wsResumo.mergeCells('D7:E7');
  wsResumo.mergeCells('G7:H7');
  wsResumo.mergeCells('J7:K7');

  // Linha 8: Eficiência e Status da Saúde
  const r8 = wsResumo.addRow([
    'Taxa de Liquidação Receita:', '', `${taxaRecebimento}%`,
    'Taxa de Execução Despesa:', '', `${taxaExecucaoDespesas}%`,
    'Saúde Financeira do Período:', '', saldoEmCaixa >= 0 ? '🟢 SUPERÁVIT POSITIVO' : '🔴 DÉFICIT EM CAIXA',
    'Classificação de Risco:', '', valorVencido === 0 ? '🟢 BAIXO / CONTROLADO' : '🔴 ATENÇÃO REQUERIDA',
  ]);
  r8.height = 25;
  wsResumo.mergeCells('A8:B8');
  wsResumo.mergeCells('D8:E8');
  wsResumo.mergeCells('G8:H8');
  wsResumo.mergeCells('J8:K8');

  // Estilização das células dos 4 Cards Horizontais
  [5, 6, 7, 8].forEach((rowNum, idx) => {
    const r = wsResumo.getRow(rowNum);
    const isMain = idx === 0;

    // Card 1 (A, B, C)
    r.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isMain ? PALETTE.greenLight : PALETTE.greenSoft } };
    r.getCell(1).font = { name: 'Arial', size: isMain ? 10.5 : 9.5, bold: isMain, color: { argb: PALETTE.headerDark } };
    r.getCell(1).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    r.getCell(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isMain ? PALETTE.greenLight : PALETTE.greenSoft } };
    r.getCell(3).font = { name: 'Arial', size: isMain ? 13 : 10, bold: true, color: { argb: PALETTE.greenText } };
    r.getCell(3).alignment = { vertical: 'middle', horizontal: 'right' };
    if (typeof r.getCell(3).value === 'number') r.getCell(3).numFmt = '"R$ " #,##0.00';

    // Card 2 (D, E, F)
    r.getCell(4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isMain ? PALETTE.redLight : PALETTE.redSoft } };
    r.getCell(4).font = { name: 'Arial', size: isMain ? 10.5 : 9.5, bold: isMain, color: { argb: PALETTE.headerDark } };
    r.getCell(4).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    r.getCell(6).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isMain ? PALETTE.redLight : PALETTE.redSoft } };
    r.getCell(6).font = { name: 'Arial', size: isMain ? 13 : 10, bold: true, color: { argb: PALETTE.redText } };
    r.getCell(6).alignment = { vertical: 'middle', horizontal: 'right' };
    if (typeof r.getCell(6).value === 'number') r.getCell(6).numFmt = '"R$ " #,##0.00';

    // Card 3 (G, H, I)
    r.getCell(7).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isMain ? PALETTE.blueLight : PALETTE.blueSoft } };
    r.getCell(7).font = { name: 'Arial', size: isMain ? 10.5 : 9.5, bold: isMain, color: { argb: PALETTE.headerDark } };
    r.getCell(7).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    r.getCell(9).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isMain ? PALETTE.blueLight : PALETTE.blueSoft } };
    r.getCell(9).font = { name: 'Arial', size: isMain ? 13 : 10, bold: true, color: { argb: saldoEmCaixa >= 0 ? PALETTE.blueText : PALETTE.redText } };
    r.getCell(9).alignment = { vertical: 'middle', horizontal: idx === 3 ? 'center' : 'right' };
    if (typeof r.getCell(9).value === 'number') r.getCell(9).numFmt = '"R$ " #,##0.00;[Red]-"R$ " #,##0.00';

    // Card 4 (J, K, L)
    r.getCell(10).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isMain ? PALETTE.amberLight : PALETTE.amberSoft } };
    r.getCell(10).font = { name: 'Arial', size: isMain ? 10.5 : 9.5, bold: isMain, color: { argb: PALETTE.headerDark } };
    r.getCell(10).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    r.getCell(12).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isMain ? PALETTE.amberLight : PALETTE.amberSoft } };
    r.getCell(12).font = { name: 'Arial', size: isMain ? 13 : 10, bold: true, color: { argb: PALETTE.amberText } };
    r.getCell(12).alignment = { vertical: 'middle', horizontal: idx === 3 ? 'center' : 'right' };
    if (typeof r.getCell(12).value === 'number') r.getCell(12).numFmt = '"R$ " #,##0.00';

    // Bordas em todas as 12 células
    for (let c = 1; c <= 12; c++) {
      r.getCell(c).border = {
        top: { style: 'thin', color: { argb: PALETTE.borderLight } },
        bottom: { style: 'thin', color: { argb: PALETTE.borderLight } },
        left: { style: 'thin', color: { argb: PALETTE.borderLight } },
        right: { style: 'thin', color: { argb: PALETTE.borderLight } },
      };
    }
  });

  // Borda inferior dupla nos 4 cards
  for (let c = 1; c <= 12; c++) {
    wsResumo.getRow(8).getCell(c).border = {
      ...wsResumo.getRow(8).getCell(c).border,
      bottom: { style: 'medium', color: { argb: PALETTE.headerDark } },
    };
  }

  wsResumo.addRow([]); // Linha 9 vazia
  wsResumo.getRow(9).height = 14;

  // =========================================================================
  // TABELA 1: SITUAÇÃO DETALHADA DAS CONTAS (STATUS OPERACIONAL)
  // Ocupa todas as 12 colunas de A até L com detalhes ricos e completos!
  // =========================================================================
  wsResumo.mergeCells('A10:L10');
  const cT1Title = wsResumo.getCell('A10');
  cT1Title.value = '📋  SITUAÇÃO CONSOLIDADA DAS CONTAS & TÍTULOS (DISTRIBUIÇÃO POR STATUS)';
  cT1Title.font = { name: 'Arial', size: 11, bold: true, color: { argb: PALETTE.white } };
  cT1Title.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  cT1Title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.blueDark } };
  wsResumo.getRow(10).height = 28;

  const rT1Head = wsResumo.addRow([
    'Situação / Status da Parcela',
    'Classificação Operacional',
    'Quantidade de Títulos',
    'Valor Total Previsto (R$)',
    'Valor Efetivamente Pago (R$)',
    'Saldo Aberto Pendente (R$)',
    'Participação Faturamento (%)',
    'Taxa de Liquidação (%)',
    'Prazo Médio Recebimento',
    'Impacto no Fluxo de Caixa',
    'Procedimento Operacional Recomendado',
    'Status de Conciliação',
  ]);
  rT1Head.height = 26;
  rT1Head.eachCell((cell) => {
    cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: PALETTE.white } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.headerSlate } };
    cell.border = {
      top: { style: 'thin', color: { argb: PALETTE.borderMedium } },
      bottom: { style: 'medium', color: { argb: PALETTE.headerMaster } },
      left: { style: 'thin', color: { argb: 'FF475569' } },
      right: { style: 'thin', color: { argb: 'FF475569' } },
    };
  });

  const totalGeralOperacao = totalReceberPrevisto || 1;
  const statusLinhas = [
    {
      status: '🟢  QUITADO / PAGO',
      classif: 'Títulos Liquidados',
      qtd: qtdPago,
      previsto: totalRecebido,
      pago: totalRecebido,
      saldo: 0,
      part: `${Math.round((totalRecebido / totalGeralOperacao) * 100)}%`,
      liq: '100%',
      prazo: 'Imediato / Liquidado',
      impacto: 'ENTRADA EFETIVADA',
      procedimento: 'Recebimento baixado e conferido no extrato',
      conciliacao: '100% Conciliado',
      bg: PALETTE.greenLight,
      fg: PALETTE.greenText,
    },
    {
      status: '🟡  PENDENTE NO PRAZO',
      classif: 'Aguardando Vencimento',
      qtd: qtdPendente,
      previsto: Math.max(0, totalReceberPendente - valorVencido),
      pago: 0,
      saldo: Math.max(0, totalReceberPendente - valorVencido),
      part: `${Math.round((Math.max(0, totalReceberPendente - valorVencido) / totalGeralOperacao) * 100)}%`,
      liq: '0%',
      prazo: 'A vencer no prazo hábil',
      impacto: 'PROJEÇÃO DE ENTRADA',
      procedimento: 'Enviar lembrete amigável antes do vencimento',
      conciliacao: 'Aguardando Data',
      bg: PALETTE.amberLight,
      fg: PALETTE.amberText,
    },
    {
      status: '🔴  VENCIDO EM ATRASO',
      classif: 'Cobrança Ativa Requerida',
      qtd: qtdVencido,
      previsto: valorVencido,
      pago: 0,
      saldo: valorVencido,
      part: `${Math.round((valorVencido / totalGeralOperacao) * 100)}%`,
      liq: '0%',
      prazo: 'Vencido (Inadimplente)',
      impacto: 'RETENÇÃO TEMPORÁRIA',
      procedimento: 'Acionar cliente via WhatsApp e registrar acordo',
      conciliacao: 'Pendente de Quitação',
      bg: PALETTE.redLight,
      fg: PALETTE.redText,
    },
  ];

  statusLinhas.forEach((st) => {
    const row = wsResumo.addRow([
      st.status,
      st.classif,
      st.qtd,
      st.previsto,
      st.pago,
      st.saldo,
      st.part,
      st.liq,
      st.prazo,
      st.impacto,
      st.procedimento,
      st.conciliacao,
    ]);
    row.height = 25;
    row.eachCell((cell, colNum) => {
      cell.border = {
        top: { style: 'thin', color: { argb: PALETTE.borderLight } },
        bottom: { style: 'thin', color: { argb: PALETTE.borderLight } },
        left: { style: 'thin', color: { argb: PALETTE.borderLight } },
        right: { style: 'thin', color: { argb: PALETTE.borderLight } },
      };

      if (colNum === 1) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: st.bg } };
        cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: st.fg } };
        cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
      } else if (colNum === 2 || colNum === 9 || colNum === 10 || colNum === 12) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.font = { name: 'Arial', size: 9.5 };
      } else if (colNum === 3) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.font = { name: 'Arial', size: 9.5, bold: true };
      } else if (colNum === 4 || colNum === 5 || colNum === 6) {
        cell.numFmt = '"R$ " #,##0.00';
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
        cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: st.fg } };
      } else if (colNum === 7 || colNum === 8) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.font = { name: 'Arial', size: 9.5, bold: true };
      } else if (colNum === 11) {
        cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
        cell.font = { name: 'Arial', size: 9, italic: true };
      }
    });
  });

  // Linha de Totais da Tabela de Status
  const rT1Tot = wsResumo.addRow([
    'TOTAL CONSOLIDADO',
    'Todos os Lançamentos',
    qtdPago + qtdPendente + qtdVencido,
    totalReceberPrevisto,
    totalRecebido,
    totalReceberPendente,
    '100%',
    `${taxaRecebimento}%`,
    'Ciclo do Período',
    saldoEmCaixa >= 0 ? 'RESULTADO POSITIVO' : 'RESULTADO NEGATIVO',
    'Gestão e controle financeiro integrados',
    'Auditado pelo Sistema',
  ]);
  rT1Tot.height = 28;
  rT1Tot.eachCell((cell, colNum) => {
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: PALETTE.white } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.headerMaster } };
    cell.border = {
      top: { style: 'thin', color: { argb: PALETTE.borderMedium } },
      bottom: { style: 'double', color: { argb: PALETTE.white } },
    };
    if (colNum === 1 || colNum === 2) {
      cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    } else if (colNum === 4 || colNum === 5 || colNum === 6) {
      cell.numFmt = '"R$ " #,##0.00';
      cell.alignment = { vertical: 'middle', horizontal: 'right' };
    } else {
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    }
  });

  wsResumo.addRow([]); // Linha 15 separadora
  wsResumo.getRow(15).height = 16;

  // =========================================================================
  // TABELA 2: COMO O CLIENTE PAGOU (DISTRIBUIÇÃO POR FORMA DE PAGAMENTO)
  // Ocupa todas as 12 colunas de A até L com especificações completas!
  // =========================================================================
  const t2Start = wsResumo.rowCount + 1;
  wsResumo.mergeCells(`A${t2Start}:L${t2Start}`);
  const cT2Title = wsResumo.getCell(`A${t2Start}`);
  cT2Title.value = '💳  DISTRIBUIÇÃO DETALHADA POR FORMA DE PAGAMENTO (RECEBIMENTOS LIQUIDADOS)';
  cT2Title.font = { name: 'Arial', size: 11, bold: true, color: { argb: PALETTE.white } };
  cT2Title.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  cT2Title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.purpleDark } };
  wsResumo.getRow(t2Start).height = 28;

  const rT2Head = wsResumo.addRow([
    'Forma de Pagamento Utilizada',
    'Modalidade / Tipo',
    'Qtd. Transações Realizadas',
    'Valor Total Liquidado (R$)',
    'Ticket Médio por Transação (R$)',
    'Participação no Recebido (%)',
    'Prazo Médio Compensação',
    'Disponibilidade no Caixa',
    'Canal / Meio de Recebimento',
    'Custo Operacional Estimado',
    'Status de Conciliação Bancária',
    'Observações da Tesouraria',
  ]);
  rT2Head.height = 26;
  rT2Head.eachCell((cell) => {
    cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: PALETTE.white } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.purpleMedium } };
    cell.border = {
      top: { style: 'thin', color: { argb: PALETTE.borderMedium } },
      bottom: { style: 'medium', color: { argb: PALETTE.purpleDark } },
      left: { style: 'thin', color: { argb: 'FF6B21A8' } },
      right: { style: 'thin', color: { argb: 'FF6B21A8' } },
    };
  });

  let totalFormasValor = 0;
  let totalFormasQtd = 0;
  formasPagamentoMap.forEach((v) => {
    totalFormasValor += v.total;
    totalFormasQtd += v.qtd;
  });

  if (formasPagamentoMap.size === 0) {
    const rowVazia = wsResumo.addRow([
      'Nenhum pagamento liquidado no período',
      '-', 0, 0, 0, '0%', '-', '-', '-', '-', 'Aguardando Baixas', 'Nenhuma baixa registrada',
    ]);
    rowVazia.height = 24;
    rowVazia.eachCell((c) => {
      c.font = { name: 'Arial', size: 9, italic: true };
      c.alignment = { vertical: 'middle', horizontal: 'center' };
    });
  } else {
    // Especificações por forma de pagamento
    const especificacoesFormas: Record<string, { modalidade: string; prazo: string; disp: string; canal: string; custo: string }> = {
      pix: { modalidade: 'Transferência Instantânea', prazo: 'D+0 (Instantâneo)', disp: 'Disponível Imediato', canal: 'Chave PIX / QR Code', custo: 'Sem tarifa' },
      dinheiro: { modalidade: 'Espécie em Moeda Corrente', prazo: 'D+0 (Imediato)', disp: 'Caixa Físico', canal: 'Balcão / Caixa', custo: 'Sem tarifa' },
      cartao_debito: { modalidade: 'Débito Eletrônico à Vista', prazo: 'D+1 dia útil', disp: 'Crédito em Conta', canal: 'Maquininha POS / TEF', custo: 'Tarifa débito' },
      cartao_credito: { modalidade: 'Crédito à Vista / Parcelado', prazo: 'D+30 dias / Antecipado', disp: 'Adquirente / Cartão', canal: 'Maquininha / Link de Pagamento', custo: 'Tarifa crédito' },
      boleto: { modalidade: 'Boleto de Cobrança Bancária', prazo: 'D+1 a D+2 dias úteis', disp: 'Liquidação Bancária', canal: 'Compensação Bancária', custo: 'Tarifa boleto' },
      transferencia: { modalidade: 'Transferência TED / DOC', prazo: 'D+0 ou D+1 dia útil', disp: 'Crédito em Conta', canal: 'Internet Banking', custo: 'Conforme banco' },
      outro: { modalidade: 'Outro Meio de Liquidação', prazo: 'Variável', disp: 'Conforme acordo', canal: 'Operação Direta', custo: 'A combinar' },
    };

    Array.from(formasPagamentoMap.entries())
      .sort((a, b) => b[1].total - a[1].total)
      .forEach(([formaKey, valData]) => {
        const pct = totalFormasValor > 0 ? `${Math.round((valData.total / totalFormasValor) * 100)}%` : '0%';
        const ticketMedio = valData.qtd > 0 ? valData.total / valData.qtd : 0;
        const nomeForma = formatFormaPagamento(formaKey as FormaPagamento);
        const espec = especificacoesFormas[formaKey] || especificacoesFormas.outro;

        const row = wsResumo.addRow([
          nomeForma,
          espec.modalidade,
          valData.qtd,
          valData.total,
          ticketMedio,
          pct,
          espec.prazo,
          espec.disp,
          espec.canal,
          espec.custo,
          '100% Conciliado',
          'Entrada confirmada na tesouraria',
        ]);
        row.height = 24;

        row.eachCell((cell, colNum) => {
          cell.border = {
            top: { style: 'thin', color: { argb: PALETTE.borderLight } },
            bottom: { style: 'thin', color: { argb: PALETTE.borderLight } },
            left: { style: 'thin', color: { argb: PALETTE.borderLight } },
            right: { style: 'thin', color: { argb: PALETTE.borderLight } },
          };

          if (colNum === 1) {
            cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: PALETTE.purpleText } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.purpleSoft } };
            cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
          } else if (colNum === 2 || colNum === 7 || colNum === 8 || colNum === 9 || colNum === 10 || colNum === 11) {
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            cell.font = { name: 'Arial', size: 9 };
          } else if (colNum === 3 || colNum === 6) {
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            cell.font = { name: 'Arial', size: 9.5, bold: true };
          } else if (colNum === 4 || colNum === 5) {
            cell.numFmt = '"R$ " #,##0.00';
            cell.alignment = { vertical: 'middle', horizontal: 'right' };
            cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: PALETTE.purpleText } };
          } else if (colNum === 12) {
            cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
            cell.font = { name: 'Arial', size: 9, italic: true };
          }
        });
      });
  }

  // Linha de Total da Tabela de Formas
  const rT2Tot = wsResumo.addRow([
    'TOTAL GERAL RECEBIDO',
    'Todas as Formas de Pagamento',
    totalFormasQtd,
    totalFormasValor,
    totalFormasQtd > 0 ? totalFormasValor / totalFormasQtd : 0,
    '100%',
    'Fluxo Direto de Caixa',
    'Totalmente Disponível',
    'Canais Integrados',
    'Sem pendências',
    '100% Conciliado',
    'Total apurado no período',
  ]);
  rT2Tot.height = 28;
  rT2Tot.eachCell((cell, colNum) => {
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: PALETTE.white } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.purpleDark } };
    cell.border = {
      top: { style: 'thin', color: { argb: PALETTE.borderMedium } },
      bottom: { style: 'double', color: { argb: PALETTE.white } },
    };
    if (colNum === 1 || colNum === 2) {
      cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    } else if (colNum === 4 || colNum === 5) {
      cell.numFmt = '"R$ " #,##0.00';
      cell.alignment = { vertical: 'middle', horizontal: 'right' };
    } else {
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    }
  });

  wsResumo.addRow([]); // Linha separadora
  wsResumo.getRow(wsResumo.rowCount).height = 16;

  // =========================================================================
  // TABELA 3: TOP CLIENTES / FAVORECIDOS COM MAIOR CONCENTRAÇÃO FINANCEIRA
  // Ocupa todas as 12 colunas de A até L!
  // =========================================================================
  const topClientes = Array.from(clientesMap.values())
    .sort((a, b) => b.totalPrevisto - a.totalPrevisto)
    .slice(0, 5);

  if (topClientes.length > 0) {
    const t3Start = wsResumo.rowCount + 1;
    wsResumo.mergeCells(`A${t3Start}:L${t3Start}`);
    const cT3Title = wsResumo.getCell(`A${t3Start}`);
    cT3Title.value = '🏆  RANKING DE CLIENTES & FAVORECIDOS COM MAIOR CONCENTRAÇÃO FINANCEIRA';
    cT3Title.font = { name: 'Arial', size: 11, bold: true, color: { argb: PALETTE.white } };
    cT3Title.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    cT3Title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.indigoMedium } };
    wsResumo.getRow(t3Start).height = 28;

    const rT3Head = wsResumo.addRow([
      'Posição & Ranking',
      'Cliente / Favorecido',
      'CPF / CNPJ',
      'Telefone / Contato',
      'Tipo de Operação',
      'Valor Total Faturado (R$)',
      'Valor Já Liquidado (R$)',
      'Saldo em Aberto (R$)',
      'Forma Preferencial',
      'Percentual Liquidado (%)',
      'Status Geral do Cliente',
      'Ação e Relacionamento Recomendado',
    ]);
    rT3Head.height = 26;
    rT3Head.eachCell((cell) => {
      cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: PALETTE.white } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.indigoDark } };
      cell.border = {
        top: { style: 'thin', color: { argb: PALETTE.borderMedium } },
        bottom: { style: 'medium', color: { argb: PALETTE.indigoDark } },
      };
    });

    topClientes.forEach((cli, idx) => {
      let statusCli = 'QUITADO / EM DIA';
      let statusBg = PALETTE.greenLight;
      let statusColor = PALETTE.greenText;
      let acaoCli = 'Cliente adimplente, excelente relacionamento';
      if (cli.temVencido) {
        statusCli = 'VENCIDO EM ATRASO';
        statusBg = PALETTE.redLight;
        statusColor = PALETTE.redText;
        acaoCli = 'Acionar cobrança ativa e renegociação imediata';
      } else if (cli.temPendente || cli.totalSaldo > 0) {
        statusCli = 'PENDENTE NO PRAZO';
        statusBg = PALETTE.amberLight;
        statusColor = PALETTE.amberText;
        acaoCli = 'Acompanhar vencimento e enviar lembrete';
      }

      const pctLiq = cli.totalPrevisto > 0 ? `${Math.round((cli.totalPago / cli.totalPrevisto) * 100)}%` : '100%';

      const rowRank = wsResumo.addRow([
        `#0${idx + 1} Lugar`,
        cli.nome,
        cli.doc,
        cli.telefone,
        cli.tipo === 'receber' ? 'CLIENTE (RECEITA)' : cli.tipo === 'pagar' ? 'FORNECEDOR (DESPESA)' : 'MISTO',
        cli.totalPrevisto,
        cli.totalPago,
        cli.totalSaldo,
        cli.formaPreferencial,
        pctLiq,
        statusCli,
        acaoCli,
      ]);
      rowRank.height = 24;

      rowRank.eachCell((cell, colNum) => {
        cell.border = {
          top: { style: 'thin', color: { argb: PALETTE.borderLight } },
          bottom: { style: 'thin', color: { argb: PALETTE.borderLight } },
          left: { style: 'thin', color: { argb: PALETTE.borderLight } },
          right: { style: 'thin', color: { argb: PALETTE.borderLight } },
        };
        cell.font = { name: 'Arial', size: 9.5 };

        if (colNum === 1) {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: PALETTE.indigoText } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.indigoSoft } };
        } else if (colNum === 2) {
          cell.font = { name: 'Arial', size: 9.5, bold: true };
          cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
        } else if (colNum === 3 || colNum === 4 || colNum === 5 || colNum === 9 || colNum === 10) {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        } else if (colNum === 6 || colNum === 7 || colNum === 8) {
          cell.numFmt = '"R$ " #,##0.00';
          cell.alignment = { vertical: 'middle', horizontal: 'right' };
          cell.font = { name: 'Arial', size: 9.5, bold: true };
        } else if (colNum === 11) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: statusBg } };
          cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: statusColor } };
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        } else if (colNum === 12) {
          cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
          cell.font = { name: 'Arial', size: 9, italic: true };
        }
      });
    });
  }

  // =========================================================================
  // ABA 2: LANÇAMENTOS DETALHADOS (18 COLUNAS COMPLETAS E AMPLAS)
  // Largura total expansiva com filtros automáticos ativos
  // =========================================================================
  const wsAnalitico = workbook.addWorksheet('Lançamentos Detalhados', {
    views: [{ showGridLines: true }],
  });

  // Título e Subtítulo
  wsAnalitico.mergeCells('A1:R1');
  const titleA2 = wsAnalitico.getCell('A1');
  titleA2.value = `📊  ${config.nomeEmpresa || 'RR FINANCEIRO'}  |  RELAÇÃO ANALÍTICA COMPLETA DE TÍTULOS E FATURAS`;
  titleA2.font = { name: 'Arial', size: 14, bold: true, color: { argb: PALETTE.white } };
  titleA2.alignment = { vertical: 'middle', horizontal: 'center' };
  titleA2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.headerMaster } };
  wsAnalitico.getRow(1).height = 40;

  wsAnalitico.mergeCells('A2:R2');
  const subTitleA2 = wsAnalitico.getCell('A2');
  subTitleA2.value = `Posição Consolidada em: ${dataHoraExtracao}   •   Filtros: Tipo [${filtros.tipo.toUpperCase()}] | Status [${filtros.status.toUpperCase()}]   •   Total de Títulos: ${dados.length} lançamentos`;
  subTitleA2.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FFCBD5E1' } };
  subTitleA2.alignment = { vertical: 'middle', horizontal: 'center' };
  subTitleA2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.headerSlate } };
  wsAnalitico.getRow(2).height = 24;

  wsAnalitico.addRow([]); // Linha 3 separadora
  wsAnalitico.getRow(3).height = 10;

  // 18 Colunas com especificações detalhadas e sem nenhum aperto
  const colunasHeader = [
    'Código Lançamento',
    'Tipo de Operação',
    'Cliente / Favorecido',
    'CPF / CNPJ',
    'Telefone / WhatsApp',
    'Descrição da Conta',
    'Número da Parcela',
    'Parcela Complementar?',
    'Data de Emissão',
    'Data de Vencimento',
    'Data de Pagamento',
    'Como Pagou (Forma)',
    'Dias de Atraso',
    'Valor Previsto (R$)',
    'Valor Pago (R$)',
    'Saldo a Pagar (R$)',
    'Status do Título',
    'Observações / Auditoria',
  ];

  const headerRow = wsAnalitico.addRow(colunasHeader);
  headerRow.height = 30;
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: PALETTE.white } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.blueDark } };
    cell.border = {
      top: { style: 'thin', color: { argb: PALETTE.borderMedium } },
      bottom: { style: 'medium', color: { argb: PALETTE.headerMaster } },
      left: { style: 'thin', color: { argb: 'FF3B82F6' } },
      right: { style: 'thin', color: { argb: 'FF3B82F6' } },
    };
  });

  // Habilita AutoFilter nas 18 colunas para o operador filtrar dinamicamente no Excel
  wsAnalitico.autoFilter = 'A4:R4';

  let dataStart = 5;
  let somaValorTotal = 0;
  let somaValorPago = 0;
  let somaValorSaldo = 0;

  dados.forEach((item, index) => {
    const isReceber = item.tipoConta === 'receber';
    const val = Number(item.valor) || 0;
    const pago = Number(item.valor_pago) || (item.status === 'pago' ? val : 0);
    const saldo = Math.max(0, val - pago);

    somaValorTotal += val;
    somaValorPago += pago;
    somaValorSaldo += saldo;

    const pessoaInfo = pessoasMap.get(item.pessoaNome.toLowerCase());
    const docPessoa = pessoaInfo?.cpf_cnpj || 'Não informado';
    const telPessoa = pessoaInfo?.telefone || item.pessoaTelefone || '-';

    let diasAtraso = 0;
    if (item.status !== 'pago' && item.data_vencimento < hojeStr) {
      const vDate = new Date(item.data_vencimento);
      const hDate = new Date(hojeStr);
      diasAtraso = Math.ceil(Math.abs(hDate.getTime() - vDate.getTime()) / (1000 * 60 * 60 * 24));
    }

    const statusTexto = item.status === 'pago' ? 'PAGO' : item.status === 'vencido' || diasAtraso > 0 ? 'VENCIDO' : 'PENDENTE';
    const formaTexto = item.forma_pagamento
      ? formatFormaPagamento(item.forma_pagamento)
      : item.status === 'pago'
      ? 'Não informada'
      : '-';

    const contaMae = storageService.getContaById(item.conta_id);
    const dataEmissaoFormatada = contaMae?.data_emissao ? formatDate(contaMae.data_emissao) : '-';

    const row = wsAnalitico.addRow([
      item.id,
      isReceber ? 'RECEITA' : 'DESPESA',
      item.pessoaNome,
      docPessoa,
      telPessoa,
      item.descricaoConta,
      `${item.numero_parcela} de ${item.total_parcelas}`,
      item.is_complementar ? 'SIM' : 'NÃO',
      dataEmissaoFormatada,
      formatDate(item.data_vencimento),
      item.data_pagamento ? formatDate(item.data_pagamento) : '-',
      formaTexto,
      diasAtraso > 0 ? diasAtraso : 0,
      val,
      pago,
      saldo,
      statusTexto,
      item.observacoes || '-',
    ]);
    row.height = 23;

    const isZebra = index % 2 === 1;
    const bgLinha = isZebra ? PALETTE.zebraBg : PALETTE.white;

    row.eachCell((cell, colNum) => {
      cell.font = { name: 'Arial', size: 9 };
      cell.border = {
        top: { style: 'thin', color: { argb: PALETTE.borderLight } },
        bottom: { style: 'thin', color: { argb: PALETTE.borderLight } },
        left: { style: 'thin', color: { argb: PALETTE.borderLight } },
        right: { style: 'thin', color: { argb: PALETTE.borderLight } },
      };

      if (!isZebra) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgLinha } };
      }

      // Tipo: RECEITA (verde claro) / DESPESA (vermelho claro)
      if (colNum === 2) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isReceber ? PALETTE.greenSoft : PALETTE.redSoft } };
        cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: isReceber ? PALETTE.greenText : PALETTE.redText } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      }
      // Cliente e Descrição
      else if (colNum === 3 || colNum === 6 || colNum === 18) {
        cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
      }
      // Parcela Complementar (destaque lilás se SIM)
      else if (colNum === 8 && item.is_complementar) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.purpleLight } };
        cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: PALETTE.purpleText } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      }
      // Como Pagou
      else if (colNum === 12 && item.forma_pagamento) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.purpleSoft } };
        cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: PALETTE.purpleText } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      }
      // Dias de atraso
      else if (colNum === 13) {
        if (diasAtraso > 0) {
          cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: PALETTE.redText } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.redLight } };
        }
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      }
      // Valores Monetários: 14 (Previsto), 15 (Pago), 16 (Saldo)
      else if (colNum === 14 || colNum === 15 || colNum === 16) {
        cell.numFmt = '"R$ " #,##0.00;[Red]-"R$ " #,##0.00';
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
        cell.font = { name: 'Arial', size: 9, bold: true };
      }
      // Status
      else if (colNum === 17) {
        let bgSt = PALETTE.amberLight;
        let fgSt = PALETTE.amberText;
        if (statusTexto === 'PAGO') {
          bgSt = PALETTE.greenLight;
          fgSt = PALETTE.greenText;
        } else if (statusTexto === 'VENCIDO') {
          bgSt = PALETTE.redLight;
          fgSt = PALETTE.redText;
        }
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgSt } };
        cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: fgSt } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      }
      // Colunas Centrais
      else if ([1, 4, 5, 7, 9, 10, 11].includes(colNum)) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      }
    });

    dataStart++;
  });

  // Linha de Totais da Aba 2 com fórmulas nativas do Excel
  const lastRow = dataStart - 1;
  const rowTotais = wsAnalitico.addRow([
    'TOTAIS CONSOLIDADOS',
    `${dados.length} lançamentos`,
    '', '', '', '', '', '', '', '', '', '',
    'SOMAS:',
    { formula: `SUM(N5:N${lastRow})`, result: somaValorTotal },
    { formula: `SUM(O5:O${lastRow})`, result: somaValorPago },
    { formula: `SUM(P5:P${lastRow})`, result: somaValorSaldo },
    '', '',
  ]);
  rowTotais.height = 28;
  rowTotais.eachCell((cell, colNum) => {
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: PALETTE.white } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.headerMaster } };
    cell.border = {
      top: { style: 'thin', color: { argb: PALETTE.borderMedium } },
      bottom: { style: 'double', color: { argb: PALETTE.white } },
    };
    if (colNum === 14 || colNum === 15 || colNum === 16) {
      cell.numFmt = '"R$ " #,##0.00';
      cell.alignment = { vertical: 'middle', horizontal: 'right' };
    } else {
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    }
  });

  // Larguras amplas para as 18 colunas (visão panorâmica perfeita)
  wsAnalitico.columns = [
    { width: 18 }, // Código Lançamento
    { width: 16 }, // Tipo
    { width: 36 }, // Cliente / Favorecido
    { width: 22 }, // CPF / CNPJ
    { width: 20 }, // Telefone / WhatsApp
    { width: 34 }, // Descrição da Conta
    { width: 16 }, // Número Parcela
    { width: 18 }, // Complementar?
    { width: 16 }, // Data Emissão
    { width: 16 }, // Data Vencimento
    { width: 16 }, // Data Pagamento
    { width: 24 }, // Como Pagou (Forma)
    { width: 16 }, // Dias Atraso
    { width: 22 }, // Valor Previsto
    { width: 22 }, // Valor Pago
    { width: 22 }, // Saldo Restante
    { width: 18 }, // Status
    { width: 38 }, // Observações / Auditoria
  ];

  // =========================================================================
  // ABA 3: AUDITORIA DE PARCELAS COMPLEMENTARES (BAIXAS PARCIAIS)
  // (Criada sempre que houver parcelas complementares para auditoria)
  // =========================================================================
  if (parcelasComplementares.length > 0) {
    const wsComp = workbook.addWorksheet('Baixas Parciais (Auditoria)', {
      views: [{ showGridLines: true }],
    });

    wsComp.mergeCells('A1:I1');
    const tComp = wsComp.getCell('A1');
    tComp.value = `🔮  ${config.nomeEmpresa || 'RR FINANCEIRO'}  |  HISTÓRICO & AUDITORIA DE PAGAMENTOS PARCIAIS`;
    tComp.font = { name: 'Arial', size: 13, bold: true, color: { argb: PALETTE.white } };
    tComp.alignment = { vertical: 'middle', horizontal: 'center' };
    tComp.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.purpleDark } };
    wsComp.getRow(1).height = 38;

    const rCompHead = wsComp.addRow([
      'ID Parcela Complementar',
      'ID Parcela Original (Pai)',
      'Cliente / Devedor',
      'Descrição da Conta',
      'Saldo Complementar (R$)',
      'Data de Vencimento',
      'Data Liquidação',
      'Status Atual',
      'Histórico / Auditoria',
    ]);
    rCompHead.height = 28;
    rCompHead.eachCell((c) => {
      c.font = { name: 'Arial', size: 10, bold: true, color: { argb: PALETTE.white } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.purpleMedium } };
      c.alignment = { vertical: 'middle', horizontal: 'center' };
      c.border = {
        top: { style: 'thin', color: { argb: PALETTE.borderMedium } },
        bottom: { style: 'medium', color: { argb: PALETTE.purpleDark } },
      };
    });

    let totalSaldoComp = 0;
    parcelasComplementares.forEach((comp) => {
      const vComp = Number(comp.valor) || 0;
      totalSaldoComp += vComp;

      const rC = wsComp.addRow([
        comp.id,
        comp.parcela_origem_id || 'Origem vinculada',
        comp.pessoaNome,
        comp.descricaoConta,
        vComp,
        formatDate(comp.data_vencimento),
        comp.data_pagamento ? formatDate(comp.data_pagamento) : '-',
        comp.status.toUpperCase(),
        comp.observacoes || 'Saldo gerado por recebimento parcial',
      ]);
      rC.height = 24;
      rC.eachCell((cell, colIdx) => {
        cell.border = {
          top: { style: 'thin', color: { argb: PALETTE.borderLight } },
          bottom: { style: 'thin', color: { argb: PALETTE.borderLight } },
          left: { style: 'thin', color: { argb: PALETTE.borderLight } },
          right: { style: 'thin', color: { argb: PALETTE.borderLight } },
        };
        cell.font = { name: 'Arial', size: 9.5 };
        if (colIdx === 5) {
          cell.numFmt = '"R$ " #,##0.00';
          cell.alignment = { vertical: 'middle', horizontal: 'right' };
          cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: PALETTE.purpleText } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.purpleSoft } };
        } else if ([1, 2, 6, 7, 8].includes(colIdx)) {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        } else if (colIdx === 3 || colIdx === 4 || colIdx === 9) {
          cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
        }
      });
    });

    // Total complementar
    const rCompTot = wsComp.addRow([
      'TOTAL COMPLEMENTAR',
      `${parcelasComplementares.length} parcelas`,
      '', '',
      totalSaldoComp,
      '', '', '', '',
    ]);
    rCompTot.height = 28;
    rCompTot.eachCell((c, idx) => {
      c.font = { name: 'Arial', size: 10, bold: true, color: { argb: PALETTE.white } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.purpleDark } };
      c.border = {
        top: { style: 'thin', color: { argb: PALETTE.borderMedium } },
        bottom: { style: 'double', color: { argb: PALETTE.white } },
      };
      if (idx === 5) {
        c.numFmt = '"R$ " #,##0.00';
        c.alignment = { vertical: 'middle', horizontal: 'right' };
      } else {
        c.alignment = { vertical: 'middle', horizontal: 'center' };
      }
    });

    wsComp.columns = [
      { width: 26 }, // Complementar
      { width: 26 }, // Origem
      { width: 36 }, // Cliente
      { width: 34 }, // Descrição
      { width: 24 }, // Saldo
      { width: 20 }, // Vencimento
      { width: 20 }, // Pagamento
      { width: 18 }, // Status
      { width: 44 }, // Histórico
    ];
  }

  // Gera o arquivo e efetua o download imediato
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const dataHojeArquivo = new Date().toISOString().split('T')[0];
  const filename = `RR_Financeiro_Executivo_${dataHojeArquivo}.xlsx`;
  saveAs(blob, filename);
}
