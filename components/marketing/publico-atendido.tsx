/**
 * Quem o GlowScale atende.
 *
 * Existe por um motivo de conversao, nao de decoracao: uma nail designer que
 * le "sistema para clinicas de estetica" fecha a pagina achando que nao e
 * para ela. Ver a propria profissao escrita resolve isso em um segundo, e faz
 * mais pelo cadastro do que qualquer lista de funcionalidades.
 *
 * Em texto, nao em emoji: emoji e lido em voz alta por leitor de tela
 * ("emoji unha polida") e cada aparelho desenha o seu do seu jeito.
 */
const PUBLICO = [
  "Manicures e nail designers",
  "Lash e brow designers",
  "Esteticistas",
  "Massagistas",
  "Cabeleireiros",
  "Barbearias",
  "Maquiadores",
  "Studios de beleza",
  "Clínicas de estética",
  "Quem atende em casa",
  "Quem trabalha por comissão",
] as const;

export function PublicoAtendido() {
  return (
    <div className="pt-2">
      <h2 className="sr-only">Profissionais e negócios atendidos pelo GlowScale</h2>
      <ul className="flex flex-wrap gap-2">
        {PUBLICO.map((quem) => (
          <li
            key={quem}
            className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground"
          >
            {quem}
          </li>
        ))}
      </ul>
    </div>
  );
}
