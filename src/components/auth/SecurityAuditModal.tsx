import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  Flame,
  KeyRound,
  Trash2,
  X,
  AlertTriangle,
  FileCheck,
  CheckCircle2,
} from 'lucide-react';
import { securityEngine, SecurityThreatLog } from '../../services/securityEngine';
import { authService, AuthSession } from '../../services/authService';

interface SecurityAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SecurityAuditModal: React.FC<SecurityAuditModalProps> = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState<SecurityThreatLog[]>([]);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [testPayload, setTestPayload] = useState('');
  const [testResult, setTestResult] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLogs(securityEngine.getThreatLogs());
      setSession(authService.obterSessao());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClearLogs = () => {
    securityEngine.limparLogs();
    setLogs([]);
  };

  const handleTestWaf = () => {
    if (!testPayload) return;
    const isSqli = securityEngine.detectarSqlInjection(testPayload);
    const isXss = securityEngine.detectarXss(testPayload);

    if (isSqli) {
      setTestResult('🔴 Bloqueado: Tentativa de SQL Injection detectada e barrada!');
    } else if (isXss) {
      setTestResult('🟠 Bloqueado: Tentativa de XSS identificada e barrada!');
    } else {
      setTestResult('🟢 Aprovado: Entrada considerada segura pelas regras de sanitização.');
    }
    setLogs(securityEngine.getThreatLogs());
  };

  const shields = [
    {
      title: 'WAF Anti-SQL Injection',
      desc: 'Inspeção de queries, UNION SELECT, OR 1=1 e sanitização estrita',
      status: 'PROTEÇÃO ATIVA',
      icon: ShieldAlert,
      color: '#38bdf8',
    },
    {
      title: 'Anti-DDoS & Brute Force',
      desc: 'Rate Limiter com backoff progressivo e desafio Proof-of-Work',
      status: 'PROTEÇÃO ATIVA',
      icon: Flame,
      color: '#f97316',
    },
    {
      title: 'URL Criptografada AES-GCM',
      desc: 'Estado ofuscado na hash com integridade e prevenção anti-tampering',
      status: 'CIFRAGEM ATIVA',
      icon: Lock,
      color: '#10b981',
    },
    {
      title: 'Tokens Seguros JWT (HS256)',
      desc: 'Assinatura digital HMAC-SHA256, claims de validade e rotação',
      status: 'AUTENTICADO',
      icon: KeyRound,
      color: '#a855f7',
    },
  ];

  return (
    <div className="security-modal-backdrop" onClick={onClose}>
      <div className="security-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="security-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: 'rgba(37, 99, 235, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#60a5fa',
              }}
            >
              <ShieldCheck size={24} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>
                Central de Cibersegurança & Auditoria
              </h3>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0 }}>
                Status dos escudos de defesa em tempo real e interceptador de ameaças
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '0.4rem',
            }}
          >
            <X size={20} />
          </button>
        </div>

        <div className="security-modal-body">
          {/* Escudos de Proteção */}
          <div>
            <h4 style={{ fontSize: '0.86rem', color: '#f1f5f9', marginBottom: '0.75rem' }}>
              Camadas de Proteção Ativas (Defesa em Profundidade)
            </h4>
            <div className="cyber-shields-grid">
              {shields.map((s, idx) => {
                const Icon = s.icon;
                return (
                  <div key={idx} className="cyber-shield-card active">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Icon size={18} color={s.color} />
                      <span className="cyber-shield-status-active">{s.status}</span>
                    </div>
                    <div style={{ fontWeight: 600, fontSize: '0.84rem', color: '#f8fafc', marginTop: '0.3rem' }}>
                      {s.title}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{s.desc}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dados da Sessão JWT */}
          {session && (
            <div
              style={{
                background: 'rgba(30, 41, 59, 0.5)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 12,
                padding: '1rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem' }}>
                <FileCheck size={16} color="#10b981" />
                <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Informações da Sessão JWT Ativa</span>
                <span
                  style={{
                    marginLeft: 'auto',
                    fontSize: '0.7rem',
                    padding: '0.15rem 0.5rem',
                    borderRadius: 12,
                    background: 'rgba(16, 185, 129, 0.15)',
                    color: '#34d399',
                  }}
                >
                  {session.authMethod === 'supabase_jwt' ? 'Supabase Auth' : 'Crypto HMAC-SHA256'}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.6rem', fontSize: '0.76rem', color: '#94a3b8' }}>
                <div><strong>Usuário:</strong> {session.user.nome}</div>
                <div><strong>E-mail:</strong> {session.user.email}</div>
                <div><strong>Função (Role):</strong> {session.user.role.toUpperCase()}</div>
                <div><strong>Expiração:</strong> {new Date(session.expiresAt * 1000).toLocaleTimeString('pt-BR')}</div>
              </div>
            </div>
          )}

          {/* Teste Interativo de WAF */}
          <div
            style={{
              background: 'rgba(37, 99, 235, 0.05)',
              border: '1px dashed rgba(59, 130, 246, 0.3)',
              borderRadius: 12,
              padding: '1rem',
            }}
          >
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#93c5fd' }}>
              Simulador de Teste de Penetração (Pen-Test) WAF
            </span>
            <p style={{ fontSize: '0.73rem', color: '#64748b', margin: '0.25rem 0 0.6rem 0' }}>
              Teste a reação do motor de segurança inserindo comandos SQLi (ex: <code>' OR 1=1 --</code>) ou tags XSS (ex: <code>&lt;script&gt;alert(1)&lt;/script&gt;</code>).
            </p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                value={testPayload}
                onChange={(e) => setTestPayload(e.target.value)}
                placeholder="Insira um payload malicioso para testar o escudo..."
                style={{
                  flex: 1,
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: 8,
                  padding: '0.5rem 0.75rem',
                  color: '#ffffff',
                  fontSize: '0.8rem',
                  outline: 'none',
                }}
              />
              <button
                onClick={handleTestWaf}
                style={{
                  background: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '0.5rem 0.9rem',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Inspecionar
              </button>
            </div>
            {testResult && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.78rem', fontWeight: 500 }}>
                {testResult}
              </div>
            )}
          </div>

          {/* Histórico de Ameaças Interceptadas */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
              <h4 style={{ fontSize: '0.86rem', color: '#f1f5f9', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <AlertTriangle size={15} color="#f59e0b" />
                Ameaças Interceptadas Recentemente ({logs.length})
              </h4>
              {logs.length > 0 && (
                <button
                  onClick={handleClearLogs}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#64748b',
                    fontSize: '0.72rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                  }}
                >
                  <Trash2 size={13} /> Limpar Histórico
                </button>
              )}
            </div>

            {logs.length === 0 ? (
              <div
                style={{
                  padding: '1.5rem',
                  textAlign: 'center',
                  background: 'rgba(30, 41, 59, 0.3)',
                  borderRadius: 10,
                  color: '#64748b',
                  fontSize: '0.8rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <CheckCircle2 size={24} color="#10b981" />
                <span>Nenhuma ameaça ou ataque não autorizado detectado. Sistema 100% íntegro.</span>
              </div>
            ) : (
              <div style={{ maxHeight: 220, overflowY: 'auto', borderRadius: 10, border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <table className="threat-log-table">
                  <thead>
                    <tr>
                      <th>Horário</th>
                      <th>Tipo</th>
                      <th>Severidade</th>
                      <th>Detalhes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id}>
                        <td>{log.timestamp}</td>
                        <td>
                          <span
                            style={{
                              padding: '0.15rem 0.4rem',
                              borderRadius: 4,
                              background:
                                log.threatType === 'SQL_INJECTION'
                                  ? 'rgba(239, 68, 68, 0.2)'
                                  : 'rgba(245, 158, 11, 0.2)',
                              color: log.threatType === 'SQL_INJECTION' ? '#f87171' : '#fbbf24',
                              fontWeight: 600,
                              fontSize: '0.68rem',
                            }}
                          >
                            {log.threatType}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600, color: log.severity === 'CRITICA' ? '#ef4444' : '#f59e0b' }}>
                          {log.severity}
                        </td>
                        <td style={{ maxWidth: 300, wordBreak: 'break-word' }}>
                          {log.details}
                          {log.blockedInput && (
                            <div style={{ color: '#94a3b8', fontSize: '0.68rem', fontFamily: 'monospace' }}>
                              Input: {log.blockedInput}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
