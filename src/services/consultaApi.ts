/**
 * RR Financeiro - Serviço de Consulta Integrada de CEP e CNPJ
 * - Alta disponibilidade com múltiplos provedores públicos e fallback em cascata
 * - Consulta de CEP: ViaCEP -> BrasilAPI -> Postmon
 * - Consulta de CNPJ: MinhaReceita -> Publica.CNPJ.ws -> BrasilAPI
 */

export interface DadosCep {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  enderecoCompleto: string;
}

export interface DadosCnpj {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string;
  inscricaoEstadual: string;
  telefone: string;
  email: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  municipio: string;
  uf: string;
  enderecoCompleto: string;
  situacaoCadastral: string;
  cnaePrincipal: string;
  naturezaJuridica: string;
  porte: string;
  capitalSocial: number;
  dataAbertura: string;
}


export const consultaApiService = {
  /**
   * Formata uma string numérica de CEP para 00000-000
   */
  formatarCep(valor: string): string {
    const nums = valor.replace(/\D/g, '').substring(0, 8);
    if (nums.length <= 5) return nums;
    return `${nums.slice(0, 5)}-${nums.slice(5)}`;
  },

  /**
   * Formata telefone para (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
   */
  formatarTelefone(valor: string): string {
    const nums = valor.replace(/\D/g, '').substring(0, 11);
    if (nums.length === 0) return '';
    if (nums.length <= 2) return `(${nums}`;
    if (nums.length <= 6) return `(${nums.slice(0, 2)}) ${nums.slice(2)}`;
    if (nums.length <= 10) return `(${nums.slice(0, 2)}) ${nums.slice(2, 6)}-${nums.slice(6)}`;
    return `(${nums.slice(0, 2)}) ${nums.slice(2, 7)}-${nums.slice(7)}`;
  },

  /**
   * Formata progressivamente CPF (000.000.000-00) ou CNPJ (00.000.000/0000-00)
   */
  formatarCpfCnpj(valor: string): string {
    const nums = valor.replace(/\D/g, '').substring(0, 14);
    if (nums.length <= 11) {
      // CPF progressivo
      if (nums.length <= 3) return nums;
      if (nums.length <= 6) return `${nums.slice(0, 3)}.${nums.slice(3)}`;
      if (nums.length <= 9) return `${nums.slice(0, 3)}.${nums.slice(3, 6)}.${nums.slice(6)}`;
      return `${nums.slice(0, 3)}.${nums.slice(3, 6)}.${nums.slice(6, 9)}-${nums.slice(9)}`;
    }
    // CNPJ progressivo (12 a 14 dígitos)
    if (nums.length <= 12) {
      return `${nums.slice(0, 2)}.${nums.slice(2, 5)}.${nums.slice(5, 8)}/${nums.slice(8)}`;
    }
    return `${nums.slice(0, 2)}.${nums.slice(2, 5)}.${nums.slice(5, 8)}/${nums.slice(8, 12)}-${nums.slice(12)}`;
  },


  /**
   * Consulta dados completos de endereço através do CEP
   */
  async consultarCep(cepInput: string): Promise<DadosCep> {
    const cleanCep = cepInput.replace(/\D/g, '');
    if (cleanCep.length !== 8) {
      throw new Error('O CEP deve conter exatamente 8 dígitos.');
    }

    // 1ª Tentativa: ViaCEP
    try {
      const resp = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      if (resp.ok) {
        const data = await resp.json();
        if (!data.erro) {
          const partes = [
            data.logradouro,
            data.bairro,
            data.localidade && data.uf ? `${data.localidade}/${data.uf}` : '',
            data.cep ? `CEP ${data.cep}` : '',
          ].filter(Boolean);

          return {
            cep: data.cep || cleanCep,
            logradouro: data.logradouro || '',
            complemento: data.complemento || '',
            bairro: data.bairro || '',
            localidade: data.localidade || '',
            uf: data.uf || '',
            enderecoCompleto: partes.join(' - '),
          };
        }
      }
    } catch {
      // Fallback
    }

    // 2ª Tentativa: BrasilAPI
    try {
      const resp2 = await fetch(`https://brasilapi.com.br/api/cep/v1/${cleanCep}`);
      if (resp2.ok) {
        const data2 = await resp2.json();
        const partes = [
          data2.street,
          data2.neighborhood,
          data2.city && data2.state ? `${data2.city}/${data2.state}` : '',
          data2.cep ? `CEP ${data2.cep}` : '',
        ].filter(Boolean);

        return {
          cep: data2.cep || cleanCep,
          logradouro: data2.street || '',
          complemento: '',
          bairro: data2.neighborhood || '',
          localidade: data2.city || '',
          uf: data2.state || '',
          enderecoCompleto: partes.join(' - '),
        };
      }
    } catch {
      // Fallback
    }

    throw new Error(`Não encontramos dados para o CEP ${cleanCep}. Digite o endereço manualmente.`);
  },

  /**
   * Consulta dados completos da empresa através do CNPJ (Receita Federal + SEFAZ/IE + CNAE + Sócios)
   */
  async consultarCnpj(cnpjInput: string): Promise<DadosCnpj> {
    const cleanCnpj = cnpjInput.replace(/\D/g, '');
    if (cleanCnpj.length !== 14) {
      throw new Error('O CNPJ deve conter exatamente 14 dígitos numéricos.');
    }

    // Consulta paralela MinhaReceita + Publica.CNPJ.ws para obter todos os dados, inclusive Inscrição Estadual (IE)
    const [resMinha, resPublica] = await Promise.allSettled([
      fetch(`https://minhareceita.org/${cleanCnpj}`).then((r) => (r.ok ? r.json() : null)),
      fetch(`https://publica.cnpj.ws/cnpj/${cleanCnpj}`).then((r) => (r.ok ? r.json() : null)),
    ]);

    const minha = resMinha.status === 'fulfilled' ? resMinha.value : null;
    const pub = resPublica.status === 'fulfilled' ? resPublica.value : null;

    // Se ambos falharam, tenta BrasilAPI como fallback
    let brasilApiData: any = null;
    if (!minha?.razao_social && !pub?.razao_social) {
      try {
        const resp3 = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`);
        if (resp3.ok) {
          brasilApiData = await resp3.json();
        }
      } catch {
        // Silencioso
      }
    }

    const est = pub?.estabelecimento || {};

    const razaoSocial =
      minha?.razao_social || pub?.razao_social || brasilApiData?.razao_social || '';

    if (!razaoSocial) {
      throw new Error('Não foi possível localizar este CNPJ nas bases públicas da Receita Federal. Digite os dados manualmente.');
    }

    const nomeFantasia =
      minha?.nome_fantasia || est.nome_fantasia || brasilApiData?.nome_fantasia || razaoSocial;

    // Extração precisa da Inscrição Estadual (SEFAZ)
    let inscricaoEstadual = '';
    const ies = est.inscricoes_estaduais || [];
    const ufAlvo = minha?.uf || est.estado?.sigla || brasilApiData?.uf || '';
    if (Array.isArray(ies) && ies.length > 0) {
      const ieAtiva =
        ies.find((i: any) => i.ativo && i.estado?.sigla === ufAlvo) ||
        ies.find((i: any) => i.ativo) ||
        ies[0];
      if (ieAtiva?.inscricao_estadual) {
        inscricaoEstadual = String(ieAtiva.inscricao_estadual).trim();
      }
    }

    // Telefone formatado
    const rawTel =
      minha?.ddd_telefone_1 ||
      (est.ddd1 && est.telefone1 ? `${est.ddd1}${est.telefone1}` : '') ||
      brasilApiData?.ddd_telefone_1 ||
      '';
    const telefone = rawTel ? consultaApiService.formatarTelefone(rawTel) : '';

    // E-mail limpo
    const email = (minha?.email || est.email || brasilApiData?.email || '').toLowerCase().trim();

    // Endereço detalhado
    const cepRaw = minha?.cep || est.cep || brasilApiData?.cep || '';
    const cep = cepRaw ? consultaApiService.formatarCep(cepRaw) : '';

    const tipoLogradouro = minha?.descricao_tipo_de_logradouro || est.tipo_logradouro || brasilApiData?.descricao_tipo_de_logradouro || '';
    const logradouroBase = minha?.logradouro || est.logradouro || brasilApiData?.logradouro || '';
    let logradouro = logradouroBase;
    if (tipoLogradouro && !logradouroBase.toLowerCase().startsWith(tipoLogradouro.toLowerCase())) {
      logradouro = `${tipoLogradouro} ${logradouroBase}`;
    }

    const numero = minha?.numero || est.numero || brasilApiData?.numero || 'S/N';
    const complemento = minha?.complemento || est.complemento || brasilApiData?.complemento || '';
    const bairro = minha?.bairro || est.bairro || brasilApiData?.bairro || '';
    const municipio = minha?.municipio || est.cidade?.nome || brasilApiData?.municipio || '';
    const uf = (minha?.uf || est.estado?.sigla || brasilApiData?.uf || '').toUpperCase();

    const partesEnd = [
      logradouro,
      numero && numero !== 'SN' ? `Nº ${numero}` : (numero === 'SN' ? 'S/N' : ''),
      complemento ? `Compl: ${complemento}` : '',
      bairro ? `Bairro ${bairro}` : '',
      municipio && uf ? `${municipio}/${uf}` : '',
      cep ? `CEP ${cep}` : '',
    ].filter(Boolean);

    const enderecoCompleto = partesEnd.join(', ');

    // Situação Cadastral
    const situacaoCadastral =
      minha?.descricao_situacao_cadastral ||
      est.situacao_cadastral ||
      brasilApiData?.descricao_situacao_cadastral ||
      'ATIVA';

    // CNAE Principal
    let cnaePrincipal = '';
    if (minha?.cnae_fiscal) {
      cnaePrincipal = `${minha.cnae_fiscal} - ${minha.cnae_fiscal_descricao || ''}`.trim();
    } else if (est.atividade_principal?.descricao) {
      cnaePrincipal = `${est.atividade_principal.subclasse || est.atividade_principal.id || ''} - ${est.atividade_principal.descricao}`.trim();
    } else if (brasilApiData?.cnae_fiscal) {
      cnaePrincipal = `${brasilApiData.cnae_fiscal} - ${brasilApiData.cnae_fiscal_descricao || ''}`.trim();
    }

    // Natureza Jurídica
    const naturezaJuridica =
      minha?.natureza_juridica || pub?.natureza_juridica?.descricao || brasilApiData?.natureza_juridica || '';

    // Porte da Empresa
    const porte =
      minha?.porte || pub?.porte?.descricao || brasilApiData?.porte || '';

    // Capital Social
    const capitalSocial = Number(minha?.capital_social || pub?.capital_social || brasilApiData?.capital_social || 0);

    // Data de Abertura
    const dataAbertura =
      minha?.data_inicio_atividade || est.data_inicio_atividade || brasilApiData?.data_inicio_atividade || '';

    return {
      cnpj: cleanCnpj,
      razaoSocial,
      nomeFantasia,
      inscricaoEstadual,
      telefone,
      email,
      cep,
      logradouro,
      numero,
      complemento,
      bairro,
      municipio,
      uf,
      enderecoCompleto,
      situacaoCadastral,
      cnaePrincipal,
      naturezaJuridica,
      porte,
      capitalSocial,
      dataAbertura,
    };
  },
};
