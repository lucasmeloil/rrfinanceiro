import { storageService } from './storage';
import { Parcela, Conta, Mensalidade, ParcelaComPessoa, ResumoDashboard, MesFluxoCaixa, WhatsAppTemplate, FormaPagamento } from '../types';

export interface BaixaParcelaPayload {
  parcelaId: string;
  valorPago: number;
  dataPagamento: string;
  formaPagamento?: FormaPagamento;
  gerarComplementarSeRestante: boolean;
  dataVencimentoComplementar?: string;
  observacoes?: string;
}

export interface ResultadoBaixa {
  parcelaQuitada: Parcela;
  parcelaComplementar?: Parcela;
  saldoRestante: number;
}

export interface GerarLoteMensalidadesPayload {
  mesReferencia: string; // formato "YYYY-MM"
  periodicidade: 'mensal' | 'trimestral' | 'semestral' | 'anual';
  intervaloDias?: number; // 8, 15, 30 ou personalizado
  apenasClientesSemMensalidadeNoMes?: boolean;
}

export const formatCurrency = (val: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(val || 0);
};

export const formatDate = (dateStr: string): string => {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

export const formatFormaPagamento = (forma?: FormaPagamento): string => {
  switch (forma) {
    case 'pix': return 'PIX';
    case 'dinheiro': return 'Dinheiro';
    case 'cartao_credito': return 'Cartão de Crédito';
    case 'cartao_debito': return 'Cartão de Débito';
    case 'boleto': return 'Boleto Bancário';
    case 'transferencia': return 'Transferência Bancária';
    case 'outro': return 'Outro';
    default: return 'PIX';
  }
};

export const getTodayDateStr = (): string => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const financialEngine = {
  /**
   * Baixa de parcela com suporte a pagamento parcial e geração automática de parcela complementar
   * Assegura que parcelaQuitada.valor + parcelaComplementar.valor === valorOriginal,
   * fazendo com que o total a receber e recebido batam com 100% de precisão contábil.
   */
  async processarBaixaParcela(payload: BaixaParcelaPayload): Promise<ResultadoBaixa> {
    const parcelas = storageService.getParcelas();
    const parcela = parcelas.find((p) => p.id === payload.parcelaId);
    if (!parcela) {
      throw new Error(`Parcela ${payload.parcelaId} não encontrada`);
    }

    const valorOriginal = Number(parcela.valor);
    const valorPago = Number(payload.valorPago);
    const saldoRestante = Math.round((valorOriginal - valorPago) * 100) / 100;
    const isParcial = saldoRestante > 0.01;
    const formaLabel = formatFormaPagamento(payload.formaPagamento || 'pix');

    // Ao quitar parcialmente, a parcela original representa a fatia efetivamente quitada (valorPago).
    // O saldo remanescente vai para a parcela complementar (saldoRestante).
    // Desta forma, parcelaQuitada.valor + parcelaComplementar.valor === valorOriginal!
    const parcelaAtualizada: Parcela = {
      ...parcela,
      valor: isParcial ? valorPago : valorOriginal,
      valor_original_historico: parcela.valor_original_historico || valorOriginal,
      valor_pago: valorPago,
      forma_pagamento: payload.formaPagamento || 'pix',
      data_pagamento: payload.dataPagamento || getTodayDateStr(),
      status: 'pago',
      observacoes: payload.observacoes
        ? isParcial
          ? `${payload.observacoes} | Baixa parcial de ${formatCurrency(valorPago)} (Original: ${formatCurrency(valorOriginal)}) via ${formaLabel}`
          : `${payload.observacoes} | Pago via ${formaLabel}`
        : isParcial
        ? `Baixa parcial de ${formatCurrency(valorPago)} (Original: ${formatCurrency(valorOriginal)}) via ${formaLabel}`
        : `Pago via ${formaLabel}`,
    };

    let parcelaComplementar: Parcela | undefined = undefined;

    // Se houver saldo restante e o operador optou por gerar complementar (ou padrão true)
    if (isParcial && payload.gerarComplementarSeRestante !== false) {
      // Data de vencimento da complementar: padrão 30 dias após hoje ou escolhida
      let dataVencComplementar = payload.dataVencimentoComplementar;
      if (!dataVencComplementar) {
        const d = new Date(payload.dataPagamento || getTodayDateStr());
        d.setDate(d.getDate() + 30);
        dataVencComplementar = d.toISOString().split('T')[0];
      }

      parcelaComplementar = {
        id: `par-comp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        conta_id: parcela.conta_id,
        numero_parcela: parcela.numero_parcela,
        total_parcelas: parcela.total_parcelas,
        valor: saldoRestante,
        valor_pago: 0,
        data_vencimento: dataVencComplementar,
        status: 'pendente',
        is_complementar: true,
        parcela_origem_id: parcela.id,
        observacoes: `Parcela complementar referente ao saldo restante de ${formatCurrency(saldoRestante)} da parcela original #${parcela.numero_parcela} (Original: ${formatCurrency(valorOriginal)}, Pago: ${formatCurrency(valorPago)})`,
      };

      await storageService.saveParcela(parcelaComplementar);
    }

    await storageService.saveParcela(parcelaAtualizada);

    // Se a parcela estiver vinculada a uma mensalidade, marcar a mensalidade também
    const mensalidades = storageService.getMensalidades();
    const mensVinculada = mensalidades.find(
      (m) => m.conta_id === parcela.conta_id || (m.pessoa_id && m.data_vencimento === parcela.data_vencimento)
    );
    if (mensVinculada) {
      await storageService.saveMensalidade({
        ...mensVinculada,
        status: saldoRestante <= 0.01 ? 'pago' : 'pendente',
        valor_pago: (mensVinculada.valor_pago || 0) + valorPago,
        data_pagamento: payload.dataPagamento,
      });
    }

    // Recalcula o status da conta pai (definindo para 'parcial', 'pago', etc.)
    await storageService.recalcularStatusConta(parcela.conta_id);

    return {
      parcelaQuitada: parcelaAtualizada,
      parcelaComplementar,
      saldoRestante: Math.max(0, saldoRestante),
    };
  },

  /**
   * Geração de lotes de mensalidades para clientes cadastrados
   */
  gerarLoteMensalidades(payload: GerarLoteMensalidadesPayload): {
    geradas: Mensalidade[];
    ignoradasJaExistentes: number;
    clientesSemConfiguracao: number;
  } {
    const pessoas = storageService.getPessoas().filter((p) => p.tipo === 'cliente' || p.tipo === 'ambos');
    const mensalidadesExistentes = storageService.getMensalidades();
    const geradas: Mensalidade[] = [];
    let ignoradasJaExistentes = 0;
    let clientesSemConfiguracao = 0;

    const [anoStr, mesStr] = payload.mesReferencia.split('-');
    const ano = parseInt(anoStr, 10);
    const mes = parseInt(mesStr, 10); // 1 a 12

    for (const cliente of pessoas) {
      if (!cliente.dia_vencimento_mensalidade || !cliente.valor_mensalidade_padrao || cliente.valor_mensalidade_padrao <= 0) {
        clientesSemConfiguracao++;
        continue;
      }

      // Checa se já existe mensalidade para este cliente neste mês
      const jaExiste = mensalidadesExistentes.some(
        (m) => m.pessoa_id === cliente.id && m.mes_referencia === payload.mesReferencia
      );

      if (jaExiste && payload.apenasClientesSemMensalidadeNoMes !== false) {
        ignoradasJaExistentes++;
        continue;
      }

      // Cálculo de datas
      const ultimoDiaDoMes = new Date(ano, mes, 0).getDate();
      const diaVencimento = Math.min(cliente.dia_vencimento_mensalidade, ultimoDiaDoMes);
      const diaEmissao = cliente.dia_emissao_mensalidade
        ? Math.min(cliente.dia_emissao_mensalidade, ultimoDiaDoMes)
        : 1;

      const dataEmissaoStr = `${ano}-${String(mes).padStart(2, '0')}-${String(diaEmissao).padStart(2, '0')}`;
      const dataVencimentoStr = `${ano}-${String(mes).padStart(2, '0')}-${String(diaVencimento).padStart(2, '0')}`;

      // Criar Conta a Receber correspondente
      const contaId = `cnt-mens-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
      const novaConta: Conta = {
        id: contaId,
        pessoa_id: cliente.id,
        tipo: 'receber',
        categoria: 'Mensalidade Recorrente',
        descricao: `Mensalidade Ref. ${String(mes).padStart(2, '0')}/${ano} - ${cliente.nome}`,
        data_emissao: dataEmissaoStr,
        data_vencimento: dataVencimentoStr,
        valor_total: cliente.valor_mensalidade_padrao,
        status: 'pendente',
        numero_parcelas: 1,
        created_at: new Date().toISOString(),
      };

      const parcelaId = `par-${contaId}-1`;
      const novaParcela: Parcela = {
        id: parcelaId,
        conta_id: contaId,
        numero_parcela: 1,
        total_parcelas: 1,
        valor: cliente.valor_mensalidade_padrao,
        data_vencimento: dataVencimentoStr,
        status: 'pendente',
      };

      storageService.saveConta(novaConta, [novaParcela]);

      // Criar Mensalidade
      const novaMensalidade: Mensalidade = {
        id: `men-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        pessoa_id: cliente.id,
        mes_referencia: payload.mesReferencia,
        data_emissao: dataEmissaoStr,
        data_vencimento: dataVencimentoStr,
        valor: cliente.valor_mensalidade_padrao,
        status: 'pendente',
        conta_id: contaId,
        created_at: new Date().toISOString(),
      };

      storageService.saveMensalidade(novaMensalidade);
      geradas.push(novaMensalidade);
    }

    return {
      geradas,
      ignoradasJaExistentes,
      clientesSemConfiguracao,
    };
  },

  /**
   * Obter parcelas enriquecidas com dados da Pessoa e Conta
   */
  getParcelasEnriquecidas(): ParcelaComPessoa[] {
    const parcelas = storageService.getParcelas();
    const contas = storageService.getContas();
    const pessoas = storageService.getPessoas();

    return parcelas.map((par) => {
      const conta = contas.find((c) => c.id === par.conta_id);
      const pessoa = conta ? pessoas.find((p) => p.id === conta.pessoa_id) : undefined;

      return {
        ...par,
        pessoaNome: pessoa?.nome || 'Não identificado',
        pessoaTelefone: pessoa?.telefone || '',
        pessoaEmail: pessoa?.email || '',
        tipoConta: conta?.tipo || 'receber',
        descricaoConta: conta?.descricao || 'Sem descrição',
      };
    });
  },

  /**
   * Cálculo dos últimos 6 meses de fluxo de caixa estritamente com dados REAIS do sistema
   */
  calcularFluxoCaixa6Meses(parcelasEnriquecidas: ParcelaComPessoa[]): MesFluxoCaixa[] {
    const nomesMeses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const resultado: MesFluxoCaixa[] = [];
    const hoje = new Date();

    // Gera os 6 meses cronológicos: dos últimos 5 meses até o mês atual
    for (let i = 5; i >= 0; i--) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      const ano = d.getFullYear();
      const mesNum = d.getMonth(); // 0 a 11
      const mesKey = `${ano}-${String(mesNum + 1).padStart(2, '0')}`;
      const rotulo = i === 0 ? `${nomesMeses[mesNum]} (Atual)` : nomesMeses[mesNum];

      let receitas = 0;
      let despesas = 0;

      for (const par of parcelasEnriquecidas) {
        const isReceber = par.tipoConta === 'receber';
        const v = Number(par.valor) || 0;
        const vp = Number(par.valor_pago) || 0;

        // Se estiver quitada, contabiliza no mês em que foi efetivamente liquidada/paga
        if (par.status === 'pago') {
          const mesPag = (par.data_pagamento || par.data_vencimento || '').substring(0, 7);
          if (mesPag === mesKey) {
            const valorRealizado = vp || v;
            if (isReceber) receitas += valorRealizado;
            else despesas += valorRealizado;
          }
        } else {
          // Se estiver pendente ou vencida, contabiliza no mês de vencimento previsto
          const mesVenc = (par.data_vencimento || '').substring(0, 7);
          if (mesVenc === mesKey) {
            const valorAberto = Math.max(0, v - vp);
            if (isReceber) receitas += valorAberto;
            else despesas += valorAberto;
          }
        }
      }

      resultado.push({
        mes: rotulo,
        mesAno: mesKey,
        receitas: Math.round(receitas * 100) / 100,
        despesas: Math.round(despesas * 100) / 100,
        saldo: Math.round((receitas - despesas) * 100) / 100,
      });
    }

    return resultado;
  },

  /**
   * Cálculo dos indicadores do Dashboard com dados 100% REAIS
   */
  calcularResumoDashboard(): ResumoDashboard {
    const parcelasEnriquecidas = this.getParcelasEnriquecidas();
    const today = getTodayDateStr();

    // Data daqui a 7 dias
    const d7 = new Date();
    d7.setDate(d7.getDate() + 7);
    const next7DaysStr = d7.toISOString().split('T')[0];

    // Mês atual
    const mesAtual = today.substring(0, 7);

    let totalReceberPendente = 0;
    let totalReceberVencido = 0;
    let totalRecebidoMes = 0;
    let totalPagarPendente = 0;
    let totalPagarVencido = 0;
    let totalPagoMes = 0;

    const vencimentosHoje: ParcelaComPessoa[] = [];
    const proximosVencimentos: ParcelaComPessoa[] = [];
    const parcelasVencidas: ParcelaComPessoa[] = [];

    for (const par of parcelasEnriquecidas) {
      const isReceber = par.tipoConta === 'receber';
      const valor = Number(par.valor) || 0;
      const valorPago = Number(par.valor_pago) || 0;

      if (par.status === 'pago') {
        const dataPag = par.data_pagamento || par.data_vencimento;
        if (dataPag.startsWith(mesAtual)) {
          if (isReceber) totalRecebidoMes += valorPago || valor;
          else totalPagoMes += valorPago || valor;
        }
      } else if (par.status === 'vencido' || par.data_vencimento < today) {
        if (isReceber) totalReceberVencido += valor;
        else totalPagarVencido += valor;
        parcelasVencidas.push(par);
      } else {
        // Pendente no prazo
        if (isReceber) totalReceberPendente += valor;
        else totalPagarPendente += valor;

        if (par.data_vencimento === today) {
          vencimentosHoje.push(par);
        } else if (par.data_vencimento > today && par.data_vencimento <= next7DaysStr) {
          proximosVencimentos.push(par);
        }
      }
    }

    const totalReceberAberto = totalReceberPendente + totalReceberVencido;
    const totalPagarAberto = totalPagarPendente + totalPagarVencido;
    const totalCobrado = totalReceberPendente + totalReceberVencido + totalRecebidoMes;
    const inadimplenciaTaxa = totalCobrado > 0 ? (totalReceberVencido / totalCobrado) * 100 : 0;
    const saldoProjetado = (totalReceberPendente + totalReceberVencido + totalRecebidoMes) - (totalPagarPendente + totalPagarVencido + totalPagoMes);
    const fluxoCaixa6Meses = this.calcularFluxoCaixa6Meses(parcelasEnriquecidas);

    return {
      totalReceberPendente,
      totalReceberVencido,
      totalReceberAberto,
      totalRecebidoMes,
      totalPagarPendente,
      totalPagarVencido,
      totalPagarAberto,
      totalPagoMes,
      saldoProjetado,
      inadimplenciaTaxa: Math.round(inadimplenciaTaxa * 10) / 10,
      vencimentosHoje,
      proximosVencimentos,
      parcelasVencidas,
      fluxoCaixa6Meses,
    };
  },

  /**
   * Gerador de Mensagem WhatsApp para Cobrança
  /**
   * Aplica variáveis dinâmicas ao texto de um template
   */
  aplicarTemplate(
    templateTexto: string,
    dados: {
      nome?: string;
      valor?: number;
      vencimento?: string;
      emissao?: string;
      descricao?: string;
      chavePix?: string;
      empresa?: string;
      parcela?: string;
    }
  ): string {
    const config = storageService.getConfig();
    const nome = dados.nome || 'Cliente';
    const valor = dados.valor !== undefined ? formatCurrency(dados.valor) : 'R$ 0,00';
    const vencimento = dados.vencimento ? formatDate(dados.vencimento) : '-';
    const emissao = dados.emissao ? formatDate(dados.emissao) : formatDate(getTodayDateStr());
    const descricao = dados.descricao || 'Fatura / Mensalidade';
    const chavePix = dados.chavePix || config.chavePixPadrao || '';
    const empresa = dados.empresa || config.nomeEmpresa || 'RR Financeiro';
    const parcela = dados.parcela || '1/1';

    return templateTexto
      .replace(/\{nome\}/gi, nome)
      .replace(/\{valor\}/gi, valor)
      .replace(/\{vencimento\}/gi, vencimento)
      .replace(/\{emissao\}/gi, emissao)
      .replace(/\{descricao\}/gi, descricao)
      .replace(/\{chave_pix\}/gi, chavePix)
      .replace(/\{chavepix\}/gi, chavePix)
      .replace(/\{empresa\}/gi, empresa)
      .replace(/\{parcela\}/gi, parcela);
  },

  /**
   * Sugere o modelo mais apropriado com base no vencimento da parcela
   */
  obterTemplateSugerido(parcela: ParcelaComPessoa, templates: WhatsAppTemplate[]): WhatsAppTemplate {
    const today = getTodayDateStr();
    let tipoAlvo: 'em_atraso' | 'vence_hoje' | 'vencimento_proximo' = 'vencimento_proximo';

    if (parcela.status === 'vencido' || parcela.data_vencimento < today) {
      tipoAlvo = 'em_atraso';
    } else if (parcela.data_vencimento === today) {
      tipoAlvo = 'vence_hoje';
    } else {
      tipoAlvo = 'vencimento_proximo';
    }

    const encontrado = templates.find((t) => t.tipo === tipoAlvo);
    return encontrado || templates[0];
  },

  /**
   * Gera a mensagem formatada para envio no WhatsApp
   */
  gerarMensagemCobranca(
    parcela: ParcelaComPessoa,
    templateOuTexto?: WhatsAppTemplate | string,
    dataEmissao?: string
  ): string {
    let textoBase = '';
    if (typeof templateOuTexto === 'string') {
      textoBase = templateOuTexto;
    } else if (templateOuTexto && typeof templateOuTexto === 'object' && templateOuTexto.mensagem) {
      textoBase = templateOuTexto.mensagem;
    } else {
      const templates = storageService.getWhatsAppTemplates();
      const sugerido = this.obterTemplateSugerido(parcela, templates);
      textoBase = sugerido ? sugerido.mensagem : '';
    }

    return this.aplicarTemplate(textoBase, {
      nome: parcela.pessoaNome,
      valor: parcela.valor,
      vencimento: parcela.data_vencimento,
      emissao: dataEmissao,
      descricao: parcela.descricaoConta,
      parcela: `${parcela.numero_parcela}/${parcela.total_parcelas}`,
    });
  },

  /**
   * Gerador de Link Direto para WhatsApp com mensagem personalizada
   */
  gerarLinkWhatsappCobranca(
    parcela: ParcelaComPessoa,
    templateOuTexto?: WhatsAppTemplate | string,
    dataEmissao?: string
  ): string {
    const telLimpo = (parcela.pessoaTelefone || '').replace(/\D/g, '');
    const msg = this.gerarMensagemCobranca(parcela, templateOuTexto, dataEmissao);
    const textoEncoded = encodeURIComponent(msg);

    if (!telLimpo) {
      return `https://wa.me/?text=${textoEncoded}`;
    }
    const telComDdi = telLimpo.startsWith('55') ? telLimpo : `55${telLimpo}`;
    return `https://wa.me/${telComDdi}?text=${textoEncoded}`;
  },
};
