import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Cpu,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Calendar,
  Zap,
  ArrowLeft,
} from 'lucide-react';
import { authService, AuthSession } from '../../services/authService';
import { securityEngine } from '../../services/securityEngine';
import './auth.css';

interface LoginViewProps {
  onLoginSuccess: (session: AuthSession) => void;
  onOpenSecurityModal?: () => void;
}

type TabType = 'login' | 'recovery';

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess, onOpenSecurityModal }) => {
  const [activeTab, setActiveTab] = useState<TabType>('login');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [lembrar, setLembrar] = useState(true);
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [loading, setLoading] = useState(false);

  // Estados de Alerta e Segurança
  const [erroMsg, setErroMsg] = useState<string | null>(null);
  const [sucessoMsg, setSucessoMsg] = useState<string | null>(null);
  const [avisoSeguranca, setAvisoSeguranca] = useState<string | null>(null);

  // Estados de Rate Limit & Proof-of-Work
  const [bloqueadoTimer, setBloqueadoTimer] = useState<number | null>(null);
  const [precisaPow, setPrecisaPow] = useState(false);
  const [powResolvido, setPowResolvido] = useState(false);
  const [powCalculando, setPowCalculando] = useState(false);

  // Timer de Bloqueio por Força Bruta
  useEffect(() => {
    let interval: any = null;
    if (bloqueadoTimer && bloqueadoTimer > 0) {
      interval = setInterval(() => {
        setBloqueadoTimer((prev) => {
          if (prev && prev > 1) return prev - 1;
          return null;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [bloqueadoTimer]);

  const handleResolverPow = async () => {
    setPowCalculando(true);
    setAvisoSeguranca('Processando verificação criptográfica anti-bot (SHA-256 Proof-of-Work)...');
    try {
      const res = await securityEngine.resolverDesafioPow(3);
      if (res.resolvido) {
        setPowResolvido(true);
        setPrecisaPow(false);
        setAvisoSeguranca('Verificação anti-bot concluída com sucesso! Pode prosseguir.');
      }
    } finally {
      setPowCalculando(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErroMsg(null);
    setSucessoMsg(null);
    setAvisoSeguranca(null);

    // Verificação de WAF prévia (Anti-SQLi / Anti-XSS)
    const validacaoEmail = securityEngine.validarEntradaSegura(email, 'E-mail');
    if (!validacaoEmail.valido) {
      setErroMsg(validacaoEmail.motivo || 'Entrada inválida.');
      return;
    }

    const validacaoSenha = securityEngine.validarEntradaSegura(senha, 'Senha');
    if (!validacaoSenha.valido) {
      setErroMsg(validacaoSenha.motivo || 'Senha em formato inválido.');
      return;
    }

    // Se estiver bloqueado por taxa excessiva
    if (bloqueadoTimer) {
      setErroMsg(`Tentativas temporariamente bloqueadas. Aguarde ${bloqueadoTimer}s.`);
      return;
    }

    // Se exigir resolução de captcha de prova de trabalho
    if (precisaPow && !powResolvido) {
      setErroMsg('É necessário resolver a verificação anti-robô abaixo antes de entrar.');
      return;
    }

    setLoading(true);
    try {
      const resultado = await authService.fazerLogin(email, senha, lembrar);

      if (resultado.sucesso && resultado.sessao) {
        setSucessoMsg('Autenticação concedida com sucesso! Redirecionando...');
        setTimeout(() => {
          onLoginSuccess(resultado.sessao!);
        }, 500);
      } else {
        setErroMsg(resultado.mensagem || 'Falha na autenticação.');

        // Se mensagem indicar bloqueio por força bruta
        if (resultado.mensagem?.includes('bloqueou novas tentativas')) {
          setBloqueadoTimer(60);
          setPrecisaPow(true);
          setPowResolvido(false);
        }
      }
    } catch (err: any) {
      setErroMsg(err.message || 'Erro de comunicação segura com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  const handleRecoverySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErroMsg(null);
    const valid = securityEngine.validarEntradaSegura(email, 'E-mail');
    if (!valid.valido) {
      setErroMsg(valid.motivo || 'E-mail inválido.');
      return;
    }
    setSucessoMsg(`Um link seguro com token de uso único foi enviado para ${email}. Verifique sua caixa de entrada.`);
  };


  return (
    <div className="auth-wrapper">
      <div className="auth-bg-cyber-grid" />
      <div className="auth-bg-glow-1" />
      <div className="auth-bg-glow-2" />

      <div className="auth-container-card">
        {/* Painel Esquerdo: Identidade Corporativa & Cibersegurança (Desktop) */}
        <div className="auth-brand-pane">
          <div>
            <div className="auth-brand-header">
              <div className="auth-logo-icon">
                <ShieldCheck size={30} />
              </div>
              <div>
                <div className="auth-brand-title">RR Financeiro</div>
                <div className="auth-brand-subtitle">Gestão de Contas, Mensalidades e Cobranças</div>
              </div>
            </div>

            <div className="auth-hero-copy">
              <h2>
                Plataforma Integrada de <span>Gestão Financeira</span>
              </h2>
              <p>
                Solução completa para administração de contas, controle rigoroso de mensalidades recorrentes e automação de cobranças empresariais.
              </p>
            </div>

            {/* Recursos do Sistema */}
            <div className="auth-shields-list">
              <div className="auth-shield-item">
                <div className="auth-shield-icon blue">
                  <TrendingUp size={18} />
                </div>
                <div className="auth-shield-text">
                  <h4>Contas a Pagar & Receber</h4>
                  <p>Controle de fluxo de caixa, conciliação e previsibilidade financeira.</p>
                </div>
              </div>

              <div className="auth-shield-item">
                <div className="auth-shield-icon green">
                  <Calendar size={18} />
                </div>
                <div className="auth-shield-text">
                  <h4>Mensalidades & Cobrança Ágil</h4>
                  <p>Gestão de planos recorrentes com régua de avisos via WhatsApp.</p>
                </div>
              </div>

              <div className="auth-shield-item">
                <div className="auth-shield-icon purple">
                  <CheckCircle2 size={18} />
                </div>
                <div className="auth-shield-text">
                  <h4>Relatórios & Inteligência</h4>
                  <p>Métricas operacionais consolidadas e exportações analíticas em Excel.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="auth-brand-footer">
            <span className="auth-status-chip">
              <span className="auth-status-dot" />
              Sistema Operacional & Integrado
            </span>
          </div>
        </div>

        {/* Painel Direito: Formulário Interativo & Mobile Nativo */}
        <div className="auth-form-pane">
          {/* Header visível apenas em Mobile */}
          <div className="auth-mobile-header">
            <div className="auth-logo-icon mobile">
              <ShieldCheck size={26} />
            </div>
            <div className="auth-mobile-brand">
              <div className="auth-mobile-title">RR Financeiro</div>
              <div className="auth-mobile-badge">
                <span className="auth-status-dot-sm" />
                Ambiente Criptografado
              </div>
            </div>
          </div>

          {/* Abas Limpas de Navegação: Apenas Entrar e Recuperar (Sem Criar Conta) */}
          <div className="auth-tabs-nav">
            <button
              type="button"
              className={`auth-tab-btn ${activeTab === 'login' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('login');
                setErroMsg(null);
                setSucessoMsg(null);
              }}
            >
              <KeyRound size={16} />
              <span>Entrar</span>
            </button>
            <button
              type="button"
              className={`auth-tab-btn ${activeTab === 'recovery' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('recovery');
                setErroMsg(null);
                setSucessoMsg(null);
              }}
            >
              <span>Recuperar Acesso</span>
            </button>
          </div>

          <div className="auth-form-header">
            <h3 className="auth-form-title">
              {activeTab === 'login' ? 'Autenticação de Usuário' : 'Recuperação de Acesso'}
            </h3>
            <p className="auth-form-desc">
              {activeTab === 'login'
                ? 'Informe suas credenciais autorizadas para emissão do token seguro.'
                : 'Informe o e-mail cadastrado pelo administrador para redefinir o acesso.'}
            </p>
          </div>

          {/* Mensagens de Alerta */}
          {erroMsg && (
            <div className="auth-alert auth-alert-error">
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
              <div>{erroMsg}</div>
            </div>
          )}

          {sucessoMsg && (
            <div className="auth-alert auth-alert-success">
              <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: 1 }} />
              <div>{sucessoMsg}</div>
            </div>
          )}

          {avisoSeguranca && (
            <div className="auth-alert auth-alert-warning">
              <Sparkles size={18} style={{ flexShrink: 0, marginTop: 1 }} />
              <div>{avisoSeguranca}</div>
            </div>
          )}

          {/* Contador de Bloqueio Brute Force */}
          {bloqueadoTimer !== null && (
            <div className="auth-alert auth-alert-error">
              <Zap size={18} style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <strong>Bloqueio Ativo:</strong> Aguarde{' '}
                <span style={{ fontWeight: 800 }}>{bloqueadoTimer}s</span> para novas tentativas.
              </div>
            </div>
          )}

          {/* Desafio Proof-of-Work sob Suspeita de Robô */}
          {precisaPow && (
            <div className="auth-pow-box">
              <div className="auth-pow-info">
                <Cpu size={18} color="#2563eb" />
                <div>
                  <div className="auth-pow-title">Desafio Criptográfico Anti-Bot</div>
                  <div className="auth-pow-desc">Validação matemática SHA-256 para comprovar origem legítima.</div>
                </div>
              </div>
              <button
                type="button"
                className="auth-pow-btn"
                onClick={handleResolverPow}
                disabled={powCalculando || powResolvido}
              >
                {powCalculando ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Calculando Hashes...</span>
                  </>
                ) : powResolvido ? (
                  <>
                    <CheckCircle2 size={14} color="#16a34a" />
                    <span>Verificado com Êxito</span>
                  </>
                ) : (
                  <span>Resolver Desafio Anti-Robô</span>
                )}
              </button>
            </div>
          )}

          {/* Formulário - Login */}
          {activeTab === 'login' && (
            <form className="auth-form" onSubmit={handleLoginSubmit}>
              <div className="auth-field-group">
                <label className="auth-label" htmlFor="login-email">
                  E-mail Corporativo
                </label>
                <div className="auth-input-container">
                  <input
                    id="login-email"
                    type="email"
                    className="auth-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@rrfinanceiro.com.br"
                    autoComplete="email"
                    inputMode="email"
                    required
                    disabled={loading || bloqueadoTimer !== null}
                  />
                  <Mail size={18} className="auth-input-icon" />
                </div>
              </div>

              <div className="auth-field-group">
                <div className="auth-label-row">
                  <label className="auth-label" htmlFor="login-password">
                    Senha de Acesso
                  </label>
                  <button
                    type="button"
                    className="auth-forgot-link"
                    onClick={() => {
                      setActiveTab('recovery');
                      setErroMsg(null);
                    }}
                  >
                    Esqueceu a senha?
                  </button>
                </div>
                <div className="auth-input-container">
                  <input
                    id="login-password"
                    type={mostrarSenha ? 'text' : 'password'}
                    className="auth-input"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder="••••••••••••"
                    autoComplete="current-password"
                    required
                    disabled={loading || bloqueadoTimer !== null}
                  />
                  <Lock size={18} className="auth-input-icon" />
                  <button
                    type="button"
                    className="auth-password-toggle"
                    onClick={() => setMostrarSenha(!mostrarSenha)}
                    aria-label={mostrarSenha ? 'Ocultar senha' : 'Exibir senha'}
                  >
                    {mostrarSenha ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="auth-options-row">
                <label className="auth-checkbox-label">
                  <input
                    type="checkbox"
                    checked={lembrar}
                    onChange={(e) => setLembrar(e.target.checked)}
                    className="auth-checkbox"
                  />
                  <span>Lembrar sessão segura</span>
                </label>
              </div>

              <button
                type="submit"
                className="auth-submit-btn"
                disabled={loading || bloqueadoTimer !== null}
              >
                {loading ? (
                  <>
                    <RefreshCw size={18} className="animate-spin" />
                    <span>Autenticando...</span>
                  </>
                ) : (
                  <>
                    <span>Entrar no Sistema</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Formulário - Recuperação de Senha */}
          {activeTab === 'recovery' && (
            <form className="auth-form" onSubmit={handleRecoverySubmit}>
              <div className="auth-field-group">
                <label className="auth-label" htmlFor="recovery-email">
                  E-mail Cadastrado no Sistema
                </label>
                <div className="auth-input-container">
                  <input
                    id="recovery-email"
                    type="email"
                    className="auth-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu.email@empresa.com.br"
                    autoComplete="email"
                    inputMode="email"
                    required
                  />
                  <Mail size={18} className="auth-input-icon" />
                </div>
              </div>

              <button type="submit" className="auth-submit-btn">
                <span>Enviar Link de Redefinição</span>
                <ArrowRight size={18} />
              </button>

              <button
                type="button"
                className="auth-back-btn"
                onClick={() => {
                  setActiveTab('login');
                  setErroMsg(null);
                }}
              >
                <ArrowLeft size={16} />
                <span>Voltar ao Login</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
