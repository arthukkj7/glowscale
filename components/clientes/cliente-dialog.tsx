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
import { Textarea } from "@/components/ui/textarea";
import { atualizarCliente, criarCliente } from "@/lib/actions/clientes";
import { clienteSchema, type ClienteFormValues, type ClienteInput } from "@/lib/validations";
import type { ClienteRow } from "@/types/database";

interface ClienteDialogProps {
  aberto: boolean;
  onAbertoChange: (aberto: boolean) => void;
  /** Quando presente, o dialogo edita; quando ausente, cria. */
  cliente?: ClienteRow | null;
}

function valoresIniciais(cliente?: ClienteRow | null): ClienteFormValues {
  if (!cliente) {
    return { nome: "", telefone: "", email: "", data_nascimento: "", observacoes: "", ativo: true };
  }
  return {
    nome: cliente.nome,
    telefone: cliente.telefone ?? "",
    email: cliente.email ?? "",
    // A data ja vem como "yyyy-MM-dd" do banco, que e o formato do input date.
    data_nascimento: cliente.data_nascimento ?? "",
    observacoes: cliente.observacoes ?? "",
    ativo: cliente.ativo,
  };
}

/**
 * O formulario e um componente separado, montado apenas enquanto o dialogo
 * esta aberto. Assim o estado nasce com os valores certos, sem useEffect de
 * sincronizacao.
 */
function FormularioCliente({
  cliente,
  onConcluir,
}: {
  cliente?: ClienteRow | null;
  onConcluir: () => void;
}) {
  const editando = Boolean(cliente);
  const [pendente, startTransition] = useTransition();
  const [erroGeral, setErroGeral] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<ClienteFormValues, unknown, ClienteInput>({
    resolver: zodResolver(clienteSchema),
    defaultValues: valoresIniciais(cliente),
  });

  const ativo = useWatch({ control, name: "ativo" });

  function aoEnviar(valores: ClienteInput) {
    setErroGeral(null);
    startTransition(async () => {
      const resultado = cliente
        ? await atualizarCliente({ ...valores, id: cliente.id })
        : await criarCliente(valores);

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
      <FormField id="cli-nome" rotulo="Nome" erro={errors.nome?.message} obrigatorio>
        <Input
          {...camposAria("cli-nome", errors.nome?.message)}
          {...register("nome")}
          placeholder="Maria Silva"
          disabled={pendente}
        />
      </FormField>

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField id="cli-telefone" rotulo="Telefone" erro={errors.telefone?.message}>
          <Input
            {...camposAria("cli-telefone", errors.telefone?.message)}
            {...register("telefone")}
            type="tel"
            placeholder="(11) 90000-0000"
            disabled={pendente}
          />
        </FormField>

        <FormField
          id="cli-nascimento"
          rotulo="Data de nascimento"
          erro={errors.data_nascimento?.message}
          descricao="Opcional."
        >
          <Input
            {...camposAria("cli-nascimento", errors.data_nascimento?.message, "Opcional.")}
            {...register("data_nascimento")}
            type="date"
            disabled={pendente}
          />
        </FormField>
      </div>

      <FormField id="cli-email" rotulo="E-mail" erro={errors.email?.message}>
        <Input
          {...camposAria("cli-email", errors.email?.message)}
          {...register("email")}
          type="email"
          placeholder="maria@email.com"
          disabled={pendente}
        />
      </FormField>

      <FormField
        id="cli-observacoes"
        rotulo="Observações"
        erro={errors.observacoes?.message}
        descricao="Alergias, preferências, o que combinaram na última vez."
      >
        <Textarea
          {...camposAria(
            "cli-observacoes",
            errors.observacoes?.message,
            "Alergias, preferências, o que combinaram na última vez.",
          )}
          {...register("observacoes")}
          rows={3}
          placeholder="Alérgica a acetona. Prefere atendimento pela manhã."
          disabled={pendente}
        />
      </FormField>

      <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
        <div className="space-y-0.5">
          <p className="text-sm font-medium">Cliente ativo</p>
          <p className="text-xs text-muted-foreground">
            Clientes arquivados somem das listas, mas mantêm o histórico.
          </p>
        </div>
        <Switch
          checked={Boolean(ativo)}
          onCheckedChange={(valor) => setValue("ativo", valor, { shouldDirty: true })}
          disabled={pendente}
          aria-label="Cliente ativo"
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

export function ClienteDialog({ aberto, onAbertoChange, cliente }: ClienteDialogProps) {
  return (
    <Dialog open={aberto} onOpenChange={onAbertoChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{cliente ? "Editar cliente" : "Novo cliente"}</DialogTitle>
          <DialogDescription>
            Só o nome é obrigatório. O resto pode ser preenchido depois, conforme você
            conhece a pessoa.
          </DialogDescription>
        </DialogHeader>

        <FormularioCliente
          key={cliente?.id ?? "novo"}
          cliente={cliente}
          onConcluir={() => onAbertoChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
