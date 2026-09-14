import React, { useState } from 'react';
import {
  PlusCircle,
  Search,
  Filter,
  ArrowDownCircle,
  ArrowUpCircle,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ChevronDown,
  ChevronUp,
  Trash2,
  X,
  Layers,
} from 'lucide-react';
import { Conta, Parcela, Pessoa, TipoConta, ParcelaComPessoa } from '../../types';
import { storageService } from '../../services/storage';
import { formatCurrency, formatDate, getTodayDateStr } from '../../services/financialEngine';
import { notificationService } from '../../services/notificationService';

interface ContasViewProps {
  tipo: TipoConta; // 'receber' ou 'pagar'
  contas: Conta[];
  pessoas: Pessoa[];
  onRefresh: () => void;
  onDarBaixaParcela: (parcela: ParcelaComPessoa) => void;
  onAlternarTipo?: (novoTipo: TipoConta) => void;
  abrirNovaContaInicial?: boolean;
}

export const ContasView: React.FC<ContasViewProps> = ({
  tipo,
  contas,
  pessoas,
  onRefresh,
  onDarBaixaParcela,
  onAlternarTipo,
  abrirNovaContaInicial,
}) => {
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [chipFiltro, setChipFiltro] = useState<'todos' | 'vencidos' | 'hoje' | 'proximos7' | 'pagos' | 'parciais'>('todos');
  const [expandedContas, setExpandedContas] = useState<Record<string, boolean>>({});
  const [modalNovaConta, setModalNovaConta] = useState(false);

  React.useEffect(() => {
    if (abrirNovaContaInicial) {
      setModalNovaConta(true);
    }
  }, [abrirNovaContaInicial]);

  // Estados formulário de nova conta
  const [formPessoaId, setFormPessoaId] = useState('');
  const [formDescricao, setFormDescricao] = useState('');
  const [formCategoria, setFormCategoria] = useState(
    tipo === 'receber' ? 'Prestação de Serviços' : 'Despesa Operacional'
  );
  const [formDataEmissao, setFormDataEmissao] = useState(getTodayDateStr());
  const [formDataVencimento, setFormDataVencimento] = useState(getTodayDateStr());
  const [formValorTotal, setFormValorTotal] = useState<number>(0);
  const [formNumParcelas, setFormNumParcelas] = useState<number>(1);
  const [formIntervaloDias, setFormIntervaloDias] = useState<number>(30);

  const toggleExpand = (contaId: string) => {
    setExpandedContas((prev) => ({ ...prev, [contaId]: !prev[contaId] }));
  };

  const handleSalvarConta = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPessoaId || !formDescricao || formValorTotal <= 0) return;

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

      // Ajusta centavos na primeira parcela se houver dízima
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
      tipo,
      categoria: formCategoria,
      descricao: formDescricao,
      data_emissao: formDataEmissao,
      data_vencimento: formDataVencimento,
      valor_total: formValorTotal,
      status: 'pendente',
      numero_parcelas: numParc,
      created_at: new Date().toISOString(),
    };

    storageService.saveConta(novaConta, parcelasGeradas);
    
    const pessoaNome = pessoas.find((p) => p.id === formPessoaId)?.nome || 'Pessoa';
    const tipoLabel = tipo === 'receber' ? 'Conta a Receber' : 'Conta a Pagar';
    notificationService.sucesso(
      `${tipoLabel} Criada!`,
      `Conta "${formDescricao}" de R$ ${formValorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} em ${numParc}x cadastrada para ${pessoaNome}.`,
      { tab: tipo === 'receber' ? 'receber' : 'pagar', label: `Ver ${tipoLabel}` },
      'financeiro'
    );

    setModalNovaConta(false);
    // Reset
    setFormDescricao('');
    setFormValorTotal(0);
    setFormNumParcelas(1);
    onRefresh();
  };

  const handleExcluirConta = (id: string, desc: string) => {
    if (window.confirm(`Deseja excluir a conta "${desc}" e todas as suas parcelas?`)) {
      storageService.deleteConta(id);
      notificationService.aviso(
        'Conta Excluída',
        `A conta "${desc}" e suas parcelas foram excluídas.`,
        { tab: tipo === 'receber' ? 'receber' : 'pagar', label: 'Ver Contas' },
        'financeiro'
      );
      onRefresh();
    }
  };

  // Filtragem e Métricas
  const hojeStr = getTodayDateStr();
  const d7 = new Date();
  d7.setDate(d7.getDate() + 7);
  const d7Str = d7.toISOString().split('T')[0];

  const contasDoTipo = contas.filter((c) => c.tipo === tipo);

  const contasFiltradas = contasDoTipo.filter((c) => {
    const pessoa = pessoas.find((p) => p.id === c.pessoa_id);
    const pessoaNome = pessoa?.nome.toLowerCase() || '';
    const desc = c.descricao.toLowerCase();
    const cat = c.categoria.toLowerCase();
    const matchBusca =
      desc.includes(busca.toLowerCase()) ||
      pessoaNome.includes(busca.toLowerCase()) ||
      cat.includes(busca.toLowerCase());

    const matchStatus = filtroStatus === 'todos' || c.status === filtroStatus;

    // Filtro por Chip rápido
    let matchChip = true;
    const parcelas = c.parcelas || [];
    if (chipFiltro === 'vencidos') {
      matchChip = parcelas.length > 0
        ? parcelas.some((p) => p.status !== 'pago' && p.data_vencimento < hojeStr)
        : (c.status !== 'pago' && c.data_vencimento < hojeStr);
    } else if (chipFiltro === 'hoje') {
      matchChip = parcelas.some((p) => p.status !== 'pago' && p.data_vencimento === hojeStr);
    } else if (chipFiltro === 'proximos7') {
      matchChip = parcelas.some(
        (p) => p.status !== 'pago' && p.data_vencimento > hojeStr && p.data_vencimento <= d7Str
      );
    } else if (chipFiltro === 'pagos') {
      matchChip = c.status === 'pago';
    } else if (chipFiltro === 'parciais') {
      matchChip = c.status === 'parcial';
    }

    return matchBusca && matchStatus && matchChip;
  });

  const isReceber = tipo === 'receber';
  const pessoasDisponiveis = pessoas.filter(
    (p) => (isReceber ? p.tipo === 'cliente' || p.tipo === 'ambos' : p.tipo === 'fornecedor' || p.tipo === 'ambos')
  );

  // Estatísticas do filtro ativo
  const totalFiltradoValor = contasFiltradas.reduce((acc, c) => acc + Number(c.valor_total || 0), 0);
  const totalFiltradoQuitado = contasFiltradas.reduce((acc, c) => {
    const pags = (c.parcelas || []).reduce(
      (pacc, p) => pacc + (Number(p.valor_pago) || (p.status === 'pago' ? Number(p.valor) : 0)),
      0
    );
    return acc + pags;
  }, 0);
  const totalFiltradoRestante = Math.max(0, totalFiltradoValor - totalFiltradoQuitado);

  return (
    <div className="page-wrapper">
      {/* 1. Alternador Segmentado Rápido [ A Receber | A Pagar ] */}
      {onAlternarTipo && (
        <div className="segmented-control-container" style={{ marginBottom: '1.25rem' }}>
          <button
            type="button"
            className={`segmented-control-btn ${isReceber ? 'active-receber' : ''}`}
            onClick={() => onAlternarTipo('receber')}
          >
            <ArrowDownCircle size={17} />
            <span>Contas a Receber</span>
            <span className="segmented-badge">
              {contas.filter((c) => c.tipo === 'receber' && c.status !== 'pago').length} abertas
            </span>
          </button>
          <button
            type="button"
            className={`segmented-control-btn ${!isReceber ? 'active-pagar' : ''}`}
            onClick={() => onAlternarTipo('pagar')}
          >
            <ArrowUpCircle size={17} />
            <span>Contas a Pagar</span>
            <span className="segmented-badge">
              {contas.filter((c) => c.tipo === 'pagar' && c.status !== 'pago').length} abertas
            </span>
          </button>
        </div>
      )}

      {/* 2. Barra de Busca, Status e Botão Criar */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          marginBottom: '0.85rem',
        }}
      >
        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', width: '100%' }}>
          <div style={{ position: 'relative', flex: '1 1 240px', minWidth: '0' }}>
            <Search
              size={18}
              style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }}
            />
            <input
              type="text"
              className="form-control"
              style={{ paddingLeft: '2.4rem', width: '100%' }}
              placeholder={`Buscar ${isReceber ? 'clientes' : 'fornecedores'} ou descrições...`}
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>

          <select
            className="form-control"
            style={{ flex: '0 1 160px', minWidth: '130px' }}
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
          >
            <option value="todos">Todos Status</option>
            <option value="pendente">Pendentes</option>
            <option value="pago">Quitados</option>
            <option value="vencido">Vencidos</option>
            <option value="parcial">Parciais</option>
          </select>

          <button
            className="btn btn-primary"
            onClick={() => setModalNovaConta(true)}
            style={{
              minHeight: '42px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              whiteSpace: 'nowrap',
            }}
          >
            <PlusCircle size={18} />
            <span>{isReceber ? 'Nova Conta a Receber' : 'Nova Conta a Pagar'}</span>
          </button>
        </div>

        {/* 3. Chips de Filtros Rápidos */}
        <div className="filter-chips-row">
          <button
            type="button"
            className={`filter-chip ${chipFiltro === 'todos' ? 'active' : ''}`}
            onClick={() => setChipFiltro('todos')}
          >
            Todos ({contasDoTipo.length})
          </button>
          <button
            type="button"
            className={`filter-chip chip-vencidos ${chipFiltro === 'vencidos' ? 'active' : ''}`}
            onClick={() => setChipFiltro('vencidos')}
          >
            🔴 Vencidos
          </button>
          <button
            type="button"
            className={`filter-chip chip-hoje ${chipFiltro === 'hoje' ? 'active' : ''}`}
            onClick={() => setChipFiltro('hoje')}
          >
            🟡 Vence Hoje
          </button>
          <button
            type="button"
            className={`filter-chip ${chipFiltro === 'proximos7' ? 'active' : ''}`}
            onClick={() => setChipFiltro('proximos7')}
          >
            ⏱️ Próximos 7 Dias
          </button>
          <button
            type="button"
            className={`filter-chip chip-quitados ${chipFiltro === 'pagos' ? 'active' : ''}`}
            onClick={() => setChipFiltro('pagos')}
          >
            🟢 Quitados
          </button>
          <button
            type="button"
            className={`filter-chip ${chipFiltro === 'parciais' ? 'active' : ''}`}
            onClick={() => setChipFiltro('parciais')}
          >
            🟣 Parciais
          </button>
        </div>

        {/* 4. Mini Barra Resumida de Totais do Filtro */}
        <div className="contas-summary-bar">
          <div className="contas-summary-item">
            <span className="summary-label">Lançamentos:</span>
            <strong className="summary-value">{contasFiltradas.length}</strong>
          </div>
          <div className="contas-summary-divider" />
          <div className="contas-summary-item">
            <span className="summary-label">Total Previsto:</span>
            <strong className="summary-value">{formatCurrency(totalFiltradoValor)}</strong>
          </div>
          <div className="contas-summary-divider" />
          <div className="contas-summary-item">
            <span className="summary-label">{isReceber ? 'Recebido:' : 'Pago:'}</span>
            <strong className="summary-value" style={{ color: '#16a34a' }}>
              {formatCurrency(totalFiltradoQuitado)}
            </strong>
          </div>
          <div className="contas-summary-divider" />
          <div className="contas-summary-item">
            <span className="summary-label">Restante:</span>
            <strong className="summary-value" style={{ color: totalFiltradoRestante > 0 ? (isReceber ? '#2563eb' : '#dc2626') : '#64748b' }}>
              {formatCurrency(totalFiltradoRestante)}
            </strong>
          </div>
        </div>
      </div>

      {/* Lista de Contas com Acordeão para Parcelas */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {contasFiltradas.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
            {isReceber ? (
              <ArrowDownCircle size={44} color="#3b82f6" style={{ margin: '0 auto 1rem' }} />
            ) : (
              <ArrowUpCircle size={44} color="#f43f5e" style={{ margin: '0 auto 1rem' }} />
            )}
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Nenhum lançamento encontrado</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              Crie uma nova conta ou altere os filtros de pesquisa.
            </p>
          </div>
        ) : (
          contasFiltradas.map((conta) => {
            const pessoa = pessoas.find((p) => p.id === conta.pessoa_id);
            const isExpanded = expandedContas[conta.id] !== false; // Padrão expandido
            const parcelas = conta.parcelas || [];
            const pagasCount = parcelas.filter((p) => p.status === 'pago').length;
            const totalPago = parcelas.reduce(
              (acc, p) => acc + (Number(p.valor_pago) || (p.status === 'pago' ? Number(p.valor) : 0)),
              0
            );
            const saldoRestante = Math.max(0, Math.round((Number(conta.valor_total) - totalPago) * 100) / 100);
            const isParcial = totalPago > 0 && saldoRestante > 0.01;

            return (
              <div key={conta.id} className="card" style={{ padding: '1rem' }}>
                {/* Cabeçalho da Conta */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '0.75rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', flex: '1 1 240px', minWidth: 0 }}>
                    <button
                      className="btn-icon"
                      onClick={() => toggleExpand(conta.id)}
                      title={isExpanded ? 'Recolher' : 'Expandir parcelas'}
                      style={{ marginTop: '2px' }}
                    >
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>

                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <strong style={{ fontSize: '1.05rem', color: '#0f172a', wordBreak: 'break-word' }}>
                          {pessoa?.nome || 'Contato não identificado'}
                        </strong>
                        <span
                          className={`status-badge ${
                            conta.status === 'pago'
                              ? 'status-pago'
                              : conta.status === 'vencido'
                              ? 'status-vencido'
                              : conta.status === 'parcial'
                              ? 'status-parcial'
                              : 'status-pendente'
                          }`}
                        >
                          {conta.status.toUpperCase()}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.2rem', wordBreak: 'break-word' }}>
                        {conta.descricao} • <span style={{ color: 'var(--text-muted)' }}>{conta.categoria}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                        Valor Total
                      </div>
                      <div style={{ fontWeight: 800, fontSize: '1.15rem', color: isReceber ? '#2563eb' : '#dc2626' }}>
                        {formatCurrency(conta.valor_total)}
                      </div>
                      {isParcial ? (
                        <div style={{ fontSize: '0.76rem', marginTop: '0.15rem' }}>
                          <span style={{ color: '#16a34a', fontWeight: 700 }}>Pago: {formatCurrency(totalPago)}</span>
                          {' • '}
                          <span style={{ color: '#d97706', fontWeight: 800 }}>Restante: {formatCurrency(saldoRestante)}</span>
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                          {pagasCount} de {parcelas.length} parcelas quitadas
                        </div>
                      )}
                    </div>

                    <button
                      className="btn-icon"
                      onClick={() => handleExcluirConta(conta.id, conta.descricao)}
                      title="Excluir conta e parcelas"
                      style={{ color: '#dc2626', backgroundColor: '#fff1f2', borderColor: '#fecaca' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Sublista de Parcelas: Versão Desktop (Tabela) e Versão Mobile (Cards Nativos) */}
                {isExpanded && parcelas.length > 0 && (
                  <div style={{ marginTop: '1rem', paddingTop: '0.85rem', borderTop: '1px solid #e2e8f0' }}>
                    {/* 1. VISUALIZAÇÃO DESKTOP: Tabela com todas as colunas */}
                    <div className="table-container desktop-only">
                      <table className="custom-table">
                        <thead>
                          <tr>
                            <th>Parcela</th>
                            <th>Vencimento</th>
                            <th>Valor</th>
                            <th>Valor Pago</th>
                            <th>Data Pagto</th>
                            <th>Status</th>
                            <th>Obs / Detalhes</th>
                            <th style={{ textAlign: 'right' }}>Ação</th>
                          </tr>
                        </thead>
                        <tbody>
                          {parcelas.map((par) => {
                            const parcelaEnriquecida: ParcelaComPessoa = {
                              ...par,
                              pessoaNome: pessoa?.nome || 'Não identificado',
                              pessoaTelefone: pessoa?.telefone || '',
                              pessoaEmail: pessoa?.email || '',
                              tipoConta: conta.tipo,
                              descricaoConta: conta.descricao,
                            };

                            const isComplementar = par.is_complementar;

                            return (
                              <tr
                                key={par.id}
                                style={{
                                  backgroundColor: isComplementar ? 'rgba(168, 85, 247, 0.05)' : undefined,
                                }}
                              >
                                <td>
                                  <span style={{ fontWeight: 600 }}>
                                    {par.numero_parcela}/{par.total_parcelas}
                                  </span>
                                  {isComplementar && (
                                    <span
                                      className="status-badge status-parcial"
                                      style={{ marginLeft: '0.4rem', fontSize: '0.65rem' }}
                                    >
                                      Complementar
                                    </span>
                                  )}
                                </td>
                                <td>{formatDate(par.data_vencimento)}</td>
                                <td style={{ fontWeight: 700 }}>{formatCurrency(par.valor)}</td>
                                <td style={{ color: par.valor_pago ? '#10b981' : 'var(--text-muted)' }}>
                                  {par.valor_pago ? formatCurrency(par.valor_pago) : '-'}
                                </td>
                                <td>{par.data_pagamento ? formatDate(par.data_pagamento) : '-'}</td>
                                <td>
                                  <span
                                    className={`status-badge ${
                                      par.status === 'pago'
                                        ? 'status-pago'
                                        : par.status === 'vencido'
                                        ? 'status-vencido'
                                        : par.status === 'parcial'
                                        ? 'status-parcial'
                                        : 'status-pendente'
                                    }`}
                                  >
                                    {par.status}
                                  </span>
                                </td>
                                <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                                  {par.observacoes || '-'}
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                  {par.status !== 'pago' ? (
                                    <button
                                      className="btn btn-primary btn-sm"
                                      onClick={() => onDarBaixaParcela(parcelaEnriquecida)}
                                    >
                                      Dar Baixa
                                    </button>
                                  ) : (
                                    <span style={{ color: '#10b981', fontSize: '0.78rem', fontWeight: 600 }}>
                                      Quitada ✓
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* 2. VISUALIZAÇÃO MOBILE NATIVA: Cards de Parcelas sem corte horizontal */}
                    <div className="mobile-only" style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                      {parcelas.map((par) => {
                        const parcelaEnriquecida: ParcelaComPessoa = {
                          ...par,
                          pessoaNome: pessoa?.nome || 'Não identificado',
                          pessoaTelefone: pessoa?.telefone || '',
                          pessoaEmail: pessoa?.email || '',
                          tipoConta: conta.tipo,
                          descricaoConta: conta.descricao,
                        };
                        const isComplementar = par.is_complementar;

                        return (
                          <div
                            key={par.id}
                            style={{
                              backgroundColor: '#f8fafc',
                              border: '1px solid #e2e8f0',
                              borderRadius: '10px',
                              padding: '0.85rem',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.5rem',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f172a' }}>
                                  Parcela {par.numero_parcela}/{par.total_parcelas}
                                </span>
                                {isComplementar && (
                                  <span className="status-badge status-parcial" style={{ fontSize: '0.62rem' }}>
                                    Complementar
                                  </span>
                                )}
                              </div>
                              <span
                                className={`status-badge ${
                                  par.status === 'pago'
                                    ? 'status-pago'
                                    : par.status === 'vencido'
                                    ? 'status-vencido'
                                    : par.status === 'parcial'
                                    ? 'status-parcial'
                                    : 'status-pendente'
                                }`}
                              >
                                {par.status.toUpperCase()}
                              </span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                              <div>
                                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Vencimento</div>
                                <div style={{ fontSize: '0.84rem', fontWeight: 600, color: '#334155' }}>
                                  {formatDate(par.data_vencimento)}
                                </div>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Valor da Parcela</div>
                                <div style={{ fontWeight: 800, fontSize: '1.1rem', color: isReceber ? '#2563eb' : '#dc2626' }}>
                                  {formatCurrency(par.valor)}
                                </div>
                              </div>
                            </div>

                            {par.valor_pago ? (
                              <div style={{ fontSize: '0.75rem', color: '#15803d', display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #cbd5e1', paddingTop: '0.35rem' }}>
                                <span>Pago em {par.data_pagamento ? formatDate(par.data_pagamento) : '-'}</span>
                                <strong>{formatCurrency(par.valor_pago)}</strong>
                              </div>
                            ) : null}

                            {par.status !== 'pago' ? (
                              <button
                                className="btn btn-primary"
                                onClick={() => onDarBaixaParcela(parcelaEnriquecida)}
                                style={{ width: '100%', minHeight: '44px', marginTop: '0.25rem', fontSize: '0.85rem' }}
                              >
                                <CheckCircle2 size={16} />
                                <span>Dar Baixa na Parcela</span>
                              </button>
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', color: '#16a34a', fontWeight: 600, fontSize: '0.82rem', padding: '0.35rem 0' }}>
                                <CheckCircle2 size={16} />
                                <span>Parcela Quitada</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modal Nova Conta */}
      {modalNovaConta && (
        <div className="modal-overlay">
          <div className="modal-content">
            <form onSubmit={handleSalvarConta}>
              <div className="modal-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  {isReceber ? <ArrowDownCircle size={20} color="#3b82f6" /> : <ArrowUpCircle size={20} color="#f43f5e" />}
                  <h3 className="modal-title">
                    {isReceber ? 'Nova Conta a Receber' : 'Nova Conta a Pagar'}
                  </h3>
                </div>
                <button type="button" className="btn-icon" onClick={() => setModalNovaConta(false)}>
                  <X size={18} />
                </button>
              </div>

              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">{isReceber ? 'Cliente *' : 'Fornecedor *'}</label>
                  <select
                    required
                    className="form-control"
                    value={formPessoaId}
                    onChange={(e) => setFormPessoaId(e.target.value)}
                  >
                    <option value="">Selecione...</option>
                    {pessoasDisponiveis.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nome} ({p.cpf_cnpj || 'Sem doc'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Descrição da Conta / Fatura *</label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    placeholder="Ex: Contrato de Manutenção, Compra de Suprimentos..."
                    value={formDescricao}
                    onChange={(e) => setFormDescricao(e.target.value)}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Categoria</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formCategoria}
                      onChange={(e) => setFormCategoria(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Valor Total (R$) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      className="form-control"
                      placeholder="0.00"
                      value={formValorTotal || ''}
                      onChange={(e) => setFormValorTotal(parseFloat(e.target.value) || 0)}
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
                    <label className="form-label">Vencimento da 1ª Parcela</label>
                    <input
                      type="date"
                      className="form-control"
                      value={formDataVencimento}
                      onChange={(e) => setFormDataVencimento(e.target.value)}
                    />
                  </div>
                </div>

                {/* Bloco de Parcelamento */}
                <div
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1rem',
                    margin: '0.75rem 0',
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#93c5fd', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Layers size={16} />
                    <span>Configuração de Parcelas</span>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Número de Parcelas</label>
                      <select
                        className="form-control"
                        value={formNumParcelas}
                        onChange={(e) => setFormNumParcelas(parseInt(e.target.value) || 1)}
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                          <option key={n} value={n}>
                            {n}x {formValorTotal > 0 ? `(${formatCurrency(formValorTotal / n)})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Intervalo entre Parcelas (Dias)</label>
                      <select
                        className="form-control"
                        value={formIntervaloDias}
                        onChange={(e) => setFormIntervaloDias(parseInt(e.target.value) || 30)}
                      >
                        <option value={8}>8 dias (Semanal)</option>
                        <option value={15}>15 dias (Quinzenal)</option>
                        <option value={30}>30 dias (Mensal)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setModalNovaConta(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.45rem' }}
                >
                  <CheckCircle2 size={16} />
                  <span>Cadastrar Conta</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
