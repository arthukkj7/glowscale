/**
 * Tipos de negocio e os servicos que cada um costuma oferecer.
 *
 * Existem por um motivo de ativacao, nao de personalizacao: hoje quem cria uma
 * conta encontra seis formularios vazios antes de ver qualquer coisa util, e e
 * ali que a maioria vai embora. Escolher "Manicure" e ja encontrar Manicure,
 * Pedicure e Alongamento cadastrados muda o primeiro minuto inteiro.
 *
 * Os valores sao ponto de partida, nao sugestao de preco: cada uma ajusta ao
 * seu mercado. Estao arredondados de proposito para nao parecerem uma tabela
 * que alguem precisa seguir.
 *
 * Dados de produto, nao do inquilino - por isso constante, e nao tabela. Numa
 * tabela, cada instalacao poderia divergir sem deixar rastro no repositorio.
 */

export interface ServicoSugerido {
  nome: string;
  valor: number;
  duracaoMinutos: number;
}

export interface Segmento {
  id: string;
  nome: string;
  /** Aparece embaixo do nome no cartao de escolha. */
  descricao: string;
  servicos: ServicoSugerido[];
}

export const SEGMENTOS: Segmento[] = [
  {
    id: "manicure",
    nome: "Manicure e nail design",
    descricao: "Unhas, alongamento e nail art",
    servicos: [
      { nome: "Manicure", valor: 40, duracaoMinutos: 45 },
      { nome: "Pedicure", valor: 50, duracaoMinutos: 60 },
      { nome: "Manicure e pedicure", valor: 80, duracaoMinutos: 90 },
      { nome: "Esmaltação em gel", valor: 70, duracaoMinutos: 60 },
      { nome: "Alongamento em fibra", valor: 180, duracaoMinutos: 150 },
      { nome: "Manutenção de alongamento", valor: 120, duracaoMinutos: 120 },
      { nome: "Nail art (por unha)", valor: 15, duracaoMinutos: 15 },
      { nome: "Remoção de alongamento", valor: 50, duracaoMinutos: 45 },
    ],
  },
  {
    id: "lash",
    nome: "Cílios",
    descricao: "Extensão, volume e lash lifting",
    servicos: [
      { nome: "Extensão fio a fio", valor: 180, duracaoMinutos: 150 },
      { nome: "Volume brasileiro", valor: 220, duracaoMinutos: 180 },
      { nome: "Volume russo", valor: 280, duracaoMinutos: 180 },
      { nome: "Manutenção", valor: 120, duracaoMinutos: 90 },
      { nome: "Lash lifting", valor: 150, duracaoMinutos: 60 },
      { nome: "Remoção", valor: 50, duracaoMinutos: 30 },
    ],
  },
  {
    id: "sobrancelha",
    nome: "Sobrancelhas",
    descricao: "Design, henna e micropigmentação",
    servicos: [
      { nome: "Design de sobrancelha", valor: 45, duracaoMinutos: 30 },
      { nome: "Design com henna", valor: 65, duracaoMinutos: 45 },
      { nome: "Brow lamination", valor: 150, duracaoMinutos: 60 },
      { nome: "Micropigmentação", valor: 600, duracaoMinutos: 180 },
      { nome: "Retoque de micropigmentação", valor: 250, duracaoMinutos: 90 },
    ],
  },
  {
    id: "estetica",
    nome: "Estética facial e corporal",
    descricao: "Limpeza de pele, peeling e corporais",
    servicos: [
      { nome: "Limpeza de pele", valor: 150, duracaoMinutos: 90 },
      { nome: "Peeling químico", valor: 220, duracaoMinutos: 60 },
      { nome: "Microagulhamento", valor: 350, duracaoMinutos: 90 },
      { nome: "Drenagem linfática", valor: 130, duracaoMinutos: 60 },
      { nome: "Massagem modeladora", valor: 140, duracaoMinutos: 60 },
      { nome: "Radiofrequência", valor: 200, duracaoMinutos: 60 },
    ],
  },
  {
    id: "cabelo",
    nome: "Cabelo",
    descricao: "Corte, coloração e tratamentos",
    servicos: [
      { nome: "Corte feminino", valor: 90, duracaoMinutos: 60 },
      { nome: "Escova", valor: 60, duracaoMinutos: 45 },
      { nome: "Coloração", valor: 200, duracaoMinutos: 150 },
      { nome: "Mechas", valor: 400, duracaoMinutos: 240 },
      { nome: "Progressiva", valor: 350, duracaoMinutos: 180 },
      { nome: "Hidratação", valor: 80, duracaoMinutos: 60 },
    ],
  },
  {
    id: "barbearia",
    nome: "Barbearia",
    descricao: "Corte masculino, barba e combos",
    servicos: [
      { nome: "Corte masculino", valor: 45, duracaoMinutos: 40 },
      { nome: "Barba", valor: 35, duracaoMinutos: 30 },
      { nome: "Corte e barba", valor: 70, duracaoMinutos: 60 },
      { nome: "Pezinho", valor: 20, duracaoMinutos: 15 },
      { nome: "Platinado", valor: 150, duracaoMinutos: 120 },
      { nome: "Sobrancelha masculina", valor: 20, duracaoMinutos: 15 },
    ],
  },
  {
    id: "maquiagem",
    nome: "Maquiagem",
    descricao: "Social, noiva e produção",
    servicos: [
      { nome: "Maquiagem social", valor: 180, duracaoMinutos: 60 },
      { nome: "Maquiagem para noiva", valor: 500, duracaoMinutos: 120 },
      { nome: "Maquiagem para madrinha", valor: 250, duracaoMinutos: 75 },
      { nome: "Penteado", valor: 200, duracaoMinutos: 90 },
    ],
  },
  {
    id: "massagem",
    nome: "Massagem",
    descricao: "Relaxante, terapêutica e corporais",
    servicos: [
      { nome: "Massagem relaxante", valor: 130, duracaoMinutos: 60 },
      { nome: "Massagem terapêutica", valor: 160, duracaoMinutos: 60 },
      { nome: "Pedras quentes", valor: 180, duracaoMinutos: 75 },
      { nome: "Massagem desportiva", valor: 170, duracaoMinutos: 60 },
      { nome: "Reflexologia podal", valor: 110, duracaoMinutos: 45 },
    ],
  },
  {
    id: "depilacao",
    nome: "Depilação",
    descricao: "Cera, laser e egípcia",
    servicos: [
      { nome: "Axilas", valor: 35, duracaoMinutos: 20 },
      { nome: "Virilha simples", valor: 55, duracaoMinutos: 30 },
      { nome: "Virilha completa", valor: 80, duracaoMinutos: 45 },
      { nome: "Pernas completas", valor: 90, duracaoMinutos: 60 },
      { nome: "Buço", valor: 25, duracaoMinutos: 15 },
      { nome: "Corpo inteiro", valor: 250, duracaoMinutos: 120 },
    ],
  },
  {
    id: "outro",
    nome: "Outro",
    descricao: "Cadastro os serviços eu mesma",
    servicos: [],
  },
];

export const IDS_DE_SEGMENTO = SEGMENTOS.map((s) => s.id);

export function buscarSegmento(id: string | null | undefined): Segmento | null {
  if (!id) return null;
  return SEGMENTOS.find((s) => s.id === id) ?? null;
}

export function ehSegmento(valor: string): boolean {
  return IDS_DE_SEGMENTO.includes(valor);
}
