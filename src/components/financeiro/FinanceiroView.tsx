import React, { useState, useMemo } from 'react';
import {
  DollarSign,
  FileSpreadsheet,
  Download,
  PlusCircle,
  Filter,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Layers,
  ArrowDownCircle,
  ArrowUpCircle,
  Calendar,
  ChevronDown,
  ChevronUp,
  Trash2,
  X,
  TrendingUp,
  Percent,
  RefreshCw,
  Wallet,
  FileText,
} from 'lucide-react';
import { Conta, Parcela, Pessoa, TipoConta, ParcelaComPessoa, FiltrosRelatorio } from '../../types';
import { storageService } from '../../services/storage';
import { formatCurrency, formatDate, getTodayDateStr, formatFormaPagamento } from '../../services/financialEngine';
import { exportarRelatorioExcel } from '../../services/excelExport';
import { notificationService } from '../../services/notificationService';
import { baixarReciboPdf, criarDadosReciboDeParcela } from '../../services/receiptService';

interface FinanceiroViewProps {
  contas: Conta[];
  pessoas: Pessoa[];
  parcelas: ParcelaComPessoa[];
  onRefresh: () => void;
  onDarBaixa: (parcela: ParcelaComPessoa) => void;
}

export const FinanceiroView: React.FC<FinanceiroViewProps> = ({
  contas,
  pessoas,
  parcelas,
  onRefresh,
  onDarBaixa,
}) => {
  // Abas do Módulo Financeiro
  const [activeSubTab, setActiveSubTab] = useState<'faturamento' | 'baixas' | 'extrato' | 'excel'>('faturamento');

  // Filtros Globais / Busca
  const [busca, setBusca] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'receber' | 'pagar'>('todos');
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [filtroPessoaId, setFiltroPessoaId] = useState<string>('');
  const [dataInicio, setDataInicio] = useState<string>('');
  const [dataFim, setDataFim] = useState<string>('');
  const [exportando, setExportando] = useState(false);

  // Estados de Faturamento (Contas expandidas)
  const [expandedContas, setExpandedContas] = useState<Record<string, boolean>>({});

  // Modal de Novo Faturamento / Conta
  const [modalNovoFaturamento, setModalNovoFaturamento] = useState(false);
  const [formTipo, setFormTipo] = useState<TipoConta>('receber');
  const [formPessoaId, setFormPessoaId] = useState('');
  const [formDescricao, setFormDescricao] = useState('');
  const [formCategoria, setFormCategoria] = useState('Prestação de Serviços');
  const [formDataEmissao, setFormDataEmissao] = useState(getTodayDateStr());
  const [formDataVencimento, setFormDataVencimento] = useState(getTodayDateStr());
  const [formValorTotal, setFormValorTotal] = useState<number>(0);
  const [formNumParcelas, setFormNumParcelas] = useState<number>(1);
  const [formIntervaloDias, setFormIntervaloDias] = useState<number>(30);
  const [salvandoConta, setSalvandoConta] = useState(false);
  const [erroForm, setErroForm] = useState('');

  // Toggle expandir conta
  const toggleExpand = (contaId: string) => {
    setExpandedContas((prev) => ({ ...prev, [contaId]: !prev[contaId] }));
  };

  // -------------------------------------------------------------
  // CÁLCULOS EXECUTIVOS & FLUXO DE CAIXA
  // -------------------------------------------------------------
  const hoje = getTodayDateStr();

  const metricas = useMemo(() => {
    let totalReceberPrevisto = 0;
    let totalReceberRealizado = 0;
    let totalPagarPrevisto = 0;
    let totalPagarRealizado = 0;
    let totalVencido = 0;

    parcelas.forEach((p) => {
      const v = Number(p.valor) || 0;
      const vp = Number(p.valor_pago) || (p.status === 'pago' ? v : 0);

      if (p.tipoConta === 'receber') {
        totalReceberPrevisto += v;
        totalReceberRealizado += vp;
      } else {
        totalPagarPrevisto += v;
        totalPagarRealizado += vp;
      }

      if (p.status !== 'pago' && p.data_vencimento < hoje) {
        totalVencido += Math.max(0, v - vp);
      }
    });

    const saldoRealizado = totalReceberRealizado - totalPagarRealizado;
    const saldoProjetado = totalReceberPrevisto - totalPagarPrevisto;
    const inadimplencia = totalReceberPrevisto > 0
      ? Math.round((totalVencido / totalReceberPrevisto) * 1000) / 10
      : 0;

    return {
      totalReceberPrevisto,
      totalReceberRealizado,
      saldoReceberPendente: Math.max(0, totalReceberPrevisto - totalReceberRealizado),
      totalPagarPrevisto,
      totalPagarRealizado,
      saldoPagarPendente: Math.max(0, totalPagarPrevisto - totalPagarRealizado),
      saldoRealizado,
      saldoProjetado,
      totalVencido,
      inadimplencia,
    };
  }, [parcelas, hoje]);

  // -------------------------------------------------------------
  // FILTRAGEM DE CONTAS (ABA FATURAMENTO)
  // -------------------------------------------------------------
  const contasFiltradas = useMemo(() => {
    return contas.filter((c) => {
      if (filtroTipo !== 'todos' && c.tipo !== filtroTipo) return false;
      if (filtroStatus !== 'todos' && c.status !== filtroStatus) return false;
      if (filtroPessoaId && c.pessoa_id !== filtroPessoaId) return false;

      if (busca) {
        const termo = busca.toLowerCase();
        const nomePessoa = pessoas.find((p) => p.id === c.pessoa_id)?.nome.toLowerCase() || '';
        const matchDesc = c.descricao.toLowerCase().includes(termo);
        const matchCat = c.categoria.toLowerCase().includes(termo);
        const matchPessoa = nomePessoa.includes(termo);
        if (!matchDesc && !matchCat && !matchPessoa) return false;
      }

      return true;
    });
  }, [contas, pessoas, filtroTipo, filtroStatus, filtroPessoaId, busca]);

  // -------------------------------------------------------------
  // FILTRAGEM DE PARCELAS PARA BAIXAS (ABA BAIXAS & LIQUIDAÇÕES)
  // -------------------------------------------------------------
  const parcelasParaBaixa = useMemo(() => {
    return parcelas.filter((p) => {
      // Prioridade para liquidações: pendentes ou vencidas
      if (filtroStatus !== 'todos') {
        if (filtroStatus === 'pendente' && p.status !== 'pendente') return false;
        if (filtroStatus === 'vencido' && p.status !== 'vencido') return false;
        if (filtroStatus === 'pago' && p.status !== 'pago') return false;
      }

      if (filtroTipo !== 'todos' && p.tipoConta !== filtroTipo) return false;
      if (filtroPessoaId) {
        const pessoaMatch = pessoas.find((pes) => pes.id === filtroPessoaId);
        if (pessoaMatch && !p.pessoaNome.toLowerCase().includes(pessoaMatch.nome.toLowerCase())) {
          return false;
        }
      }

      if (dataInicio && p.data_vencimento < dataInicio) return false;
      if (dataFim && p.data_vencimento > dataFim) return false;

      if (busca) {
        const termo = busca.toLowerCase();
        const matchNome = p.pessoaNome.toLowerCase().includes(termo);
        const matchDesc = p.descricaoConta.toLowerCase().includes(termo);
        if (!matchNome && !matchDesc) return false;
      }

      return true;
    });
  }, [parcelas, pessoas, filtroTipo, filtroStatus, filtroPessoaId, dataInicio, dataFim, busca]);

  // -------------------------------------------------------------
  // EXPORTAÇÃO EXCEL ROBUSTA
  // -------------------------------------------------------------
  const handleExportarExcel = async () => {
    try {
      setExportando(true);
      if (onRefresh) {
        onRefresh();
      }
      const filtrosPayload: FiltrosRelatorio = {
        tipo: filtroTipo,
        status: (filtroStatus === 'pago' || filtroStatus === 'pendente' || filtroStatus === 'vencido') ? filtroStatus : 'todos',
        pessoaId: filtroPessoaId,
        dataInicio,
        dataFim,
      };
      // Exporta em tempo real puxando os recebimentos atualizados do Supabase
      await exportarRelatorioExcel(filtrosPayload);
      notificationService.sucesso(
        'Relatório Excel Exportado!',
        'Planilha executiva baixada com recebimentos em tempo real e análise contábil.',
        undefined,
        'financeiro'
      );
    } catch (err) {
      console.error('Erro na exportação Excel:', err);
      notificationService.erro(
        'Falha na Exportação',
        'Houve um erro ao gerar a planilha Excel executiva.',
        undefined,
        'financeiro'
      );
    } finally {
      setExportando(false);
    }
  };

  // -------------------------------------------------------------
  // SALVAR NOVO FATURAMENTO / CONTA
  // -------------------------------------------------------------
  const handleSalvarFaturamento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPessoaId || !formDescricao || formValorTotal <= 0) {
      setErroForm('Preencha os campos obrigatórios e um valor maior que zero.');
      return;
    }

    try {
      setSalvandoConta(true);
      setErroForm('');

      const contaId = `cnt-${Date.now()}`;
      const numParc = Math.max(1, formNumParcelas);
      const valorParcelaBase = Math.floor((formValorTotal / numParc) * 100) / 100;
      const diferencaCentavos = Math.round((formValorTotal - valorParcelaBase * numParc) * 100) / 100;

      const parcelasGeradas: Parcela[] = [];

      for (let i = 1; i <= numParc; i++) {
        const dataVenc = new Date(formDataVencimento);
        if (i > 1) {
          dataVenc.setDate(dataVenc.getDate() + (i - 1) * formIntervaloDias);
        }
        const dataVencStr = dataVenc.toISOString().split('T')[0];
        const valorDesta = i === 1 ? valorParcelaBase + diferencaCentavos : valorParcelaBase;

        parcelasGeradas.push({
          id: `par-${contaId}-${i}`,
          conta_id: contaId,
          numero_parcela: i,
          total_parcelas: numParc,
          valor: valorDesta,
          data_vencimento: dataVencStr,
          status: 'pendente',
        });
      }

      const novaConta: Conta = {
        id: contaId,
        pessoa_id: formPessoaId,
        tipo: formTipo,
        categoria: formCategoria,
        descricao: formDescricao,
        data_emissao: formDataEmissao,
        data_vencimento: formDataVencimento,
        valor_total: formValorTotal,
        status: 'pendente',
        numero_parcelas: numParc,
        created_at: new Date().toISOString(),
      };

      await storageService.saveConta(novaConta, parcelasGeradas);

      const pessoaNome = pessoas.find((p) => p.id === formPessoaId)?.nome || 'Cliente/Fornecedor';
      const tipoNome = formTipo === 'receber' ? 'Receita / Faturamento' : 'Despesa a Pagar';
      notificationService.sucesso(
        `${tipoNome} Cadastrado!`,
        `Conta "${formDescricao}" de R$ ${formValorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} em ${numParc}x para ${pessoaNome}.`,
        { tab: 'financeiro', label: 'Ver Faturamento' },
        'financeiro'
      );

      setModalNovoFaturamento(false);
      setFormDescricao('');
      setFormValorTotal(0);
      setFormNumParcelas(1);
      onRefresh();
    } catch (err: any) {
      const msg = err.message || 'Erro ao registrar faturamento.';
      setErroForm(msg);
      notificationService.erro('Erro ao Salvar Faturamento', msg, undefined, 'financeiro');
    } finally {
      setSalvandoConta(false);
    }
  };

  const handleExcluirConta = async (id: string, desc: string) => {
    if (window.confirm(`Deseja realmente excluir a fatura/conta "${desc}" e todas as suas parcelas do sistema e do banco de dados?`)) {
      await storageService.deleteConta(id);
      notificationService.aviso(
        'Conta Excluída',
        `A fatura/conta "${desc}" e suas parcelas foram excluídas do sistema.`,
        { tab: 'financeiro', label: 'Atualizar' },
        'financeiro'
      );
      onRefresh();
    }
  };

  return (
    <div className="page-wrapper">
      {/* HEADER DO MÓDULO FINANCEIRO - DESKTOP */}
      <div className="desktop-only" style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', flexShrink: 0 }}>
                <Wallet size={20} />
              </div>
              <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Módulo Financeiro & Controladoria
              </h1>
            </div>
            <p style={{ fontSize: '0.86rem', color: '#64748b', margin: '0.35rem 0 0 0' }}>
              Centralize faturamento, liquidações totais/parciais e relatórios executivos com precisão contábil.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button
              className="btn btn-secondary"
              onClick={handleExportarExcel}
              disabled={exportando}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minHeight: '40px' }}
            >
              <Download size={16} color="#16a34a" />
              <span>{exportando ? 'Gerando...' : 'Exportar Excel'}</span>
            </button>

            <button
              className="btn btn-primary"
              onClick={() => setModalNovoFaturamento(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minHeight: '40px' }}
            >
              <PlusCircle size={16} />
              <span>Novo Faturamento</span>
            </button>
          </div>
        </div>
      </div>

      {/* HEADER DO MÓDULO FINANCEIRO - MOBILE (AÇÕES RÁPIDAS COMPACTAS) */}
      <div className="mobile-only" style={{ marginBottom: '0.85rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
          <button
            className="btn btn-primary"
            onClick={() => setModalNovoFaturamento(true)}
            style={{
              width: '100%',
              minHeight: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.35rem',
              fontSize: '0.82rem',
              fontWeight: 600,
              borderRadius: '10px',
              padding: '0 0.65rem',
            }}
          >
            <PlusCircle size={15} />
            <span>Novo Faturamento</span>
          </button>

          <button
            className="btn btn-secondary"
            onClick={handleExportarExcel}
            disabled={exportando}
            style={{
              width: '100%',
              minHeight: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.35rem',
              fontSize: '0.82rem',
              fontWeight: 600,
              borderRadius: '10px',
              padding: '0 0.65rem',
            }}
          >
            <Download size={15} color="#16a34a" />
            <span>{exportando ? 'Gerando...' : 'Baixar Excel'}</span>
          </button>
        </div>
      </div>

      {/* CARDS DE RESUMO EXECUTIVO (MÉTRICAS RÁPIDAS) */}
      <div className="kpi-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="kpi-card" style={{ borderLeft: '4px solid #2563eb' }}>
          <div className="kpi-icon-wrapper" style={{ backgroundColor: '#eff6ff', color: '#2563eb' }}>
            <TrendingUp size={20} />
          </div>
          <div className="kpi-label">Total Faturado a Receber</div>
          <div className="kpi-value" style={{ color: '#1e40af' }}>{formatCurrency(metricas.totalReceberPrevisto)}</div>
          <div className="kpi-subtext">
            <span>Realizado: </span>
            <strong style={{ color: '#16a34a' }}>{formatCurrency(metricas.totalReceberRealizado)}</strong>
          </div>
        </div>

        <div className="kpi-card" style={{ borderLeft: '4px solid #dc2626' }}>
          <div className="kpi-icon-wrapper" style={{ backgroundColor: '#fef2f2', color: '#dc2626' }}>
            <ArrowUpCircle size={20} />
          </div>
          <div className="kpi-label">Total Contas a Pagar</div>
          <div className="kpi-value" style={{ color: '#991b1b' }}>{formatCurrency(metricas.totalPagarPrevisto)}</div>
          <div className="kpi-subtext">
            <span>Liquidado: </span>
            <strong style={{ color: '#16a34a' }}>{formatCurrency(metricas.totalPagarRealizado)}</strong>
          </div>
        </div>

        <div className="kpi-card" style={{ borderLeft: '4px solid #16a34a' }}>
          <div className="kpi-icon-wrapper" style={{ backgroundColor: '#f0fdf4', color: '#16a34a' }}>
            <Wallet size={20} />
          </div>
          <div className="kpi-label">Saldo Líquido Realizado</div>
          <div className="kpi-value" style={{ color: metricas.saldoRealizado >= 0 ? '#166534' : '#991b1b' }}>
            {formatCurrency(metricas.saldoRealizado)}
          </div>
          <div className="kpi-subtext">
            <span>Projetado: </span>
            <strong>{formatCurrency(metricas.saldoProjetado)}</strong>
          </div>
        </div>

        <div className="kpi-card" style={{ borderLeft: '4px solid #d97706' }}>
          <div className="kpi-icon-wrapper" style={{ backgroundColor: '#fef3c7', color: '#d97706' }}>
            <AlertTriangle size={20} />
          </div>
          <div className="kpi-label">Vencidos / Inadimplência</div>
          <div className="kpi-value" style={{ color: '#b45309' }}>{formatCurrency(metricas.totalVencido)}</div>
          <div className="kpi-subtext">
            <span>Índice de Atraso: </span>
            <strong>{metricas.inadimplencia}%</strong>
          </div>
        </div>
      </div>

      {/* SELETOR DE ABAS INTERNAS */}
      <div className="financeiro-tab-pill-container">
        <button
          onClick={() => setActiveSubTab('faturamento')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.7rem 1.2rem',
            fontWeight: 700,
            fontSize: '0.92rem',
            borderRadius: '8px 8px 0 0',
            border: 'none',
            cursor: 'pointer',
            backgroundColor: activeSubTab === 'faturamento' ? '#ffffff' : 'transparent',
            color: activeSubTab === 'faturamento' ? '#2563eb' : '#64748b',
            borderBottom: activeSubTab === 'faturamento' ? '3px solid #2563eb' : '3px solid transparent',
            transition: 'all 0.2s',
          }}
        >
          <Layers size={17} />
          <span>Faturamento & Lançamentos ({contas.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('baixas')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.7rem 1.2rem',
            fontWeight: 700,
            fontSize: '0.92rem',
            borderRadius: '8px 8px 0 0',
            border: 'none',
            cursor: 'pointer',
            backgroundColor: activeSubTab === 'baixas' ? '#ffffff' : 'transparent',
            color: activeSubTab === 'baixas' ? '#2563eb' : '#64748b',
            borderBottom: activeSubTab === 'baixas' ? '3px solid #2563eb' : '3px solid transparent',
            transition: 'all 0.2s',
          }}
        >
          <CheckCircle2 size={17} />
          <span>Baixas & Liquidações ({parcelas.filter(p => p.status !== 'pago').length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('extrato')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.7rem 1.2rem',
            fontWeight: 700,
            fontSize: '0.92rem',
            borderRadius: '8px 8px 0 0',
            border: 'none',
            cursor: 'pointer',
            backgroundColor: activeSubTab === 'extrato' ? '#ffffff' : 'transparent',
            color: activeSubTab === 'extrato' ? '#2563eb' : '#64748b',
            borderBottom: activeSubTab === 'extrato' ? '3px solid #2563eb' : '3px solid transparent',
            transition: 'all 0.2s',
          }}
        >
          <TrendingUp size={17} />
          <span>Extrato & Fluxo de Caixa</span>
        </button>

        <button
          onClick={() => setActiveSubTab('excel')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.7rem 1.2rem',
            fontWeight: 700,
            fontSize: '0.92rem',
            borderRadius: '8px 8px 0 0',
            border: 'none',
            cursor: 'pointer',
            backgroundColor: activeSubTab === 'excel' ? '#ffffff' : 'transparent',
            color: activeSubTab === 'excel' ? '#16a34a' : '#64748b',
            borderBottom: activeSubTab === 'excel' ? '3px solid #16a34a' : '3px solid transparent',
            transition: 'all 0.2s',
          }}
        >
          <FileSpreadsheet size={17} />
          <span>Relatórios em Excel (.xlsx)</span>
        </button>
      </div>

      {/* BARRA DE FILTROS RÁPIDOS */}
      <div className="card" style={{ marginBottom: '1.25rem', padding: '1rem' }}>
        <div className="financeiro-filter-row" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: 10, top: 12, color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Buscar por cliente, fornecedor, descrição ou categoria..."
              className="form-control"
              style={{ paddingLeft: '2.2rem' }}
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>

          <div style={{ minWidth: '150px' }}>
            <select
              className="form-control"
              value={filtroTipo}
              onChange={(e: any) => setFiltroTipo(e.target.value)}
            >
              <option value="todos">Todos os Tipos</option>
              <option value="receber">Receitas (A Receber)</option>
              <option value="pagar">Despesas (A Pagar)</option>
            </select>
          </div>

          <div style={{ minWidth: '150px' }}>
            <select
              className="form-control"
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
            >
              <option value="todos">Todos os Status</option>
              <option value="pendente">Pendente (Em Aberto)</option>
              <option value="parcial">Parcial (Quitada Parcialmente)</option>
              <option value="pago">Quitado / Pago</option>
              <option value="vencido">Vencido (Em Atraso)</option>
            </select>
          </div>

          <div style={{ minWidth: '170px' }}>
            <select
              className="form-control"
              value={filtroPessoaId}
              onChange={(e) => setFiltroPessoaId(e.target.value)}
            >
              <option value="">Todos os Cadastros</option>
              {pessoas.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
          </div>

          {(busca || filtroTipo !== 'todos' || filtroStatus !== 'todos' || filtroPessoaId) && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setBusca('');
                setFiltroTipo('todos');
                setFiltroStatus('todos');
                setFiltroPessoaId('');
                setDataInicio('');
                setDataFim('');
              }}
            >
              Limpar Filtros
            </button>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* ABA 1: FATURAMENTO & LANÇAMENTOS */}
      {/* ========================================================= */}
      {activeSubTab === 'faturamento' && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Layers size={18} color="#2563eb" />
              <span>Faturas e Lançamentos Registrados ({contasFiltradas.length})</span>
            </div>
            <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
              Histórico unificado de títulos
            </span>
          </div>

          {contasFiltradas.length === 0 ? (
            <div className="empty-state">
              <Layers size={40} color="#94a3b8" />
              <h4>Nenhum faturamento encontrado</h4>
              <p>Clique no botão acima para cadastrar uma nova conta a receber ou pagar.</p>
            </div>
          ) : (
            <>
              <div className="table-container desktop-only">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Tipo</th>
                    <th>Pessoa / Sacado</th>
                    <th>Descrição & Categoria</th>
                    <th>Emissão</th>
                    <th>1º Vencimento</th>
                    <th style={{ textAlign: 'right' }}>Valor Total</th>
                    <th>Status</th>
                    <th>Parcelamento</th>
                    <th style={{ textAlign: 'center' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {contasFiltradas.map((conta) => {
                    const pessoaNome = pessoas.find((p) => p.id === conta.pessoa_id)?.nome || 'Não identificada';
                    const isReceber = conta.tipo === 'receber';
                    const isExpanded = !!expandedContas[conta.id];
                    const parcelasConta = parcelas.filter((p) => p.conta_id === conta.id);
                    const totalPagoConta = parcelasConta.reduce(
                      (acc, p) => acc + (Number(p.valor_pago) || (p.status === 'pago' ? Number(p.valor) : 0)),
                      0
                    );
                    const saldoRestanteConta = Math.max(0, Math.round((Number(conta.valor_total) - totalPagoConta) * 100) / 100);
                    const isParcialConta = totalPagoConta > 0 && saldoRestanteConta > 0.01;

                    return (
                      <React.Fragment key={conta.id}>
                        <tr>
                          <td>
                            <span className={`badge ${isReceber ? 'badge-success' : 'badge-danger'}`}>
                              {isReceber ? <ArrowDownCircle size={13} /> : <ArrowUpCircle size={13} />}
                              <span>{isReceber ? 'Receita' : 'Despesa'}</span>
                            </span>
                          </td>
                          <td>
                            <strong>{pessoaNome}</strong>
                          </td>
                          <td>
                            <div>{conta.descricao}</div>
                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{conta.categoria}</span>
                          </td>
                          <td>{formatDate(conta.data_emissao)}</td>
                          <td>{formatDate(conta.data_vencimento)}</td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: 800, color: isReceber ? '#2563eb' : '#dc2626' }}>
                              {formatCurrency(conta.valor_total)}
                            </div>
                            {isParcialConta && (
                              <div style={{ fontSize: '0.73rem', marginTop: '2px', lineHeight: '1.2' }}>
                                <span style={{ color: '#16a34a', fontWeight: 600 }}>Pago: {formatCurrency(totalPagoConta)}</span>
                                <div style={{ color: '#d97706', fontWeight: 800 }}>Restante: {formatCurrency(saldoRestanteConta)}</div>
                              </div>
                            )}
                          </td>
                          <td>
                            <span
                              className={`badge ${
                                conta.status === 'pago'
                                  ? 'badge-success'
                                  : conta.status === 'parcial'
                                  ? 'badge-warning'
                                  : conta.status === 'vencido'
                                  ? 'badge-danger'
                                  : 'badge-secondary'
                              }`}
                            >
                              {conta.status === 'pago'
                                ? 'Quitada'
                                : conta.status === 'parcial'
                                ? 'Parcial'
                                : conta.status === 'vencido'
                                ? 'Vencida'
                                : 'Pendente'}
                            </span>
                          </td>
                          <td>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => toggleExpand(conta.id)}
                              style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem' }}
                            >
                              <span>{parcelasConta.length} parc.</span>
                              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              className="btn-icon"
                              title="Excluir Conta"
                              onClick={() => handleExcluirConta(conta.id, conta.descricao)}
                              style={{ color: '#ef4444' }}
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>

                        {/* Detalhamento das parcelas expandidas */}
                        {isExpanded && (
                          <tr>
                            <td colSpan={9} style={{ backgroundColor: '#f8fafc', padding: '1rem' }}>
                              <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.5rem', color: '#334155' }}>
                                Parcelas vinculadas à fatura:
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem' }}>
                                {parcelasConta.map((par) => {
                                  const isComp = par.is_complementar;
                                  return (
                                    <div
                                      key={par.id}
                                      style={{
                                        border: isComp ? '1px solid #d8b4fe' : '1px solid #cbd5e1',
                                        backgroundColor: isComp ? '#faf5ff' : '#ffffff',
                                        borderRadius: '8px',
                                        padding: '0.75rem',
                                      }}
                                    >
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontWeight: 700, fontSize: '0.86rem' }}>
                                          Parcela {par.numero_parcela}/{par.total_parcelas}
                                          {isComp && (
                                            <span style={{ marginLeft: '0.35rem', color: '#7e22ce', fontSize: '0.75rem' }}>
                                              (Complementar)
                                            </span>
                                          )}
                                        </span>
                                        <span
                                          className={`badge ${
                                            par.status === 'pago' ? 'badge-success' : par.status === 'vencido' ? 'badge-danger' : 'badge-secondary'
                                          }`}
                                        >
                                          {par.status.toUpperCase()}
                                        </span>
                                      </div>

                                      <div style={{ marginTop: '0.4rem', fontSize: '0.84rem' }}>
                                        <div>Vencimento: <strong>{formatDate(par.data_vencimento)}</strong></div>
                                        <div>Valor: <strong style={{ color: '#2563eb' }}>{formatCurrency(par.valor)}</strong></div>
                                        {par.valor_pago && (
                                          <div>
                                            Pago: <strong style={{ color: '#16a34a' }}>{formatCurrency(par.valor_pago)}</strong>
                                            {par.forma_pagamento && (
                                              <span className="badge badge-secondary" style={{ marginLeft: '0.35rem', fontSize: '0.7rem' }}>
                                                {formatFormaPagamento(par.forma_pagamento)}
                                              </span>
                                            )}
                                            {' '}({formatDate(par.data_pagamento || '')})
                                          </div>
                                        )}
                                      </div>

                                      {par.status !== 'pago' ? (
                                        <button
                                          className="btn btn-success btn-sm"
                                          onClick={() => onDarBaixa(par)}
                                          style={{ width: '100%', marginTop: '0.6rem', padding: '0.35rem' }}
                                        >
                                          <CheckCircle2 size={14} />
                                          <span>Dar Baixa / Receber</span>
                                        </button>
                                      ) : (
                                        <button
                                          type="button"
                                          className="btn btn-secondary btn-sm"
                                          onClick={() => baixarReciboPdf(criarDadosReciboDeParcela(par))}
                                          style={{ width: '100%', marginTop: '0.6rem', padding: '0.35rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
                                          title="Baixar Recibo Oficial em PDF"
                                        >
                                          <FileText size={14} />
                                          <span>Recibo em PDF</span>
                                        </button>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* LISTAGEM RESPONSIVA MOBILE: CARDS INTUITIVOS PARA TELAS MENORES */}
            <div className="mobile-only" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {contasFiltradas.map((conta) => {
                const pessoaNome = pessoas.find((p) => p.id === conta.pessoa_id)?.nome || 'Não identificada';
                const isReceber = conta.tipo === 'receber';
                const isExpanded = !!expandedContas[conta.id];
                const parcelasConta = parcelas.filter((p) => p.conta_id === conta.id);
                const pagasCount = parcelasConta.filter((p) => p.status === 'pago').length;
                const totalPagoConta = parcelasConta.reduce(
                  (acc, p) => acc + (Number(p.valor_pago) || (p.status === 'pago' ? Number(p.valor) : 0)),
                  0
                );
                const saldoRestanteConta = Math.max(0, Math.round((Number(conta.valor_total) - totalPagoConta) * 100) / 100);
                const isParcialConta = totalPagoConta > 0 && saldoRestanteConta > 0.01;

                return (
                  <div key={conta.id} className="financeiro-mobile-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                        <span className={`badge ${isReceber ? 'badge-success' : 'badge-danger'}`}>
                          {isReceber ? <ArrowDownCircle size={13} /> : <ArrowUpCircle size={13} />}
                          <span>{isReceber ? 'Receita' : 'Despesa'}</span>
                        </span>
                        <span
                          className={`badge ${
                            conta.status === 'pago'
                              ? 'badge-success'
                              : conta.status === 'parcial'
                              ? 'badge-warning'
                              : conta.status === 'vencido'
                              ? 'badge-danger'
                              : 'badge-secondary'
                          }`}
                        >
                          {conta.status === 'pago'
                            ? 'Quitada'
                            : conta.status === 'parcial'
                            ? 'Parcial'
                            : conta.status === 'vencido'
                            ? 'Vencida'
                            : 'Pendente'}
                        </span>
                      </div>
                      <button
                        className="btn-icon"
                        title="Excluir Fatura"
                        onClick={() => handleExcluirConta(conta.id, conta.descricao)}
                        style={{ color: '#ef4444', padding: '0.2rem' }}
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>

                    <div>
                      <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0f172a', lineHeight: 1.3 }}>
                        {pessoaNome}
                      </div>
                      <div style={{ fontSize: '0.86rem', color: '#475569', marginTop: '0.2rem' }}>
                        {conta.descricao}
                        {conta.categoria && <span style={{ color: '#64748b' }}> • {conta.categoria}</span>}
                      </div>
                    </div>

                    <div className="financeiro-mobile-grid-info">
                      <div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Valor Total</div>
                        <div style={{ fontWeight: 900, fontSize: '1.12rem', color: isReceber ? '#15803d' : '#b91c1c' }}>
                          {formatCurrency(conta.valor_total)}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>1º Vencimento</div>
                        <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#1e293b', marginTop: '2px' }}>
                          {formatDate(conta.data_vencimento)}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Emissão</div>
                        <div style={{ fontSize: '0.84rem', color: '#334155' }}>
                          {formatDate(conta.data_emissao)}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Parcelamento</div>
                        <div style={{ fontSize: '0.84rem', color: '#334155' }}>
                          {pagasCount}/{parcelasConta.length} quitadas
                        </div>
                      </div>
                    </div>

                    {isParcialConta && (
                      <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '8px', padding: '0.45rem 0.65rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                        <span style={{ color: '#16a34a', fontWeight: 700 }}>Pago: {formatCurrency(totalPagoConta)}</span>
                        <span style={{ color: '#b45309', fontWeight: 800 }}>Saldo Restante: {formatCurrency(saldoRestanteConta)}</span>
                      </div>
                    )}

                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => toggleExpand(conta.id)}
                      style={{
                        width: '100%',
                        minHeight: '40px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.4rem',
                        fontSize: '0.86rem',
                        fontWeight: 600,
                      }}
                    >
                      <span>{isExpanded ? 'Ocultar Parcelas' : `Ver ${parcelasConta.length} Parcela(s)`}</span>
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>

                    {isExpanded && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.25rem', paddingTop: '0.65rem', borderTop: '1px dashed #cbd5e1' }}>
                        {parcelasConta.map((par) => {
                          const isComp = par.is_complementar;
                          const isParPago = par.status === 'pago';
                          return (
                            <div
                              key={par.id}
                              style={{
                                border: isComp ? '1px solid #d8b4fe' : '1px solid #e2e8f0',
                                backgroundColor: isComp ? '#faf5ff' : '#f8fafc',
                                borderRadius: '10px',
                                padding: '0.75rem',
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                                <span style={{ fontWeight: 700, fontSize: '0.86rem', color: '#0f172a' }}>
                                  Parcela {par.numero_parcela}/{par.total_parcelas}
                                  {isComp && <span style={{ marginLeft: '0.35rem', color: '#7e22ce', fontSize: '0.75rem' }}>(Complementar)</span>}
                                </span>
                                <span className={`badge ${isParPago ? 'badge-success' : par.status === 'vencido' ? 'badge-danger' : 'badge-secondary'}`}>
                                  {par.status.toUpperCase()}
                                </span>
                              </div>

                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', color: '#334155' }}>
                                <span>Venc: <strong>{formatDate(par.data_vencimento)}</strong></span>
                                <span>Valor: <strong style={{ color: '#2563eb' }}>{formatCurrency(par.valor)}</strong></span>
                              </div>

                              {par.valor_pago && (
                                <div style={{ fontSize: '0.78rem', color: '#16a34a', marginTop: '0.3rem', fontWeight: 600 }}>
                                  Pago: {formatCurrency(par.valor_pago)}
                                  {par.forma_pagamento && ` via ${formatFormaPagamento(par.forma_pagamento)}`}
                                  {' '}({formatDate(par.data_pagamento || '')})
                                </div>
                              )}

                              {!isParPago ? (
                                <button
                                  type="button"
                                  className="btn btn-success btn-sm"
                                  onClick={() => onDarBaixa(par)}
                                  style={{
                                    width: '100%',
                                    marginTop: '0.6rem',
                                    minHeight: '40px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.4rem',
                                    fontWeight: 700,
                                  }}
                                >
                                  <CheckCircle2 size={16} />
                                  <span>Dar Baixa / Receber</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => baixarReciboPdf(criarDadosReciboDeParcela(par))}
                                  style={{
                                    width: '100%',
                                    marginTop: '0.6rem',
                                    minHeight: '40px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.4rem',
                                    fontWeight: 700,
                                  }}
                                >
                                  <FileText size={15} />
                                  <span>Baixar Recibo em PDF</span>
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
        </div>
      )}

      {/* ========================================================= */}
      {/* ABA 2: BAIXAS & LIQUIDAÇÕES */}
      {/* ========================================================= */}
      {activeSubTab === 'baixas' && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <CheckCircle2 size={18} color="#16a34a" />
              <span>Liquidações de Parcelas em Aberto ({parcelasParaBaixa.length})</span>
            </div>
            <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
              Suporta recebimento total e recebimento parcial com geração de parcela complementar
            </span>
          </div>

          {parcelasParaBaixa.length === 0 ? (
            <div className="empty-state">
              <CheckCircle2 size={40} color="#16a34a" />
              <h4>Tudo em dia!</h4>
              <p>Nenhuma parcela pendente com os filtros selecionados.</p>
            </div>
          ) : (
            <>
              <div className="table-container desktop-only">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Tipo</th>
                    <th>Pessoa / Sacado</th>
                    <th>Descrição</th>
                    <th>Parcela</th>
                    <th>Vencimento</th>
                    <th style={{ textAlign: 'right' }}>Valor da Parcela</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'center' }}>Ação de Liquidação</th>
                  </tr>
                </thead>
                <tbody>
                  {parcelasParaBaixa.map((par) => {
                    const isReceber = par.tipoConta === 'receber';
                    const isComp = par.is_complementar;
                    const isPago = par.status === 'pago';

                    return (
                      <tr key={par.id}>
                        <td>
                          <span className={`badge ${isReceber ? 'badge-success' : 'badge-danger'}`}>
                            {isReceber ? 'Receber' : 'Pagar'}
                          </span>
                        </td>
                        <td>
                          <strong>{par.pessoaNome}</strong>
                        </td>
                        <td>
                          {par.descricaoConta}
                          {isComp && (
                            <div style={{ fontSize: '0.74rem', color: '#7e22ce', fontWeight: 600 }}>
                              ⚡ Saldo Remanescente (Comp)
                            </div>
                          )}
                        </td>
                        <td>
                          {par.numero_parcela}/{par.total_parcelas}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <Calendar size={14} color="#64748b" />
                            <span>{formatDate(par.data_vencimento)}</span>
                          </div>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 800, fontSize: '0.98rem' }}>
                          {formatCurrency(par.valor)}
                        </td>
                        <td>
                          <span
                            className={`badge ${
                              isPago ? 'badge-success' : par.status === 'vencido' ? 'badge-danger' : 'badge-secondary'
                            }`}
                          >
                            {par.status.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {isPago ? (
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                              <span style={{ fontSize: '0.8rem', color: '#16a34a', fontWeight: 700 }}>
                                ✓ Liquidada {par.forma_pagamento ? `(${formatFormaPagamento(par.forma_pagamento)})` : ''}
                              </span>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => baixarReciboPdf(criarDadosReciboDeParcela(par))}
                                title="Baixar Recibo Oficial em PDF"
                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                              >
                                <FileText size={13} />
                                <span>Recibo</span>
                              </button>
                            </div>
                          ) : (
                            <button
                              className="btn btn-success btn-sm"
                              onClick={() => onDarBaixa(par)}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                            >
                              <CheckCircle2 size={15} />
                              <span>Dar Baixa</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* LISTAGEM RESPONSIVA MOBILE PARA BAIXAS */}
            <div className="mobile-only" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {parcelasParaBaixa.map((par) => {
                const isReceber = par.tipoConta === 'receber';
                const isComp = par.is_complementar;
                const isPago = par.status === 'pago';
                const isVencido = par.status !== 'pago' && par.data_vencimento < hoje;

                return (
                  <div key={par.id} className="financeiro-mobile-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                        <span className={`badge ${isReceber ? 'badge-success' : 'badge-danger'}`}>
                          {isReceber ? <ArrowDownCircle size={13} /> : <ArrowUpCircle size={13} />}
                          <span>{isReceber ? 'Receber' : 'Pagar'}</span>
                        </span>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>
                          Parc. {par.numero_parcela}/{par.total_parcelas}
                        </span>
                      </div>

                      <span
                        className={`badge ${
                          isPago ? 'badge-success' : isVencido ? 'badge-danger' : 'badge-secondary'
                        }`}
                      >
                        {isPago ? 'Liquidada' : isVencido ? 'Vencida' : 'Pendente'}
                      </span>
                    </div>

                    <div>
                      <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0f172a', lineHeight: 1.3 }}>
                        {par.pessoaNome}
                      </div>
                      <div style={{ fontSize: '0.86rem', color: '#475569', marginTop: '0.2rem' }}>
                        {par.descricaoConta}
                      </div>
                      {isComp && (
                        <div style={{ marginTop: '0.3rem' }}>
                          <span className="badge badge-secondary" style={{ backgroundColor: '#f3e8ff', color: '#7e22ce', fontSize: '0.72rem' }}>
                            ⚡ Saldo Remanescente (Complementar)
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="financeiro-mobile-grid-info">
                      <div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Valor da Parcela</div>
                        <div style={{ fontWeight: 900, fontSize: '1.2rem', color: isReceber ? '#15803d' : '#b91c1c' }}>
                          {formatCurrency(par.valor)}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Vencimento</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '2px', fontWeight: 700, fontSize: '0.92rem', color: isVencido ? '#b91c1c' : '#1e293b' }}>
                          <Calendar size={14} color={isVencido ? '#dc2626' : '#64748b'} />
                          <span>{formatDate(par.data_vencimento)}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      {isPago ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                          <div style={{ textAlign: 'center', padding: '0.5rem', backgroundColor: '#f0fdf4', borderRadius: '8px', color: '#166534', fontWeight: 700, fontSize: '0.88rem' }}>
                            ✓ Liquidada em {formatDate(par.data_pagamento || '')} {par.forma_pagamento ? `via ${formatFormaPagamento(par.forma_pagamento)}` : ''}
                          </div>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => baixarReciboPdf(criarDadosReciboDeParcela(par))}
                            style={{
                              width: '100%',
                              minHeight: '40px',
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '0.4rem',
                            }}
                          >
                            <FileText size={15} />
                            <span>Baixar Recibo Oficial em PDF</span>
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-success"
                          onClick={() => onDarBaixa(par)}
                          style={{
                            width: '100%',
                            minHeight: '46px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            fontSize: '0.95rem',
                            fontWeight: 700,
                          }}
                        >
                          <CheckCircle2 size={18} />
                          <span>Dar Baixa / {isReceber ? 'Receber' : 'Pagar'} {formatCurrency(par.valor)}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
        </div>
      )}

      {/* ========================================================= */}
      {/* ABA 3: EXTRATO & FLUXO DE CAIXA */}
      {/* ========================================================= */}
      {activeSubTab === 'extrato' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1rem', color: '#0f172a' }}>
              Extrato Consolidado de Liquidez Empresarial
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '1.25rem' }}>
                <div style={{ fontSize: '0.82rem', color: '#166534', fontWeight: 700, textTransform: 'uppercase' }}>
                  Receitas Realizadas (Entradas no Caixa)
                </div>
                <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#15803d', marginTop: '0.3rem' }}>
                  {formatCurrency(metricas.totalReceberRealizado)}
                </div>
                <div style={{ fontSize: '0.82rem', color: '#166534', marginTop: '0.5rem' }}>
                  De um total previsto de {formatCurrency(metricas.totalReceberPrevisto)}
                </div>
              </div>

              <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '1.25rem' }}>
                <div style={{ fontSize: '0.82rem', color: '#991b1b', fontWeight: 700, textTransform: 'uppercase' }}>
                  Despesas Pagas (Saídas do Caixa)
                </div>
                <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#b91c1c', marginTop: '0.3rem' }}>
                  {formatCurrency(metricas.totalPagarRealizado)}
                </div>
                <div style={{ fontSize: '0.82rem', color: '#991b1b', marginTop: '0.5rem' }}>
                  De um total previsto de {formatCurrency(metricas.totalPagarPrevisto)}
                </div>
              </div>

              <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '1.25rem' }}>
                <div style={{ fontSize: '0.82rem', color: '#1e40af', fontWeight: 700, textTransform: 'uppercase' }}>
                  Saldo Líquido Efetivo (Caixa)
                </div>
                <div
                  style={{
                    fontSize: '1.6rem',
                    fontWeight: 900,
                    color: metricas.saldoRealizado >= 0 ? '#1d4ed8' : '#b91c1c',
                    marginTop: '0.3rem',
                  }}
                >
                  {formatCurrency(metricas.saldoRealizado)}
                </div>
                <div style={{ fontSize: '0.82rem', color: '#1e40af', marginTop: '0.5rem' }}>
                  Saldo Projetado Futuro: <strong>{formatCurrency(metricas.saldoProjetado)}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* ABA 4: RELATÓRIOS & EXCEL EXECUTIVO */}
      {/* ========================================================= */}
      {activeSubTab === 'excel' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Banner de Destaque da Exportação Robusta em Excel */}
          <div
            className="card"
            style={{
              backgroundColor: '#f0fdf4',
              borderColor: '#86efac',
              padding: '1.5rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ maxWidth: '780px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
                  <FileSpreadsheet size={26} color="#16a34a" />
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#166534' }}>
                    Exportador Executivo de Relatórios em Excel (.xlsx)
                  </h2>
                </div>
                <p style={{ fontSize: '0.9rem', color: '#334155', lineHeight: 1.5 }}>
                  Gera uma pasta de trabalho profissional completa com <strong>Múltiplas Abas</strong>:
                  <br />• <strong>Resumo Executivo & KPIs</strong> (Cartões de Liquidez, distribuição por status e adimplência)
                  <br />• <strong>Detalhamento Analítico</strong> (17 colunas de dados, fórmulas nativas SUM, cores para status)
                  <br />• <strong>Auditoria de Parcelas Complementares</strong> (Rastreabilidade de recebimentos parciais e saldos gerados)
                </p>
              </div>

              <button
                className="btn btn-primary"
                onClick={handleExportarExcel}
                disabled={exportando || parcelasParaBaixa.length === 0}
                style={{
                  backgroundColor: '#16a34a',
                  borderColor: '#15803d',
                  padding: '0.85rem 1.75rem',
                  fontSize: '1rem',
                  fontWeight: 700,
                }}
              >
                <Download size={20} />
                <span>{exportando ? 'Gerando Pasta de Trabalho...' : 'Baixar Planilha Completa (.xlsx)'}</span>
              </button>
            </div>
          </div>

          {/* Filtros de Datas para o Relatório */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Filter size={16} color="#2563eb" />
              <span>Intervalo de Datas para Exportação</span>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Data de Vencimento Inicial</label>
                <input
                  type="date"
                  className="form-control"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Data de Vencimento Final</label>
                <input
                  type="date"
                  className="form-control"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Pré-visualização dos Dados */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">
                <FileSpreadsheet size={18} color="#16a34a" />
                <span>Pré-visualização da Base a Ser Exportada ({parcelasParaBaixa.length} registros)</span>
              </div>
            </div>

            <div className="table-container desktop-only">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Tipo</th>
                    <th>Pessoa / Sacado</th>
                    <th>Descrição</th>
                    <th>Parcela</th>
                    <th>Vencimento</th>
                    <th style={{ textAlign: 'right' }}>Valor Previsto</th>
                    <th style={{ textAlign: 'right' }}>Valor Pago</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {parcelasParaBaixa.slice(0, 50).map((p) => (
                    <tr key={p.id}>
                      <td>
                        <span className={`badge ${p.tipoConta === 'receber' ? 'badge-success' : 'badge-danger'}`}>
                          {p.tipoConta === 'receber' ? 'Receita' : 'Despesa'}
                        </span>
                      </td>
                      <td>{p.pessoaNome}</td>
                      <td>{p.descricaoConta}</td>
                      <td>{p.numero_parcela}/{p.total_parcelas}</td>
                      <td>{formatDate(p.data_vencimento)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatCurrency(p.valor)}</td>
                      <td style={{ textAlign: 'right', color: '#16a34a' }}>
                        {p.valor_pago ? formatCurrency(p.valor_pago) : '-'}
                      </td>
                      <td>
                        <span className={`badge ${p.status === 'pago' ? 'badge-success' : p.status === 'vencido' ? 'badge-danger' : 'badge-secondary'}`}>
                          {p.status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* LISTAGEM PREVIEW RESPONSIVA MOBILE */}
            <div className="mobile-only" style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', padding: '0.75rem' }}>
              {parcelasParaBaixa.slice(0, 30).map((p) => {
                const isReceber = p.tipoConta === 'receber';
                return (
                  <div key={p.id} className="financeiro-mobile-card" style={{ padding: '0.75rem', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className={`badge ${isReceber ? 'badge-success' : 'badge-danger'}`}>
                        {isReceber ? 'Receita' : 'Despesa'}
                      </span>
                      <span className={`badge ${p.status === 'pago' ? 'badge-success' : p.status === 'vencido' ? 'badge-danger' : 'badge-secondary'}`}>
                        {p.status.toUpperCase()}
                      </span>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a' }}>{p.pessoaNome}</div>
                    <div style={{ fontSize: '0.82rem', color: '#64748b' }}>{p.descricaoConta} • Parc. {p.numero_parcela}/{p.total_parcelas}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.86rem', marginTop: '0.2rem' }}>
                      <span>Venc: <strong>{formatDate(p.data_vencimento)}</strong></span>
                      <span style={{ fontWeight: 800, color: isReceber ? '#15803d' : '#b91c1c' }}>{formatCurrency(p.valor)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL NOVO FATURAMENTO / CONTA */}
      {/* ========================================================= */}
      {modalNovoFaturamento && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <PlusCircle size={22} color="#2563eb" />
                <h3 className="modal-title">Lançar Novo Faturamento / Conta</h3>
              </div>
              <button className="btn-icon" onClick={() => setModalNovoFaturamento(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSalvarFaturamento}>
              <div className="modal-body">
                {erroForm && (
                  <div className="alert-box alert-danger">
                    <AlertTriangle size={18} />
                    <span>{erroForm}</span>
                  </div>
                )}

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Tipo de Movimento *</label>
                    <select
                      className="form-control"
                      value={formTipo}
                      onChange={(e: any) => {
                        setFormTipo(e.target.value);
                        setFormCategoria(
                          e.target.value === 'receber' ? 'Prestação de Serviços' : 'Despesa Operacional'
                        );
                      }}
                    >
                      <option value="receber">Receita (A Receber do Cliente)</option>
                      <option value="pagar">Despesa (A Pagar ao Fornecedor)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Cliente / Fornecedor *</label>
                    <select
                      className="form-control"
                      value={formPessoaId}
                      onChange={(e) => setFormPessoaId(e.target.value)}
                      required
                    >
                      <option value="">Selecione...</option>
                      {pessoas.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nome} ({p.tipo.toUpperCase()})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Descrição da Conta *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Ex: Fatura de Manutenção Mensal..."
                      value={formDescricao}
                      onChange={(e) => setFormDescricao(e.target.value)}
                      required
                    >
                    </input>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Categoria</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formCategoria}
                      onChange={(e) => setFormCategoria(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Valor Total (R$) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      className="form-control"
                      style={{ fontWeight: 800, fontSize: '1.05rem' }}
                      value={formValorTotal || ''}
                      onChange={(e) => setFormValorTotal(parseFloat(e.target.value) || 0)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Nº de Parcelas</label>
                    <input
                      type="number"
                      min="1"
                      max="48"
                      className="form-control"
                      value={formNumParcelas}
                      onChange={(e) => setFormNumParcelas(parseInt(e.target.value, 10) || 1)}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Data de Emissão</label>
                    <input
                      type="date"
                      className="form-control"
                      value={formDataEmissao}
                      onChange={(e) => setFormDataEmissao(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">1º Vencimento</label>
                    <input
                      type="date"
                      className="form-control"
                      value={formDataVencimento}
                      onChange={(e) => setFormDataVencimento(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setModalNovoFaturamento(false)}
                  disabled={salvandoConta}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={salvandoConta}
                >
                  <CheckCircle2 size={16} />
                  <span>{salvandoConta ? 'Salvando no Banco...' : 'Gravar Faturamento'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
