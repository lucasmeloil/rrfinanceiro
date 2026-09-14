import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Clock,
  CheckCircle2,
  CalendarCheck2,
  Wallet,
  ArrowRight,
  MessageCircle,
} from 'lucide-react';
import { ResumoDashboard, ParcelaComPessoa } from '../../types';
import { formatCurrency, formatDate, financialEngine } from '../../services/financialEngine';

interface DashboardViewProps {
  resumo: ResumoDashboard;
  onDarBaixa?: (parcela: ParcelaComPessoa) => void;
  onNavigateToCobrancas: () => void;
  onNavigateToReceber: () => void;
  onNavigateToPagar: () => void;
  onNavigateToFinanceiro?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  resumo,
  onDarBaixa,
  onNavigateToCobrancas,
  onNavigateToReceber,
  onNavigateToPagar,
  onNavigateToFinanceiro,
}) => {
  const mesesFluxo = resumo.fluxoCaixa6Meses || [];
  const valoresReais = mesesFluxo.flatMap((m) => [m.receitas, m.despesas]);
  const maxValReal = valoresReais.length > 0 ? Math.max(...valoresReais) : 0;
  const divisorEscala = maxValReal > 0 ? maxValReal : 1;

  const totalReceitasPeriodo = mesesFluxo.reduce((acc, m) => acc + m.receitas, 0);
  const totalDespesasPeriodo = mesesFluxo.reduce((acc, m) => acc + m.despesas, 0);
  const saldoPeriodo = totalReceitasPeriodo - totalDespesasPeriodo;

  return (
    <div className="page-wrapper">
      {/* KPI Cards Grid */}
      <div className="kpi-grid">
        {/* Total a Receber */}
        <div className="kpi-card" onClick={onNavigateToReceber} style={{ cursor: 'pointer' }}>
          <div className="kpi-icon-wrapper" style={{ backgroundColor: '#eff6ff', color: '#2563eb' }}>
            <TrendingUp size={22} />
          </div>
          <div className="kpi-label">Total a Receber (Aberto)</div>
          <div className="kpi-value" style={{ color: '#1e40af' }}>{formatCurrency(resumo.totalReceberAberto ?? resumo.totalReceberPendente)}</div>
          <div className="kpi-subtext">
            <span>Recebido no mês: </span>
            <strong style={{ color: '#16a34a' }}>{formatCurrency(resumo.totalRecebidoMes)}</strong>
          </div>
        </div>

        {/* Total a Pagar */}
        <div className="kpi-card" onClick={onNavigateToPagar} style={{ cursor: 'pointer' }}>
          <div className="kpi-icon-wrapper" style={{ backgroundColor: '#fef2f2', color: '#dc2626' }}>
            <TrendingDown size={22} />
          </div>
          <div className="kpi-label">Total a Pagar (Aberto)</div>
          <div className="kpi-value" style={{ color: '#b91c1c' }}>{formatCurrency(resumo.totalPagarAberto ?? resumo.totalPagarPendente)}</div>
          <div className="kpi-subtext">
            <span>Pago no mês: </span>
            <strong style={{ color: '#475569' }}>{formatCurrency(resumo.totalPagoMes)}</strong>
          </div>
        </div>

        {/* Vencidos / Inadimplência */}
        <div className="kpi-card" onClick={onNavigateToCobrancas} style={{ cursor: 'pointer' }}>
          <div className="kpi-icon-wrapper" style={{ backgroundColor: '#fee2e2', color: '#dc2626' }}>
            <AlertTriangle size={22} />
          </div>
          <div className="kpi-label">Inadimplência / Vencidos</div>
          <div className="kpi-value" style={{ color: '#dc2626' }}>
            {formatCurrency(resumo.totalReceberVencido)}
          </div>
          <div className="kpi-subtext" style={{ color: '#991b1b' }}>
            <span>Taxa estimada: </span>
            <strong>{resumo.inadimplenciaTaxa}% da carteira</strong>
          </div>
        </div>

        {/* Saldo Líquido Projetado */}
        <div className="kpi-card">
          <div className="kpi-icon-wrapper" style={{ backgroundColor: '#ecfdf5', color: '#059669' }}>
            <Wallet size={22} />
          </div>
          <div className="kpi-label">Saldo Líquido Projetado</div>
          <div
            className="kpi-value"
            style={{ color: resumo.saldoProjetado >= 0 ? '#059669' : '#dc2626' }}
          >
            {formatCurrency(resumo.saldoProjetado)}
          </div>
          <div className="kpi-subtext">
            <span>Receitas abertas vs despesas</span>
          </div>
        </div>
      </div>

      {/* Grid Principal: Gráfico e Alertas do Dia */}
      <div className="grid-2" style={{ marginBottom: '1.75rem' }}>
        {/* Gráfico de Fluxo de Caixa */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <TrendingUp size={20} color="#2563eb" />
              <span>Fluxo de Caixa (Receitas vs Despesas)</span>
            </div>
            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Últimos 6 meses</span>
          </div>

          <div style={{ display: 'flex', gap: '1.25rem', marginBottom: '1.5rem', fontSize: '0.82rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: '#2563eb', display: 'inline-block' }} />
              <span style={{ color: '#475569' }}>Receitas Previstas/Realizadas</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: '#f43f5e', display: 'inline-block' }} />
              <span style={{ color: '#475569' }}>Despesas</span>
            </div>
          </div>

          {/* Gráfico em barras CSS */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              height: 220,
              paddingTop: '1rem',
              borderBottom: '1px solid #e2e8f0',
              gap: '0.75rem',
              backgroundColor: '#f8fafc',
              borderRadius: '8px 8px 0 0',
              padding: '1rem 0.5rem 0',
              overflowX: 'auto',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {mesesFluxo.map((item, idx) => {
              const temReceita = item.receitas > 0;
              const temDespesa = item.despesas > 0;
              const altReceitas = maxValReal > 0 && temReceita
                ? Math.max(6, Math.round((item.receitas / divisorEscala) * 170))
                : 3;
              const altDespesas = maxValReal > 0 && temDespesa
                ? Math.max(6, Math.round((item.despesas / divisorEscala) * 170))
                : 3;

              return (
                <div
                  key={idx}
                  onClick={() => (onNavigateToFinanceiro ? onNavigateToFinanceiro() : onNavigateToReceber())}
                  title={`Clique para ver detalhes do mês ${item.mes}`}
                  style={{
                    flex: 1,
                    minWidth: '42px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    height: '100%',
                    justifyContent: 'flex-end',
                    gap: '0.5rem',
                    cursor: 'pointer',
                    paddingBottom: '4px',
                    borderRadius: '6px',
                    transition: 'background 0.2s ease',
                  }}
                  className="dashboard-bar-col"
                >
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '5px', height: 180 }}>
                    {/* Barra Receita */}
                    <div
                      title={`Receitas em ${item.mes}: ${formatCurrency(item.receitas)}`}
                      style={{
                        width: '18px',
                        height: `${altReceitas}px`,
                        background: temReceita
                          ? 'linear-gradient(180deg, #3b82f6 0%, #1d4ed8 100%)'
                          : '#cbd5e1',
                        borderRadius: '4px 4px 0 0',
                        boxShadow: temReceita ? '0 2px 6px rgba(37, 99, 235, 0.2)' : 'none',
                        transition: 'all 0.3s ease',
                      }}
                    />
                    {/* Barra Despesa */}
                    <div
                      title={`Despesas em ${item.mes}: ${formatCurrency(item.despesas)}`}
                      style={{
                        width: '18px',
                        height: `${altDespesas}px`,
                        background: temDespesa
                          ? 'linear-gradient(180deg, #fb7185 0%, #e11d48 100%)'
                          : '#e2e8f0',
                        borderRadius: '4px 4px 0 0',
                        boxShadow: temDespesa ? '0 2px 6px rgba(244, 63, 94, 0.2)' : 'none',
                        transition: 'all 0.3s ease',
                      }}
                    />
                  </div>
                  <span style={{ fontSize: '0.72rem', color: '#475569', fontWeight: 600 }}>
                    {item.mes}
                  </span>
                </div>
              );
            })}
          </div>

          <div
            style={{
              marginTop: '1rem',
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.82rem',
              color: '#64748b',
              flexWrap: 'wrap',
              gap: '0.5rem',
            }}
          >
            <span>Escala máxima real: <strong style={{ color: '#0f172a' }}>{formatCurrency(maxValReal)}</strong></span>
            {maxValReal === 0 ? (
              <span style={{ color: '#64748b', fontWeight: 600 }}>Nenhuma movimentação financeira registrada no período</span>
            ) : saldoPeriodo > 0 ? (
              <span style={{ color: '#059669', fontWeight: 700 }}>
                Projeção positiva de liquidez (+{formatCurrency(saldoPeriodo)})
              </span>
            ) : saldoPeriodo < 0 ? (
              <span style={{ color: '#dc2626', fontWeight: 700 }}>
                Despesas superam receitas no período ({formatCurrency(saldoPeriodo)})
              </span>
            ) : (
              <span style={{ color: '#64748b', fontWeight: 600 }}>Saldo equilibrado no período</span>
            )}
          </div>
        </div>

        {/* Alertas de Vencimentos do Dia */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <CalendarCheck2 size={20} color="#d97706" />
              <span>Vencimentos de Hoje ({resumo.vencimentosHoje.length})</span>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={onNavigateToCobrancas}>
              <span>Ver Todos</span>
              <ArrowRight size={14} />
            </button>
          </div>

          {resumo.vencimentosHoje.length === 0 ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '3rem 1rem',
                color: '#64748b',
                textAlign: 'center',
              }}
            >
              <CheckCircle2 size={42} color="#059669" style={{ marginBottom: '0.75rem' }} />
              <p style={{ fontWeight: 700, color: '#0f172a' }}>Tudo em dia para hoje!</p>
              <p style={{ fontSize: '0.82rem', marginTop: '0.25rem' }}>
                Nenhuma conta a receber ou a pagar vence nesta data.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {resumo.vencimentosHoje.map((par) => {
                const isReceber = par.tipoConta === 'receber';
                return (
                  <div
                    key={par.id}
                    style={{
                      padding: '0.85rem 1rem',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '0.65rem',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span
                          className={`status-badge ${isReceber ? 'status-pendente' : 'status-vencido'}`}
                          style={{ fontSize: '0.7rem' }}
                        >
                          {isReceber ? 'Receber' : 'Pagar'}
                        </span>
                        <strong style={{ fontSize: '0.92rem', color: '#0f172a' }}>{par.pessoaNome}</strong>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.2rem' }}>
                        {par.descricaoConta} • Parcela {par.numero_parcela}/{par.total_parcelas}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 800, fontSize: '0.98rem', color: '#0f172a' }}>
                          {formatCurrency(par.valor)}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#d97706', fontWeight: 600 }}>Vence Hoje</div>
                      </div>

                      {isReceber && par.pessoaTelefone && (
                        <a
                          href={financialEngine.gerarLinkWhatsappCobranca(par)}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-whatsapp btn-sm"
                          title="Cobrar via WhatsApp"
                          style={{ padding: '0.45rem 0.65rem' }}
                        >
                          <MessageCircle size={15} />
                        </a>
                      )}

                      {onDarBaixa && (
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => onDarBaixa(par)}
                          title="Dar baixa e liquidar esta parcela agora"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                        >
                          <CheckCircle2 size={14} />
                          <span>Baixar</span>
                        </button>
                      )}

                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={par.tipoConta === 'pagar' ? onNavigateToPagar : onNavigateToReceber}
                        title="Ver Conta no Módulo de Contas"
                      >
                        Ver Conta
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Destaque para próximas contas */}
          <div
            style={{
              marginTop: '1.25rem',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.82rem',
              flexWrap: 'wrap',
              gap: '0.5rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1e40af', fontWeight: 500 }}>
              <Clock size={16} />
              <span>{resumo.proximosVencimentos.length} contas vencem nos próximos 7 dias</span>
            </div>
            <button
              onClick={onNavigateToCobrancas}
              style={{
                background: 'none',
                border: 'none',
                color: '#2563eb',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Conferir Alertas →
            </button>
          </div>
        </div>
      </div>

      {/* Tabela de Contas Vencidas */}
      {resumo.parcelasVencidas.length > 0 && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <AlertTriangle size={20} color="#dc2626" />
              <span>Avisos de Contas Vencidas que Exigem Ação Imediata</span>
            </div>
            <span className="status-badge status-vencido">
              {resumo.parcelasVencidas.length} Vencidas
            </span>
          </div>

          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Cliente / Fornecedor</th>
                  <th>Descrição</th>
                  <th>Vencimento</th>
                  <th>Valor</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {resumo.parcelasVencidas.slice(0, 5).map((par) => {
                  const isReceber = par.tipoConta === 'receber';
                  return (
                    <tr key={par.id}>
                      <td>
                        <span className={`status-badge ${isReceber ? 'status-pendente' : 'status-vencido'}`}>
                          {isReceber ? 'Receber' : 'Pagar'}
                        </span>
                      </td>
                      <td>
                        <strong style={{ color: '#0f172a' }}>{par.pessoaNome}</strong>
                        {par.pessoaTelefone && (
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            {par.pessoaTelefone}
                          </div>
                        )}
                      </td>
                      <td>
                        {par.descricaoConta}
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          Parcela {par.numero_parcela}/{par.total_parcelas}
                        </div>
                      </td>
                      <td style={{ color: '#dc2626', fontWeight: 700 }}>
                        {formatDate(par.data_vencimento)}
                      </td>
                      <td style={{ fontWeight: 800, color: '#0f172a' }}>{formatCurrency(par.valor)}</td>
                      <td>
                        <span className="status-badge status-vencido">Vencida</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                          {isReceber && par.pessoaTelefone && (
                            <a
                              href={financialEngine.gerarLinkWhatsappCobranca(par)}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-whatsapp btn-sm"
                              title="Enviar Cobrança WhatsApp"
                            >
                              <MessageCircle size={14} />
                              <span>WhatsApp</span>
                            </a>
                          )}

                          {onDarBaixa && (
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => onDarBaixa(par)}
                              title="Dar baixa imediata nesta parcela"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                            >
                              <CheckCircle2 size={14} />
                              <span>Baixar</span>
                            </button>
                          )}

                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={par.tipoConta === 'pagar' ? onNavigateToPagar : onNavigateToReceber}
                          >
                            Ver Conta
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
