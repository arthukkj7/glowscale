"use client";

import { MessageCircleIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { linkDoWhatsApp } from "@/lib/whatsapp/telefone";
import { cn } from "@/lib/utils";

interface BotaoWhatsAppProps {
  telefone: string | null | undefined;
  mensagem: string;
  rotulo?: string;
  className?: string;
  variante?: "botao" | "item";
}

/**
 * Abre o WhatsApp com a mensagem ja escrita.
 *
 * O texto vai como rascunho: quem envia le e edita antes. Nao existe envio
 * automatico aqui de proposito - uma mensagem disparada pelo sistema no nome
 * da profissional, sem ela ver, e o tipo de coisa que queima a relacao com a
 * cliente e nao tem desfazer.
 *
 * Some quando nao ha telefone: um botao que abre uma conversa vazia parece
 * defeito, e a pessoa so descobre depois de clicar.
 */
export function BotaoWhatsApp({
  telefone,
  mensagem,
  rotulo = "Enviar pelo WhatsApp",
  className,
  variante = "botao",
}: BotaoWhatsAppProps) {
  const link = linkDoWhatsApp(telefone, mensagem);
  if (!link) return null;

  if (variante === "item") {
    return (
      <DropdownMenuItem asChild>
        <a href={link} target="_blank" rel="noopener noreferrer">
          <MessageCircleIcon aria-hidden="true" />
          {rotulo}
        </a>
      </DropdownMenuItem>
    );
  }

  return (
    <Button variant="outline" size="sm" className={cn(className)} asChild>
      <a href={link} target="_blank" rel="noopener noreferrer">
        <MessageCircleIcon className="size-4" aria-hidden="true" />
        {rotulo}
      </a>
    </Button>
  );
}
