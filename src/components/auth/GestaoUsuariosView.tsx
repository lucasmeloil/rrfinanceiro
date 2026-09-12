import React, { useState, useEffect, useCallback } from 'react';
import {
  UserCheck,
  UserPlus,
  ShieldCheck,
  Trash2,
  Lock,
  Mail,
  User,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  X,
  Eye,
  EyeOff,
  RefreshCw,
  Search,
  Calendar,
  Key,
} from 'lucide-react';
import { authService, UsuarioSistemaPublico } from '../../services/authService';

export const GestaoUsuariosView: React.FC = () => {
  const [usuarios, setUsuarios] = useState<UsuarioSistemaPublico[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMaster, setIsMaster] = useState(false);
  const [busca, setBusca] = useState('');

  // Modal de Novo Usuário
  const [modalNovoAberto, setModalNovoAberto] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [novoEmail, setNovoEmail] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [novoRole, setNovoRole] = useState<'admin' | 'operador' | 'auditor'>('operador');
  const [mostrarSenhaNovo, setMostrarSenhaNovo] = useState(false);
  const [salvandoNovo, setSalvandoNovo] = useState(false);

  // Modal de Alteração de Senha
  const [modalSenhaAberto, setModalSenhaAberto] = useState(false);
  const [usuarioAlvoSenha, setUsuarioAlvoSenha] = useState<UsuarioSistemaPublico | null>(null);
  const [senhaNovaDefinida, setSenhaNovaDefinida] = useState('');
  const [mostrarSenhaDefinida, setMostrarSenhaDefinida] = useState(false);
  const [salvandoSenha, setSalvandoSenha] = useState(false);

  // Mensagens de Feedback
  const [msgSucesso, setMsgSucesso] = useState('');
  const [msgErro, setMsgErro] = useState('');

  const carregarDados = useCallback(async () => {
    try {
      setLoading(true);
      const master = await authService.isMasterAdmin();
      setIsMaster(master);

      if (master) {
        const list = await authService.obterUsuariosSistema();
        setUsuarios(list);
      }
    } catch (err) {
      console.error('Erro ao carregar usuários:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  // Criar Novo Usuário
  const handleSalvarNovoUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsgErro('');
    setMsgSucesso('');

    if (novaSenha.length < 8) {
      setMsgErro('A senha provisória deve ter no mínimo 8 caracteres para conformidade de segurança.');
      return;
    }

    try {
      setSalvandoNovo(true);
      const res = await authService.registrarUsuario(novoNome, novoEmail, novaSenha, novoRole);
      if (res.sucesso) {
        setMsgSucesso(res.mensagem || `Usuário "${novoNome}" cadastrado com sucesso!`);
        await carregarDados();
        setModalNovoAberto(false);
        setNovoNome('');
        setNovoEmail('');
        setNovaSenha('');
        setNovoRole('operador');
        setTimeout(() => setMsgSucesso(''), 5000);
      } else {
        setMsgErro(res.mensagem || 'Não foi possível registrar o usuário.');
      }
    } catch (err: any) {
      setMsgErro(err.message || 'Erro ao registrar credencial de acesso.');
    } finally {
      setSalvandoNovo(false);
    }
  };

  // Abrir Modal de Troca de Senha
  const handleAbrirTrocarSenha = (u: UsuarioSistemaPublico) => {
    setUsuarioAlvoSenha(u);
    setSenhaNovaDefinida('');
    setMostrarSenhaDefinida(false);
    setMsgErro('');
    setModalSenhaAberto(true);
  };

  // Salvar Troca de Senha
  const handleSalvarTrocaSenha = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuarioAlvoSenha) return;
    setMsgErro('');

    if (senhaNovaDefinida.length < 8) {
      setMsgErro('A nova senha deve possuir no mínimo 8 caracteres para segurança.');
      return;
    }

    try {
      setSalvandoSenha(true);
      const res = await authService.alterarSenhaUsuario(usuarioAlvoSenha.email, senhaNovaDefinida);
      if (res.sucesso) {
        setMsgSucesso(res.mensagem || `Senha de ${usuarioAlvoSenha.nome} alterada com sucesso!`);
        setModalSenhaAberto(false);
        setSenhaNovaDefinida('');
        setUsuarioAlvoSenha(null);
        setTimeout(() => setMsgSucesso(''), 5000);
      } else {
        setMsgErro(res.mensagem || 'Não foi possível alterar a senha.');
      }
    } catch (err: any) {
      setMsgErro(err.message || 'Erro ao redefinir credencial.');
    } finally {
      setSalvandoSenha(false);
    }
  };

  // Revogar Acesso
  const handleExcluirUsuario = async (user: UsuarioSistemaPublico) => {
    if (user.isMaster) {
      alert('O Administrador Geral do Sistema não pode ser removido.');
      return;
    }

    if (
      window.confirm(
        `Confirma a revogação de acesso para "${user.nome}" (${user.email})? Este usuário não poderá mais entrar no sistema.`
      )
    ) {
      const ok = await authService.removerUsuarioSistema(user.email);
      if (ok) {
        setMsgSucesso(`Acesso de ${user.email} revogado com êxito!`);
        await carregarDados();
        setTimeout(() => setMsgSucesso(''), 4000);
      } else {
        setMsgErro('Não foi possível remover este usuário do cofre.');
      }
    }
  };

  // Badge de Perfil
  const renderBadgeRole = (role: string, isMasterUser?: boolean) => {
    if (isMasterUser || role === 'admin') {
      return (
        <span
          style={{
            backgroundColor: '#eff6ff',
            color: '#1d4ed8',
            border: '1px solid #bfdbfe',
            padding: '0.25rem 0.65rem',
            borderRadius: '999px',
            fontSize: '0.74rem',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
          }}
        >
          <ShieldCheck size={13} />
          <span>{isMasterUser ? 'Administrador Geral' : 'Administrador'}</span>
        </span>
      );
    }

    if (role === 'operador') {
      return (
        <span
          style={{
            backgroundColor: '#f0fdf4',
            color: '#15803d',
            border: '1px solid #bbf7d0',
            padding: '0.25rem 0.65rem',
            borderRadius: '999px',
            fontSize: '0.74rem',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
          }}
        >
          <UserCheck size={13} />
          <span>Operador Financeiro</span>
        </span>
      );
    }

    return (
      <span
        style={{
          backgroundColor: '#fffbeb',
          color: '#b45309',
          border: '1px solid #fde68a',
          padding: '0.25rem 0.65rem',
          borderRadius: '999px',
          fontSize: '0.74rem',
          fontWeight: 700,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem',
        }}
      >
        <KeyRound size={13} />
        <span>Auditor / Consulta</span>
      </span>
    );
  };

  // Filtragem
  const usuariosFiltrados = usuarios.filter((u) => {
    if (!busca) return true;
    const b = busca.toLowerCase();
    return u.nome.toLowerCase().includes(b) || u.email.toLowerCase().includes(b);
  });

  if (loading) {
    return (
      <div className="page-wrapper" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
        <RefreshCw size={28} className="animate-spin" color="#2563eb" />
      </div>
    );
  }

  // Se o usuário conectado NÃO for o Administrador Geral
  if (!isMaster) {
    return (
      <div className="page-wrapper" style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div
          className="card"
          style={{
            padding: '2.5rem 1.5rem',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
            backgroundColor: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            boxShadow: '0 4px 14px rgba(15, 23, 42, 0.06)',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: '#fee2e2',
              color: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ShieldAlert size={32} />
          </div>

          <div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem 0' }}>
              Acesso Restrito ao Administrador Geral
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.92rem', maxWidth: '520px', lineHeight: 1.5, margin: 0 }}>
              Por diretrizes de cibersegurança e controle de privilégios mínimos (PoLP), apenas o <strong>Administrador Geral</strong> possui autorização para criar novos acessos, visualizar a lista de credenciais ou redefinir senhas.
            </p>
          </div>

          <div
            style={{
              padding: '0.75rem 1rem',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              fontSize: '0.82rem',
              color: '#475569',
              marginTop: '0.5rem',
            }}
          >
            Caso necessite de novas credenciais ou troca de senha, solicite diretamente ao responsável administrativo.
          </div>
        </div>
      </div>
    );
  }

  const totalAdmins = usuarios.filter((u) => u.role === 'admin' || u.isMaster).length;
  const totalOperadores = usuarios.filter((u) => u.role !== 'admin' && !u.isMaster).length;

  return (
    <div className="page-wrapper" style={{ maxWidth: '1050px' }}>
      {/* Alertas de Feedback */}
      {msgSucesso && (
        <div className="alert-box alert-success" style={{ marginBottom: '1.25rem' }}>
          <CheckCircle2 size={18} />
          <span>{msgSucesso}</span>
        </div>
      )}

      {msgErro && (
        <div className="alert-box alert-danger" style={{ marginBottom: '1.25rem' }}>
          <AlertCircle size={18} />
          <span>{msgErro}</span>
        </div>
      )}

      {/* Cartões de Indicadores Executivos */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <div className="card" style={{ padding: '1.15rem' }}>
          <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>Total de Acessos</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', marginTop: '0.25rem' }}>
            {usuarios.length}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#16a34a', marginTop: '0.2rem', fontWeight: 600 }}>
            • Cofre protegido com SHA-256
          </div>
        </div>

        <div className="card" style={{ padding: '1.15rem' }}>
          <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>Administradores</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#2563eb', marginTop: '0.25rem' }}>
            {totalAdmins}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.2rem' }}>
            Acesso irrestrito a configurações
          </div>
        </div>

        <div className="card" style={{ padding: '1.15rem' }}>
          <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>Operadores & Auditores</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#059669', marginTop: '0.25rem' }}>
            {totalOperadores}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.2rem' }}>
            Operações do dia a dia
          </div>
        </div>
      </div>

      {/* Card Principal de Gestão */}
      <div className="card">
        <div
          className="card-header"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            paddingBottom: '1rem',
            borderBottom: '1px solid #f1f5f9',
          }}
        >
          <div>
            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldCheck size={22} color="#2563eb" />
              <span>Controle de Acessos & Usuários Autorizados</span>
            </div>
            <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '0.2rem' }}>
              Área restrita: Apenas você como Administrador Geral pode emitir acessos e gerenciar senhas.
            </div>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setModalNovoAberto(true);
              setMsgErro('');
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              minHeight: '44px',
              padding: '0.5rem 1.15rem',
            }}
          >
            <UserPlus size={17} />
            <span>Novo Usuário</span>
          </button>
        </div>

        {/* Barra de Busca de Usuários */}
        <div style={{ padding: '1rem 0 0.5rem 0' }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: '380px' }}>
            <Search
              size={17}
              color="#94a3b8"
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
            />
            <input
              type="text"
              className="form-control"
              placeholder="Buscar por nome ou e-mail..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              style={{ paddingLeft: '38px', minHeight: '42px', fontSize: '0.88rem' }}
            />
          </div>
        </div>

        {/* 1. VISÃO DESKTOP (TABELA ESPAÇOSA) */}
        <div className="desktop-only" style={{ marginTop: '0.75rem' }}>
          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Usuário / Nome</th>
                  <th>E-mail Corporativo</th>
                  <th>Nível de Permissão</th>
                  <th>Criação</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {usuariosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>
                      Nenhum usuário encontrado com os termos pesquisados.
                    </td>
                  </tr>
                ) : (
                  usuariosFiltrados.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <div
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: '50%',
                              backgroundColor: user.isMaster || user.role === 'admin' ? '#eff6ff' : '#f0fdf4',
                              color: user.isMaster || user.role === 'admin' ? '#1d4ed8' : '#15803d',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '0.86rem',
                              flexShrink: 0,
                              border: user.isMaster ? '2px solid #3b82f6' : '1px solid #cbd5e1',
                            }}
                          >
                            {user.nome.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9rem' }}>
                              {user.nome}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>ID: {user.id}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ color: '#334155', fontWeight: 500, fontSize: '0.86rem' }}>{user.email}</td>
                      <td>{renderBadgeRole(user.role, user.isMaster)}</td>
                      <td style={{ color: '#64748b', fontSize: '0.82rem' }}>{user.criadoEm}</td>
                      <td>
                        <span
                          style={{
                            backgroundColor: '#f0fdf4',
                            color: '#16a34a',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '0.2rem 0.55rem',
                            borderRadius: '6px',
                            border: '1px solid #bbf7d0',
                          }}
                        >
                          ● Ativo
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleAbrirTrocarSenha(user)}
                            title="Trocar senha deste usuário"
                            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                          >
                            <Key size={14} />
                            <span>Trocar Senha</span>
                          </button>

                          {!user.isMaster && (
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleExcluirUsuario(user)}
                              title="Revogar acesso deste usuário"
                              style={{ color: '#dc2626', borderColor: '#fecaca', backgroundColor: '#fff1f2' }}
                            >
                              <Trash2 size={14} />
                              <span>Revogar</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 2. VISÃO MOBILE (CARDS RESPONSIVOS TOUCH) */}
        <div className="mobile-only" style={{ marginTop: '0.75rem' }}>
          {usuariosFiltrados.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#64748b' }}>
              Nenhum usuário encontrado.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {usuariosFiltrados.map((user) => (
                <div
                  key={user.id}
                  className="user-mobile-card"
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '14px',
                    padding: '1rem',
                    boxShadow: '0 2px 6px rgba(15, 23, 42, 0.05)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                  }}
                >
                  {/* Topo do Card */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <div
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: '50%',
                          backgroundColor: user.isMaster || user.role === 'admin' ? '#eff6ff' : '#f0fdf4',
                          color: user.isMaster || user.role === 'admin' ? '#1d4ed8' : '#15803d',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '0.95rem',
                          flexShrink: 0,
                          border: user.isMaster ? '2px solid #3b82f6' : '1px solid #cbd5e1',
                        }}
                      >
                        {user.nome.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.98rem', color: '#0f172a' }}>
                          {user.nome}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>ID: {user.id}</div>
                      </div>
                    </div>

                    <div>{renderBadgeRole(user.role, user.isMaster)}</div>
                  </div>

                  {/* Informações de Contato e Criação */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr',
                      gap: '0.4rem',
                      backgroundColor: '#f8fafc',
                      padding: '0.75rem',
                      borderRadius: '10px',
                      border: '1px solid #f1f5f9',
                      fontSize: '0.82rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#334155' }}>
                      <Mail size={15} color="#64748b" />
                      <span style={{ fontWeight: 600, wordBreak: 'break-all' }}>{user.email}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b' }}>
                      <Calendar size={15} color="#94a3b8" />
                      <span>Cadastrado em: {user.criadoEm}</span>
                    </div>
                  </div>

                  {/* Botões de Ação Touch */}
                  <div style={{ display: 'grid', gridTemplateColumns: user.isMaster ? '1fr' : '1fr 1fr', gap: '0.5rem' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => handleAbrirTrocarSenha(user)}
                      style={{
                        minHeight: '44px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.4rem',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                      }}
                    >
                      <Key size={15} color="#2563eb" />
                      <span>Trocar Senha</span>
                    </button>

                    {!user.isMaster && (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => handleExcluirUsuario(user)}
                        style={{
                          minHeight: '44px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.4rem',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          color: '#dc2626',
                          backgroundColor: '#fff1f2',
                          borderColor: '#fecaca',
                        }}
                      >
                        <Trash2 size={15} />
                        <span>Revogar</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: NOVO USUÁRIO */}
      {modalNovoAberto && (
        <div className="modal-overlay" onClick={() => setModalNovoAberto(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <UserPlus size={20} color="#2563eb" />
                <h3 className="modal-title">Cadastrar Novo Usuário</h3>
              </div>
              <button className="btn-icon" onClick={() => setModalNovoAberto(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSalvarNovoUsuario}>
              <div className="modal-body">
                {msgErro && (
                  <div className="alert-box alert-danger" style={{ marginBottom: '1rem' }}>
                    <AlertCircle size={16} />
                    <span>{msgErro}</span>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Nome Completo</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Ex: João da Silva"
                      value={novoNome}
                      onChange={(e) => setNovoNome(e.target.value)}
                      required
                    />
                    <User size={16} color="#94a3b8" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">E-mail Corporativo</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="email"
                      className="form-control"
                      placeholder="usuario@rrfinanceiro.com.br"
                      value={novoEmail}
                      onChange={(e) => setNovoEmail(e.target.value)}
                      required
                    />
                    <Mail size={16} color="#94a3b8" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Senha Inicial Provisória (Mínimo 8 caracteres)</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={mostrarSenhaNovo ? 'text' : 'password'}
                      className="form-control"
                      placeholder="••••••••••••"
                      value={novaSenha}
                      onChange={(e) => setNovaSenha(e.target.value)}
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setMostrarSenhaNovo(!mostrarSenhaNovo)}
                      style={{
                        position: 'absolute',
                        right: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#64748b',
                      }}
                    >
                      {mostrarSenhaNovo ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Nível de Permissão</label>
                  <select
                    className="form-control"
                    value={novoRole}
                    onChange={(e: any) => setNovoRole(e.target.value)}
                  >
                    <option value="operador">Operador Financeiro (Contas, Baixas e WhatsApp)</option>
                    <option value="auditor">Auditor (Somente Leitura e Relatórios)</option>
                    <option value="admin">Administrador Secundário</option>
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModalNovoAberto(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={salvandoNovo}>
                  {salvandoNovo ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      <span>Salvando no Cofre...</span>
                    </>
                  ) : (
                    <span>Registrar Usuário</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: TROCAR SENHA (EXCLUSIVO ADMINISTRADOR GERAL) */}
      {modalSenhaAberto && usuarioAlvoSenha && (
        <div className="modal-overlay" onClick={() => setModalSenhaAberto(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Key size={20} color="#2563eb" />
                <h3 className="modal-title">Alterar Senha de Acesso</h3>
              </div>
              <button className="btn-icon" onClick={() => setModalSenhaAberto(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSalvarTrocaSenha}>
              <div className="modal-body">
                {msgErro && (
                  <div className="alert-box alert-danger" style={{ marginBottom: '1rem' }}>
                    <AlertCircle size={16} />
                    <span>{msgErro}</span>
                  </div>
                )}

                <div
                  style={{
                    backgroundColor: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    borderRadius: '10px',
                    padding: '0.85rem 1rem',
                    marginBottom: '1rem',
                    fontSize: '0.85rem',
                  }}
                >
                  <div style={{ color: '#1e40af', fontWeight: 700 }}>
                    Usuário Selecionado: {usuarioAlvoSenha.nome}
                  </div>
                  <div style={{ color: '#3b82f6', fontSize: '0.8rem', marginTop: '0.15rem' }}>
                    {usuarioAlvoSenha.email}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Nova Senha (Mínimo 8 caracteres)</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={mostrarSenhaDefinida ? 'text' : 'password'}
                      className="form-control"
                      placeholder="Digite a nova senha segura..."
                      value={senhaNovaDefinida}
                      onChange={(e) => setSenhaNovaDefinida(e.target.value)}
                      required
                      minLength={8}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setMostrarSenhaDefinida(!mostrarSenhaDefinida)}
                      style={{
                        position: 'absolute',
                        right: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#64748b',
                      }}
                    >
                      {mostrarSenhaDefinida ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.5rem' }}>
                  🛡️ A nova senha será armazenada no cofre seguro com Salt e criptografia SHA-256 de mão única.
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModalSenhaAberto(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={salvandoSenha}>
                  {salvandoSenha ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      <span>Atualizando no Cofre...</span>
                    </>
                  ) : (
                    <span>Salvar Nova Senha</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
