import { describe, expect, it } from "vitest";

import {
  atendimentoSchema,
  cadastroSchema,
  escalaSchema,
  procedimentoSchema,
  profissionalSchema,
} from "@/lib/validations";

const UUID_A = "22222222-2222-4222-8222-000000000001";
const UUID_B = "33333333-3333-4333-8333-000000000001";

describe("profissionalSchema", () => {
  it("aceita comissão dentro do intervalo", () => {
    const resultado = profissionalSchema.safeParse({
      nome: "Ana Beatriz",
      email: "",
      telefone: "",
      especialidade: "Facial",
      percentual_comissao: "40",
      ativo: true,
    });
    expect(resultado.success).toBe(true);
    if (resultado.success) {
      expect(resultado.data.percentual_comissao).toBe(40);
      expect(resultado.data.email).toBeNull();
    }
  });

  it("recusa comissão acima de 100", () => {
    const resultado = profissionalSchema.safeParse({
      nome: "Ana",
      percentual_comissao: "120",
    });
    expect(resultado.success).toBe(false);
  });

  it("exige nome", () => {
    expect(profissionalSchema.safeParse({ nome: "", percentual_comissao: "10" }).success).toBe(
      false,
    );
  });

  it("recusa e-mail inválido quando preenchido", () => {
    const resultado = profissionalSchema.safeParse({
      nome: "Ana",
      email: "nao-e-email",
      percentual_comissao: "10",
    });
    expect(resultado.success).toBe(false);
  });
});

describe("procedimentoSchema", () => {
  it("interpreta valor no formato brasileiro", () => {
    const resultado = procedimentoSchema.safeParse({
      nome: "Limpeza de pele",
      valor: "1.200,50",
      duracao_minutos: 60,
    });
    expect(resultado.success).toBe(true);
    if (resultado.success) expect(resultado.data.valor).toBe(1200.5);
  });

  it("recusa duração fora do intervalo", () => {
    expect(
      procedimentoSchema.safeParse({ nome: "X procedimento", valor: "10", duracao_minutos: 0 })
        .success,
    ).toBe(false);
  });
});

describe("atendimentoSchema", () => {
  it("aceita um lançamento válido", () => {
    const resultado = atendimentoSchema.safeParse({
      profissional_id: UUID_A,
      procedimento_id: UUID_B,
      data_atendimento: "2026-03-14",
      quantidade: 2,
      valor_unitario: "200,00",
      status: "realizado",
      observacoes: "",
    });
    expect(resultado.success).toBe(true);
    if (resultado.success) {
      expect(resultado.data.valor_unitario).toBe(200);
      expect(resultado.data.quantidade).toBe(2);
    }
  });

  it("não aceita percentual de comissão vindo do formulario", () => {
    const resultado = atendimentoSchema.safeParse({
      profissional_id: UUID_A,
      procedimento_id: UUID_B,
      data_atendimento: "2026-03-14",
      quantidade: 1,
      valor_unitario: "200",
      comissao_percentual: 0,
    });
    expect(resultado.success).toBe(true);
    if (resultado.success) {
      expect("comissao_percentual" in resultado.data).toBe(false);
    }
  });

  it("recusa quantidade zero", () => {
    const resultado = atendimentoSchema.safeParse({
      profissional_id: UUID_A,
      procedimento_id: UUID_B,
      data_atendimento: "2026-03-14",
      quantidade: 0,
      valor_unitario: "200",
    });
    expect(resultado.success).toBe(false);
  });

  it("recusa id que não e uuid", () => {
    const resultado = atendimentoSchema.safeParse({
      profissional_id: "1 OR 1=1",
      procedimento_id: UUID_B,
      data_atendimento: "2026-03-14",
      quantidade: 1,
      valor_unitario: "200",
    });
    expect(resultado.success).toBe(false);
  });
});

describe("escalaSchema", () => {
  it("aceita turno com início antes do fim", () => {
    const resultado = escalaSchema.safeParse({
      profissional_id: UUID_A,
      data: "2026-03-14",
      hora_inicio: "08:00",
      hora_fim: "18:00",
    });
    expect(resultado.success).toBe(true);
  });

  it("recusa turno com fim antes do início", () => {
    const resultado = escalaSchema.safeParse({
      profissional_id: UUID_A,
      data: "2026-03-14",
      hora_inicio: "18:00",
      hora_fim: "08:00",
    });
    expect(resultado.success).toBe(false);
  });
});

describe("cadastroSchema", () => {
  const base = {
    nome: "Maria Silva",
    email: "maria@clinica.com.br",
    senha: "senha1234",
    confirmarSenha: "senha1234",
    clinicaNome: "Studio Bella",
  };

  it("aceita um cadastro completo", () => {
    expect(cadastroSchema.safeParse(base).success).toBe(true);
  });

  it("recusa senhas diferentes", () => {
    expect(cadastroSchema.safeParse({ ...base, confirmarSenha: "outra1234" }).success).toBe(false);
  });

  it("recusa senha fraca", () => {
    expect(cadastroSchema.safeParse({ ...base, senha: "abc", confirmarSenha: "abc" }).success).toBe(
      false,
    );
  });

  it("recusa senha sem número", () => {
    expect(
      cadastroSchema.safeParse({ ...base, senha: "senhasenha", confirmarSenha: "senhasenha" })
        .success,
    ).toBe(false);
  });
});
