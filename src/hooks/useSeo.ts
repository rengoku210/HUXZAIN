import { useEffect } from "react";
import { getPageSeo } from "@/lib/seo.functions";

export function useSeo(path: string, fallbackTitle?: string, fallbackDescription?: string) {
  useEffect(() => {
    let active = true;

    async function loadSeo() {
      try {
        const res = await getPageSeo({ data: { path } });
        if (!active) return;

        let title = fallbackTitle || "HUXZAIN — Digital Marketplace";
        let description = fallbackDescription || "Verified digital products & escrow services.";
        let keywords = "";
        let ogImageUrl = "";
        let schemaJson: any = null;

        if (res.success && res.seo) {
          title = res.seo.title || title;
          description = res.seo.description || description;
          keywords = res.seo.keywords || "";
          ogImageUrl = res.seo.og_image_url || "";
          schemaJson = res.seo.schema_json;
        }

        // 1. Title
        document.title = title;

        // 2. Meta description
        let descMeta = document.querySelector('meta[name="description"]');
        if (!descMeta) {
          descMeta = document.createElement("meta");
          descMeta.setAttribute("name", "description");
          document.head.appendChild(descMeta);
        }
        descMeta.setAttribute("content", description);

        // 3. Meta keywords
        if (keywords) {
          let kwMeta = document.querySelector('meta[name="keywords"]');
          if (!kwMeta) {
            kwMeta = document.createElement("meta");
            kwMeta.setAttribute("name", "keywords");
            document.head.appendChild(kwMeta);
          }
          kwMeta.setAttribute("content", keywords);
        }

        // 4. OG tags
        let ogTitle = document.querySelector('meta[property="og:title"]');
        if (!ogTitle) {
          ogTitle = document.createElement("meta");
          ogTitle.setAttribute("property", "og:title");
          document.head.appendChild(ogTitle);
        }
        ogTitle.setAttribute("content", title);

        let ogDesc = document.querySelector('meta[property="og:description"]');
        if (!ogDesc) {
          ogDesc = document.createElement("meta");
          ogDesc.setAttribute("property", "og:description");
          document.head.appendChild(ogDesc);
        }
        ogDesc.setAttribute("content", description);

        if (ogImageUrl) {
          let ogImg = document.querySelector('meta[property="og:image"]');
          if (!ogImg) {
            ogImg = document.createElement("meta");
            ogImg.setAttribute("property", "og:image");
            document.head.appendChild(ogImg);
          }
          ogImg.setAttribute("content", ogImageUrl);
        }

        // 5. Canonical Link
        let canonicalLink = document.querySelector('link[rel="canonical"]');
        if (!canonicalLink) {
          canonicalLink = document.createElement("link");
          canonicalLink.setAttribute("rel", "canonical");
          document.head.appendChild(canonicalLink);
        }
        canonicalLink.setAttribute("href", window.location.href);

        // 6. Schema JSON-LD
        const existingSchema = document.getElementById("seo-schema-jsonld");
        if (existingSchema) {
          existingSchema.remove();
        }

        if (schemaJson) {
          const script = document.createElement("script");
          script.id = "seo-schema-jsonld";
          script.type = "application/ld+json";
          script.text = JSON.stringify(schemaJson);
          document.head.appendChild(script);
        }
      } catch (err) {
        console.warn("[useSeo] Error loading page metadata:", err);
      }
    }

    loadSeo();

    return () => {
      active = false;
    };
  }, [path, fallbackTitle, fallbackDescription]);
}
