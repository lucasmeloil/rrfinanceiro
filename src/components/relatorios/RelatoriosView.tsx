import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  Filter,
  Calendar,
  Layers,
  DollarSign,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { ParcelaComPessoa, Pessoa, FiltrosRelatorio } from '../../types';
import { exportarRelatorioExcel } from '../../services/excelExport';
import { formatCurrency, formatDate } from '../../services/financialEngine';

interface RelatoriosViewProps {
  parcelas: ParcelaComPessoa[];
  pessoas: Pessoa[];
}

export const RelatoriosView: React.FC<RelatoriosViewProps> = ({ parcelas, pessoas }) => {
  const [tipo, setTipo] = useState<FiltrosRelatorio['tipo']>('todos');
  const [status, setStatus] = useState<FiltrosRelatorio['status']>('todos');
  const [pessoaId, setPessoaId] = useState<string>('');
  const [dataInicio, setDataInicio] = useState<string>('');
  const [dataFim, setDataFim] = useState<string>('');
  const [exportando, setExportando] = useState(false);

  // Filtragem
  const dadosFiltrados = parcelas.filter((par) => {
    // Tipo
    if (tipo === 'receber' && par.tipoConta !== 'receber') return false;
    if (tipo === 'pagar' && par.tipoConta !== 'pagar') return false;

    // Status
    if (status !== 'todos' && par.status !== status) return false;

    // Pessoa
    if (pessoaId && !par.pessoaNome.toLowerCase().includes(pessoas.find(p => p.id === pessoaId)?.nome.toLowerCase() || '')) {
      return false;
    }

    // Período de Vencimento
    if (dataInicio && par.data_vencimento < dataInicio) return false;
    if (dataFim && par.data_vencimento > dataFim) return false;

    return true;
  });

  const totalSoma = dadosFiltrados.reduce((a, b) => a + (Number(b.valor) || 0), 0);
  const totalQuitado = dadosFiltrados
    .filter((p) => p.status === 'pago')
    .reduce((a, b) => a + (Number(b.valor_pago || b.valor) || 0), 0);
  const totalAberto = totalSoma - totalQuitado;

  const handleExportarExcel = async () => {
    try {
      setExportando(true);
      await exportarRelatorioExcel(
        { tipo, status, pessoaId, dataInicio, dataFim },
        dadosFiltrados
      );
    } catch (err) {
      console.error('Erro na exportação Excel:', err);
      alert('Houve um erro ao exportar para Excel.');
    } finally {
      setExportando(false);
    }
  };

  return (
    <div className="page-wrapper">
      {/* Banner Informativo dos Diferenciais do Excel */}
      <div
        className="card"
        style={{
          backgroundColor: '#eff6ff',
          borderColor: '#bfdbfe',
          marginBottom: '1.5rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div style={{ maxWidth: '750px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
              <FileSpreadsheet size={24} color="#2563eb" />
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1e40af' }}>
                Exportação de Relatórios Inteligentes para Excel (.xlsx)
              </h2>
            </div>
            <p style={{ fontSize: '0.86rem', color: '#334155' }}>
              Planilhas formatadas com cabeçalho corporativo, cores dinâmicas conforme status
              (<strong style={{ color: '#16a34a' }}>verde</strong> para pago, <strong style={{ color: '#dc2626' }}>vermelho</strong> para vencido, <strong style={{ color: '#d97706' }}>amarelo</strong> para pendente),
              máscaras monetárias em BRL e totais automáticos via fórmulas nativas.
            </p>
          </div>

          <button
            className="btn btn-primary"
            onClick={handleExportarExcel}
            disabled={exportando || dadosFiltrados.length === 0}
            style={{ padding: '0.75rem 1.5rem', fontSize: '0.95rem' }}
          >
            <Download size={18} />
            <span>{exportando ? 'Gerando Planilha...' : 'Exportar Excel Colorido'}</span>
          </button>
        </div>
      </div>

      {/* Painel de Filtros */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: '#93c5fd', fontSize: '0.9rem', fontWeight: 600 }}>
          <Filter size={16} />
          <span>Filtros do Relatório</span>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Tipo de Movimento</label>
            <select
              className="form-control"
              value={tipo}
              onChange={(e: any) => setTipo(e.target.value)}
            >
              <option value="todos">Todos (Receitas & Despesas)</option>
              <option value="receber">Apenas Contas a Receber</option>
              <option value="pagar">Apenas Contas a Pagar</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Status da Parcela</label>
            <select
              className="form-control"
              value={status}
              onChange={(e: any) => setStatus(e.target.value)}
            >
              <option value="todos">Todos os Status</option>
              <option value="pago">Quitadas (Pago)</option>
              <option value="pendente">Pendentes (No Prazo)</option>
              <option value="vencido">Vencidas (Em Atraso)</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Cliente / Fornecedor</label>
            <select
              className="form-control"
              value={pessoaId}
              onChange={(e) => setPessoaId(e.target.value)}
            >
              <option value="">Todos os Cadastros</option>
              {pessoas.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Data Vencimento Inicial</label>
            <input
              type="date"
              className="form-control"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Data Vencimento Final</label>
            <input
              type="date"
              className="form-control"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
            />
          </div>
        </div>

        {/* Resumo da Consulta Filtrada */}
        <div
          style={{
            marginTop: '0.75rem',
            paddingTop: '0.75rem',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            fontSize: '0.86rem',
          }}
        >
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', color: 'var(--text-secondary)' }}>
            <span>Registros: <strong style={{ color: '#0f172a' }}>{dadosFiltrados.length}</strong></span>
            <span>Total Filtrado: <strong style={{ color: '#2563eb' }}>{formatCurrency(totalSoma)}</strong></span>
            <span>Quitado: <strong style={{ color: '#16a34a' }}>{formatCurrency(totalQuitado)}</strong></span>
            <span>Em Aberto: <strong style={{ color: '#d97706' }}>{formatCurrency(totalAberto)}</strong></span>
          </div>

          {(tipo !== 'todos' || status !== 'todos' || pessoaId || dataInicio || dataFim) && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setTipo('todos');
                setStatus('todos');
                setPessoaId('');
                setDataInicio('');
                setDataFim('');
              }}
            >
              Limpar Filtros
            </button>
          )}
        </div>
      </div>

      {/* Prévia da Tabela de Relatório */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <FileSpreadsheet size={18} color="#3b82f6" />
            <span>Pré-visualização dos Dados da Planilha</span>
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            {dadosFiltrados.length} linhas selecionadas
          </span>
        </div>

        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Pessoa</th>
                <th>Descrição</th>
                <th>Parcela</th>
                <th>Vencimento</th>
                <th>Valor</th>
                <th>Status</th>
                <th>Pagamento</th>
              </tr>
            </thead>
            <tbody>
              {dadosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
                    Nenhum registro corresponde aos filtros selecionados.
                  </td>
                </tr>
              ) : (
                dadosFiltrados.map((par) => {
                  const isReceber = par.tipoConta === 'receber';
                  return (
                    <tr key={par.id}>
                      <td>
                        <span className={`status-badge ${isReceber ? 'status-pendente' : 'status-vencido'}`}>
                          {isReceber ? 'Receber' : 'Pagar'}
                        </span>
                      </td>
                      <td>
                        <strong>{par.pessoaNome}</strong>
                      </td>
                      <td>{par.descricaoConta}</td>
                      <td>
                        {par.numero_parcela}/{par.total_parcelas}
                        {par.is_complementar && ' (Comp)'}
                      </td>
                      <td>{formatDate(par.data_vencimento)}</td>
                      <td style={{ fontWeight: 700 }}>{formatCurrency(par.valor)}</td>
                      <td>
                        <span
                          className={`status-badge ${
                            par.status === 'pago'
                              ? 'status-pago'
                              : par.status === 'vencido'
                              ? 'status-vencido'
                              : 'status-pendente'
                          }`}
                        >
                          {par.status}
                        </span>
                      </td>
                      <td>{par.data_pagamento ? formatDate(par.data_pagamento) : '-'}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {dadosFiltrados.length > 0 && (
              <tfoot>
                <tr style={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderTop: '2px solid var(--border-medium)' }}>
                  <td colSpan={5} style={{ fontWeight: 700, textAlign: 'right', color: '#ffffff' }}>
                    SOMA TOTAL:
                  </td>
                  <td style={{ fontWeight: 800, color: '#38bdf8', fontSize: '1rem' }}>
                    {formatCurrency(totalSoma)}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};
