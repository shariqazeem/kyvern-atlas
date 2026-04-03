import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/pulse/dashboard/keys", "/pulse/dashboard/billing"],
      },
    ],
    sitemap: "https://kyvernlabs.com/sitemap.xml",
  };
}
