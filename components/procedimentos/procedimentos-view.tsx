"use client";

import {
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  PowerIcon,
  SparklesIcon,
  Trash2Icon,
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
  alternarStatusProcedimento,
  excluirProcedimento,
} from "@/lib/actions/procedimentos";
import { formatCurrency } from "@/lib/calculations/money";
import type { ProcedimentoRow } from "@/types/database";
import { ProcedimentoDialog } from "./procedimento-dialog";

interface ProcedimentosViewProps {
  procedimentos: ProcedimentoRow[];
}

export function ProcedimentosView({ procedimentos }: ProcedimentosViewProps) {
  const [pendente, startTransition] = useTransition();
  const [dialogoAberto, setDialogoAberto] = useState(false);
  const [emEdicao, setEmEdicao] = useState<ProcedimentoRow | null>(null);
  const [paraExcluir, setParaExcluir] = useState<ProcedimentoRow | null>(null);

  function abrirCriacao() {
    setEmEdicao(null);
    setDialogoAberto(true);
  }

  function alternarStatus(procedimento: ProcedimentoRow) {
    startTransition(async () => {
      const resultado = await alternarStatusProcedimento({
        id: procedimento.id,
        ativo: !procedimento.ativo,
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
    const resultado = await excluirProcedimento(paraExcluir.id);
    if (!resultado.ok) {
      toast.error(resultado.erro);
      return;
    }
    toast.success(resultado.mensagem ?? "Procedimento excluido.");
    setParaExcluir(null);
  }

  const colunas: ColunaTabela<ProcedimentoRow>[] = [
    {
      chave: "nome",
      cabecalho: "Procedimento",
      celula: (registro) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{registro.nome}</p>
          {registro.descricao ? (
            <p className="line-clamp-1 text-xs text-muted-foreground">{registro.descricao}</p>
          ) : null}
        </div>
      ),
    },
    {
      chave: "duracao",
      cabecalho: "Duração",
      apenasDesktop: true,
      celula: (registro) => `${registro.duracao_minutos} min`,
    },
    {
      chave: "valor",
      cabecalho: "Valor",
      alinhamento: "direita",
      celula: (registro) => (
        <span className="font-medium">{formatCurrency(registro.valor)}</span>
      ),
    },
    {
      chave: "status",
      cabecalho: "Status",
      celula: (registro) => <StatusAtivoBadge ativo={registro.ativo} />,
    },
    {
      chave: "acoes",
      cabecalho: "Ações",
      alinhamento: "direita",
      className: "w-16",
      celula: (registro) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Ações para ${registro.nome}`}
              disabled={pendente}
            >
              <MoreHorizontalIcon className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onSelect={() => {
                setEmEdicao(registro);
                setDialogoAberto(true);
              }}
            >
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
          Adicionar procedimento
        </Button>
      </div>

      {procedimentos.length === 0 ? (
        <EmptyState
          icone={SparklesIcon}
          titulo="Você ainda não possui procedimentos cadastrados"
          descricao="Cadastre os serviços da clínica com valor e duração para agilizar os lançamentos."
          acao={
            <Button onClick={abrirCriacao}>
              <PlusIcon className="size-4" aria-hidden="true" />
              Adicionar procedimento
            </Button>
          }
        />
      ) : (
        <Card className="overflow-hidden">
          <DataTable
            colunas={colunas}
            registros={procedimentos}
            chaveDoRegistro={(registro) => registro.id}
          />
        </Card>
      )}

      <ProcedimentoDialog
        aberto={dialogoAberto}
        onAbertoChange={setDialogoAberto}
        procedimento={emEdicao}
      />

      <ConfirmDialog
        aberto={paraExcluir !== null}
        onAbertoChange={(aberto) => !aberto && setParaExcluir(null)}
        titulo="Excluir procedimento"
        descricao={`Esta ação remove ${paraExcluir?.nome ?? "o procedimento"} definitivamente. Se houver atendimentos registrados, prefira desativar o cadastro.`}
        textoConfirmar="Excluir"
        destrutivo
        onConfirmar={confirmarExclusao}
      />
    </div>
  );
}
