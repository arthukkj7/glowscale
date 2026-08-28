"use client";

import * as React from "react";

import { Input } from "@/components/ui/input";

type DatePickerProps = Omit<React.ComponentProps<"input">, "type">;

/**
 * Seletor de data. Usa o controle nativo do browser: e acessivel por teclado,
 * tem comportamento correto em mobile e nao carrega dependencia extra.
 * O valor circula sempre como "yyyy-MM-dd", sem conversao de fuso.
 */
export function DatePicker(props: DatePickerProps) {
  return <Input type="date" className="[&::-webkit-calendar-picker-indicator]:opacity-60" {...props} />;
}

/** Mesma ideia para horarios, no formato "HH:MM". */
export function TimePicker(props: Omit<React.ComponentProps<"input">, "type">) {
  return <Input type="time" step={300} {...props} />;
}
