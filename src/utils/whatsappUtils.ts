/**
 * Utilitários dedicados para sanitização e geração de mensagens/links do WhatsApp
 * Garantindo 100% de compatibilidade de emojis e caracteres especiais sem interrogações ()
 */

/**
 * Normaliza e sanitiza textos de mensagens para WhatsApp.
 * Remove caracteres corrompidos (\uFFFD / losangos com interrogação)
 * e o variation selector 16 (\uFE0F) que causa interrogação após certos emojis,
 * substituindo por emojis universais e seguros no WhatsApp Web e celular.
 */
export function normalizarTextoWhatsApp(texto: string): string {
  if (!texto) return '';
  return texto
    // Substitui interrogações corrompidas antes de Chave PIX
    .replace(/\uFFFD\s*\*?Chave PIX:?\*?/gi, '💳 *Chave PIX:*')
    // Substitui emoji de sol com/sem variation selector que causa  no Windows
    .replace(/\u2600(\uFE0F)?/g, '👋')
    // Substitui emoji de chave por cartão/pagamento universal
    .replace(/🔑/g, '💳')
    // Substitui qualquer outro  solto por aceno amigável
    .replace(/\uFFFD/g, '👋')
    // Remove variation selector 16 solto (\uFE0F) que o Windows/Chrome quebra como 
    .replace(/\uFE0F/g, '')
    // Remove múltiplos espaços mantendo quebras de linha
    .replace(/[ \t]{2,}/g, ' ');
}

/**
 * Gera URL direta e estável para a API do WhatsApp (evita o redirect 302 do wa.me que corrompe UTF-8)
 */
export function gerarUrlApiWhatsApp(telefone: string, mensagem: string): string {
  const telLimpo = (telefone || '').replace(/\D/g, '');
  const msgNormalizada = normalizarTextoWhatsApp(mensagem);
  const textoEncoded = encodeURIComponent(msgNormalizada);

  if (!telLimpo) {
    return `https://api.whatsapp.com/send?text=${textoEncoded}`;
  }
  const telComDdi = telLimpo.startsWith('55') ? telLimpo : `55${telLimpo}`;
  return `https://api.whatsapp.com/send?phone=${telComDdi}&text=${textoEncoded}`;
}
