(() => {
  "use strict";

  const form = document.getElementById("form-lab-conhecimento");
  const historico = document.getElementById("lab-historico");
  const mensagem = document.getElementById("lab-mensagem");
  const botao = document.getElementById("lab-enviar");

  if (!form || !historico || !mensagem) return;

  function apiBase() {
    return String(
      appData?.config?.apiBase ||
      "https://api.gustavopaulasantos.com.br"
    ).replace(/\/+$/, "");
  }

  function token() {
    return typeof tokenDoCofre === "function"
      ? tokenDoCofre()
      : "";
  }

  function criarLinha(texto) {
    const p = document.createElement("p");
    p.textContent = texto;
    return p;
  }

  async function revisar(id, status) {
    const chave = token();

    if (!chave) {
      mensagem.textContent =
        'Token "Turing API token" não encontrado no cofre.';
      return;
    }

    const acao = status === "aprovado"
      ? "Aprovando"
      : "Rejeitando";

    mensagem.textContent = `${acao} conhecimento #${id}...`;

    try {
      const res = await fetch(
        `${apiBase()}/api/turing/conhecimento/${id}/revisar`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + chave
          },
          body: JSON.stringify({ status })
        }
      );

      const dados = await res.json();

      if (!res.ok || !dados.ok) {
        throw new Error(
          dados.erro || `HTTP ${res.status}`
        );
      }

      mensagem.textContent =
        `Conhecimento #${id} · status ${dados.conhecimento.status}`;

      await carregarHistorico();

    } catch (erro) {
      mensagem.textContent =
        "Falha na revisão: " + erro.message;
    }
  }

  function renderizar(registros) {
    historico.replaceChildren();

    if (!Array.isArray(registros) || !registros.length) {
      historico.textContent =
        "Nenhum conhecimento registrado na API.";
      return;
    }

    for (const item of registros) {
      const card = document.createElement("article");
      card.className = "lab-registro";

      card.appendChild(
        criarLinha(
          `#${item.id} · ${item.area} · status: ${item.status}`
        )
      );

      card.appendChild(
        criarLinha("Pergunta: " + item.pergunta)
      );

      card.appendChild(
        criarLinha("Orientação: " + item.resposta)
      );

      if (item.fonte) {
        card.appendChild(
          criarLinha("Fonte: " + item.fonte)
        );
      }

      if (item.criado_em) {
        card.appendChild(
          criarLinha(
            "Criado: " +
            new Date(item.criado_em)
              .toLocaleString("pt-BR")
          )
        );
      }

      if (item.status === "rascunho") {
        const acoes = document.createElement("div");
        acoes.style.display = "flex";
        acoes.style.gap = "10px";
        acoes.style.marginTop = "12px";

        const aprovar = document.createElement("button");
        aprovar.type = "button";
        aprovar.className = "btn-action";
        aprovar.textContent = "Aprovar";
        aprovar.addEventListener(
          "click",
          () => revisar(item.id, "aprovado")
        );

        const rejeitar = document.createElement("button");
        rejeitar.type = "button";
        rejeitar.className = "btn-action secondary";
        rejeitar.textContent = "Rejeitar";
        rejeitar.addEventListener(
          "click",
          () => revisar(item.id, "rejeitado")
        );

        acoes.append(aprovar, rejeitar);
        card.appendChild(acoes);
      }

      historico.appendChild(card);
    }
  }

  async function carregarHistorico() {
    const chave = token();

    if (!chave) {
      historico.textContent =
        'Token "Turing API token" não encontrado no cofre.';
      return;
    }

    historico.textContent = "Carregando conhecimentos da API...";

    try {
      const res = await fetch(
        apiBase() + "/api/turing/conhecimento/listar",
        {
          method: "GET",
          headers: {
            "Authorization": "Bearer " + chave
          },
          cache: "no-store"
        }
      );

      const dados = await res.json();

      if (!res.ok || !dados.ok) {
        throw new Error(
          dados.erro || `HTTP ${res.status}`
        );
      }

      renderizar(dados.conhecimentos || []);

    } catch (erro) {
      historico.textContent =
        "Erro ao consultar API: " + erro.message;
    }
  }

  form.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    const chave = token();

    if (!chave) {
      mensagem.textContent =
        'Token "Turing API token" não encontrado no cofre.';
      return;
    }

    const registro = {
      area: document.getElementById("lab-area").value,
      pergunta:
        document.getElementById("lab-pergunta").value.trim(),
      resposta:
        document.getElementById("lab-orientacao").value.trim(),
      fonte: "Laboratório Gustavo + Turing"
    };

    if (!registro.pergunta || !registro.resposta) return;

    mensagem.textContent = "Enviando para API...";
    if (botao) botao.disabled = true;

    try {
      const res = await fetch(
        apiBase() + "/api/turing/conhecimento/ensinar",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + chave
          },
          body: JSON.stringify(registro)
        }
      );

      const dados = await res.json();

      if (!res.ok || !dados.ok) {
        throw new Error(
          dados.erro || `HTTP ${res.status}`
        );
      }

      mensagem.textContent =
        `Enviado para API · ID ${dados.conhecimento.id} · ` +
        `status ${dados.conhecimento.status}`;

      form.reset();
      await carregarHistorico();

    } catch (erro) {
      mensagem.textContent =
        "Falha no envio para API: " + erro.message;
    } finally {
      if (botao) botao.disabled = false;
    }
  });

  carregarHistorico();
})();
