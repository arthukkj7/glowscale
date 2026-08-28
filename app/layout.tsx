import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";

import { ProvedorTema } from "@/components/layout/provedor-tema";
import { Toaster } from "@/components/ui/sonner";
import { APP_DESCRIPTION, APP_NAME } from "@/lib/constants";

import "./globals.css";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: `${APP_NAME} - Gestão para negócios de beleza`,
    template: `%s | ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: APP_NAME,
    title: `${APP_NAME} - Gestão para negócios de beleza`,
    description: APP_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: `${APP_NAME} - Gestão para negócios de beleza`,
    description: APP_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  // Acompanha o tema do sistema: a barra do navegador combina com o fundo da
  // pagina em vez de destoar dela.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fffdfb" },
    { media: "(prefers-color-scheme: dark)", color: "#1e191f" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // O idioma vem do cookie, resolvido em lib/i18n/request.ts. Precisa chegar
  // ao <html lang> tambem: e ele que diz ao leitor de tela em que idioma
  // pronunciar a pagina, e ao navegador o que oferecer para traduzir.
  const locale = await getLocale();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="min-h-dvh antialiased">
        <a
          href="#conteudo"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
        >
          Pular para o conteúdo
        </a>
        {/* Sem o provider, todo componente de cliente que chama
            useTranslations quebra a pagina inteira. */}
        <ProvedorTema>
          <NextIntlClientProvider>{children}</NextIntlClientProvider>
          <Toaster />
        </ProvedorTema>
      </body>
    </html>
  );
}
