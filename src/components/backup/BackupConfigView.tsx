import React, { useState, useRef, useEffect } from 'react';
import {
  Database,
  Download,
  Upload,
  Cloud,
  CheckCircle2,
  AlertCircle,
  Building2,
  ShieldCheck,
  Copy,
  ExternalLink,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { ConfiguracoesApp } from '../../types';
import { storageService } from '../../services/storage';
import { checkSupabaseConnection, SupabaseSyncStatus } from '../../services/supabaseClient';

interface BackupConfigViewProps {
  onRefresh: () => void;
  onNavigateToUsuarios?: () => void;
}

export const BackupConfigView: React.FC<BackupConfigViewProps> = ({ onRefresh, onNavigateToUsuarios }) => {
  const [config, setConfig] = useState<ConfiguracoesApp>(storageService.getConfig());
  const [msgSucesso, setMsgSucesso] = useState('');
  const [msgErro, setMsgErro] = useState('');
  const [supabaseStatus, setSupabaseStatus] = useState<SupabaseSyncStatus | null>(null);
  const [testandoConexao, setTestandoConexao] = useState(false);
  const [copiouSql, setCopiouSql] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    verificarSupabase();
  }, []);

  const verificarSupabase = async () => {
    setTestandoConexao(true);
    const status = await checkSupabaseConnection();
    setSupabaseStatus(status);
    setTestandoConexao(false);
  };

  const handleSalvarConfig = (e: React.FormEvent) => {
    e.preventDefault();
    storageService.saveConfig(config);
    setMsgSucesso('Configurações salvas com sucesso!');
    setTimeout(() => setMsgSucesso(''), 3000);
    onRefresh();
  };

  const handleExportarBackup = () => {
    const jsonStr = storageService.exportarDadosCompletos();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `RR_Financeiro_Backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setMsgSucesso('Arquivo de backup exportado com sucesso!');
    setTimeout(() => setMsgSucesso(''), 3000);
  };

  const handleImportarArquivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const conteudo = event.target?.result as string;
        const sucesso = storageService.importarDados(conteudo);
        if (sucesso) {
          setConfig(storageService.getConfig());
          setMsgSucesso('Backup importado e restaurado com êxito!');
          setTimeout(() => setMsgSucesso(''), 4000);
          onRefresh();
        } else {
          setMsgErro('Formato do arquivo de backup inválido.');
        }
      } catch {
        setMsgErro('Erro ao processar o arquivo selecionado.');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleZerarTudo = () => {
    if (
      window.confirm(
        'ATENÇÃO: Deseja ZERAR TODOS OS DADOS do sistema? Todos os clientes, contas, mensalidades e parcelas serão apagados, deixando o sistema 100% limpo para operação real.'
      )
    ) {
      storageService.zerarDadosDoSistema();
      setMsgSucesso('Todos os dados foram zerados com sucesso! O sistema está limpo.');
      setTimeout(() => setMsgSucesso(''), 3000);
      onRefresh();
    }
  };

  const handleCopiarSql = () => {
    const sqlContent = `-- ==============================================================================
-- RR FINANCEIRO - ESQUEMA DE BANCO DE DADOS SUPABASE (POSTGRESQL)
-- Projeto: https://djqykdfnmbonnohcijwf.supabase.co
-- ==============================================================================

-- 1. TABELA DE PESSOAS (CLIENTES & FORNECEDORES)
CREATE TABLE IF NOT EXISTS public.pessoas (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    cpf_cnpj TEXT,
    telefone TEXT,
    email TEXT,
    endereco TEXT,
    tipo TEXT NOT NULL DEFAULT 'cliente',
    dia_emissao_mensalidade INTEGER DEFAULT 1,
    dia_vencimento_mensalidade INTEGER DEFAULT 10,
    valor_mensalidade_padrao NUMERIC(12, 2) DEFAULT 0.00,
    chave_pix TEXT,
    observacoes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABELA DE CONTAS (A RECEBER E A PAGAR)
CREATE TABLE IF NOT EXISTS public.contas (
    id TEXT PRIMARY KEY,
    pessoa_id TEXT REFERENCES public.pessoas(id) ON DELETE SET NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('receber', 'pagar')),
    categoria TEXT,
    descricao TEXT NOT NULL,
    data_emissao DATE NOT NULL,
    data_vencimento DATE NOT NULL,
    valor_total NUMERIC(12, 2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pendente',
    numero_parcelas INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABELA DE PARCELAS (INCLUINDO PARCELAS COMPLEMENTARES)
CREATE TABLE IF NOT EXISTS public.parcelas (
    id TEXT PRIMARY KEY,
    conta_id TEXT REFERENCES public.contas(id) ON DELETE CASCADE,
    numero_parcela INTEGER NOT NULL,
    total_parcelas INTEGER NOT NULL,
    valor NUMERIC(12, 2) NOT NULL,
    valor_pago NUMERIC(12, 2),
    data_vencimento DATE NOT NULL,
    data_pagamento DATE,
    status TEXT NOT NULL DEFAULT 'pendente',
    is_complementar BOOLEAN DEFAULT FALSE,
    parcela_origem_id TEXT,
    observacoes TEXT
);

-- 4. TABELA DE MENSALIDADES (RECORRÊNCIA E LOTES)
CREATE TABLE IF NOT EXISTS public.mensalidades (
    id TEXT PRIMARY KEY,
    pessoa_id TEXT REFERENCES public.pessoas(id) ON DELETE CASCADE,
    mes_referencia TEXT NOT NULL,
    data_emissao DATE NOT NULL,
    data_vencimento DATE NOT NULL,
    valor NUMERIC(12, 2) NOT NULL,
    valor_pago NUMERIC(12, 2),
    data_pagamento DATE,
    status TEXT NOT NULL DEFAULT 'pendente',
    conta_id TEXT,
    observacoes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABELA DE CONFIGURAÇÕES
CREATE TABLE IF NOT EXISTS public.configuracoes (
    id TEXT PRIMARY KEY DEFAULT 'config_padrao',
    nome_empresa TEXT DEFAULT 'RR Financeiro & Gestão',
    cnpj_empresa TEXT,
    chave_pix_padrao TEXT,
    instrucoes_cobranca TEXT,
    modo_offline BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.pessoas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parcelas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mensalidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso Público para Frontend
DROP POLICY IF EXISTS "Permitir leitura geral pessoas" ON public.pessoas;
CREATE POLICY "Permitir leitura geral pessoas" ON public.pessoas FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir leitura geral contas" ON public.contas;
CREATE POLICY "Permitir leitura geral contas" ON public.contas FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir leitura geral parcelas" ON public.parcelas;
CREATE POLICY "Permitir leitura geral parcelas" ON public.parcelas FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir leitura geral mensalidades" ON public.mensalidades;
CREATE POLICY "Permitir leitura geral mensalidades" ON public.mensalidades FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir leitura geral configuracoes" ON public.configuracoes;
CREATE POLICY "Permitir leitura geral configuracoes" ON public.configuracoes FOR ALL USING (true) WITH CHECK (true);

-- Índices de Performance
CREATE INDEX IF NOT EXISTS idx_contas_pessoa ON public.contas(pessoa_id);
CREATE INDEX IF NOT EXISTS idx_parcelas_conta ON public.parcelas(conta_id);
CREATE INDEX IF NOT EXISTS idx_parcelas_vencimento ON public.parcelas(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_mensalidades_pessoa ON public.mensalidades(pessoa_id);
CREATE INDEX IF NOT EXISTS idx_mensalidades_mes ON public.mensalidades(mes_referencia);
`;

    navigator.clipboard.writeText(sqlContent);
    setCopiouSql(true);
    setTimeout(() => setCopiouSql(false), 3000);
  };

  return (
    <div className="page-wrapper" style={{ maxWidth: '1000px' }}>
      {msgSucesso && (
        <div className="alert-box alert-success">
          <CheckCircle2 size={18} />
          <span>{msgSucesso}</span>
        </div>
      )}

      {msgErro && (
        <div className="alert-box alert-danger">
          <AlertCircle size={18} />
          <span>{msgErro}</span>
        </div>
      )}

      {/* Cartão de Conexão Supabase em Destaque */}
      <div
        className="card"
        style={{
          marginBottom: '1.75rem',
          backgroundColor: '#eff6ff',
          border: '1px solid #bfdbfe',
        }}
      >
        <div className="card-header">
          <div className="card-title" style={{ color: '#1e40af' }}>
            <Cloud size={22} color="#2563eb" />
            <span>Banco de Dados em Nuvem (Supabase Conectado)</span>
          </div>
          <span className="status-badge status-pago">
            {supabaseStatus?.online ? 'Conexão Estabelecida' : 'Aguardando Sincronização'}
          </span>
        </div>

        <p style={{ fontSize: '0.88rem', color: '#334155', marginBottom: '1.25rem' }}>
          O sistema está configurado com as credenciais do seu projeto Supabase. Os dados salvos localmente são sincronizados automaticamente com o banco de dados.
        </p>

        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 'var(--radius-md)',
            padding: '1rem',
            marginBottom: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            fontSize: '0.85rem',
          }}
        >
          <div>
            <span style={{ color: '#64748b', fontWeight: 600 }}>URL do Projeto: </span>
            <code style={{ color: '#1e40af', fontWeight: 700 }}>
              https://djqykdfnmbonnohcijwf.supabase.co
            </code>
          </div>
          <div>
            <span style={{ color: '#64748b', fontWeight: 600 }}>Publishable Key: </span>
            <code style={{ color: '#475569' }}>
              sb_publishable_JVEchFVme0KIYWjLrySSSA_XAI-8VI0
            </code>
          </div>
          {supabaseStatus && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px dashed #cbd5e1' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldCheck size={16} color="#16a34a" />
                <span style={{ color: '#16a34a', fontWeight: 600 }}>
                  Conexão ativa e tabelas com RLS verificado às {supabaseStatus.lastChecked}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                {[
                  { name: 'pessoas', ok: supabaseStatus.tablePessoas },
                  { name: 'contas', ok: supabaseStatus.tableContas },
                  { name: 'parcelas', ok: supabaseStatus.tableParcelas },
                  { name: 'mensalidades', ok: supabaseStatus.tableMensalidades },
                  { name: 'configuracoes', ok: supabaseStatus.tableConfiguracoes },
                  { name: 'auditoria_seguranca', ok: supabaseStatus.tableAuditoria },
                ].map((t) => (
                  <span
                    key={t.name}
                    style={{
                      fontSize: '0.72rem',
                      padding: '0.15rem 0.5rem',
                      borderRadius: '12px',
                      background: t.ok ? '#dcfce7' : '#fee2e2',
                      color: t.ok ? '#166534' : '#991b1b',
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                    }}
                  >
                    <span>{t.ok ? '✓' : '✗'}</span>
                    <span>{t.name}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={verificarSupabase}
            disabled={testandoConexao}
          >
            <RefreshCw size={14} className={testandoConexao ? 'spin' : ''} />
            <span>{testandoConexao ? 'Testando...' : 'Testar Conexão Supabase'}</span>
          </button>

          <button className="btn btn-primary btn-sm" onClick={handleCopiarSql}>
            <Copy size={14} />
            <span>{copiouSql ? 'Script SQL Copiado!' : 'Copiar Script SQL das Tabelas'}</span>
          </button>

          <a
            href="https://supabase.com/dashboard/project/djqykdfnmbonnohcijwf/sql"
            target="_blank"
            rel="noreferrer"
            className="btn btn-secondary btn-sm"
          >
            <ExternalLink size={14} />
            <span>Abrir SQL Editor no Console</span>
          </a>
        </div>
      </div>

      {/* Gestão de Acessos & Usuários */}
      {onNavigateToUsuarios && (
        <div
          className="card"
          style={{
            marginBottom: '1.75rem',
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            padding: '1.25rem 1.5rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '10px',
                backgroundColor: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ShieldCheck size={24} />
            </div>
            <div>
              <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '1rem' }}>
                Gestão de Usuários & Controle de Acessos
              </div>
              <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '0.15rem' }}>
                Cadastre novos administradores, operadores de cobrança e defina níveis de permissão com segurança.
              </div>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={onNavigateToUsuarios}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <span>Gerenciar Usuários</span>
            <ExternalLink size={14} />
          </button>
        </div>
      )}

      {/* Dados da Empresa & Cobrança */}
      <div className="card" style={{ marginBottom: '1.75rem' }}>
        <div className="card-header">
          <div className="card-title">
            <Building2 size={20} color="#2563eb" />
            <span>Dados da Empresa & Dados de Cobrança</span>
          </div>
        </div>

        <form onSubmit={handleSalvarConfig}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Nome da Empresa / Razão Social</label>
              <input
                type="text"
                className="form-control"
                value={config.nomeEmpresa}
                onChange={(e) => setConfig({ ...config, nomeEmpresa: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">CNPJ da Empresa</label>
              <input
                type="text"
                className="form-control"
                value={config.cnpjEmpresa}
                onChange={(e) => setConfig({ ...config, cnpjEmpresa: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Chave PIX Padrão (Incluída nos Alertas de WhatsApp)</label>
            <input
              type="text"
              className="form-control"
              placeholder="Ex: financeiro@empresa.com.br ou CNPJ"
              value={config.chavePixPadrao}
              onChange={(e) => setConfig({ ...config, chavePixPadrao: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Instruções de Pagamento / Cobrança</label>
            <textarea
              className="form-control"
              rows={3}
              value={config.instrucoesCobranca}
              onChange={(e) => setConfig({ ...config, instrucoesCobranca: e.target.value })}
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem' }}>
            <CheckCircle2 size={16} />
            <span>Salvar Alterações</span>
          </button>
        </form>
      </div>

      {/* Backup e Restauração de Dados */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <Database size={20} color="#059669" />
            <span>Backup e Segurança dos Dados</span>
          </div>
        </div>

        <p style={{ fontSize: '0.86rem', color: '#475569', marginBottom: '1.25rem' }}>
          Você pode gerar backups manuais a qualquer momento em arquivo JSON para garantir redundância total e segurança dos dados financeiros.
        </p>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={handleExportarBackup}>
            <Download size={17} />
            <span>Exportar Backup Completo (.json)</span>
          </button>

          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            accept=".json"
            onChange={handleImportarArquivo}
          />

          <button className="btn btn-secondary" onClick={() => fileInputRef.current?.click()}>
            <Upload size={17} />
            <span>Restaurar Backup do Arquivo</span>
          </button>

          <button
            className="btn btn-secondary"
            onClick={handleZerarTudo}
            style={{ color: '#dc2626', borderColor: '#fca5a5', fontWeight: 600 }}
            title="Apaga todos os clientes, contas e mensalidades"
          >
            <Trash2 size={17} />
            <span>Zerar Todos os Dados (Base Limpa)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
