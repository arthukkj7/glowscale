import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const comIntl = createNextIntlPlugin("./lib/i18n/request.ts");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // O Next gera AGENTS.md e CLAUDE.md a cada `next dev`. Sao arquivos de
  // ferramenta, nao do produto: deixa-los nascer suja o diff de quem so rodou
  // o servidor local.
  agentRules: false,
  poweredByHeader: false,
  typedRoutes: false,
  experimental: {
    typedEnv: false,
  },
};

export default comIntl(nextConfig);
