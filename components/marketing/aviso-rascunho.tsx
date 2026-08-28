import { EMPRESA, dadosDaEmpresaPendentes } from "@/lib/constants/empresa";

/**
 * Aviso mostrado enquanto os dados da empresa nao foram preenchidos.
 *
 * Publicar uma politica de privacidade com "[CNPJ]" no lugar do CNPJ e pior do
 * que nao ter: passa a impressao de descuido justamente no documento que
 * deveria transmitir cuidado. O aviso existe para que isso nao passe
 * despercebido - e some sozinho quando os campos forem preenchidos.
 */
export function AvisoDeRascunho() {
  if (!dadosDaEmpresaPendentes()) return null;

  return (
    <div className="rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm">
      <p className="font-medium">Rascunho — não publique assim.</p>
      <p className="mt-1 text-muted-foreground">
        Os dados da empresa ainda não foram preenchidos em{" "}
        <code className="font-mono text-xs">lib/constants/empresa.ts</code>, e este texto não
        passou por revisão jurídica. Ele cobre o que a LGPD exige na estrutura, mas quem
        responde pelo documento é quem o publica.
      </p>
    </div>
  );
}

/** Bloco de identificação do controlador, reaproveitado nos dois documentos. */
export function IdentificacaoDaEmpresa() {
  return (
    <dl className="grid gap-2 rounded-lg border border-border p-4 text-sm sm:grid-cols-[auto_1fr] sm:gap-x-6">
      <dt className="text-muted-foreground">Razão social</dt>
      <dd>{EMPRESA.razaoSocial}</dd>
      <dt className="text-muted-foreground">CNPJ</dt>
      <dd>{EMPRESA.cnpj}</dd>
      <dt className="text-muted-foreground">Endereço</dt>
      <dd>{EMPRESA.endereco}</dd>
      <dt className="text-muted-foreground">Contato</dt>
      <dd>{EMPRESA.emailPrivacidade}</dd>
    </dl>
  );
}
