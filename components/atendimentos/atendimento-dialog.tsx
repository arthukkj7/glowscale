"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon } from "lucide-react";
import { useState, useTransition } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { CurrencyInput } from "@/components/shared/currency-input";
import { DatePicker } from "@/components/shared/date-picker";
import { FormField, camposAria } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { atualizarAtendimento, criarAtendimento } from "@/lib/actions/atendimentos";
import { calculateCommission } from "@/lib/calculations/commission";
import { formatCurrency, formatPercent } from "@/lib/calculations/money";
import {
  atendimentoSchema,
  type AtendimentoFormValues,
  type AtendimentoInput,
} from "@/lib/validations";
import type { AtendimentoRow, ProcedimentoRow, ProfissionalRow } from "@/types/database";

interface AtendimentoDialogProps {
  aberto: boolean;
  onAbertoChange: (aberto: boolean) => void;
  profissionais: ProfissionalRow[];
  procedimentos: ProcedimentoRow[];
  atendimento?: AtendimentoRow | null;
  dataPadrao: string;
}

function valoresIniciais(
  atendimento: AtendimentoRow | null | undefined,
  profissionais: ProfissionalRow[],
  dataPadrao: string,
): AtendimentoFormValues {
  if (!atendimento) {
    return {
      profissional_id: profissionais[0]?.id ?? "",
      procedimento_id: "",
      data_atendimento: dataPadrao,
      quantidade: 1,
      valor_unitario: "",
      status: "realizado",
      observacoes: "",
    };
  }
  return {
    profissional_id: atendimento.profissional_id,
    procedimento_id: atendimento.procedimento_id,
    data_atendimento: atendimento.data_atendimento,
    quantidade: atendimento.quantidade,
    valor_unitario: atendimento.valor_unitario,
    status: atendimento.status,
    observacoes: atendimento.observacoes ?? "",
  };
}

/** Previa do lancamento; devolve null enquanto os campos nao formam um calculo valido. */
function calcularPrevia(
  valorUnitario: unknown,
  quantidade: unknown,
  comissaoPercentual: number,
) {
  const unitario = typeof valorUnitario === "number" ? valorUnitario : Number(valorUnitario);
  const qtd = Number(quantidade);
  if (!Number.isFinite(unitario) || unitario < 0 || !Number.isInteger(qtd) || qtd < 1) {
    return null;
  }
  return calculateCommission({ valorUnitario: unitario, quantidade: qtd, comissaoPercentual });
}

