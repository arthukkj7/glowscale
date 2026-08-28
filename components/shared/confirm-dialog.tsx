"use client";

import * as React from "react";
import { Loader2Icon } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ConfirmDialogProps {
  aberto: boolean;
  onAbertoChange: (aberto: boolean) => void;
  titulo: string;
  descricao: string;
  textoConfirmar?: string;
  textoCancelar?: string;
  destrutivo?: boolean;
  onConfirmar: () => void | Promise<void>;
}

/** Confirmacao obrigatoria para qualquer operacao destrutiva. */
export function ConfirmDialog({
  aberto,
  onAbertoChange,
  titulo,
  descricao,
  textoConfirmar = "Confirmar",
  textoCancelar = "Cancelar",
  destrutivo = false,
  onConfirmar,
}: ConfirmDialogProps) {
  const [processando, setProcessando] = React.useState(false);

  async function confirmar(evento: React.MouseEvent) {
    evento.preventDefault();
    setProcessando(true);
    try {
      await onConfirmar();
      onAbertoChange(false);
    } finally {
      setProcessando(false);
    }
  }

  return (
    <AlertDialog open={aberto} onOpenChange={onAbertoChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{titulo}</AlertDialogTitle>
          <AlertDialogDescription>{descricao}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={processando}>{textoCancelar}</AlertDialogCancel>
          <AlertDialogAction
            onClick={confirmar}
            disabled={processando}
            className={cn(destrutivo && buttonVariants({ variant: "destructive" }))}
          >
            {processando ? <Loader2Icon className="size-4 animate-spin" /> : null}
            {textoConfirmar}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
