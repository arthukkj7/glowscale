import type { MetadataRoute } from "next";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export default function sitemap(): MetadataRoute.Sitemap {
  const agora = new Date();
  return [
    { url: appUrl, lastModified: agora, changeFrequency: "monthly", priority: 1 },
    { url: `${appUrl}/cadastro`, lastModified: agora, changeFrequency: "monthly", priority: 0.8 },
  ];
}
