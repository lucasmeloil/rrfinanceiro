import React, { useState, useRef, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Edit2,
  Trash2,
  Phone,
  Mail,
  MapPin,
  Calendar,
  X,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  RefreshCw,
  Building2,
  FileText,
  BadgeCheck,
  Briefcase,
  Layers,
  DollarSign,
  Table,
  LayoutGrid,
  MessageCircle,
} from 'lucide-react';
import { Pessoa, TipoPessoa } from '../../types';
import { storageService } from '../../services/storage';
import { formatCurrency } from '../../services/financialEngine';
import { consultaApiService } from '../../services/consultaApi';
import { notificationService } from '../../services/notificationService';

interface PessoasViewProps {
  pessoas: Pessoa[];
  onRefresh: () => void;
  onOpenNovoClienteModal?: boolean;
}

export const PessoasView: React.FC<PessoasViewProps> = ({ pessoas, onRefresh, onOpenNovoClienteModal }) => {
  const [busca, setBusca] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'cliente' | 'fornecedor'>('todos');
  const [modalAberto, setModalAberto] = useState(false);
  const [abaModal, setAbaModal] = useState<'identificacao' | 'endereco' | 'financeiro' | 'fiscal'>('identificacao');
  const [pessoaEmEdicao, setPessoaEmEdicao] = useState<Pessoa | null>(null);
  const [modoVisualizacao, setModoVisualizacao] = useState<'tabela' | 'cards'>('tabela');

  // Estados do formulário - Dados Cadastrais Completos
  const [formNome, setFormNome] = useState('');
  const [formRazaoSocial, setFormRazaoSocial] = useState('');
  const [formNomeFantasia, setFormNomeFantasia] = useState('');
  const [formCpfCnpj, setFormCpfCnpj] = useState('');
  const [formInscricaoEstadual, setFormInscricaoEstadual] = useState('');
  const [formTelefone, setFormTelefone] = useState('');
  const [formEmail, setFormEmail] = useState('');

  // Endereço detalhado
  const [formCep, setFormCep] = useState('');
  const [formLogradouro, setFormLogradouro] = useState('');
  const [formNumero, setFormNumero] = useState('');
  const [formComplemento, setFormComplemento] = useState('');
  const [formBairro, setFormBairro] = useState('');
  const [formCidade, setFormCidade] = useState('');
  const [formUf, setFormUf] = useState('');
  const [formEndereco, setFormEndereco] = useState('');

  // Dados Fiscais / Econômicos da Receita Federal & SEFAZ
  const [formSituacaoCadastral, setFormSituacaoCadastral] = useState('');
  const [formCnaePrincipal, setFormCnaePrincipal] = useState('');
  const [formNaturezaJuridica, setFormNaturezaJuridica] = useState('');
  const [formPorte, setFormPorte] = useState('');
  const [formCapitalSocial, setFormCapitalSocial] = useState<number>(0);
  const [formDataAbertura, setFormDataAbertura] = useState('');

  // Configuração Comercial
  const [formTipo, setFormTipo] = useState<TipoPessoa>('cliente');
  const [formDiaEmissao, setFormDiaEmissao] = useState<number>(1);
  const [formDiaVencimento, setFormDiaVencimento] = useState<number>(10);
  const [formValorMensalidade, setFormValorMensalidade] = useState<number>(0);
  const [formObs, setFormObs] = useState('');

  // Estados de Busca de CEP e CNPJ
  const [buscandoCnpj, setBuscandoCnpj] = useState(false);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [apiFeedback, setApiFeedback] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  // Refs para evitar buscas duplicadas em loop enquanto digita
  const lastSearchedCnpjRef = useRef<string>('');
  const lastSearchedCepRef = useRef<string>('');

  const abrirModal = (pessoa?: Pessoa) => {
    setAbaModal('identificacao');
    setApiFeedback(null);
    lastSearchedCnpjRef.current = '';
    lastSearchedCepRef.current = '';
    if (pessoa) {
      setPessoaEmEdicao(pessoa);
      setFormNome(pessoa.nome || pessoa.razao_social || '');
      setFormRazaoSocial(pessoa.razao_social || pessoa.nome || '');
      setFormNomeFantasia(pessoa.nome_fantasia || '');
      setFormInscricaoEstadual(pessoa.inscricao_estadual || '');
      setFormCpfCnpj(consultaApiService.formatarCpfCnpj(pessoa.cpf_cnpj || ''));
      setFormTelefone(consultaApiService.formatarTelefone(pessoa.telefone || ''));
      setFormEmail(pessoa.email || '');
      setFormCep(consultaApiService.formatarCep(pessoa.cep || ''));
      setFormLogradouro(pessoa.logradouro || '');
      setFormNumero(pessoa.numero || '');
      setFormComplemento(pessoa.complemento || '');
      setFormBairro(pessoa.bairro || '');
      setFormCidade(pessoa.cidade || '');
      setFormUf(pessoa.uf || '');
      setFormEndereco(pessoa.endereco || '');
      setFormSituacaoCadastral(pessoa.situacao_cadastral || 'ATIVA');
      setFormCnaePrincipal(pessoa.cnae_principal || '');
      setFormNaturezaJuridica(pessoa.natureza_juridica || '');
      setFormPorte(pessoa.porte || '');
      setFormCapitalSocial(pessoa.capital_social || 0);
      setFormDataAbertura(pessoa.data_abertura || '');
      setFormTipo(pessoa.tipo || 'cliente');
      setFormDiaEmissao(pessoa.dia_emissao_mensalidade || 1);
      setFormDiaVencimento(pessoa.dia_vencimento_mensalidade || 10);
      setFormValorMensalidade(pessoa.valor_mensalidade_padrao || 0);
      setFormObs(pessoa.observacoes || '');
    } else {
      setPessoaEmEdicao(null);
      setFormNome('');
      setFormRazaoSocial('');
      setFormNomeFantasia('');
      setFormInscricaoEstadual('');
      setFormCpfCnpj('');
      setFormTelefone('');
      setFormEmail('');
      setFormCep('');
      setFormLogradouro('');
      setFormNumero('');
      setFormComplemento('');
      setFormBairro('');
      setFormCidade('');
      setFormUf('');
      setFormEndereco('');
      setFormSituacaoCadastral('ATIVA');
      setFormCnaePrincipal('');
      setFormNaturezaJuridica('');
      setFormPorte('');
      setFormCapitalSocial(0);
      setFormDataAbertura('');
      setFormTipo('cliente');
      setFormDiaEmissao(1);
      setFormDiaVencimento(10);
      setFormValorMensalidade(0);
      setFormObs('');
    }
    setModalAberto(true);
  };

  useEffect(() => {
    if (onOpenNovoClienteModal) {
      abrirModal();
    }
  }, [onOpenNovoClienteModal]);

  const handleBuscarCnpj = async (cnpjParaBuscar?: string) => {
    const raw = cnpjParaBuscar !== undefined ? cnpjParaBuscar : formCpfCnpj;
    const clean = raw.replace(/\D/g, '');
    if (clean.length !== 14) {
      setApiFeedback({ tipo: 'erro', texto: 'Informe os 14 dígitos numéricos do CNPJ para realizar a consulta.' });
      return;
    }

    setBuscandoCnpj(true);
    setApiFeedback(null);

    try {
      const dados = await consultaApiService.consultarCnpj(clean);
      setFormNome(dados.razaoSocial || dados.nomeFantasia);
      setFormRazaoSocial(dados.razaoSocial);
      setFormNomeFantasia(dados.nomeFantasia);
      setFormInscricaoEstadual(dados.inscricaoEstadual || '');
      if (dados.telefone) setFormTelefone(consultaApiService.formatarTelefone(dados.telefone));
      if (dados.email) setFormEmail(dados.email);

      // Endereço detalhado
      if (dados.cep) {
        setFormCep(consultaApiService.formatarCep(dados.cep));
        lastSearchedCepRef.current = dados.cep.replace(/\D/g, '');
      }
      setFormLogradouro(dados.logradouro || '');
      setFormNumero(dados.numero || '');
      setFormComplemento(dados.complemento || '');
      setFormBairro(dados.bairro || '');
      setFormCidade(dados.municipio || '');
      setFormUf(dados.uf || '');
      setFormEndereco(dados.enderecoCompleto || '');

      // Dados Fiscais e Econômicos
      setFormSituacaoCadastral(dados.situacaoCadastral || 'ATIVA');
      setFormCnaePrincipal(dados.cnaePrincipal || '');
      setFormNaturezaJuridica(dados.naturezaJuridica || '');
      setFormPorte(dados.porte || '');
      setFormCapitalSocial(dados.capitalSocial || 0);
      setFormDataAbertura(dados.dataAbertura || '');

      setFormObs((prev) => {
        if (!prev || prev.includes('Situação:')) {
          const partes = [
            `Situação: ${dados.situacaoCadastral}`,
            dados.inscricaoEstadual ? `IE: ${dados.inscricaoEstadual}` : '',
            dados.porte ? `Porte: ${dados.porte}` : '',
            dados.cnaePrincipal ? `CNAE: ${dados.cnaePrincipal}` : '',
          ].filter(Boolean);
          return partes.join(' | ');
        }
        return prev;
      });

      setApiFeedback({
        tipo: 'sucesso',
        texto: `✅ Dados completos de "${dados.razaoSocial}" importados com sucesso da Receita Federal & SEFAZ!`,
      });
    } catch (err: any) {
      setApiFeedback({ tipo: 'erro', texto: err.message || 'Falha ao consultar CNPJ na base pública.' });
    } finally {
      setBuscandoCnpj(false);
    }
  };

  const handleBuscarCep = async (cepParaBuscar?: string) => {
    const raw = cepParaBuscar !== undefined ? cepParaBuscar : formCep;
    const clean = raw.replace(/\D/g, '');
    if (clean.length !== 8) {
      setApiFeedback({ tipo: 'erro', texto: 'Informe o CEP com 8 dígitos para consultar o endereço.' });
      return;
    }

    setBuscandoCep(true);
    setApiFeedback(null);

    try {
      const dados = await consultaApiService.consultarCep(clean);
      setFormCep(consultaApiService.formatarCep(dados.cep));
      setFormLogradouro(dados.logradouro || '');
      setFormBairro(dados.bairro || '');
      setFormCidade(dados.localidade || '');
      setFormUf(dados.uf || '');
      setFormEndereco(dados.enderecoCompleto);
      setApiFeedback({
        tipo: 'sucesso',
        texto: `Endereço localizado: ${dados.logradouro}, ${dados.bairro} - ${dados.localidade}/${dados.uf}`,
      });
    } catch (err: any) {
      setApiFeedback({ tipo: 'erro', texto: err.message || 'Falha ao consultar CEP nos Correios/ViaCEP.' });
    } finally {
      setBuscandoCep(false);
    }
  };

  // Manipulador dinâmico ao digitar CNPJ/CPF ("ao introduzir")
  const handleCpfCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const clean = raw.replace(/\D/g, '').substring(0, 14);
    const formatado = consultaApiService.formatarCpfCnpj(clean);
    setFormCpfCnpj(formatado);

    // Se completou 14 dígitos de CNPJ, dispara a busca automática imediatamente
    if (clean.length === 14) {
      if (lastSearchedCnpjRef.current !== clean) {
        lastSearchedCnpjRef.current = clean;
        handleBuscarCnpj(clean);
      }
    } else {
      if (lastSearchedCnpjRef.current && clean.length < 14) {
        lastSearchedCnpjRef.current = '';
      }
    }
  };

  // Manipulador dinâmico ao digitar CEP ("ao introduzir")
  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const clean = raw.replace(/\D/g, '').substring(0, 8);
    const formatado = consultaApiService.formatarCep(clean);
    setFormCep(formatado);

    // Se completou 8 dígitos de CEP, dispara a busca automática imediatamente
    if (clean.length === 8) {
      if (lastSearchedCepRef.current !== clean) {
        lastSearchedCepRef.current = clean;
        handleBuscarCep(clean);
      }
    } else {
      if (lastSearchedCepRef.current && clean.length < 8) {
        lastSearchedCepRef.current = '';
      }
    }
  };

  // Formata telefone ao digitar
  const handleTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const clean = raw.replace(/\D/g, '').substring(0, 11);
    setFormTelefone(consultaApiService.formatarTelefone(clean));
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNome.trim() && !formRazaoSocial.trim()) return;

    // Constrói o endereço completo atualizado
    const partesEnd = [
      formLogradouro.trim(),
      formNumero.trim() && formNumero.trim() !== 'SN' ? `Nº ${formNumero.trim()}` : (formNumero.trim() === 'SN' ? 'S/N' : ''),
      formComplemento.trim() ? `Compl: ${formComplemento.trim()}` : '',
      formBairro.trim() ? `Bairro ${formBairro.trim()}` : '',
      formCidade.trim() && formUf.trim() ? `${formCidade.trim()}/${formUf.trim()}` : '',
      formCep.trim() ? `CEP ${formCep.trim()}` : '',
    ].filter(Boolean);
    const enderecoMontado = partesEnd.length > 0 ? partesEnd.join(', ') : formEndereco.trim();

    const novaPessoa: Pessoa = {
      id: pessoaEmEdicao ? pessoaEmEdicao.id : `pes-${Date.now()}`,
      nome: (formRazaoSocial.trim() || formNome.trim()),
      razao_social: formRazaoSocial.trim() || formNome.trim(),
      nome_fantasia: formNomeFantasia.trim(),
      cpf_cnpj: formCpfCnpj.trim(),
      inscricao_estadual: formInscricaoEstadual.trim(),
      telefone: formTelefone.trim(),
      email: formEmail.trim(),
      cep: formCep.trim(),
      logradouro: formLogradouro.trim(),
      numero: formNumero.trim(),
      complemento: formComplemento.trim(),
      bairro: formBairro.trim(),
      cidade: formCidade.trim(),
      uf: formUf.trim().toUpperCase(),
      endereco: enderecoMontado,
      situacao_cadastral: formSituacaoCadastral.trim() || 'ATIVA',
      cnae_principal: formCnaePrincipal.trim(),
      natureza_juridica: formNaturezaJuridica.trim(),
      porte: formPorte.trim(),
      capital_social: Number(formCapitalSocial) || 0,
      data_abertura: formDataAbertura.trim(),
      tipo: formTipo,
      dia_emissao_mensalidade: Number(formDiaEmissao) || 1,
      dia_vencimento_mensalidade: Number(formDiaVencimento) || 10,
      valor_mensalidade_padrao: Number(formValorMensalidade) || 0,
      observacoes: formObs.trim(),
      created_at: pessoaEmEdicao ? pessoaEmEdicao.created_at : new Date().toISOString(),
    };

    await storageService.savePessoa(novaPessoa);

    if (pessoaEmEdicao) {
      notificationService.sucesso(
        'Cadastro Atualizado!',
        `Os dados de "${novaPessoa.nome}" foram atualizados com sucesso.`,
        { tab: 'pessoas', label: 'Ver Clientes' },
        'cliente'
      );
    } else {
      notificationService.sucesso(
        'Cliente Cadastrado com Sucesso!',
        `"${novaPessoa.nome}" (${novaPessoa.tipo.toUpperCase()}) foi inserido na base de dados.`,
        { tab: 'pessoas', label: 'Ver Clientes' },
        'cliente'
      );
    }

    setModalAberto(false);
    onRefresh();
  };

  const handleExcluir = async (id: string, nome: string) => {
    if (window.confirm(`Tem certeza que deseja remover ${nome}?`)) {
      await storageService.deletePessoa(id);
      notificationService.aviso(
        'Cadastro Excluído',
        `"${nome}" foi removido do sistema.`,
        { tab: 'pessoas', label: 'Ver Clientes' },
        'cliente'
      );
      onRefresh();
    }
  };

  const pessoasFiltradas = pessoas.filter((p) => {
    const matchBusca =
      p.nome.toLowerCase().includes(busca.toLowerCase()) ||
      (p.razao_social && p.razao_social.toLowerCase().includes(busca.toLowerCase())) ||
      (p.nome_fantasia && p.nome_fantasia.toLowerCase().includes(busca.toLowerCase())) ||
      (p.inscricao_estadual && p.inscricao_estadual.includes(busca)) ||
      p.cpf_cnpj.toLowerCase().includes(busca.toLowerCase()) ||
      (p.email && p.email.toLowerCase().includes(busca.toLowerCase())) ||
      (p.telefone && p.telefone.includes(busca)) ||
      (p.cidade && p.cidade.toLowerCase().includes(busca.toLowerCase()));

    const matchTipo =
      filtroTipo === 'todos' || p.tipo === filtroTipo || p.tipo === 'ambos';

    return matchBusca && matchTipo;
  });

  return (
    <div className="page-wrapper">
      {/* Top Controls Fluidos para Mobile e Desktop */}
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
              style={{ position: 'absolute', left: 12, top: 12, color: '#64748b' }}
            />
            <input
              type="text"
              className="form-control"
              style={{ paddingLeft: '2.4rem', width: '100%' }}
              placeholder="Buscar por Razão Social, CNPJ, IE, cidade..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', flex: '1 1 200px', alignItems: 'center', justifyContent: 'space-between' }}>
            <select
              className="form-control"
              style={{ flex: '1 1 120px', minWidth: '110px' }}
              value={filtroTipo}
              onChange={(e: any) => setFiltroTipo(e.target.value)}
            >
              <option value="todos">Todos ({pessoas.length})</option>
              <option value="cliente">Clientes</option>
              <option value="fornecedor">Fornecedores</option>
            </select>

            {/* Seletor de Modo: Tabela Moderna / Cards */}
            <div style={{ display: 'flex', gap: '0.2rem', backgroundColor: '#f1f5f9', padding: '0.2rem', borderRadius: 'var(--radius-md)' }}>
              <button
                type="button"
                onClick={() => setModoVisualizacao('tabela')}
                className="btn-icon"
                style={{
                  backgroundColor: modoVisualizacao === 'tabela' ? '#ffffff' : 'transparent',
                  color: modoVisualizacao === 'tabela' ? '#2563eb' : '#64748b',
                  boxShadow: modoVisualizacao === 'tabela' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  padding: '0.4rem 0.65rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  borderRadius: '6px',
                }}
                title="Visualização em Tabela Detalhada"
              >
                <Table size={15} />
                <span>Tabela</span>
              </button>
              <button
                type="button"
                onClick={() => setModoVisualizacao('cards')}
                className="btn-icon"
                style={{
                  backgroundColor: modoVisualizacao === 'cards' ? '#ffffff' : 'transparent',
                  color: modoVisualizacao === 'cards' ? '#2563eb' : '#64748b',
                  boxShadow: modoVisualizacao === 'cards' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  padding: '0.4rem 0.65rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  borderRadius: '6px',
                }}
                title="Visualização em Cards"
              >
                <LayoutGrid size={15} />
                <span>Cards</span>
              </button>
            </div>
          </div>
        </div>

        <button
          className="btn btn-primary"
          onClick={() => abrirModal()}
          style={{ minHeight: '46px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
        >
          <UserPlus size={18} />
          <span>Cadastrar Empresa / Pessoa</span>
        </button>
      </div>

      {/* Visualização 1: Tabela Moderna e Bem Detalhada (Padrão) */}
      {modoVisualizacao === 'tabela' ? (
        <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid #e2e8f0', borderRadius: 'var(--radius-lg)' }}>
          <div
            style={{
              padding: '0.85rem 1.25rem',
              backgroundColor: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.5rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Users size={18} color="#2563eb" />
              <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>
                Cadastros de Clientes & Pessoas ({pessoasFiltradas.length})
              </span>
            </div>
            <span style={{ fontSize: '0.76rem', color: '#64748b' }}>
              Listagem corporativa detalhada com ações rápidas
            </span>
          </div>

          <div
            className="mobile-only"
            style={{
              fontSize: '0.74rem',
              color: '#1d4ed8',
              backgroundColor: '#eff6ff',
              padding: '0.45rem 0.85rem',
              borderBottom: '1px solid #dbeafe',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <span>👉 Deslize horizontalmente para ver todas as colunas ou alterne para <strong>Cards</strong> no topo.</span>
          </div>

          <div className="table-container" style={{ overflowX: 'auto', width: '100%', WebkitOverflowScrolling: 'touch' }}>
            <table className="custom-table data-table" style={{ width: '100%', minWidth: '940px', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Empresa / Razão Social
                  </th>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Documentos
                  </th>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Contato
                  </th>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Endereço / Local
                  </th>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Mensalidade Padrão
                  </th>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Tipo / Status
                  </th>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'right' }}>
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {pessoasFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748b' }}>
                      Nenhum cliente ou pessoa encontrado para os filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  pessoasFiltradas.map((p) => {
                    const isCliente = p.tipo === 'cliente' || p.tipo === 'ambos';
                    const telLimpo = p.telefone ? p.telefone.replace(/\D/g, '') : '';
                    const linkWhatsapp = telLimpo ? `https://wa.me/55${telLimpo}` : null;

                    return (
                      <tr
                        key={p.id}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          transition: 'background-color 0.15s ease',
                        }}
                        className="table-row-hover"
                      >
                        {/* Empresa / Razão Social & Fantasia */}
                        <td style={{ padding: '0.85rem 1rem', verticalAlign: 'middle', maxWidth: '280px' }}>
                          <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.88rem', lineHeight: 1.3 }}>
                            {p.razao_social || p.nome}
                          </div>
                          {p.nome_fantasia && p.nome_fantasia !== (p.razao_social || p.nome) && (
                            <div style={{ fontSize: '0.78rem', color: '#2563eb', fontWeight: 500, marginTop: '2px' }}>
                              Fantasia: {p.nome_fantasia}
                            </div>
                          )}
                          {p.cnae_principal && (
                            <div
                              style={{
                                fontSize: '0.72rem',
                                color: '#64748b',
                                marginTop: '3px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                maxWidth: '260px',
                              }}
                              title={p.cnae_principal}
                            >
                              {p.cnae_principal}
                            </div>
                          )}
                        </td>

                        {/* Documentos (CNPJ/CPF & IE) */}
                        <td style={{ padding: '0.85rem 1rem', verticalAlign: 'middle' }}>
                          <div style={{ fontFamily: 'monospace', fontWeight: 700, color: '#334155', fontSize: '0.84rem' }}>
                            {p.cpf_cnpj || 'Não informado'}
                          </div>
                          {p.inscricao_estadual && (
                            <div style={{ fontSize: '0.74rem', color: '#0284c7', fontWeight: 600, marginTop: '2px' }}>
                              IE: {p.inscricao_estadual}
                            </div>
                          )}
                          {p.porte && (
                            <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                              Porte: {p.porte}
                            </div>
                          )}
                        </td>

                        {/* Contato (Telefone, WhatsApp & E-mail) */}
                        <td style={{ padding: '0.85rem 1rem', verticalAlign: 'middle' }}>
                          {p.telefone ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              <Phone size={13} color="#2563eb" />
                              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#1e293b' }}>
                                {p.telefone}
                              </span>
                              {linkWhatsapp && (
                                <a
                                  href={linkWhatsapp}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    color: '#16a34a',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    padding: '2px',
                                    marginLeft: '2px',
                                  }}
                                  title="Conversar no WhatsApp"
                                >
                                  <MessageCircle size={14} />
                                </a>
                              )}
                            </div>
                          ) : (
                            <span style={{ color: '#94a3b8', fontSize: '0.78rem' }}>Sem telefone</span>
                          )}

                          {p.email ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '3px' }}>
                              <Mail size={13} color="#64748b" />
                              <a
                                href={`mailto:${p.email}`}
                                style={{
                                  fontSize: '0.78rem',
                                  color: '#2563eb',
                                  textDecoration: 'none',
                                  maxWidth: '180px',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  display: 'inline-block',
                                }}
                                title={p.email}
                              >
                                {p.email}
                              </a>
                            </div>
                          ) : null}
                        </td>

                        {/* Localização */}
                        <td style={{ padding: '0.85rem 1rem', verticalAlign: 'middle', maxWidth: '240px' }}>
                          <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.82rem' }}>
                            {p.cidade && p.uf ? `${p.cidade}/${p.uf}` : (p.cidade || '—')}
                          </div>
                          {(p.logradouro || p.endereco) && (
                            <div
                              style={{
                                fontSize: '0.74rem',
                                color: '#64748b',
                                marginTop: '2px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                maxWidth: '220px',
                              }}
                              title={p.endereco || `${p.logradouro}, ${p.numero || 'SN'}`}
                            >
                              {p.logradouro ? `${p.logradouro}, ${p.numero || 'SN'}` : p.endereco}
                            </div>
                          )}
                          {p.cep && (
                            <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '1px' }}>
                              CEP: {p.cep}
                            </div>
                          )}
                        </td>

                        {/* Mensalidade */}
                        <td style={{ padding: '0.85rem 1rem', verticalAlign: 'middle' }}>
                          {isCliente && p.valor_mensalidade_padrao && p.valor_mensalidade_padrao > 0 ? (
                            <div>
                              <div style={{ fontWeight: 800, color: '#16a34a', fontSize: '0.92rem' }}>
                                {formatCurrency(p.valor_mensalidade_padrao)}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                                Vence dia <strong>{p.dia_vencimento_mensalidade || 10}</strong>
                              </div>
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>—</span>
                          )}
                        </td>

                        {/* Tipo & Situação */}
                        <td style={{ padding: '0.85rem 1rem', verticalAlign: 'middle' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'flex-start' }}>
                            <span
                              className={`status-badge ${
                                p.tipo === 'cliente'
                                  ? 'status-pago'
                                  : p.tipo === 'fornecedor'
                                  ? 'status-parcial'
                                  : 'status-pendente'
                              }`}
                              style={{ fontSize: '0.68rem', fontWeight: 700 }}
                            >
                              {p.tipo.toUpperCase()}
                            </span>
                            {p.situacao_cadastral && (
                              <span
                                style={{
                                  fontSize: '0.68rem',
                                  fontWeight: 600,
                                  padding: '0.1rem 0.4rem',
                                  borderRadius: '4px',
                                  backgroundColor: p.situacao_cadastral === 'ATIVA' ? '#dcfce7' : '#fee2e2',
                                  color: p.situacao_cadastral === 'ATIVA' ? '#166534' : '#991b1b',
                                }}
                              >
                                {p.situacao_cadastral}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Ações */}
                        <td style={{ padding: '0.85rem 1rem', verticalAlign: 'middle', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                            {linkWhatsapp && (
                              <a
                                href={linkWhatsapp}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn-icon"
                                style={{
                                  color: '#16a34a',
                                  backgroundColor: '#f0fdf4',
                                  border: '1px solid #bbf7d0',
                                  padding: '0.35rem',
                                }}
                                title="Cobrar ou Falar no WhatsApp"
                              >
                                <MessageCircle size={15} />
                              </a>
                            )}
                            <button
                              className="btn-icon"
                              onClick={() => abrirModal(p)}
                              title="Editar Cadastro Completo"
                              style={{
                                color: '#2563eb',
                                backgroundColor: '#eff6ff',
                                border: '1px solid #bfdbfe',
                                padding: '0.35rem',
                              }}
                            >
                              <Edit2 size={15} />
                            </button>
                            <button
                              className="btn-icon"
                              onClick={() => handleExcluir(p.id, p.nome)}
                              title="Excluir Registro"
                              style={{
                                color: '#dc2626',
                                backgroundColor: '#fff1f2',
                                border: '1px solid #fecaca',
                                padding: '0.35rem',
                              }}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Visualização 2: Grid de Cards Fluidos */
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))',
            gap: '1rem',
          }}
        >
          {pessoasFiltradas.map((p) => {
            const isCliente = p.tipo === 'cliente' || p.tipo === 'ambos';
            return (
              <div key={p.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {/* Header do Card */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div style={{ flex: 1, minWidth: 0, paddingRight: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
                      <span
                        className={`status-badge ${
                          p.tipo === 'cliente'
                            ? 'status-pago'
                            : p.tipo === 'fornecedor'
                            ? 'status-parcial'
                            : 'status-pendente'
                        }`}
                        style={{ fontSize: '0.68rem', fontWeight: 700 }}
                      >
                        {p.tipo.toUpperCase()}
                      </span>

                      {p.situacao_cadastral && (
                        <span
                          style={{
                            fontSize: '0.68rem',
                            fontWeight: 600,
                            padding: '0.15rem 0.45rem',
                            borderRadius: '4px',
                            backgroundColor: p.situacao_cadastral === 'ATIVA' ? '#dcfce7' : '#fee2e2',
                            color: p.situacao_cadastral === 'ATIVA' ? '#166534' : '#991b1b',
                          }}
                        >
                          {p.situacao_cadastral}
                        </span>
                      )}

                      {p.porte && (
                        <span style={{ fontSize: '0.68rem', color: '#475569', backgroundColor: '#f1f5f9', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>
                          {p.porte}
                        </span>
                      )}
                    </div>

                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.3, wordBreak: 'break-word' }}>
                      {p.razao_social || p.nome}
                    </h3>

                    {p.nome_fantasia && p.nome_fantasia !== p.nome && (
                      <div style={{ fontSize: '0.8rem', color: '#2563eb', fontWeight: 500, marginTop: '0.15rem' }}>
                        Fantasia: {p.nome_fantasia}
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginTop: '0.35rem', fontSize: '0.78rem', color: '#64748b' }}>
                      <span><strong>CNPJ/CPF:</strong> {p.cpf_cnpj || 'Não informado'}</span>
                      {p.inscricao_estadual && (
                        <span style={{ color: '#0369a1', fontWeight: 600 }}>
                          <strong>IE:</strong> {p.inscricao_estadual}
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
                    <button className="btn-icon" onClick={() => abrirModal(p)} title="Editar Cadastro Completo">
                      <Edit2 size={15} />
                    </button>
                    <button
                      className="btn-icon"
                      onClick={() => handleExcluir(p.id, p.nome)}
                      title="Excluir"
                      style={{ color: '#dc2626' }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {/* Informações de Contato e Endereço */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.8rem', color: '#475569', padding: '0.5rem 0', borderTop: '1px solid #f1f5f9' }}>
                  {p.telefone && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <Phone size={13} color="#2563eb" />
                      <span>{p.telefone}</span>
                    </div>
                  )}
                  {p.email && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <Mail size={13} color="#2563eb" />
                      <span style={{ wordBreak: 'break-all' }}>{p.email}</span>
                    </div>
                  )}
                  {p.endereco && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.45rem' }}>
                      <MapPin size={13} color="#64748b" style={{ marginTop: '2px', flexShrink: 0 }} />
                      <span style={{ lineHeight: 1.3 }}>{p.endereco}</span>
                    </div>
                  )}
                  {p.cnae_principal && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.45rem', fontSize: '0.74rem', color: '#64748b' }}>
                      <Briefcase size={12} style={{ marginTop: '2px', flexShrink: 0 }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p.cnae_principal}>
                        {p.cnae_principal}
                      </span>
                    </div>
                  )}
                </div>

                {/* Configuração de Mensalidade (se cliente) */}
                {isCliente && (
                  <div
                    style={{
                      marginTop: 'auto',
                      backgroundColor: '#f0f9ff',
                      border: '1px solid #bae6fd',
                      padding: '0.75rem 0.9rem',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#0369a1', fontWeight: 600 }}>
                        <Calendar size={14} />
                        <span>Emissão: dia <strong>{p.dia_emissao_mensalidade || 1}</strong></span>
                        <span>•</span>
                        <span>Vencimento: dia <strong>{p.dia_vencimento_mensalidade || 10}</strong></span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.35rem' }}>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Mensalidade Padrão:</span>
                      <strong style={{ fontSize: '0.95rem', color: '#16a34a' }}>
                        {formatCurrency(p.valor_mensalidade_padrao || 0)}
                      </strong>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Cadastro/Edição de Pessoa / Empresa Completo */}
      {modalAberto && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '840px' }}>
            <form onSubmit={handleSalvar}>
              <div className="modal-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <Building2 size={22} color="#2563eb" />
                  <div>
                    <h3 className="modal-title" style={{ fontSize: '1.15rem' }}>
                      {pessoaEmEdicao ? 'Editar Dados Cadastrais' : 'Cadastro Completo de Empresa / Cliente'}
                    </h3>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      Consulta pública integrada: Receita Federal, SEFAZ (Inscrição Estadual) e Correios
                    </div>
                  </div>
                </div>
                <button type="button" className="btn-icon" onClick={() => setModalAberto(false)}>
                  <X size={18} />
                </button>
              </div>

              {/* Abas do Modal de Cadastro */}
              <div className="modal-tabs">
                <button
                  type="button"
                  className={`modal-tab-btn ${abaModal === 'identificacao' ? 'active' : ''}`}
                  onClick={() => setAbaModal('identificacao')}
                >
                  <Building2 size={15} />
                  <span>1. Identificação & Contato</span>
                </button>
                <button
                  type="button"
                  className={`modal-tab-btn ${abaModal === 'endereco' ? 'active' : ''}`}
                  onClick={() => setAbaModal('endereco')}
                >
                  <MapPin size={15} />
                  <span>2. Endereço</span>
                </button>
                <button
                  type="button"
                  className={`modal-tab-btn ${abaModal === 'financeiro' ? 'active' : ''}`}
                  onClick={() => setAbaModal('financeiro')}
                >
                  <DollarSign size={15} />
                  <span>3. Mensalidade</span>
                </button>
                <button
                  type="button"
                  className={`modal-tab-btn ${abaModal === 'fiscal' ? 'active' : ''}`}
                  onClick={() => setAbaModal('fiscal')}
                >
                  <Briefcase size={15} />
                  <span>4. Dados Fiscais</span>
                </button>
              </div>

              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {apiFeedback && (
                  <div
                    className={`alert-box ${apiFeedback.tipo === 'sucesso' ? 'alert-success' : 'alert-danger'}`}
                    style={{ fontSize: '0.84rem' }}
                  >
                    {apiFeedback.tipo === 'sucesso' ? (
                      <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
                    ) : (
                      <AlertCircle size={18} style={{ flexShrink: 0 }} />
                    )}
                    <span>{apiFeedback.texto}</span>
                  </div>
                )}

                {/* ABA 1: IDENTIFICAÇÃO E CONTATO */}
                {abaModal === 'identificacao' && (
                  <>
                    <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.85rem', color: '#1e293b', fontWeight: 700, fontSize: '0.9rem' }}>
                        <Building2 size={16} color="#2563eb" />
                        <span>Identificação Principal & Consulta CNPJ</span>
                      </div>

                      <div className="form-row">
                        <div className="form-group" style={{ flex: '0 1 200px', minWidth: '140px' }}>
                          <label className="form-label">Tipo de Cadastro</label>
                          <select
                            className="form-control"
                            value={formTipo}
                            onChange={(e: any) => setFormTipo(e.target.value)}
                          >
                            <option value="cliente">Cliente</option>
                            <option value="fornecedor">Fornecedor</option>
                            <option value="ambos">Cliente & Fornecedor</option>
                          </select>
                        </div>

                        <div className="form-group" style={{ flex: 1, minWidth: 0 }}>
                          <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
                            <span>CNPJ ou CPF *</span>
                            <span style={{ fontSize: '0.72rem', color: '#2563eb', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              {buscandoCnpj ? (
                                <>
                                  <RefreshCw size={12} className="spin" />
                                  <span>Consultando Receita Federal & SEFAZ...</span>
                                </>
                              ) : (
                                <>
                                  <Sparkles size={12} />
                                  <span>Auto-busca ao digitar 14 dígitos</span>
                                </>
                              )}
                            </span>
                          </label>
                          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                            <input
                              type="text"
                              required
                              className="form-control"
                              placeholder="00.000.000/0000-00 ou CPF"
                              value={formCpfCnpj}
                              onChange={handleCpfCnpjChange}
                              style={{ flex: '1 1 180px', minWidth: 0 }}
                              onPaste={(e) => {
                                const pasted = e.clipboardData.getData('text');
                                const clean = pasted.replace(/\D/g, '');
                                if (clean.length === 14) {
                                  lastSearchedCnpjRef.current = clean;
                                  handleBuscarCnpj(clean);
                                }
                              }}
                            />
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => {
                                lastSearchedCnpjRef.current = '';
                                handleBuscarCnpj();
                              }}
                              disabled={buscandoCnpj}
                              title="Consultar todos os dados na Receita Federal e SEFAZ via CNPJ"
                              style={{ whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.35rem', minHeight: '44px' }}
                            >
                              {buscandoCnpj ? (
                                <RefreshCw size={14} className="spin" />
                              ) : (
                                <Sparkles size={14} color="#2563eb" />
                              )}
                              <span>{buscandoCnpj ? 'Buscando...' : 'Buscar CNPJ'}</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="form-row" style={{ marginTop: '0.75rem' }}>
                        <div className="form-group" style={{ flex: 1 }}>
                          <label className="form-label">Razão Social / Nome Oficial *</label>
                          <input
                            type="text"
                            required
                            className="form-control"
                            placeholder="Ex: Banco do Brasil SA"
                            value={formRazaoSocial || formNome}
                            onChange={(e) => {
                              setFormRazaoSocial(e.target.value);
                              setFormNome(e.target.value);
                            }}
                          />
                        </div>

                        <div className="form-group" style={{ flex: 1 }}>
                          <label className="form-label">Nome Fantasia</label>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Ex: Direção Geral"
                            value={formNomeFantasia}
                            onChange={(e) => setFormNomeFantasia(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="form-row" style={{ marginTop: '0.75rem' }}>
                        <div className="form-group" style={{ flex: 1 }}>
                          <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Inscrição Estadual (IE)</span>
                            <span style={{ fontSize: '0.7rem', color: '#0369a1', fontWeight: 600 }}>SEFAZ Estadual</span>
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Ex: 0809427800174 ou Isento"
                            value={formInscricaoEstadual}
                            onChange={(e) => setFormInscricaoEstadual(e.target.value)}
                          />
                        </div>

                        <div className="form-group" style={{ flex: '1 1 180px' }}>
                          <label className="form-label">Situação Cadastral</label>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Ex: ATIVA"
                            value={formSituacaoCadastral}
                            onChange={(e) => setFormSituacaoCadastral(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>

                    <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.85rem', color: '#1e293b', fontWeight: 700, fontSize: '0.9rem' }}>
                        <Phone size={16} color="#2563eb" />
                        <span>Canais de Contato</span>
                      </div>

                      <div className="form-row">
                        <div className="form-group">
                          <label className="form-label">Telefone / WhatsApp</label>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="(XX) XXXXX-XXXX"
                            value={formTelefone}
                            onChange={handleTelefoneChange}
                          />
                        </div>

                        <div className="form-group">
                          <label className="form-label">E-mail Comercial / Financeiro</label>
                          <input
                            type="email"
                            className="form-control"
                            placeholder="contato@empresa.com.br"
                            value={formEmail}
                            onChange={(e) => setFormEmail(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* ABA 2: LOCALIZAÇÃO & ENDEREÇO */}
                {abaModal === 'endereco' && (
                  <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.85rem', color: '#1e293b', fontWeight: 700, fontSize: '0.9rem' }}>
                      <MapPin size={16} color="#2563eb" />
                      <span>Endereço Completo & Localização</span>
                    </div>

                    <div className="form-row">
                      <div className="form-group" style={{ flex: '1 1 180px', minWidth: 0 }}>
                        <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
                          <span>CEP</span>
                          <span style={{ fontSize: '0.72rem', color: '#2563eb', fontWeight: 600 }}>
                            {buscandoCep ? 'Buscando...' : 'Auto-busca 8 dígitos'}
                          </span>
                        </label>
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="00000-000"
                            value={formCep}
                            onChange={handleCepChange}
                            style={{ flex: '1 1 120px', minWidth: 0 }}
                            onPaste={(e) => {
                              const pasted = e.clipboardData.getData('text');
                              const clean = pasted.replace(/\D/g, '');
                              if (clean.length === 8) {
                                lastSearchedCepRef.current = clean;
                                handleBuscarCep(clean);
                              }
                            }}
                          />
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => {
                              lastSearchedCepRef.current = '';
                              handleBuscarCep();
                            }}
                            disabled={buscandoCep}
                            title="Buscar endereço completo pelo CEP"
                            style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', minHeight: '44px' }}
                          >
                            {buscandoCep ? <RefreshCw size={14} className="spin" /> : <Search size={14} />}
                          </button>
                        </div>
                      </div>

                      <div className="form-group" style={{ flex: '2 1 200px', minWidth: 0 }}>
                        <label className="form-label">Logradouro / Avenida / Rua</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Ex: Avenida Paulista"
                          value={formLogradouro}
                          onChange={(e) => setFormLogradouro(e.target.value)}
                        />
                      </div>

                      <div className="form-group" style={{ flex: '1 1 100px', minWidth: 0 }}>
                        <label className="form-label">Número</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="1000"
                          value={formNumero}
                          onChange={(e) => setFormNumero(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="form-row" style={{ marginTop: '0.75rem' }}>
                      <div className="form-group" style={{ flex: 1 }}>
                        <label className="form-label">Complemento</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Ex: Sala 1204, Bloco B"
                          value={formComplemento}
                          onChange={(e) => setFormComplemento(e.target.value)}
                        />
                      </div>

                      <div className="form-group" style={{ flex: 1 }}>
                        <label className="form-label">Bairro</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Ex: Bela Vista"
                          value={formBairro}
                          onChange={(e) => setFormBairro(e.target.value)}
                        />
                      </div>

                      <div className="form-group" style={{ flex: 1 }}>
                        <label className="form-label">Cidade / Município</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Ex: São Paulo"
                          value={formCidade}
                          onChange={(e) => setFormCidade(e.target.value)}
                        />
                      </div>

                      <div className="form-group" style={{ flex: '1 1 80px' }}>
                        <label className="form-label">UF</label>
                        <input
                          type="text"
                          maxLength={2}
                          className="form-control"
                          placeholder="SP"
                          value={formUf}
                          onChange={(e) => setFormUf(e.target.value.toUpperCase())}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* ABA 3: MENSALIDADE & COMERCIAL */}
                {abaModal === 'financeiro' && (
                  <>
                    <div
                      style={{
                        backgroundColor: '#eff6ff',
                        border: '1px solid #bfdbfe',
                        borderRadius: 'var(--radius-md)',
                        padding: '1rem',
                      }}
                    >
                      <div style={{ fontWeight: 700, color: '#1e40af', fontSize: '0.9rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Calendar size={16} />
                        <span>Configuração de Mensalidades do Cliente</span>
                      </div>

                      <div className="form-row">
                        <div className="form-group">
                          <label className="form-label">Dia de Emissão da Fatura</label>
                          <input
                            type="number"
                            min="1"
                            max="31"
                            className="form-control"
                            placeholder="Ex: 1"
                            value={formDiaEmissao}
                            onChange={(e) => setFormDiaEmissao(parseInt(e.target.value) || 1)}
                          />
                        </div>

                        <div className="form-group">
                          <label className="form-label">Dia de Vencimento</label>
                          <input
                            type="number"
                            min="1"
                            max="31"
                            className="form-control"
                            placeholder="Ex: 10"
                            value={formDiaVencimento}
                            onChange={(e) => setFormDiaVencimento(parseInt(e.target.value) || 10)}
                          />
                        </div>

                        <div className="form-group">
                          <label className="form-label">Valor Mensal Padrão (R$)</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            className="form-control"
                            placeholder="0.00"
                            value={formValorMensalidade || ''}
                            onChange={(e) => setFormValorMensalidade(parseFloat(e.target.value) || 0)}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Observações Gerais / Contratuais</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Informações adicionais do cliente ou fornecedor"
                        value={formObs}
                        onChange={(e) => setFormObs(e.target.value)}
                      />
                    </div>
                  </>
                )}

                {/* ABA 4: DADOS FISCAIS & ECONÔMICOS */}
                {abaModal === 'fiscal' && (
                  <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.85rem', color: '#1e293b', fontWeight: 700, fontSize: '0.9rem' }}>
                      <Briefcase size={16} color="#2563eb" />
                      <span>Dados Econômicos, Fiscais & Atividade</span>
                    </div>

                    <div className="form-row">
                      <div className="form-group" style={{ flex: 2 }}>
                        <label className="form-label">Atividade Econômica Principal (CNAE)</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Ex: 6201-5/01 - Desenvolvimento de programas de computador"
                          value={formCnaePrincipal}
                          onChange={(e) => setFormCnaePrincipal(e.target.value)}
                        />
                      </div>

                      <div className="form-group" style={{ flex: 1 }}>
                        <label className="form-label">Porte da Empresa</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Ex: ME, EPP ou DEMAIS"
                          value={formPorte}
                          onChange={(e) => setFormPorte(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="form-row" style={{ marginTop: '0.75rem' }}>
                      <div className="form-group" style={{ flex: 2 }}>
                        <label className="form-label">Natureza Jurídica</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Ex: Sociedade Empresária Limitada"
                          value={formNaturezaJuridica}
                          onChange={(e) => setFormNaturezaJuridica(e.target.value)}
                        />
                      </div>

                      <div className="form-group" style={{ flex: 1 }}>
                        <label className="form-label">Data de Abertura</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="YYYY-MM-DD"
                          value={formDataAbertura}
                          onChange={(e) => setFormDataAbertura(e.target.value)}
                        />
                      </div>

                      <div className="form-group" style={{ flex: 1 }}>
                        <label className="form-label">Capital Social (R$)</label>
                        <input
                          type="number"
                          step="0.01"
                          className="form-control"
                          placeholder="0.00"
                          value={formCapitalSocial || ''}
                          onChange={(e) => setFormCapitalSocial(parseFloat(e.target.value) || 0)}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {abaModal !== 'identificacao' && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        if (abaModal === 'endereco') setAbaModal('identificacao');
                        else if (abaModal === 'financeiro') setAbaModal('endereco');
                        else if (abaModal === 'fiscal') setAbaModal('financeiro');
                      }}
                    >
                      ← Voltar
                    </button>
                  )}
                  {abaModal !== 'fiscal' && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        if (abaModal === 'identificacao') setAbaModal('endereco');
                        else if (abaModal === 'endereco') setAbaModal('financeiro');
                        else if (abaModal === 'financeiro') setAbaModal('fiscal');
                      }}
                    >
                      Avançar →
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setModalAberto(false)}
                    style={{ minHeight: '44px' }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.45rem' }}
                  >
                    <CheckCircle2 size={18} />
                    <span>Salvar Cadastro Completo</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

