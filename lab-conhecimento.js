(() => {
  "use strict";

  // Laboratório do Turing — único caminho de treino ligado à API.
  // Rotas usadas (todas exigem token do cofre):
  //   GET   /api/turing/conhecimento/listar
  //   POST  /api/turing/conhecimento/ensinar
  //   PATCH /api/turing/conhecimento/:id/revisar

  const form = document.getElementById("form-lab-conhecimento");
  const historico = document.getElementById("lab-historico");
  const mensagem = document.getElementById("lab-mensagem");
  const botao = document.getElementById("lab-enviar");
  const filtroStatus = document.getElementById("lab-filtro-status");
  const filtroArea = document.getElementById("lab-filtro-area");

  if (!form || !historico || !mensagem) return;

  let registrosCache = [];

  function apiBase() {
    return String(
      (typeof appData !== "undefined" && appData?.config?.apiBase) ||
      "https://api.gustavopaulasantos.com.br"
    ).replace(/\/+$/, "");
  }

  function token() {
    return typeof tokenDoCofre === "function" ? tokenDoCofre() : "";
  }

  function setTexto(id, texto) {
    const el = document.getElementById(id);
    if (el) el.textContent = texto;
  }

  function criarLinha(texto) {
    const p = document.createElement("p");
    p.textContent = texto;
    return p;
  }

  // Lê a resposta sem quebrar quando a API devolve HTML ou corpo vazio.
  async function lerJson(res) {
    try { return await res.json(); } catch (e) { return {}; }
  }

  function atualizarContadores(registros) {
    const n = s => registros.filter(x => x.status === s).length;
    const total = registros.length;
    const rasc = n("rascunho"), aprov = n("aprovado"), rej = n("rejeitado");

    setTexto("lab-total", String(total));
    setTexto("lab-rascunhos", String(rasc));
    setTexto("lab-aprovados", String(aprov));
    setTexto("lab-rejeitados", String(rej));

    // Home e tela do Turing passam a mostrar números reais da API.
    setTexto("home-turing-treino", `${aprov} aprovado(s) · ${rasc} rascunho(s) · fonte: API`);
    setTexto("turin-lab-contagem", `${aprov} aprovados · ${rasc} rascunhos`);
  }

  function atualizarFiltroArea(registros) {
    if (!filtroArea) return;
    const atual = filtroArea.value;
    const areas = [...new Set(registros.map(x => x.area).filter(Boolean))].sort();
    filtroArea.replaceChildren();
    const todas = document.createElement("option");
    todas.value = "";
    todas.textContent = "Todas";
    filtroArea.appendChild(todas);
    for (const a of areas) {
      const o = document.createElement("option");
      o.value = a;
      o.textContent = a;
      filtroArea.appendChild(o);
    }
    filtroArea.value = areas.includes(atual) ? atual : "";
  }

  async function revisar(id, status) {
    const chave = token();
    if (!chave) {
      mensagem.textContent = 'Token "Turing API token" não encontrado no cofre.';
      return;
    }

    mensagem.textContent = `${status === "aprovado" ? "Aprovando" : "Rejeitando"} conhecimento #${id}...`;

    try {
      const res = await fetch(`${apiBase()}/api/turing/conhecimento/${encodeURIComponent(id)}/revisar`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + chave },
        body: JSON.stringify({ status })
      });
      const dados = await lerJson(res);
      if (!res.ok || !dados.ok) throw new Error(dados.erro || `HTTP ${res.status}`);

      mensagem.textContent = `Conhecimento #${id} · status ${dados.conhecimento?.status || status}`;
      await carregarHistorico();
    } catch (erro) {
      mensagem.textContent = "Falha na revisão: " + erro.message;
    }
  }

  function renderizar() {
    historico.replaceChildren();

    const st = filtroStatus ? filtroStatus.value : "";
    const ar = filtroArea ? filtroArea.value : "";
    const lista = registrosCache.filter(x => (!st || x.status === st) && (!ar || x.area === ar));

    if (!lista.length) {
      historico.textContent = registrosCache.length
        ? "Nenhum registro com esse filtro."
        : "Nenhum conhecimento registrado na API.";
      return;
    }

    for (const item of lista) {
      const card = document.createElement("article");
      card.className = "lab-registro";

      card.appendChild(criarLinha(`#${item.id} · ${item.area} · status: ${item.status}`));
      card.appendChild(criarLinha("Cenário: " + item.pergunta));
      card.appendChild(criarLinha("Resposta esperada: " + item.resposta));
      if (item.fonte) card.appendChild(criarLinha("Fonte: " + item.fonte));
      if (item.criado_em) {
        card.appendChild(criarLinha("Criado: " + new Date(item.criado_em).toLocaleString("pt-BR")));
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
        aprovar.addEventListener("click", () => revisar(item.id, "aprovado"));

        const rejeitar = document.createElement("button");
        rejeitar.type = "button";
        rejeitar.className = "btn-action secondary";
        rejeitar.textContent = "Rejeitar";
        rejeitar.addEventListener("click", () => revisar(item.id, "rejeitado"));

        acoes.append(aprovar, rejeitar);
        card.appendChild(acoes);
      }

      historico.appendChild(card);
    }
  }

  async function carregarHistorico() {
    const chave = token();
    if (!chave) {
      historico.textContent = 'Token "Turing API token" não encontrado no cofre.';
      setTexto("home-turing-treino", "sem token no cofre");
      return;
    }

    historico.textContent = "Carregando conhecimentos da API...";

    try {
      const res = await fetch(apiBase() + "/api/turing/conhecimento/listar", {
        method: "GET",
        headers: { "Authorization": "Bearer " + chave },
        cache: "no-store"
      });
      const dados = await lerJson(res);
      if (!res.ok || !dados.ok) throw new Error(dados.erro || `HTTP ${res.status}`);

      registrosCache = Array.isArray(dados.conhecimentos) ? dados.conhecimentos : [];
      atualizarContadores(registrosCache);
      atualizarFiltroArea(registrosCache);
      renderizar();
    } catch (erro) {
      historico.textContent = "Erro ao consultar API: " + erro.message;
      setTexto("home-turing-treino", "API não respondeu: " + erro.message);
    }
  }

  form.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    const chave = token();
    if (!chave) {
      mensagem.textContent = 'Token "Turing API token" não encontrado no cofre.';
      return;
    }

    const classe = document.getElementById("lab-classificacao")?.value || "informativo";
    const cenario = document.getElementById("lab-pergunta").value.trim();
    const resposta = document.getElementById("lab-orientacao").value.trim();
    if (!cenario || !resposta) return;

    // A rota aceita area, pergunta, resposta e fonte.
    // A classificação vai como prefixo da pergunta para não exigir mudança na API.
    const registro = {
      area: document.getElementById("lab-area").value,
      pergunta: `[${classe}] ${cenario}`,
      resposta,
      fonte: "Laboratório do Turing · painel"
    };

    mensagem.textContent = "Enviando para API...";
    if (botao) botao.disabled = true;

    try {
      const res = await fetch(apiBase() + "/api/turing/conhecimento/ensinar", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + chave },
        body: JSON.stringify(registro)
      });
      const dados = await lerJson(res);
      if (!res.ok || !dados.ok) throw new Error(dados.erro || `HTTP ${res.status}`);

      mensagem.textContent =
        `Enviado para API · ID ${dados.conhecimento?.id} · status ${dados.conhecimento?.status}`;

      // Mantém área e classificação para cadastrar vários exemplos seguidos.
      document.getElementById("lab-pergunta").value = "";
      document.getElementById("lab-orientacao").value = "";
      await carregarHistorico();
    } catch (erro) {
      mensagem.textContent = "Falha no envio para API: " + erro.message;
    } finally {
      if (botao) botao.disabled = false;
    }
  });

  if (filtroStatus) filtroStatus.addEventListener("change", renderizar);
  if (filtroArea) filtroArea.addEventListener("change", renderizar);

  carregarHistorico();

  // O cofre é descriptografado depois do login: espera o token aparecer.
  let tentativasToken = 0;
  const sincronizarToken = setInterval(() => {
    tentativasToken++;
    if (token()) {
      clearInterval(sincronizarToken);
      carregarHistorico();
      return;
    }
    if (tentativasToken >= 240) clearInterval(sincronizarToken); // até ~60 s
  }, 250);

  window.carregarHistoricoTuring = carregarHistorico;
})();
