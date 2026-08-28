#!/usr/bin/env bash
#
# Procura credenciais reais no bundle que vai para o navegador.
#
#   npm run auditar:segredos     (roda depois de um build)
#
# Procura FORMATOS de credencial, nao nomes de variavel: a interface cita
# nomes como STRIPE_SECRET_KEY em texto, para dizer a quem instala o que
# preencher, e isso nao e vazamento. O que nao pode aparecer e um valor.
#
# Vale como rede de seguranca, nao como prova: a garantia real vem do import
# de "server-only" nos modulos de credencial, que quebra o build se algum
# deles for arrastado para um componente de cliente.

set -uo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ALVO="$RAIZ/.next/static"

if [ ! -d "$ALVO" ]; then
  echo "Nada a auditar: rode 'npm run build' antes." >&2
  exit 1
fi

# Formato -> de quem e
PADROES=(
  'sk_live_[A-Za-z0-9]{8}|chave secreta de producao do Stripe'
  'sk_test_[A-Za-z0-9]{8}|chave secreta de teste do Stripe'
  'rk_live_[A-Za-z0-9]{8}|chave restrita de producao do Stripe'
  'whsec_[A-Za-z0-9]{16}|segredo de webhook do Stripe'
  '\$aact_[A-Za-z0-9]{8}|API key do Asaas'
  'eyJhbGciOi[A-Za-z0-9_-]{10}|JWT (possivel service role do Supabase)'
  'sb_secret_[A-Za-z0-9]{8}|chave secreta do Supabase'
)

encontrados=0
for entrada in "${PADROES[@]}"; do
  padrao="${entrada%%|*}"
  descricao="${entrada##*|}"
  arquivos=$(grep -rlE "$padrao" "$ALVO" 2>/dev/null || true)
  if [ -n "$arquivos" ]; then
    echo "  [VAZOU]  $descricao"
    echo "$arquivos" | sed 's|^|             |'
    encontrados=$((encontrados + 1))
  else
    echo "  [ok]     nenhum(a) $descricao no bundle"
  fi
done

echo ""
if [ $encontrados -gt 0 ]; then
  echo "$encontrados tipo(s) de credencial no bundle do navegador. NAO PUBLIQUE."
  exit 1
fi
echo "Bundle limpo: nenhuma credencial encontrada."
