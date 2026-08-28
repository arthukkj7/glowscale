"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ExternalLinkIcon, Loader2Icon, RefreshCwIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { FormField, camposAria } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { iniciarAssinatura, sincronizarAssinatura } from "@/lib/actions/assinatura";
import { checkoutSchema, type CheckoutFormValues, type CheckoutInput } from "@/lib/validations";

interface CheckoutFormProps {
  documentoAtual: string | null;
  telefoneAtual: string | null;
  urlPagamentoAtual: string | null;
  assinaturaIniciada: boolean;
  integracaoDisponivel: boolean;
}

export function CheckoutForm({
  documentoAtual,
  telefoneAtual,
  urlPagamentoAtual,
  assinaturaIniciada,
  integracaoDisponivel,
}: CheckoutFormProps) {
  const router = useRouter();
  const [pendente, startTransition] = useTransition();
  const [sincronizando, startSincronizacao] = useTransition();
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [urlPagamento, setUrlPagamento] = useState<string | null>(urlPagamentoAtual);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<CheckoutFormValues, unknown, CheckoutInput>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      documento: documentoAtual ?? "",
      telefone: telefoneAtual ?? "",
      formaPagamento: "PIX",
    },
  });

  function aoEnviar(valores: CheckoutInput) {
    setErroGeral(null);
    startTransition(async () => {
      const resultado = await iniciarAssinatura(valores);
      if (!resultado.ok) {
        setErroGeral(resultado.erro);
        return;
      }
      setUrlPagamento(resultado.data.urlPagamento);
      toast.success(resultado.mensagem ?? "Assinatura criada.");
      router.refresh();
    });
  }

  function aoSincronizar() {
    startSincronizacao(async () => {
      const resultado = await sincronizarAssinatura();
      if (!resultado.ok) {
        toast.error(resultado.erro);
        return;
      }
      toast.success(resultado.mensagem ?? "Situacao atualizada.");
      router.refresh();
    });
  }

  if (!integracaoDisponivel) {
    return (
      <div className="rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm">
        <p className="font-medium">Cobranca ainda nao configurada nesta instalacao.</p>
        <p className="mt-1 text-muted-foreground">
          Configure <code className="font-mono text-xs">ASAAS_API_KEY</code>,{" "}
          <code className="font-mono text-xs">ASAAS_WEBHOOK_TOKEN</code> e{" "}
          <code className="font-mono text-xs">SUPABASE_SERVICE_ROLE_KEY</code> no servidor
          para habilitar o checkout. O restante do sistema continua funcionando durante o
          periodo de teste.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {urlPagamento ? (
        <div className="space-y-3 rounded-lg border border-success/40 bg-success/10 p-4">
          <p className="text-sm font-medium">Sua cobranca esta pronta.</p>
          <p className="text-sm text-muted-foreground">
            Conclua o pagamento na pagina segura do Asaas. Assim que o pagamento for
            confirmado, o acesso e liberado automaticamente.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <a href={urlPagamento} target="_blank" rel="noopener noreferrer">
                Abrir fatura
                <ExternalLinkIcon className="size-4" aria-hidden="true" />
              </a>
            </Button>
            <Button variant="outline" onClick={aoSincronizar} disabled={sincronizando}>
              {sincronizando ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <RefreshCwIcon className="size-4" aria-hidden="true" />
              )}
              Ja paguei, atualizar
            </Button>
          </div>
        </div>
      ) : null}

      {!assinaturaIniciada ? (
        <form onSubmit={handleSubmit(aoEnviar)} className="space-y-5" noValidate>
          <FormField
            id="checkout-documento"
            rotulo="CPF ou CNPJ"
            erro={errors.documento?.message}
            descricao="Necessario para emitir a cobranca."
            obrigatorio
          >
            <Input
              {...camposAria("checkout-documento", errors.documento?.message, "Necessario para emitir a cobranca.")}
              {...register("documento")}
              inputMode="numeric"
              placeholder="000.000.000-00"
              disabled={pendente}
            />
          </FormField>

          <FormField id="checkout-telefone" rotulo="Telefone" erro={errors.telefone?.message}>
            <Input
              {...camposAria("checkout-telefone", errors.telefone?.message)}
              {...register("telefone")}
              type="tel"
              placeholder="(11) 90000-0000"
              disabled={pendente}
            />
          </FormField>

          <FormField
            id="checkout-forma"
            rotulo="Forma de pagamento"
            erro={errors.formaPagamento?.message}
          >
            <Controller
              control={control}
              name="formaPagamento"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={pendente}>
                  <SelectTrigger {...camposAria("checkout-forma", errors.formaPagamento?.message)}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PIX">PIX</SelectItem>
                    <SelectItem value="CREDIT_CARD">Cartao de credito</SelectItem>
                    <SelectItem value="BOLETO">Boleto</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>

          {erroGeral ? (
            <p
              role="alert"
              className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {erroGeral}
            </p>
          ) : null}

          <Button type="submit" size="lg" className="w-full" disabled={pendente}>
            {pendente ? <Loader2Icon className="size-4 animate-spin" /> : null}
            Assinar agora
          </Button>
        </form>
      ) : (
        <Button variant="outline" onClick={aoSincronizar} disabled={sincronizando}>
          {sincronizando ? (
            <Loader2Icon className="size-4 animate-spin" />
          ) : (
            <RefreshCwIcon className="size-4" aria-hidden="true" />
          )}
          Atualizar situacao da assinatura
        </Button>
      )}
    </div>
  );
}
