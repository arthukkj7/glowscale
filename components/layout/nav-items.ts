import {
  BarChart3Icon,
  CalendarDaysIcon,
  ClipboardListIcon,
  ClockIcon,
  LayoutDashboardIcon,
  SettingsIcon,
  SparklesIcon,
  UserRoundIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react";

export interface ItemDeNavegacao {
  /**
   * Chave no catalogo de traducao, nao o texto pronto.
   * Guardar o rotulo aqui deixaria o menu em portugues com a interface em
   * ingles - e este arquivo e importado pelo servidor e pelo cliente.
   */
  chave: string;
  href: string;
  icone: LucideIcon;
}

export const ITENS_DE_NAVEGACAO: readonly ItemDeNavegacao[] = [
  { chave: "painel", href: "/dashboard", icone: LayoutDashboardIcon },
  { chave: "clientes", href: "/clientes", icone: UserRoundIcon },
  { chave: "agenda", href: "/agenda", icone: CalendarDaysIcon },
  { chave: "escala", href: "/escala", icone: ClockIcon },
  { chave: "servicos", href: "/procedimentos", icone: SparklesIcon },
  { chave: "equipe", href: "/profissionais", icone: UsersIcon },
  { chave: "atendimentos", href: "/atendimentos", icone: ClipboardListIcon },
  { chave: "financeiro", href: "/financeiro", icone: BarChart3Icon },
  { chave: "configuracoes", href: "/configuracoes", icone: SettingsIcon },
] as const;
