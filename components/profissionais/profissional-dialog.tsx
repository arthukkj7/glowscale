"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon } from "lucide-react";
import { useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

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
import { Switch } from "@/components/ui/switch";
import { atualizarProfissional, criarProfissional } from "@/lib/actions/profissionais";
import {
  profissionalSchema,
  type ProfissionalFormValues,
  type ProfissionalInput,
} from "@/lib/validations";
import type { ProfissionalRow } from "@/types/database";

interface ProfissionalDialogProps {
  aberto: boolean;
  onAbertoChange: (aberto: boolean) => void;
  /** Quando presente, o dialogo edita; quando ausente, cria. */
  profissional?: ProfissionalRow | null;
}

function valoresIniciais(profissional?: ProfissionalRow | null): ProfissionalFormValues {
  if (!profissional) {
    return {
      nome: "",
      email: "",
      telefone: "",
      especialidade: "",
      percentual_comissao: "",
      ativo: true,
    };
  }
  return {
    nome: profissional.nome,
    email: profissional.email ?? "",
    telefone: profissional.telefone ?? "",
    especialidade: profissional.especialidade ?? "",
    percentual_comissao: String(profissional.percentual_comissao).replace(".", ","),
    ativo: profissional.ativo,
  };
}

/**
 * O formulario e um componente separado, montado apenas enquanto o dialogo
 * esta aberto. Assim o estado nasce ja com os valores certos e nao existe
 * useEffect de sincronizacao.
 */
function FormularioProfissional({
  profissional,
  onConcluir,
}: {
  profissional?: ProfissionalRow | null;
  onConcluir: () => void;
}) {
  const editando = Boolean(profissional);
  const [pendente, startTransition] = useTransition();
  const [erroGeral, setErroGeral] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<ProfissionalFormValues, unknown, ProfissionalInput>({
    resolver: zodResolver(profissionalSchema),
    defaultValues: valoresIniciais(profissional),
  });

  const ativo = useWatch({ control, name: "ativo" });

  function aoEnviar(valores: ProfissionalInput) {
    setErroGeral(null);
    startTransition(async () => {
      const resultado = profissional
        ? await atualizarProfissional({ ...valores, id: profissional.id })
        : await criarProfissional(valores);

      if (!resultado.ok) {
        setErroGeral(resultado.erro);
        return;
      }
      toast.success(resultado.mensagem ?? "Dados salvos.");
      onConcluir();
    });
  }

  return (
    <form onSubmit={handleSubmit(aoEnviar)} className="space-y-5" noValidate>
      <FormField id="prof-nome" rotulo="Nome" erro={errors.nome?.message} obrigatorio>
        <Input
          {...camposAria("prof-nome", errors.nome?.message)}
          {...register("nome")}
          placeholder="Ana Beatriz Souza"
          disabled={pendente}
        />
      </FormField>

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField id="prof-email" rotulo="E-mail" erro={errors.email?.message}>
          <Input
            {...camposAria("prof-email", errors.email?.message)}
            {...register("email")}
            type="email"
            placeholder="ana@clinica.com.br"
            disabled={pendente}
          />
        </FormField>

        <FormField id="prof-telefone" rotulo="Telefone" erro={errors.telefone?.message}>
          <Input
            {...camposAria("prof-telefone", errors.telefone?.message)}
            {...register("telefone")}
            type="tel"
            placeholder="(11) 90000-0000"
            disabled={pendente}
          />
        </FormField>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField
          id="prof-especialidade"
          rotulo="Especialidade"
          erro={errors.especialidade?.message}
        >
          <Input
            {...camposAria("prof-especialidade", errors.especialidade?.message)}
            {...register("especialidade")}
            placeholder="Estética facial"
            disabled={pendente}
          />
        </FormField>

        <FormField
          id="prof-comissao"
          rotulo="Comissão (%)"
          erro={errors.percentual_comissao?.message}
          descricao="Entre 0 e 100."
          obrigatorio
        >
          <Input
            {...camposAria("prof-comissao", errors.percentual_comissao?.message, "Entre 0 e 100.")}
            {...register("percentual_comissao")}
            inputMode="decimal"
            placeholder="40"
            disabled={pendente}
          />
        </FormField>
      </div>

      <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
        <div className="space-y-0.5">
          <p className="text-sm font-medium">Profissional ativa</p>
          <p className="text-xs text-muted-foreground">
            Profissionais inativas não aparecem nos lançamentos.
          </p>
        </div>
        <Switch
          checked={Boolean(ativo)}
          onCheckedChange={(valor) => setValue("ativo", valor, { shouldDirty: true })}
          disabled={pendente}
          aria-label="Profissional ativa"
        />
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
          {editando ? "Salvar alterações" : "Cadastrar"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function ProfissionalDialog({
  aberto,
  onAbertoChange,
  profissional,
}: ProfissionalDialogProps) {
  return (
    <Dialog open={aberto} onOpenChange={onAbertoChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {profissional ? "Editar profissional" : "Nova profissional"}
          </DialogTitle>
          <DialogDescription>
            A comissão informada aqui e aplicada aos próximos atendimentos. Lançamentos
            anteriores mantem o percentual que valia na data.
          </DialogDescription>
        </DialogHeader>

        <FormularioProfissional
          key={profissional?.id ?? "nova"}
          profissional={profissional}
          onConcluir={() => onAbertoChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