function FormularioAtendimento({
  atendimento,
  profissionais,
  procedimentos,
  dataPadrao,
  onConcluir,
}: {
  atendimento?: AtendimentoRow | null;
  profissionais: ProfissionalRow[];
  procedimentos: ProcedimentoRow[];
  dataPadrao: string;
  onConcluir: () => void;
}) {
  const editando = Boolean(atendimento);
  const [pendente, startTransition] = useTransition();
  const [erroGeral, setErroGeral] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<AtendimentoFormValues, unknown, AtendimentoInput>({
    resolver: zodResolver(atendimentoSchema),
    defaultValues: valoresIniciais(atendimento, profissionais, dataPadrao),
  });

  const profissionalId = useWatch({ control, name: "profissional_id" });
  const procedimentoId = useWatch({ control, name: "procedimento_id" });
  const quantidade = useWatch({ control, name: "quantidade" });
  const valorUnitario = useWatch({ control, name: "valor_unitario" });

  const profissionalSelecionada = profissionais.find((item) => item.id === profissionalId);

  /**
   * Percentual exibido na previa. No servidor o snapshot e sempre relido do
   * banco: aqui e apenas informativo. Em edicao, mostramos o percentual ja
   * gravado no atendimento enquanto a profissional nao mudar.
   */
  const percentualDaPrevia =
    atendimento && atendimento.profissional_id === profissionalId
      ? atendimento.comissao_percentual
      : (profissionalSelecionada?.percentual_comissao ?? 0);

  // Calculo barato o suficiente para rodar a cada render; o React Compiler
  // cuida da memoizacao.
  const previa = calcularPrevia(valorUnitario, quantidade, percentualDaPrevia);

  /** Ao escolher o procedimento, o valor cadastrado e sugerido. */
  function aoEscolherProcedimento(id: string) {
    setValue("procedimento_id", id, { shouldValidate: true });
    const procedimento = procedimentos.find((item) => item.id === id);
    if (procedimento) {
      setValue("valor_unitario", procedimento.valor, { shouldValidate: true });
    }
  }

  function aoEnviar(valores: AtendimentoInput) {
    setErroGeral(null);
    startTransition(async () => {
      const resultado = atendimento
        ? await atualizarAtendimento({ ...valores, id: atendimento.id })
        : await criarAtendimento(valores);

      if (!resultado.ok) {
        setErroGeral(resultado.erro);
        return;
      }
      toast.success(resultado.mensagem ?? "Atendimento salvo.");
      onConcluir();
    });
  }

  return (
    <form onSubmit={handleSubmit(aoEnviar)} className="space-y-5" noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField
          id="atend-profissional"
          rotulo="Profissional"
          erro={errors.profissional_id?.message}
          descricao={
            profissionalSelecionada
              ? `Comissão atual: ${formatPercent(profissionalSelecionada.percentual_comissao)}`
              : undefined
          }
          obrigatorio
        >
          <Controller
            control={control}
            name="profissional_id"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange} disabled={pendente}>
                <SelectTrigger
                  {...camposAria("atend-profissional", errors.profissional_id?.message)}
                >
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {profissionais.map((profissional) => (
                    <SelectItem key={profissional.id} value={profissional.id}>
                      {profissional.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </FormField>

        <FormField
          id="atend-procedimento"
          rotulo="Procedimento"
          erro={errors.procedimento_id?.message}
          obrigatorio
        >
          <Select
            value={procedimentoId}
            onValueChange={aoEscolherProcedimento}
            disabled={pendente}
          >
            <SelectTrigger {...camposAria("atend-procedimento", errors.procedimento_id?.message)}>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {procedimentos.map((procedimento) => (
                <SelectItem key={procedimento.id} value={procedimento.id}>
                  {procedimento.nome} - {formatCurrency(procedimento.valor)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <FormField
          id="atend-data"
          rotulo="Data"
          erro={errors.data_atendimento?.message}
          obrigatorio
        >
          <DatePicker
            {...camposAria("atend-data", errors.data_atendimento?.message)}
            {...register("data_atendimento")}
            disabled={pendente}
          />
        </FormField>

        <FormField
          id="atend-quantidade"
          rotulo="Quantidade"
          erro={errors.quantidade?.message}
          obrigatorio
        >
          <Input
            {...camposAria("atend-quantidade", errors.quantidade?.message)}
            {...register("quantidade")}
            type="number"
            min={1}
            max={1000}
            step={1}
            disabled={pendente}
          />
        </FormField>

        <FormField
          id="atend-valor"
          rotulo="Valor unitario"
          erro={errors.valor_unitario?.message}
          obrigatorio
        >
          <Controller
            control={control}
            name="valor_unitario"
            render={({ field }) => (
              <CurrencyInput
                {...camposAria("atend-valor", errors.valor_unitario?.message)}
                value={typeof field.value === "number" ? field.value : null}
                onValueChange={(valor) => field.onChange(valor ?? "")}
                onBlur={field.onBlur}
                disabled={pendente}
              />
            )}
          />
        </FormField>
      </div>

      <FormField id="atend-status" rotulo="Status" erro={errors.status?.message}>
        <Controller
          control={control}
          name="status"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange} disabled={pendente}>
              <SelectTrigger {...camposAria("atend-status", errors.status?.message)}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="realizado">Realizado</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
      </FormField>

      <FormField id="atend-obs" rotulo="Observações" erro={errors.observacoes?.message}>
        <Textarea
          {...camposAria("atend-obs", errors.observacoes?.message)}
          {...register("observacoes")}
          rows={2}
          placeholder="Anotacoes sobre a sessão."
          disabled={pendente}
        />
      </FormField>

      {/* Previa do calculo, com a mesma formula aplicada no banco. */}
      <div className="rounded-lg border border-border bg-muted/40 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Prévia do lançamento
        </p>
        <dl className="mt-3 grid gap-3 sm:grid-cols-3">
          <div>
            <dt className="text-xs text-muted-foreground">Valor do atendimento</dt>
            <dd className="text-lg font-semibold tabular-nums">
              {previa ? formatCurrency(previa.valorTotal) : "-"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">
              Comissao ({formatPercent(percentualDaPrevia)})
            </dt>
            <dd className="text-lg font-semibold tabular-nums text-primary">
              {previa ? formatCurrency(previa.valorComissao) : "-"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Valor da clínica</dt>
            <dd className="text-lg font-semibold tabular-nums">
              {previa ? formatCurrency(previa.valorClinica) : "-"}
            </dd>
          </div>
        </dl>
      </div>

      {erroGeral ? (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {erroGeral}
        </p>
      ) : null}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onConcluir} disabled={pendente}>
          Cancelar
        </Button>
        <Button type="submit" disabled={pendente}>
          {pendente ? <Loader2Icon className="size-4 animate-spin" /> : null}
          {editando ? "Salvar alterações" : "Registrar atendimento"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function AtendimentoDialog({
  aberto,
  onAbertoChange,
  profissionais,
  procedimentos,
  atendimento,
  dataPadrao,
}: AtendimentoDialogProps) {
  return (
    <Dialog open={aberto} onOpenChange={onAbertoChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{atendimento ? "Editar atendimento" : "Novo atendimento"}</DialogTitle>
          <DialogDescription>
            A comissão e congelada no momento do lançamento: alterar o cadastro da
            profissional depois não altera este registro.
          </DialogDescription>
        </DialogHeader>

        <FormularioAtendimento
          key={atendimento?.id ?? "novo"}
          atendimento={atendimento}
          profissionais={profissionais}
          procedimentos={procedimentos}
          dataPadrao={dataPadrao}
          onConcluir={() => onAbertoChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
