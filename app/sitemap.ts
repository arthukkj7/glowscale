import type { MetadataRoute } from "next";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export default function sitemap(): MetadataRoute.Sitemap {
  const agora = new Date();
  return [
    { url: appUrl, lastModified: agora, changeFrequency: "monthly", priority: 1 },
    { url: `${appUrl}/cadastro`, lastModified: agora, changeFrequency: "monthly", priority: 0.8 },
    // Paginas legais entram no sitemap de proposito: buscador e plataforma de
    // anuncio procuram por elas antes de aprovar um site que cobra.
    { url: `${appUrl}/privacidade`, lastModified: agora, changeFrequency: "yearly", priority: 0.3 },
    { url: `${appUrl}/termos`, lastModified: agora, changeFrequency: "yearly", priority: 0.3 },
  ];
}
