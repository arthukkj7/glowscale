import {
  BarChart3Icon,
  CalendarDaysIcon,
  ClipboardListIcon,
  LayoutDashboardIcon,
  SettingsIcon,
  SparklesIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react";

export interface ItemDeNavegacao {
  titulo: string;
  href: string;
  icone: LucideIcon;
}

export const ITENS_DE_NAVEGACAO: readonly ItemDeNavegacao[] = [
  { titulo: "Dashboard", href: "/dashboard", icone: LayoutDashboardIcon },
  { titulo: "Profissionais", href: "/profissionais", icone: UsersIcon },
  { titulo: "Escala", href: "/escala", icone: CalendarDaysIcon },
  { titulo: "Procedimentos", href: "/procedimentos", icone: SparklesIcon },
  { titulo: "Atendimentos", href: "/atendimentos", icone: ClipboardListIcon },
  { titulo: "Financeiro", href: "/financeiro", icone: BarChart3Icon },
  { titulo: "Configuracoes", href: "/configuracoes", icone: SettingsIcon },
] as const;
