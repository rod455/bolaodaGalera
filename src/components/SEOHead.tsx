import { Helmet } from "react-helmet-async";

interface SEOHeadProps {
  title?: string;
  description?: string;
  path?: string;
  image?: string;
  noindex?: boolean;
}

const DEFAULTS = {
  siteName: "Bolão na Copa",
  baseUrl: "https://www.bolaonacopa.com.br",
  defaultTitle: "Bolão na Copa — Palpites de Futebol Grátis | Paulistão, Brasileirão e mais",
  defaultDescription:
    "Crie e participe de bolões de futebol grátis! Dispute com amigos no Paulistão 2026, Brasileirão, Copa do Brasil e mais. Prêmios em dinheiro.",
  defaultImage:
    "https://hvgsdxcdufekksxgqyoj.supabase.co/storage/v1/object/public/bolao-capas/og-cover.png",
};

const SEOHead = ({
  title,
  description = DEFAULTS.defaultDescription,
  path = "/",
  image = DEFAULTS.defaultImage,
  noindex = false,
}: SEOHeadProps) => {
  const fullTitle = title ? `${title} — ${DEFAULTS.siteName}` : DEFAULTS.defaultTitle;
  const fullUrl = `${DEFAULTS.baseUrl}${path}`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={fullUrl} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}

      {/* Open Graph */}
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={DEFAULTS.siteName} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:locale" content="pt_BR" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
    </Helmet>
  );
};

export default SEOHead;
