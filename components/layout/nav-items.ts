import {
  BarChart3Icon,
  CalendarDaysIcon,
  ClipboardListIcon,
  LayoutDashboardIcon,
  SettingsIcon,
  SparklesIcon,
  UserRoundIcon,
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
  { titulo: "Clientes", href: "/clientes", icone: UserRoundIcon },
  { titulo: "Agenda", href: "/escala", icone: CalendarDaysIcon },
  { titulo: "Serviços", href: "/procedimentos", icone: SparklesIcon },
  { titulo: "Equipe", href: "/profissionais", icone: UsersIcon },
  { titulo: "Atendimentos", href: "/atendimentos", icone: ClipboardListIcon },
  { titulo: "Financeiro", href: "/financeiro", icone: BarChart3Icon },
  { titulo: "Configurações", href: "/configuracoes", icone: SettingsIcon },
] as const;
