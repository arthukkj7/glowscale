/**
 * Dados da empresa nos documentos legais.
 *
 * Ficam numa constante, e nao espalhados pelas paginas, porque um documento
 * legal com contato desatualizado e pior do que nenhum: a pessoa tenta exercer
 * um direito, nao consegue, e a falha e da empresa.
 *
 * PREENCHA antes de publicar. Enquanto estiverem assim, as paginas mostram um
 * aviso de que o documento e um rascunho.
 */
export const EMPRESA = {
  nomeFantasia: "GlowScale",
  /** Razao social completa. */
  razaoSocial: "[RAZÃO SOCIAL]",
  cnpj: "[CNPJ]",
  /** Canal para pedidos sobre dados pessoais (LGPD, art. 18). */
  emailPrivacidade: "[E-MAIL DE CONTATO]",
  emailSuporte: "[E-MAIL DE CONTATO]",
  /** Endereco do controlador. */
  endereco: "[ENDEREÇO]",
  /** Data da ultima revisao dos documentos. */
  atualizadoEm: "2026-08-28",
} as const;

/** true enquanto houver marcador nao preenchido. */
export function dadosDaEmpresaPendentes(): boolean {
  return Object.values(EMPRESA).some((valor) => valor.includes("["));
}
