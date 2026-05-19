-- ============================================================================
-- 08-seed.sql: storage buckets + campeonatos pre-cadastrados
-- Idempotente: INSERT ... ON CONFLICT DO NOTHING.
-- ============================================================================

-- ---- Storage buckets (todos publicos) ----
INSERT INTO storage.buckets (id, name, public) VALUES
  ('avatars', 'avatars', true),
  ('banner-capas', 'banner-capas', true),
  ('bares', 'bares', true),
  ('bolao-capas', 'bolao-capas', true),
  ('iconesapp', 'iconesapp', true),
  ('iconesCampeonatos', 'iconesCampeonatos', true),
  ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

-- ---- Campeonatos disponiveis (9 competicoes) ----
INSERT INTO public.campeonatos (id, api_football_id, nome, nome_popular, temporada, logo_url, pais, tipo, ativo, visivel) VALUES
  ('f24285a8-931f-484d-b0f4-fff682a64cab', 2013, 'Campeonato Brasileiro Série A', 'Brasileiro', 2026, 'https://crests.football-data.org/BSA.png', 'Brazil', 'nacional', true, true),
  ('2651787c-7929-4574-86e6-a07d6dee9bec', 99002, 'Campeonato Mineiro Módulo I', 'Mineiro 2026', 2026, 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/Campeonato_Mineiro_logo.svg/200px-Campeonato_Mineiro_logo.svg.png', 'Brazil', 'estadual', true, false),
  ('0ba245ae-3df0-470e-9814-1ee00791960e', 99001, 'Campeonato Paulista Série A1', 'Paulistão 2026', 2026, 'https://upload.wikimedia.org/wikipedia/pt/8/83/Campeonato_Paulista_de_Futebol_logo.png', 'Brazil', 'estadual', true, false),
  ('7d5a3269-36e3-4e0d-8c9b-7936e5c5ea54', 99003, 'Copa do Brasil', 'Copa do Brasil 2026', 2026, NULL, 'Brazil', 'nacional', true, true),
  ('3366d51c-d1ee-4758-8294-d4190e4f4966', 2000, 'Copa do Mundo 2026', 'Copa do Mundo', 2026, 'https://crests.football-data.org/FIFA.png', 'World', 'mundial', true, true),
  ('569443c6-8c97-42ad-9ab4-60c578b903dd', 2152, 'Copa Libertadores', 'Libertadores', 2026, NULL, NULL, 'continental', true, true),
  ('480ae76a-15e3-4b52-92c6-e2e0620bf208', 99926, 'Finais Estaduais 2026', 'Finais Estaduais 2026', 2026, NULL, 'Brasil', 'estadual', true, false),
  ('40458868-23d4-4790-b02c-733958cdd6a7', 99999, 'Final Copa 2026', 'Final Copa 2026', 2026, 'https://crests.football-data.org/FIFA.png', NULL, 'copa', true, false),
  ('7471a5fe-e779-4bae-aca4-416ae04f302d', 2001, 'UEFA Champions League', 'Champions League', 2025, NULL, 'Europe', 'continental', true, true)
ON CONFLICT (id) DO NOTHING;
