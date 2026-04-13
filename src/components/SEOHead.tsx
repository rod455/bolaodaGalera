import { Helmet } from "react-helmet-async";

interface SEOHeadProps {
  title?: string;
  description?: string;
  path?: string;
  image?: string;
  noindex?: boolean;
  keywords?: string;
}

const DEFAULTS = {
  siteName: "Bolão na Copa",
  baseUrl: "https://www.bolaonacopa.com.br",
  defaultTitle: "Bolão na Copa — Bolão de Futebol Grátis | Temporada 2026 e mais",
  defaultDescription:
    "Bolão na Copa: crie bolões de futebol grátis e dispute com amigos! Palpites em campeonatos nacionais e internacionais, Champions League e mais. Cadastre-se em 10 segundos.",
  defaultImage:
    "https://hvgsdxcdufekksxgqyoj.supabase.co/storage/v1/object/public/bolao-capas/og-cover.png",
  defaultKeywords:
    "bolão na copa, bolão de futebol, bolão grátis, palpites futebol, bolão copa 2026, bolão campeonato, bolão entre amigos",
};

const SEOHead = ({
  title,
  description = DEFAULTS.defaultDescription,
  path = "/",
  image = DEFAULTS.defaultImage,
  noindex = false,
  keywords,
}: SEOHeadProps) => {
  // Padrão: "Bolão na Copa — {título da página}" para que o nome do site
  // apareça primeiro nas buscas do Google
  const fullTitle = title ? `Bolão na Copa — ${title}` : DEFAULTS.defaultTitle;
  const fullUrl = `${DEFAULTS.baseUrl}${path}`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={fullUrl} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}
      {keywords && <meta name="keywords" content={keywords} />}

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
