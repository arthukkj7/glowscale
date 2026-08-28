"use client";

import {
  ClipboardListIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataTable, type ColunaTabela } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusAtendimentoBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { excluirAtendimento } from "@/lib/actions/atendimentos";
import { formatCurrency, formatPercent } from "@/lib/calculations/money";
import type { AtendimentoComRelacoes } from "@/lib/data/atendimentos";
import { formatDateBR } from "@/lib/utils/date";
import type { AtendimentoRow, ProcedimentoRow, ProfissionalRow } from "@/types/database";
import { AtendimentoDialog } from "./atendimento-dialog";

interface AtendimentosViewProps {
  atendimentos: AtendimentoComRelacoes[];
  profissionais: ProfissionalRow[];
  procedimentos: ProcedimentoRow[];
  dataPadrao: string;
  temFiltroAtivo: boolean;
}

export function AtendimentosView({
  atendimentos,
  profissionais,
  procedimentos,
  dataPadrao,
  temFiltroAtivo,
}: AtendimentosViewProps) {
  const [dialogoAberto, setDialogoAberto] = useState(false);
  const [emEdicao, setEmEdicao] = useState<AtendimentoRow | null>(null);
  const [paraExcluir, setParaExcluir] = useState<AtendimentoComRelacoes | null>(null);

  const podeLancar = profissionais.length > 0 && procedimentos.length > 0;

  function abrirCriacao() {
    setEmEdicao(null);
    setDialogoAberto(true);
  }

  async function confirmarExclusao() {
    if (!paraExcluir) return;
    const resultado = await excluirAtendimento(paraExcluir.id);
    if (!resultado.ok) {
      toast.error(resultado.erro);
      return;
    }
    toast.success(resultado.mensagem ?? "Atendimento excluido.");
    setParaExcluir(null);
  }

  const colunas: ColunaTabela<AtendimentoComRelacoes>[] = [
    {
      chave: "data",
      cabecalho: "Data",
      celula: (registro) => (
        <span className="whitespace-nowrap tabular-nums">
          {formatDateBR(registro.data_atendimento)}
        </span>
      ),
    },
    {
      chave: "profissional",
      cabecalho: "Profissional",
      celula: (registro) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{registro.profissional_nome}</p>
          <p className="truncate text-xs text-muted-foreground md:hidden">
            {registro.procedimento_nome}
          </p>
        </div>
      ),
    },
    {
      chave: "procedimento",
      cabecalho: "Procedimento",
      apenasDesktop: true,
      celula: (registro) => (
        <div className="min-w-0">
          <p className="truncate">{registro.procedimento_nome}</p>
          {registro.quantidade > 1 ? (
            <p className="text-xs text-muted-foreground">
              {registro.quantidade}x {formatCurrency(registro.valor_unitario)}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      chave: "total",
      cabecalho: "Total",
      alinhamento: "direita",
      celula: (registro) => (
        <span className="font-medium">{formatCurrency(registro.valor_total)}</span>
      ),
    },
    {
      chave: "comissao",
      cabecalho: "Comissao",
      alinhamento: "direita",
      apenasDesktop: true,
      celula: (registro) => (
        <div>
          <p>{formatCurrency(registro.valor_comissao)}</p>
          <p className="text-xs text-muted-foreground">
            {formatPercent(registro.comissao_percentual)}
          </p>
        </div>
      ),
    },
    {
      chave: "clinica",
      cabecalho: "Clinica",
      alinhamento: "direita",
      apenasDesktop: true,
      celula: (registro) => formatCurrency(registro.valor_clinica),
    },
    {
      chave: "status",
      cabecalho: "Status",
      celula: (registro) => <StatusAtendimentoBadge status={registro.status} />,
    },
    {
      chave: "acoes",
      cabecalho: "Acoes",
      alinhamento: "direita",
      className: "w-16",
      celula: (registro) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label="Acoes do atendimento">
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
            <DropdownMenuItem variant="destructive" onSelect={() => setParaExcluir(registro)}>
              <Trash2Icon aria-hidden="true" />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  if (!podeLancar) {
    return (
      <EmptyState
        icone={ClipboardListIcon}
        titulo="Cadastre profissionais e procedimentos antes de lancar"
        descricao="Um atendimento sempre relaciona uma profissional a um procedimento. Complete os dois cadastros para comecar."
        acao={
          <div className="flex flex-wrap justify-center gap-2">
            <Button asChild variant={profissionais.length === 0 ? "default" : "outline"}>
              <Link href="/profissionais">Profissionais</Link>
            </Button>
            <Button asChild variant={procedimentos.length === 0 ? "default" : "outline"}>
              <Link href="/procedimentos">Procedimentos</Link>
            </Button>
          </div>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={abrirCriacao}>
          <PlusIcon className="size-4" aria-hidden="true" />
          Registrar atendimento
        </Button>
      </div>

      {atendimentos.length === 0 ? (
        <EmptyState
          icone={ClipboardListIcon}
          titulo={
            temFiltroAtivo
              ? "Nenhum atendimento neste filtro"
              : "Voce ainda nao registrou atendimentos"
          }
          descricao={
            temFiltroAtivo
              ? "Ajuste o periodo ou a profissional para ver outros lancamentos."
              : "Registre o primeiro atendimento para acompanhar faturamento e comissoes."
          }
          acao={
            temFiltroAtivo ? (
              <Button variant="outline" asChild>
                <Link href="/atendimentos">Limpar filtros</Link>
              </Button>
            ) : (
              <Button onClick={abrirCriacao}>
                <PlusIcon className="size-4" aria-hidden="true" />
                Registrar atendimento
              </Button>
            )
          }
        />
      ) : (
        <Card className="overflow-hidden">
          <DataTable
            colunas={colunas}
            registros={atendimentos}
            chaveDoRegistro={(registro) => registro.id}
          />
        </Card>
      )}

      <AtendimentoDialog
        aberto={dialogoAberto}
        onAbertoChange={setDialogoAberto}
        profissionais={profissionais}
        procedimentos={procedimentos}
        atendimento={emEdicao}
        dataPadrao={dataPadrao}
      />

      <ConfirmDialog
        aberto={paraExcluir !== null}
        onAbertoChange={(aberto) => !aberto && setParaExcluir(null)}
        titulo="Excluir atendimento"
        descricao={
          paraExcluir
            ? `Excluir o atendimento de ${paraExcluir.profissional_nome} em ${formatDateBR(paraExcluir.data_atendimento)}? Os valores saem do relatorio financeiro.`
            : ""
        }
        textoConfirmar="Excluir"
        destrutivo
        onConfirmar={confirmarExclusao}
      />
    </div>
  );
}
