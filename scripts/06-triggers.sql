-- ============================================================================
-- 06-triggers.sql: triggers no schema public + um trigger em auth.users
-- Idempotente: DROP IF EXISTS + CREATE.
-- ============================================================================

-- Trigger no schema auth (cria profile quando user novo eh criado).
-- Sem isso, signup quebra: usuario eh criado em auth.users mas profile fica vazio.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Cortesia automatica em bolao_participantes para criadores com plano copa_sem_ads.
DROP TRIGGER IF EXISTS trg_cortesia_copa_sem_ads ON public.bolao_participantes;
CREATE TRIGGER trg_cortesia_copa_sem_ads
  AFTER INSERT ON public.bolao_participantes
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_cortesia_copa_sem_ads();

-- updated_at automatico em daily_metrics.
DROP TRIGGER IF EXISTS trigger_daily_metrics_updated ON public.daily_metrics;
CREATE TRIGGER trigger_daily_metrics_updated
  BEFORE UPDATE ON public.daily_metrics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Recalcular pontos quando jogo eh encerrado ou placar muda ao vivo (bar).
DROP TRIGGER IF EXISTS on_jogo_encerrado ON public.jogos;
CREATE TRIGGER on_jogo_encerrado
  AFTER UPDATE ON public.jogos
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_calcular_pontos();

-- Gerar referral_code automaticamente quando profile eh criado.
DROP TRIGGER IF EXISTS trg_gerar_referral_code ON public.profiles;
CREATE TRIGGER trg_gerar_referral_code
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  WHEN (new.referral_code IS NULL)
  EXECUTE FUNCTION public.gerar_referral_code();
