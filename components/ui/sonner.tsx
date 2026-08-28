"use client";

import { Toaster as SonnerToaster } from "sonner";

/** Toaster global. Estilizado com os tokens do tema. */
export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      closeButton
      toastOptions={{
        classNames: {
          toast:
            "group rounded-lg border border-border bg-card text-card-foreground shadow-md text-sm",
          description: "text-muted-foreground",
          actionButton: "bg-primary text-primary-foreground",
          cancelButton: "bg-muted text-muted-foreground",
        },
      }}
    />
  );
}
