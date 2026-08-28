"use client";

import {
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  PowerIcon,
  Trash2Icon,
  UserRoundIcon,
} from "lucide-react";
import Link from "next/link";
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
import { alternarStatusDoCliente, excluirCliente } from "@/lib/actions/clientes";
import { formatCurrency } from "@/lib/calculations/money";
import { formatDateBR } from "@/lib/utils/date";
import type { ClienteComResumo, ClienteRow } from "@/types/database";
import { ClienteDialog } from "./cliente-dialog";

interface ClientesViewProps {
  clientes: ClienteComResumo[];
  /** true quando a lista esta filtrada: muda o texto do estado vazio. */
  buscando: boolean;
}

/** O resumo nao traz clinica_id; o dialogo so precisa do cadastro. */
function comoCadastro(c: ClienteComResumo): ClienteRow {
  return {
    id: c.id,
    clinica_id: "",
    nome: c.nome,
    telefone: c.telefone,
    email: c.email,
    data_nascimento: c.data_nascimento,
    observacoes: c.observacoes,
    ativo: c.ativo,
    created_at: c.criado_em,
    updated_at: c.criado_em,
  };
}

export function ClientesView({ clientes, buscando }: ClientesViewProps) {
  const [pendente, startTransition] = useTransition();
  const [dialogoAberto, setDialogoAberto] = useState(false);
  const [emEdicao, setEmEdicao] = useState<ClienteRow | null>(null);
  const [paraExcluir, setParaExcluir] = useState<ClienteComResumo | null>(null);

  function abrirCriacao() {
    setEmEdicao(null);
    setDialogoAberto(true);
  }

  function abrirEdicao(cliente: ClienteComResumo) {
    setEmEdicao(comoCadastro(cliente));
    setDialogoAberto(true);
  }

  function alternarStatus(cliente: ClienteComResumo) {
    startTransition(async () => {
      const resultado = await alternarStatusDoCliente({
        id: cliente.id,
        ativo: !cliente.ativo,
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
    const resultado = await excluirCliente({ id: paraExcluir.id });
    if (!resultado.ok) {
      toast.error(resultado.erro);
      return;
    }
    toast.success(resultado.mensagem ?? "Cliente excluído.");
    setParaExcluir(null);
  }

  const colunas: ColunaTabela<ClienteComResumo>[] = [
    {
      chave: "nome",
      cabecalho: "Cliente",
      celula: (c) => (
        <div className="min-w-0">
          <Link
            href={`/clientes/${c.id}`}
            className="truncate font-medium underline-offset-4 hover:underline"
          >
            {c.nome}
          </Link>
          {c.telefone ? (
            <p className="truncate text-xs text-muted-foreground">{c.telefone}</p>
          ) : null}
        </div>
      ),
    },
    {
      chave: "ultimo",
      cabecalho: "Último atendimento",
      apenasDesktop: true,
      celula: (c) =>
        c.ultimo_atendimento ? (
          <span className="tabular-nums">{formatDateBR(c.ultimo_atendimento)}</span>
        ) : (
          <span className="text-muted-foreground">Nunca</span>
        ),
    },
    {
      chave: "preferida",
      cabecalho: "Profissional",
      apenasDesktop: true,
      celula: (c) => c.profissional_preferida ?? <span className="text-muted-foreground">-</span>,
    },
    {
      chave: "atendimentos",
      cabecalho: "Atend.",
      alinhamento: "direita",
      apenasDesktop: true,
      celula: (c) => <span className="tabular-nums">{c.total_atendimentos}</span>,
    },
    {
      chave: "total",
      cabecalho: "Total gasto",
      alinhamento: "direita",
      celula: (c) => (
        <span className="font-medium tabular-nums">{formatCurrency(c.total_gasto)}</span>
      ),
    },
    {
      chave: "status",
      cabecalho: "Status",
      celula: (c) => <StatusAtivoBadge ativo={c.ativo} />,
    },
    {
      chave: "acoes",
      cabecalho: "Ações",
      alinhamento: "direita",
      className: "w-16",
      celula: (c) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Ações para ${c.nome}`}
              disabled={pendente}
            >
              <MoreHorizontalIcon className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => abrirEdicao(c)}>
              <PencilIcon aria-hidden="true" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => alternarStatus(c)}>
              <PowerIcon aria-hidden="true" />
              {c.ativo ? "Arquivar" : "Reativar"}
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onSelect={() => setParaExcluir(c)}>
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
          Adicionar cliente
        </Button>
      </div>

      {clientes.length === 0 ? (
        <EmptyState
          icone={UserRoundIcon}
          titulo={buscando ? "Nenhum cliente encontrado" : "Sua agenda de clientes está vazia"}
          descricao={
            buscando
              ? "Tente outro nome ou telefone. A busca ignora acentos e formatação."
              : "Cadastre suas clientes para acompanhar histórico, quanto cada uma já gastou e quem anda sumida."
          }
          acao={
            buscando ? undefined : (
              <Button onClick={abrirCriacao}>
                <PlusIcon className="size-4" aria-hidden="true" />
                Adicionar cliente
              </Button>
            )
          }
        />
      ) : (
        <Card className="overflow-hidden">
          <DataTable colunas={colunas} registros={clientes} chaveDoRegistro={(c) => c.id} />
        </Card>
      )}

      <ClienteDialog
        aberto={dialogoAberto}
        onAbertoChange={setDialogoAberto}
        cliente={emEdicao}
      />

      <ConfirmDialog
        aberto={paraExcluir !== null}
        onAbertoChange={(aberto) => !aberto && setParaExcluir(null)}
        titulo="Excluir cliente"
        descricao={
          `Isto remove o cadastro de ${paraExcluir?.nome ?? "esta cliente"} em definitivo. ` +
          `Os ${paraExcluir?.total_atendimentos ?? 0} atendimentos continuam no financeiro, ` +
          "apenas sem o vínculo. Para só tirar das listas, prefira arquivar."
        }
        textoConfirmar="Excluir"
        destrutivo
        onConfirmar={confirmarExclusao}
      />
    </div>
  );
}
