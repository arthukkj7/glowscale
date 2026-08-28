import type { Metadata } from "next";

import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { requireActiveSubscription } from "@/lib/auth/session";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * Shell do painel. Todo o gate acontece aqui, no servidor:
 * sessao valida + clinica existente + assinatura em status que libera o uso.
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { clinica, usuario, email } = await requireActiveSubscription();

  return (
    <div className="flex min-h-dvh">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header clinica={clinica} usuario={usuario} email={email} />
        <main id="conteudo" className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl space-y-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
