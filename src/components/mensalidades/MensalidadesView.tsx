import React, { useState } from 'react';
import {
  CalendarDays,
  CalendarPlus,
  Search,
  PlusCircle,
  CheckCircle2,
  AlertCircle,
  Clock,
  Trash2,
  X,
  Play,
  Layers,
  Sparkles,
  DollarSign,
} from 'lucide-react';
import { Mensalidade, Pessoa, ParcelaComPessoa } from '../../types';
import { storageService } from '../../services/storage';
import {
  financialEngine,
  formatCurrency,
  formatDate,
  getTodayDateStr,
} from '../../services/financialEngine';

interface MensalidadesViewProps {
  mensalidades: Mensalidade[];
  pessoas: Pessoa[];
  onRefresh: () => void;
  onDarBaixa?: (parcela: ParcelaComPessoa) => void;
}

export const MensalidadesView: React.FC<MensalidadesViewProps> = ({
  mensalidades,
  pessoas,
  onRefresh,
}) => {
  const [busca, setBusca] = useState('');
  const [filtroMes, setFiltroMes] = useState<string>(getTodayDateStr().substring(0, 7)); // 'YYYY-MM'
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');

  // Modal Lote
  const [modalLoteAberto, setModalLoteAberto] = useState(false);
  const [loteMesReferencia, setLoteMesReferencia] = useState(getTodayDateStr().substring(0, 7));
  const [lotePeriodicidade, setLotePeriodicidade] = useState<'mensal' | 'trimestral' | 'semestral' | 'anual'>('mensal');
  const [resultadoLote, setResultadoLote] = useState<{
    geradas: number;
    jaExistiam: number;
    semConfig: number;
  } | null>(null);

  // Modal Manual
  const [modalManualAberto, setModalManualAberto] = useState(false);
  const [manualPessoaId, setManualPessoaId] = useState('');
  const [manualMesRef, setManualMesRef] = useState(getTodayDateStr().substring(0, 7));
  const [manualValor, setManualValor] = useState<number>(0);
  const [manualDataEmissao, setManualDataEmissao] = useState(getTodayDateStr());
  const [manualDataVencimento, setManualDataVencimento] = useState(getTodayDateStr());

  const clientesDisponiveis = pessoas.filter((p) => p.tipo === 'cliente' || p.tipo === 'ambos');

  const handleClienteSelectManual = (pessoaId: string) => {
    setManualPessoaId(pessoaId);
    const cliente = pessoas.find((p) => p.id === pessoaId);
    if (cliente) {
      if (cliente.valor_mensalidade_padrao) {
        setManualValor(cliente.valor_mensalidade_padrao);
      }
      // Calcular datas com base no dia do cliente
      const [anoStr, mesStr] = manualMesRef.split('-');
      const ano = parseInt(anoStr, 10);
      const mes = parseInt(mesStr, 10);
      const diaVenc = cliente.dia_vencimento_mensalidade || 10;
      const diaEmiss = cliente.dia_emissao_mensalidade || 1;

      setManualDataEmissao(`${ano}-${String(mes).padStart(2, '0')}-${String(diaEmiss).padStart(2, '0')}`);
      setManualDataVencimento(`${ano}-${String(mes).padStart(2, '0')}-${String(diaVenc).padStart(2, '0')}`);
    }
  };

  const handleExecutarLote = () => {
    const res = financialEngine.gerarLoteMensalidades({
      mesReferencia: loteMesReferencia,
      periodicidade: lotePeriodicidade,
      apenasClientesSemMensalidadeNoMes: true,
    });

    setResultadoLote({
      geradas: res.geradas.length,
      jaExistiam: res.ignoradasJaExistentes,
      semConfig: res.clientesSemConfiguracao,
    });

    onRefresh();
  };

  const handleSalvarManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualPessoaId || manualValor <= 0) return;

    const cliente = pessoas.find((p) => p.id === manualPessoaId);
    const contaId = `cnt-mens-manual-${Date.now()}`;

    // Cria conta e parcela
    storageService.saveConta(
      {
        id: contaId,
        pessoa_id: manualPessoaId,
        tipo: 'receber',
        categoria: 'Mensalidade Manual',
        descricao: `Mensalidade ${manualMesRef} - ${cliente?.nome || ''}`,
        data_emissao: manualDataEmissao,
        data_vencimento: manualDataVencimento,
        valor_total: manualValor,
        status: 'pendente',
        numero_parcelas: 1,
        created_at: new Date().toISOString(),
      },
      [
        {
          id: `par-${contaId}-1`,
          conta_id: contaId,
          numero_parcela: 1,
          total_parcelas: 1,
          valor: manualValor,
          data_vencimento: manualDataVencimento,
          status: 'pendente',
        },
      ]
    );

    // Salva Mensalidade
    storageService.saveMensalidade({
      id: `men-man-${Date.now()}`,
      pessoa_id: manualPessoaId,
      mes_referencia: manualMesRef,
      data_emissao: manualDataEmissao,
      data_vencimento: manualDataVencimento,
      valor: manualValor,
      status: 'pendente',
      conta_id: contaId,
      created_at: new Date().toISOString(),
    });

    setModalManualAberto(false);
    onRefresh();
  };

  const handleExcluirMensalidade = (id: string) => {
    if (window.confirm('Deseja excluir esta mensalidade do histórico?')) {
      storageService.deleteMensalidade(id);
      onRefresh();
    }
  };

  const mensalidadesFiltradas = mensalidades.filter((m) => {
    const cliente = pessoas.find((p) => p.id === m.pessoa_id);
    const clienteNome = cliente?.nome.toLowerCase() || '';

    const matchBusca = clienteNome.includes(busca.toLowerCase());
    const matchMes = !filtroMes || m.mes_referencia === filtroMes;
    const matchStatus = filtroStatus === 'todos' || m.status === filtroStatus;

    return matchBusca && matchMes && matchStatus;
  });

  const totalValorMes = mensalidadesFiltradas.reduce((acc, m) => acc + (Number(m.valor) || 0), 0);
  const totalPagoMes = mensalidadesFiltradas
    .filter((m) => m.status === 'pago')
    .reduce((acc, m) => acc + (Number(m.valor) || 0), 0);

  return (
    <div className="page-wrapper">
      {/* Cards de Resumo de Mensalidades */}
      <div className="kpi-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="kpi-card">
          <div className="kpi-icon-wrapper" style={{ backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
            <CalendarDays size={22} />
          </div>
          <div className="kpi-label">Faturamento do Mês ({filtroMes})</div>
          <div className="kpi-value">{formatCurrency(totalValorMes)}</div>
          <div className="kpi-subtext" style={{ color: 'var(--text-secondary)' }}>
            <span>{mensalidadesFiltradas.length} mensalidades registradas</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrapper" style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
            <CheckCircle2 size={22} />
          </div>
          <div className="kpi-label">Total Recebido / Quitado</div>
          <div className="kpi-value" style={{ color: '#10b981' }}>
            {formatCurrency(totalPagoMes)}
          </div>
          <div className="kpi-subtext" style={{ color: 'var(--text-secondary)' }}>
            <span>
              {totalValorMes > 0
                ? `${Math.round((totalPagoMes / totalValorMes) * 100)}% de realização`
                : 'Sem faturamento'}
            </span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrapper" style={{ backgroundColor: 'rgba(168, 85, 247, 0.15)', color: '#c084fc' }}>
            <Sparkles size={22} />
          </div>
          <div className="kpi-label">Clientes Aptos para Lote</div>
          <div className="kpi-value">
            {
              clientesDisponiveis.filter(
                (c) => c.dia_vencimento_mensalidade && c.valor_mensalidade_padrao && c.valor_mensalidade_padrao > 0
              ).length
            }{' '}
            / {clientesDisponiveis.length}
          </div>
          <div className="kpi-subtext" style={{ color: 'var(--text-secondary)' }}>
            <span>Com dia de vencimento e valor definidos</span>
          </div>
        </div>
      </div>

      {/* Barra de Ações e Filtros Fluidos para Mobile */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          marginBottom: '1.25rem',
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
              placeholder="Buscar cliente..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flex: '1 1 240px', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 130px', minWidth: '120px' }}>
              <input
                type="month"
                className="form-control"
                style={{ width: '100%' }}
                value={filtroMes}
                onChange={(e) => setFiltroMes(e.target.value)}
                title="Mês de Competência"
              />
            </div>

            <select
              className="form-control"
              style={{ flex: '1 1 120px', minWidth: '110px' }}
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
            >
              <option value="todos">Todos Status</option>
              <option value="pendente">Pendentes</option>
              <option value="pago">Pagas</option>
              <option value="vencido">Vencidas</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', width: '100%' }}>
          <button
            className="btn btn-secondary"
            onClick={() => setModalManualAberto(true)}
            style={{ minHeight: '46px', flex: '1 1 160px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.45rem' }}
          >
            <PlusCircle size={18} />
            <span>Mensalidade Manual</span>
          </button>

          <button
            className="btn btn-primary"
            onClick={() => { setResultadoLote(null); setModalLoteAberto(true); }}
            style={{ minHeight: '46px', flex: '2 1 200px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.45rem' }}
          >
            <Play size={18} />
            <span>Gerar Lote de Mensalidades</span>
          </button>
        </div>
      </div>

      {/* Lista de Mensalidades: Tabela Desktop e Cards Mobile */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {mensalidadesFiltradas.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--text-secondary)' }}>
            <CalendarDays size={40} color="#94a3b8" style={{ margin: '0 auto 0.75rem' }} />
            <h4 style={{ fontWeight: 600, color: '#334155' }}>Nenhuma mensalidade encontrada</h4>
            <p style={{ fontSize: '0.84rem', marginTop: '0.25rem' }}>Altere a competência ou gere um novo lote para este mês.</p>
          </div>
        ) : (
          <>
            {/* 1. VISUALIZAÇÃO DESKTOP: Tabela Tradicional */}
            <div className="table-container desktop-only">
              <table className="custom-table data-table" style={{ width: '100%', minWidth: '880px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '0.8rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Competência</th>
                    <th style={{ padding: '0.8rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Cliente</th>
                    <th style={{ padding: '0.8rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Emissão</th>
                    <th style={{ padding: '0.8rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Vencimento</th>
                    <th style={{ padding: '0.8rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Valor</th>
                    <th style={{ padding: '0.8rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Status</th>
                    <th style={{ padding: '0.8rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Data Pagto</th>
                    <th style={{ padding: '0.8rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', textAlign: 'right' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {mensalidadesFiltradas.map((m) => {
                    const cliente = pessoas.find((p) => p.id === m.pessoa_id);
                    return (
                      <tr key={m.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <strong style={{ color: '#2563eb' }}>{m.mes_referencia}</strong>
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>{cliente?.nome || 'Cliente não encontrado'}</div>
                          {cliente?.telefone && (
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                              {cliente.telefone}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>{formatDate(m.data_emissao)}</td>
                        <td style={{ padding: '0.85rem 1rem' }}>{formatDate(m.data_vencimento)}</td>
                        <td style={{ padding: '0.85rem 1rem', fontWeight: 800, color: '#16a34a' }}>{formatCurrency(m.valor)}</td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <span
                            className={`status-badge ${
                              m.status === 'pago'
                                ? 'status-pago'
                                : m.status === 'vencido'
                                ? 'status-vencido'
                                : 'status-pendente'
                            }`}
                          >
                            {m.status.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>{m.data_pagamento ? formatDate(m.data_pagamento) : '-'}</td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                            <button
                              className="btn-icon"
                              onClick={() => handleExcluirMensalidade(m.id)}
                              title="Remover"
                              style={{ color: '#dc2626', backgroundColor: '#fff1f2', borderColor: '#fecaca' }}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* 2. VISUALIZAÇÃO MOBILE NATIVA: Cards Fluidos sem estouro */}
            <div className="mobile-only" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '0.75rem' }}>
              {mensalidadesFiltradas.map((m) => {
                const cliente = pessoas.find((p) => p.id === m.pessoa_id);
                const isPaga = m.status === 'pago';

                return (
                  <div
                    key={m.id}
                    style={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      padding: '0.85rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.55rem',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a', wordBreak: 'break-word' }}>
                          {cliente?.nome || 'Cliente não identificado'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: 600, marginTop: '2px' }}>
                          Competência: {m.mes_referencia}
                        </div>
                      </div>
                      <span
                        className={`status-badge ${
                          isPaga
                            ? 'status-pago'
                            : m.status === 'vencido'
                            ? 'status-vencido'
                            : 'status-pendente'
                        }`}
                      >
                        {m.status.toUpperCase()}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', backgroundColor: '#f8fafc', padding: '0.55rem 0.75rem', borderRadius: '8px' }}>
                      <div>
                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Vencimento</div>
                        <div style={{ fontSize: '0.84rem', fontWeight: 600, color: '#334155' }}>
                          {formatDate(m.data_vencimento)}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                          Emissão: {formatDate(m.data_emissao)}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Valor</div>
                        <div style={{ fontWeight: 800, fontSize: '1.15rem', color: '#16a34a' }}>
                          {formatCurrency(m.valor)}
                        </div>
                      </div>
                    </div>

                    {m.data_pagamento && (
                      <div style={{ fontSize: '0.75rem', color: '#15803d', display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 600 }}>
                        <CheckCircle2 size={14} />
                        <span>Recebido em {formatDate(m.data_pagamento)}</span>
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.2rem' }}>
                      <button
                        className="btn btn-secondary"
                        onClick={() => handleExcluirMensalidade(m.id)}
                        title="Remover Mensalidade"
                        style={{ color: '#dc2626', width: '100%', minHeight: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                      >
                        <Trash2 size={16} />
                        <span>Remover Mensalidade</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Modal Gerar Lote de Mensalidades */}
      {modalLoteAberto && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '560px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Sparkles size={22} color="#3b82f6" />
                <h3 className="modal-title">Geração de Lote de Mensalidades</h3>
              </div>
              <button className="btn-icon" onClick={() => setModalLoteAberto(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                O sistema percorrerá automaticamente todos os clientes cadastrados que possuem <strong>Dia de Vencimento</strong> e <strong>Valor Padrão</strong> preenchidos, gerando as contas a receber e as mensalidades da competência.
              </p>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Competência / Mês Referência</label>
                  <input
                    type="month"
                    className="form-control"
                    value={loteMesReferencia}
                    onChange={(e) => setLoteMesReferencia(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Periodicidade</label>
                  <select
                    className="form-control"
                    value={lotePeriodicidade}
                    onChange={(e: any) => setLotePeriodicidade(e.target.value)}
                  >
                    <option value="mensal">Mensal (1 Mês)</option>
                    <option value="trimestral">Trimestral (3 Meses)</option>
                    <option value="semestral">Semestral (6 Meses)</option>
                    <option value="anual">Anual (12 Meses)</option>
                  </select>
                </div>
              </div>

              {resultadoLote && (
                <div
                  style={{
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1rem',
                    marginTop: '1rem',
                  }}
                >
                  <div style={{ fontWeight: 700, color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <CheckCircle2 size={18} />
                    <span>Lote Processado com Sucesso!</span>
                  </div>
                  <ul style={{ fontSize: '0.84rem', marginTop: '0.5rem', paddingLeft: '1.2rem', color: 'var(--text-secondary)' }}>
                    <li><strong>{resultadoLote.geradas}</strong> novas mensalidades geradas.</li>
                    <li><strong>{resultadoLote.jaExistiam}</strong> mensalidades já existiam (evitou duplicidade).</li>
                    {resultadoLote.semConfig > 0 && (
                      <li><strong>{resultadoLote.semConfig}</strong> clientes ignorados (sem valor ou vencimento configurado).</li>
                    )}
                  </ul>
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setModalLoteAberto(false)}
                style={{ minHeight: '44px', flex: '1 1 120px' }}
              >
                Fechar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleExecutarLote}
                style={{ minHeight: '44px', flex: '2 1 180px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
              >
                <Play size={16} />
                <span>Processar Lote Agora</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Mensalidade Manual */}
      {modalManualAberto && (
        <div className="modal-overlay">
          <div className="modal-content">
            <form onSubmit={handleSalvarManual}>
              <div className="modal-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <CalendarDays size={20} color="#3b82f6" />
                  <h3 className="modal-title">Lançar Mensalidade Manual</h3>
                </div>
                <button type="button" className="btn-icon" onClick={() => setModalManualAberto(false)}>
                  <X size={18} />
                </button>
              </div>

              <div className="modal-body">
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Cliente (Contrato Ativo)</label>
                  <select
                    required
                    className="form-control"
                    value={manualPessoaId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setManualPessoaId(id);
                      const cli = pessoas.find((p) => p.id === id);
                      if (cli) {
                        setManualValor(cli.valor_mensalidade_padrao || 0);
                        if (cli.dia_vencimento_mensalidade) {
                          const hoje = new Date();
                          const ano = hoje.getFullYear();
                          const mes = String(hoje.getMonth() + 1).padStart(2, '0');
                          const dia = String(cli.dia_vencimento_mensalidade).padStart(2, '0');
                          setManualDataVencimento(`${ano}-${mes}-${dia}`);
                        }
                      }
                    }}
                  >
                    <option value="">Selecione um cliente...</option>
                    {pessoas
                      .filter((p) => p.tipo === 'cliente' || p.tipo === 'ambos')
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nome} {c.cpf_cnpj ? `(${c.cpf_cnpj})` : ''}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Competência (YYYY-MM)</label>
                    <input
                      type="month"
                      required
                      className="form-control"
                      value={manualMesRef}
                      onChange={(e) => setManualMesRef(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Valor (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      className="form-control"
                      value={manualValor || ''}
                      onChange={(e) => setManualValor(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Data de Emissão</label>
                    <input
                      type="date"
                      required
                      className="form-control"
                      value={manualDataEmissao}
                      onChange={(e) => setManualDataEmissao(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Data de Vencimento</label>
                    <input
                      type="date"
                      required
                      className="form-control"
                      value={manualDataVencimento}
                      onChange={(e) => setManualDataVencimento(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer" style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setModalManualAberto(false)}
                  style={{ minHeight: '44px', flex: '1 1 120px' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ minHeight: '44px', flex: '2 1 180px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                >
                  <CheckCircle2 size={16} />
                  <span>Gerar Mensalidade</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
