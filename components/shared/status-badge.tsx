import { Badge } from "@/components/ui/badge";
import {
  ASSINATURA_STATUS_LABEL,
  ATENDIMENTO_STATUS_LABEL,
  CLINICA_STATUS_LABEL,
} from "@/lib/constants";
import type {
  AssinaturaStatus,
  AtendimentoStatus,
  ClinicaStatus,
} from "@/types/database";

type Variante = "default" | "neutral" | "success" | "warning" | "destructive" | "outline";

const varianteClinica: Record<ClinicaStatus, Variante> = {
  trial: "default",
  active: "success",
  past_due: "warning",
  canceled: "neutral",
  blocked: "destructive",
};

const varianteAssinatura: Record<AssinaturaStatus, Variante> = {
  pending: "warning",
  trial: "default",
  active: "success",
  past_due: "warning",
  canceled: "neutral",
  expired: "destructive",
};

const varianteAtendimento: Record<AtendimentoStatus, Variante> = {
  realizado: "success",
  cancelado: "neutral",
};

export function StatusClinicaBadge({ status }: { status: ClinicaStatus }) {
  return <Badge variant={varianteClinica[status]}>{CLINICA_STATUS_LABEL[status]}</Badge>;
}

export function StatusAssinaturaBadge({ status }: { status: AssinaturaStatus }) {
  return <Badge variant={varianteAssinatura[status]}>{ASSINATURA_STATUS_LABEL[status]}</Badge>;
}

export function StatusAtendimentoBadge({ status }: { status: AtendimentoStatus }) {
  return <Badge variant={varianteAtendimento[status]}>{ATENDIMENTO_STATUS_LABEL[status]}</Badge>;
}

export function StatusAtivoBadge({ ativo }: { ativo: boolean }) {
  return <Badge variant={ativo ? "success" : "neutral"}>{ativo ? "Ativa" : "Inativa"}</Badge>;
}
