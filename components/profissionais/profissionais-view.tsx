"use client";

import {
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  PowerIcon,
  Trash2Icon,
  UsersIcon,
} from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataTable, type ColunaTabela } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusAtivoBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  alternarStatusProfissional,
  excluirProfissional,
} from "@/lib/actions/profissionais";
import { formatPercent } from "@/lib/calculations/money";
import type { ProfissionalRow } from "@/types/database";
import { ProfissionalDialog } from "./profissional-dialog";

interface ProfissionaisViewProps {
  profissionais: ProfissionalRow[];
}

export function ProfissionaisView({ profissionais }: ProfissionaisViewProps) {
  const [pendente, startTransition] = useTransition();
  const [dialogoAberto, setDialogoAberto] = useState(false);
  const [emEdicao, setEmEdicao] = useState<ProfissionalRow | null>(null);
  const [paraExcluir, setParaExcluir] = useState<ProfissionalRow | null>(null);

  function abrirCriacao() {
    setEmEdicao(null);
    setDialogoAberto(true);
  }

  function abrirEdicao(profissional: ProfissionalRow) {
    setEmEdicao(profissional);
    setDialogoAberto(true);
  }

  function alternarStatus(profissional: ProfissionalRow) {
    startTransition(async () => {
      const resultado = await alternarStatusProfissional({
        id: profissional.id,
        ativo: !profissional.ativo,
      });
      if (!resultado.ok) {
        toast.error(resultado.erro);
        return;
      }
      toast.success(resultado.mensagem ?? "Status atualizado.");
    });
  }

  async function confirmarExclusao() {
    if (!paraExcluir) return;
    const resultado = await excluirProfissional(paraExcluir.id);
    if (!resultado.ok) {
      toast.error(resultado.erro);
      return;
    }
    toast.success(resultado.mensagem ?? "Profissional excluida.");
    setParaExcluir(null);
  }

  const colunas: ColunaTabela<ProfissionalRow>[] = [
    {
      chave: "nome",
      cabecalho: "Profissional",
      celula: (registro) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{registro.nome}</p>
          {registro.email ? (
            <p className="truncate text-xs text-muted-foreground">{registro.email}</p>
          ) : null}
        </div>
      ),
    },
    {
      chave: "especialidade",
      cabecalho: "Especialidade",
      apenasDesktop: true,
      celula: (registro) => registro.especialidade ?? "-",
    },
    {
      chave: "telefone",
      cabecalho: "Telefone",
      apenasDesktop: true,
      celula: (registro) => registro.telefone ?? "-",
    },
    {
      chave: "comissao",
      cabecalho: "Comissao",
      alinhamento: "direita",
      celula: (registro) => (
        <span className="font-medium">{formatPercent(registro.percentual_comissao)}</span>
      ),
    },
    {
      chave: "status",
      cabecalho: "Status",
      celula: (registro) => <StatusAtivoBadge ativo={registro.ativo} />,
    },
    {
      chave: "acoes",
      cabecalho: "Acoes",
      alinhamento: "direita",
      className: "w-16",
      celula: (registro) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Acoes para ${registro.nome}`}
              disabled={pendente}
            >
              <MoreHorizontalIcon className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => abrirEdicao(registro)}>
              <PencilIcon aria-hidden="true" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => alternarStatus(registro)}>
              <PowerIcon aria-hidden="true" />
              {registro.ativo ? "Desativar" : "Ativar"}
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onSelect={() => setParaExcluir(registro)}>
              <Trash2Icon aria-hidden="true" />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={abrirCriacao}>
          <PlusIcon className="size-4" aria-hidden="true" />
          Adicionar profissional
        </Button>
      </div>

      {profissionais.length === 0 ? (
        <EmptyState
          icone={UsersIcon}
          titulo="Voce ainda nao possui profissionais cadastradas"
          descricao="Adicione sua primeira profissional para comecar a montar escalas e lancar atendimentos."
          acao={
            <Button onClick={abrirCriacao}>
              <PlusIcon className="size-4" aria-hidden="true" />
              Adicionar profissional
            </Button>
          }
        />
      ) : (
        <Card className="overflow-hidden">
          <DataTable
            colunas={colunas}
            registros={profissionais}
            chaveDoRegistro={(registro) => registro.id}
          />
        </Card>
      )}

      <ProfissionalDialog
        aberto={dialogoAberto}
        onAbertoChange={setDialogoAberto}
        profissional={emEdicao}
      />

      <ConfirmDialog
        aberto={paraExcluir !== null}
        onAbertoChange={(aberto) => !aberto && setParaExcluir(null)}
        titulo="Excluir profissional"
        descricao={`Esta acao remove ${paraExcluir?.nome ?? "a profissional"} definitivamente. Se houver atendimentos registrados, prefira desativar o cadastro.`}
        textoConfirmar="Excluir"
        destrutivo
        onConfirmar={confirmarExclusao}
      />
    </div>
  );
}
