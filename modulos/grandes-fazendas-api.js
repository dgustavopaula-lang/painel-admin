/*
 * Grandes Fazendas — ligação com a NexoTerraCore API (v1: talhões).
 *
 * - Login de pessoa (e-mail + senha) em /api/auth/login. Chave de API não é usada.
 * - O token da sessão fica em sessionStorage: some ao fechar a aba.
 * - Talhões desenhados ou importados são enviados para a API quando conectado.
 * - Renomear e remover talhão também é refletido na API.
 * - A fazenda local é ligada à fazenda da API pelo NOME (ex.: "Fazenda Saudade").
 */
(function () {
  "use strict";

  const API = "https://api.gustavopaulasantos.com.br";
  const CHAVE_SESSAO = "gf.sessao.v1";
  const BASE = API + "/api/grandes-fazendas";

  let sessao = null;
  try { sessao = JSON.parse(sessionStorage.getItem(CHAVE_SESSAO) || "null"); } catch (e) { sessao = null; }
  let fazendasApi = []; // [{id, nome, ...}]
  let enviando = false;

  /* ---------- interface ---------- */
  const card = document.createElement("div");
  card.className = "card";
  card.id = "apiCard";
  card.innerHTML =
    '<div class="row" style="justify-content:space-between;align-items:center">' +
    '<div><b>☁️ Conexão com a API</b> <span id="apiStatus" class="mut">desconectado — dados só neste navegador</span></div>' +
    '<div id="apiAcoes" class="row"></div></div>' +
    '<div id="apiLogin" class="row" style="margin-top:10px">' +
    '<label>E-mail<input id="apiEmail" type="email" autocomplete="username"></label>' +
    '<label>Senha<input id="apiSenha" type="password" autocomplete="current-password"></label>' +
    '<button class="btn p" id="apiEntrar">Entrar</button></div>' +
    '<div id="apiEscolha" class="row" style="margin-top:10px;display:none">' +
    '<label>Escolha a fazenda<select id="apiFazSel"></select></label>' +
    '<button class="btn p" id="apiConfirmar">Continuar</button></div>' +
    '<p id="apiMsg" class="mut" style="margin:8px 0 0"></p>';
  const main = document.querySelector("main") || document.body;
  main.insertBefore(card, main.firstChild);

  const $ = (id) => document.getElementById(id);
  const msg = (t, erro) => { $("apiMsg").textContent = t || ""; $("apiMsg").style.color = erro ? "var(--bad)" : ""; };

  function desenharEstado() {
    const ligado = !!(sessao && sessao.token);
    $("apiLogin").style.display = ligado ? "none" : "";
    $("apiEscolha").style.display = "none";
    $("apiStatus").textContent = ligado
      ? `conectado como ${sessao.nome || sessao.email} — os talhões são salvos na API`
      : "desconectado — dados só neste navegador";
    $("apiStatus").style.color = ligado ? "var(--ok)" : "";
    $("apiAcoes").innerHTML = ligado
      ? '<button class="btn" id="apiBaixar">⬇ Carregar da API</button>' +
        '<button class="btn" id="apiEnviar">⬆ Enviar talhões pendentes</button>' +
        '<button class="btn" id="apiSair">Sair</button>'
      : "";
    if (ligado) {
      $("apiBaixar").onclick = () => carregarDaApi().catch(falha);
      $("apiEnviar").onclick = () => enviarPendentes(true).catch(falha);
      $("apiSair").onclick = sair;
    }
  }

  function falha(e) { msg(e.message || String(e), true); }

  /* ---------- HTTP ---------- */
  async function chamar(caminho, opcoes) {
    const o = Object.assign({ cache: "no-store" }, opcoes || {});
    o.headers = Object.assign({ "Content-Type": "application/json" }, o.headers || {});
    if (sessao && sessao.token) o.headers.Authorization = "Bearer " + sessao.token;
    const r = await fetch(caminho.startsWith("http") ? caminho : BASE + caminho, o);
    if (r.status === 401 && sessao) { sair(); throw new Error("Sessão expirada. Entre de novo."); }
    if (r.status === 204) return null;
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.erro || "Erro " + r.status);
    return d;
  }

  /* ---------- login ---------- */
  let desafioAtual = null;

  async function concluirSessao(s, email) {
    sessao = { token: s.token, expiraEm: s.expiraEm, nome: (s.usuario && s.usuario.nome) || "", email };
    sessionStorage.setItem(CHAVE_SESSAO, JSON.stringify(sessao));
    $("apiSenha").value = "";
    desenharEstado();
    await carregarDaApi();
  }

  $("apiEntrar").onclick = async () => {
    const email = $("apiEmail").value.trim();
    const senha = $("apiSenha").value;
    if (!email || !senha) return msg("Informe e-mail e senha.", true);
    msg("Entrando…");
    try {
      const r = await chamar(API + "/api/auth/login", { method: "POST", body: JSON.stringify({ email, senha }) });
      if (r.requerSelecaoFazenda) {
        desafioAtual = { desafio: r.desafio, email };
        const ops = r.fazendas.map((f) => `<option value="${f.id}">${esc(f.nome)} — ${esc(f.organizacao.nome)}</option>`);
        $("apiFazSel").innerHTML = ops.join("");
        const local = r.fazendas.find((f) => f.nome === fazSel.value);
        if (local) $("apiFazSel").value = String(local.id);
        $("apiLogin").style.display = "none";
        $("apiEscolha").style.display = "";
        msg("Escolha a fazenda para esta sessão.");
        return;
      }
      await concluirSessao(r, email);
    } catch (e) { falha(e); }
  };

  $("apiConfirmar").onclick = async () => {
    if (!desafioAtual) return;
    try {
      const r = await chamar(API + "/api/auth/selecionar-fazenda", {
        method: "POST",
        body: JSON.stringify({ desafio: desafioAtual.desafio, fazendaId: Number($("apiFazSel").value) })
      });
      await concluirSessao(r, desafioAtual.email);
      desafioAtual = null;
    } catch (e) { falha(e); }
  };

  function sair() {
    if (sessao && sessao.token) {
      fetch(API + "/api/auth/logout", { method: "POST", headers: { Authorization: "Bearer " + sessao.token } }).catch(() => {});
    }
    sessao = null;
    sessionStorage.removeItem(CHAVE_SESSAO);
    fazendasApi = [];
    desenharEstado();
    msg("Você saiu. Os dados continuam salvos na API.");
  }

  /* ---------- sincronização de talhões ---------- */
  const fazendaApiDe = (nomeLocal) => fazendasApi.find((f) => f.nome === nomeLocal);

  async function carregarDaApi() {
    fazendasApi = await chamar("/fazendas");
    let novos = 0;
    for (const f of fazendasApi) {
      const lista = await chamar(`/fazendas/${f.id}/talhoes`);
      // Só cria a fazenda na lista local se ela tiver talhões na API (evita nomes duplicados).
      if (lista.length && !D.fazendas.includes(f.nome)) D.fazendas.push(f.nome);
      for (const t of lista) {
        if (!t.contorno) continue;
        const local = D.talhoes.find((x) => x.apiId === t.id);
        if (local) {
          Object.assign(local, { nome: t.nome, ha: Number(t.area_hectares) || local.ha, geom: t.contorno });
        } else {
          D.talhoes.push({ id: "api-" + t.id, apiId: t.id, nome: t.nome, fazenda: f.nome,
            ha: Number(t.area_hectares) || +areaHa(t.contorno).toFixed(2), geom: t.contorno, origem: "API" });
          novos++;
        }
      }
    }
    salvarLocal();
    renderFaz(); renderTudo();
    const pend = await enviarPendentes(false);
    msg(`API: ${fazendasApi.length} fazenda(s) acessível(is), ${novos} talhão(ões) novo(s) carregado(s)` +
        (pend ? `, ${pend} enviado(s).` : "."));
  }

  async function enviarPendentes(avisar) {
    if (!sessao || enviando || !fazendasApi.length) return 0;
    enviando = true;
    let n = 0;
    try {
      for (const t of D.talhoes) {
        if (t.apiId || t.demo) continue;
        const f = fazendaApiDe(t.fazenda);
        if (!f) continue; // fazenda local sem correspondente na API: fica só no navegador
        const r = await chamar(`/fazendas/${f.id}/talhoes`, {
          method: "POST",
          body: JSON.stringify({ nome: t.nome, area_hectares: t.ha, contorno: t.geom })
        });
        t.apiId = r.id;
        n++;
      }
      if (n) salvarLocal();
      if (avisar) msg(n ? `${n} talhão(ões) enviado(s) para a API.` : "Nada pendente para enviar.");
      if (n) renderTudo();
      return n;
    } finally {
      enviando = false;
    }
  }

  /* ---------- ganchos nas funções do módulo ---------- */
  const salvarLocal = window.salvar;
  window.salvar = function () {
    salvarLocal();
    if (sessao) enviarPendentes(false).catch(falha);
  };

  const edTOriginal = window.edT;
  window.edT = (id, campo, el) => {
    edTOriginal(id, campo, el);
    const t = D.talhoes.find((x) => x.id === id);
    const f = t && fazendaApiDe(t.fazenda);
    if (sessao && t && t.apiId && f && campo === "nome") {
      chamar(`/fazendas/${f.id}/talhoes/${t.apiId}`, { method: "PATCH", body: JSON.stringify({ nome: t.nome }) })
        .then(() => msg("Nome do talhão atualizado na API."))
        .catch(falha);
    }
  };

  const remOriginal = window.remTalhao;
  window.remTalhao = (id) => {
    const t = D.talhoes.find((x) => x.id === id);
    const antes = D.talhoes.length;
    remOriginal(id);
    if (D.talhoes.length === antes || !t || !t.apiId || !sessao) return; // cancelado ou só local
    const f = fazendaApiDe(t.fazenda);
    if (!f) return;
    chamar(`/fazendas/${f.id}/talhoes/${t.apiId}`, { method: "DELETE" })
      .then(() => msg("Talhão removido também na API (o histórico continua guardado)."))
      .catch(falha);
  };

  desenharEstado();
  if (sessao && sessao.token) carregarDaApi().catch(falha);
})();
