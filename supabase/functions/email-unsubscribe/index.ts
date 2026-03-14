import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

const MOTIVOS = [
  "Recebo emails demais",
  "Os emails não são relevantes para mim",
  "Não lembro de ter me cadastrado",
  "Prefiro acompanhar só pelo app",
  "Outro motivo",
];

const SUPABASE_URL = "https://hvgsdxcdufekksxgqyoj.supabase.co";

type Etapa = "carregando" | "invalido" | "ja_descadastrado" | "motivo" | "sucesso" | "erro";

export default function Unsubscribe() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const [etapa, setEtapa] = useState<Etapa>("carregando");
  const [motivoSelecionado, setMotivoSelecionado] = useState("");
  const [motivoOutro, setMotivoOutro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erroForm, setErroForm] = useState("");

  useEffect(() => {
    if (!token) { setEtapa("invalido"); return; }

    fetch(`${SUPABASE_URL}/functions/v1/email-unsubscribe?token=${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setEtapa("invalido");
        else if (data.already_opted_out) setEtapa("ja_descadastrado");
        else setEtapa("motivo");
      })
      .catch(() => setEtapa("invalido"));
  }, [token]);

  async function handleSubmit() {
    if (!motivoSelecionado) { setErroForm("Selecione um motivo antes de continuar."); return; }
    setErroForm("");
    setEnviando(true);

    const motivoFinal =
      motivoSelecionado === "Outro motivo" && motivoOutro.trim()
        ? `Outro: ${motivoOutro.trim()}`
        : motivoSelecionado;

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/email-unsubscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, motivo: motivoFinal }),
      });
      const data = await res.json();
      if (data.success) setEtapa("sucesso");
      else setEtapa("erro");
    } catch {
      setEtapa("erro");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <img
            src="https://hvgsdxcdufekksxgqyoj.supabase.co/storage/v1/object/public/iconesapp/604913%20(512%20x%20512%20px).png"
            alt="Bolão na Copa"
            className="w-14 h-14"
          />
        </div>

        {/* Carregando */}
        {etapa === "carregando" && (
          <div className="text-center text-gray-500">Verificando...</div>
        )}

        {/* Token inválido */}
        {etapa === "invalido" && (
          <div className="text-center">
            <div className="text-5xl mb-4">❌</div>
            <h1 className="text-xl font-bold text-gray-800 mb-2">Link inválido</h1>
            <p className="text-gray-500 text-sm mb-6">Não encontramos sua conta. O link pode ter expirado.</p>
            <a href="https://bolaonacopa.com.br" className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold text-sm hover:bg-green-700">
              Voltar ao app
            </a>
          </div>
        )}

        {/* Já descadastrado */}
        {etapa === "ja_descadastrado" && (
          <div className="text-center">
            <div className="text-5xl mb-4">✅</div>
            <h1 className="text-xl font-bold text-gray-800 mb-2">Já descadastrado</h1>
            <p className="text-gray-500 text-sm mb-6">Você já havia solicitado o descadastro. Não enviaremos mais emails de engajamento.</p>
            <a href="https://bolaonacopa.com.br" className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold text-sm hover:bg-green-700">
              Voltar ao app
            </a>
          </div>
        )}

        {/* Seleção de motivo */}
        {etapa === "motivo" && (
          <>
            <h1 className="text-xl font-bold text-gray-800 text-center mb-1">Sentimos sua falta 😔</h1>
            <p className="text-sm text-gray-500 text-center mb-6">
              Antes de sair, pode nos dizer o motivo?<br />Sua opinião nos ajuda a melhorar.
            </p>

            {erroForm && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg mb-4 text-center">
                {erroForm}
              </div>
            )}

            <div className="flex flex-col gap-2 mb-4">
              {MOTIVOS.map((m) => (
                <button
                  key={m}
                  onClick={() => setMotivoSelecionado(m)}
                  className={`flex items-center gap-3 px-4 py-3 border-2 rounded-xl text-sm text-left transition-all ${
                    motivoSelecionado === m
                      ? "border-green-600 bg-green-50 text-green-700 font-semibold"
                      : "border-gray-200 text-gray-700 hover:border-green-400 hover:bg-green-50"
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                    motivoSelecionado === m ? "border-green-600 bg-green-600" : "border-gray-300"
                  }`}>
                    {motivoSelecionado === m && (
                      <span className="w-2 h-2 rounded-full bg-white block" />
                    )}
                  </span>
                  {m}
                </button>
              ))}
            </div>

            {motivoSelecionado === "Outro motivo" && (
              <textarea
                value={motivoOutro}
                onChange={(e) => setMotivoOutro(e.target.value)}
                placeholder="Conte o que aconteceu..."
                className="w-full border-2 border-gray-200 rounded-xl p-3 text-sm text-gray-700 resize-none min-h-20 mb-4 focus:outline-none focus:border-green-600"
              />
            )}

            <button
              onClick={handleSubmit}
              disabled={enviando}
              className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white font-semibold py-3 rounded-xl text-sm transition-colors"
            >
              {enviando ? "Processando..." : "Confirmar descadastro"}
            </button>
          </>
        )}

        {/* Sucesso */}
        {etapa === "sucesso" && (
          <div className="text-center">
            <div className="text-5xl mb-4">✅</div>
            <h1 className="text-xl font-bold text-gray-800 mb-2">Descadastro realizado</h1>
            <p className="text-gray-500 text-sm mb-6">
              Você não receberá mais emails de engajamento do Bolão na Copa. Sua conta continua ativa normalmente.
            </p>
            <a href="https://bolaonacopa.com.br" className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold text-sm hover:bg-green-700">
              Voltar ao app
            </a>
          </div>
        )}

        {/* Erro */}
        {etapa === "erro" && (
          <div className="text-center">
            <div className="text-5xl mb-4">❌</div>
            <h1 className="text-xl font-bold text-gray-800 mb-2">Algo deu errado</h1>
            <p className="text-gray-500 text-sm mb-6">Ocorreu um erro ao processar sua solicitação. Tente novamente.</p>
            <button
              onClick={() => setEtapa("motivo")}
              className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold text-sm hover:bg-green-700"
            >
              Tentar novamente
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
