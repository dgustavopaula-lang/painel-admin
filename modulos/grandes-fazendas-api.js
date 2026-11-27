/*
 * Grandes Fazendas — ligação com a NexoTerraCore API (v1: talhões).
 *
 * - Login de pessoa em /api/auth/login, feito pelo PAINEL com o cofre (item "Grandes Fazendas login").
 *   O módulo recebe só a sessão; a tela de e-mail/senha ficou como reserva ("Entrar manualmente").
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

  // Com "lembrar este aparelho" a sessão fica no localStorage (30 dias); sem, só na aba.
  let sessao = null;
  try {
    sessao = JSON.parse(localStorage.getItem(CHAVE_SESSAO) || sessionStorage.getItem(CHAVE_SESSAO) || "null");
    if (sessao && sessao.expiraEm && Date.parse(sessao.expiraEm) < Date.now()) sessao = null;
  } catch (e) { sessao = null; }
  function guardarSessao() {
    localStorage.removeItem(CHAVE_SESSAO); sessionStorage.removeItem(CHAVE_SESSAO);
    if (!sessao) return;
    (sessao.lembrar ? localStorage : sessionStorage).setItem(CHAVE_SESSAO, JSON.stringify(sessao));
  }
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
    '<label style="flex-direction:row;align-items:center;gap:6px"><input id="apiLembrar" type="checkbox" checked> Lembrar este aparelho</label>' +
    '<button class="btn p" id="apiEntrar">Entrar</button></div>' +
    '<div id="apiEscolha" class="row" style="margin-top:10px;display:none">' +
    '<label>Escolha a fazenda<select id="apiFazSel"></select></label>' +
    '<button class="btn p" id="apiConfirmar">Continuar</button></div>' +
    '<p id="apiMsg" class="mut" style="margin:8px 0 0"></p>';
  // Aberto pelo painel: o login é feito lá, com o cofre. A tela de e-mail/senha fica só como reserva.
  const main = document.querySelector("main") || document.body;
  main.insertBefore(card, main.firstChild);

  const $ = (id) => document.getElementById(id);
  const msg = (t, erro) => { $("apiMsg").textContent = t || ""; $("apiMsg").style.color = erro ? "var(--bad)" : ""; };

  let mostrarLogin = false;
  function desenharEstado() {
    const ligado = !!(sessao && sessao.token);
    $("apiLogin").style.display = ligado || !mostrarLogin ? "none" : "";
    $("apiEscolha").style.display = "none";
    $("apiStatus").textContent = ligado
      ? `conectado como ${sessao.nome || sessao.email} — os talhões são salvos na API`
      : "desconectado — dados só neste navegador";
    $("apiStatus").style.color = ligado ? "var(--ok)" : "";
    const selo = document.querySelector("h1 .tag");
    if (selo) { selo.textContent = ligado ? "API · v2.0" : "só neste navegador · v2.0"; selo.style.color = ligado ? "var(--ok)" : ""; selo.style.borderColor = ligado ? "var(--ok)" : ""; }
    $("apiAcoes").innerHTML = ligado
      ? '<button class="btn" id="apiBaixar">⬇ Carregar da API</button>' +
        '<button class="btn" id="apiEnviar">⬆ Enviar talhões pendentes</button>' +
        '<button class="btn" id="apiSair">Sair</button>'
      : '<button class="btn" id="apiMostrar">Entrar manualmente</button>';
    if (!ligado) $("apiMostrar").onclick = () => { mostrarLogin = !mostrarLogin; desenharEstado(); };
    if (!ligado && !mostrarLogin) $("apiStatus").textContent = "desconectado — abra o Grandes Fazendas pelo painel para conectar sem senha";
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

  async function concluirSessao(s, email, lembrar) {
    sessao = { token: s.token, expiraEm: s.expiraEm, nome: (s.usuario && s.usuario.nome) || "", email, lembrar: !!lembrar };
    guardarSessao();
    $("apiSenha").value = "";
    desenharEstado();
    await carregarDaApi();
  }

  $("apiEntrar").onclick = async () => {
    const email = $("apiEmail").value.trim();
    const senha = $("apiSenha").value;
    const lembrar = $("apiLembrar").checked;
    if (!email || !senha) return msg("Informe e-mail e senha.", true);
    msg("Entrando…");
    try {
      const r = await chamar(API + "/api/auth/login", { method: "POST", body: JSON.stringify({ email, senha, lembrar }) });
      if (r.requerSelecaoFazenda) {
        desafioAtual = { desafio: r.desafio, email, lembrar };
        // Entra direto, sem perguntar: a fazenda aberta na tela, a Saudade, ou a primeira da lista.
        const alvo = r.fazendas.find((f) => f.nome === fazSel.value) ||
          r.fazendas.find((f) => f.nome === "Fazenda Saudade") || r.fazendas[0];
        if (alvo) { $("apiFazSel").innerHTML = `<option value="${alvo.id}"></option>`; return $("apiConfirmar").onclick(); }
        const ops = r.fazendas.map((f) => `<option value="${f.id}">${esc(f.nome)} — ${esc(f.organizacao.nome)}</option>`);
        $("apiFazSel").innerHTML = ops.join("");
        const local = r.fazendas.find((f) => f.nome === fazSel.value);
        if (local) $("apiFazSel").value = String(local.id);
        $("apiLogin").style.display = "none";
        $("apiEscolha").style.display = "";
        msg("Escolha a fazenda para esta sessão.");
        return;
      }
      await concluirSessao(r, email, lembrar);
    } catch (e) { falha(e); }
  };

  $("apiConfirmar").onclick = async () => {
    if (!desafioAtual) return;
    try {
      const r = await chamar(API + "/api/auth/selecionar-fazenda", {
        method: "POST",
        body: JSON.stringify({ desafio: desafioAtual.desafio, fazendaId: Number($("apiFazSel").value), lembrar: desafioAtual.lembrar })
      });
      await concluirSessao(r, desafioAtual.email, desafioAtual.lembrar);
      desafioAtual = null;
    } catch (e) { falha(e); }
  };

  function sair() {
    if (sessao && sessao.token) {
      fetch(API + "/api/auth/logout", { method: "POST", headers: { Authorization: "Bearer " + sessao.token } }).catch(() => {});
    }
    sessao = null;
    guardarSessao();
    fazendasApi = [];
    desenharEstado();
    msg("Você saiu. Os dados continuam salvos na API.");
  }

  /* ---------- sincronização de talhões ---------- */
  // Nome no módulo → nome na API (quando forem diferentes)
  const APELIDOS = { "Fazenda PIPE — Malanje (Angola)": "Fazenda PIPE" };
  const nomeApi = (local) => APELIDOS[local] || local;
  const nomeLocal = (api) => Object.keys(APELIDOS).find((k) => APELIDOS[k] === api) || api;
  const fazendaApiDe = (local) => fazendasApi.find((f) => f.nome === nomeApi(local));

  async function carregarDaApi() {
    fazendasApi = await chamar("/fazendas");
    let novos = 0;
    for (const f of fazendasApi) {
      const lista = await chamar(`/fazendas/${f.id}/talhoes`);
      // Só cria a fazenda na lista local se ela tiver talhões na API (evita nomes duplicados).
      if (lista.length && !D.fazendas.includes(nomeLocal(f.nome))) D.fazendas.push(nomeLocal(f.nome));
      for (const t of lista) {
        if (!t.contorno) continue;
        const local = D.talhoes.find((x) => x.apiId === t.id);
        if (local) {
          Object.assign(local, { nome: t.nome, ha: Number(t.area_hectares) || local.ha, geom: t.contorno });
        } else {
          D.talhoes.push({ id: "api-" + t.id, apiId: t.id, nome: t.nome, fazenda: nomeLocal(f.nome),
            ha: Number(t.area_hectares) || +areaHa(t.contorno).toFixed(2), geom: t.contorno, origem: "API" });
          novos++;
        }
      }
    }
    // registros (satélite, campo, decisões, safras, máquinas, vendas) e local da sede
    let regsNovos = 0;
    D._apiReg = D._apiReg || {}; D.locais = D.locais || {};
    for (const f of fazendasApi) {
      const local = nomeLocal(f.nome);
      if (f.latitude != null && f.longitude != null && !(D.locais[local] && D.locais[local][3] === "definido por você"))
        D.locais[local] = [Number(f.latitude), Number(f.longitude), 14, "salvo na API"];
      let regs = [];
      try { regs = await chamar(`/fazendas/${f.id}/registros`); } catch (e) { continue; }
      for (const g of regs) {
        const col = g.dados && g.dados.col, item = g.dados && g.dados.item;
        if (!col || !item || !COLS[col] || !item.id) continue;
        const k = col + ":" + item.id;
        D[col] = D[col] || [];
        if (!D[col].some((x) => x.id === item.id)) { D[col].push(item); regsNovos++; }
        if (!D._apiReg[k]) D._apiReg[k] = { apiId: g.id, fid: f.id, h: JSON.stringify(D[col].find((x) => x.id === item.id)) };
      }
    }
    salvarLocal();
    renderFaz(); renderTudo();
    const pend = await enviarPendentes(false);
    const sync = await sincronizarRegistros();
    msg(`API: ${fazendasApi.length} fazenda(s) acessível(is) · ${novos} talhão(ões) e ${regsNovos} registro(s) carregado(s)` +
        (pend || sync.env ? ` · ${pend + sync.env} enviado(s)` : "") + " · tudo salvo na API.");
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

  /* ---------- registros das abas ↔ API (agro_registros) ---------- */
  const COLS = { sat: "satelite", campo: "campo", dec: "decisao", safras: "safra", maquinas: "maquina", vendas: "venda" };
  const ignorar = (r) => /^demo/.test(String(r.id)) || /^demo/.test(String(r.talhao || "")) || r.ref || String(r.fazenda || "").startsWith("DEMO");
  const fazendaDoItem = (r) => r.fazenda || ((D.talhoes.find((t) => t.id === r.talhao) || {}).fazenda);
  const dataDe = (r) => [r.data, r.pi, r.ci].find((d) => /^\d{4}-\d{2}-\d{2}$/.test(d || "")) || new Date().toISOString().slice(0, 10);
  const tituloDe = (col, r) => (({ sat: "Satélite", campo: "Campo", dec: "Decisão", safras: "Safra", maquinas: "Máquina", vendas: "Venda" })[col] +
    ": " + (r.nome || r.cultura || r.tipo || r.produto || r.dec || "")).slice(0, 150);
  let sincronizando = false;
  const semPermissao = new Set(); let avisouPermissao = false;
  async function sincronizarRegistros() {
    const res = { env: 0, rem: 0, falhas: 0 };
    if (!sessao || sincronizando || !fazendasApi.length) return res;
    sincronizando = true;
    try {
      D._apiReg = D._apiReg || {};
      const vivos = new Set();
      for (const col of Object.keys(COLS)) {
        if (semPermissao.has(col)) continue;
        for (const r of D[col] || []) {
          if (ignorar(r)) continue;
          const k = col + ":" + r.id; vivos.add(k);
          const f = fazendaApiDe(fazendaDoItem(r));
          if (!f) continue; // fazenda sem par na API: fica no navegador
          const reg = D._apiReg[k], h = JSON.stringify(r);
          if (reg && reg.h === h) continue;
          const t = D.talhoes.find((x) => x.id === r.talhao);
          const corpo = { tipo: COLS[col], data_registro: dataDe(r), titulo: tituloDe(col, r), dados: { col, item: r } };
          if (t && t.apiId) corpo.talhao_id = t.apiId;
          try {
            const novo = await chamar(`/fazendas/${f.id}/registros`, { method: "POST", body: JSON.stringify(corpo) });
            if (reg) await chamar(`/fazendas/${reg.fid}/registros/${reg.apiId}`, { method: "DELETE" }).catch(() => {});
            D._apiReg[k] = { apiId: novo.id, fid: f.id, h }; res.env++;
          } catch (e) {
            if (/Permiss/i.test(e.message)) { semPermissao.add(col); if (!avisouPermissao) { avisouPermissao = true; msg(`Sua conta não tem permissão na API para salvar "${col}"; esses registros ficam só no navegador.`, true); } }
            else res.falhas++;
          }
        }
      }
      const sumidos = Object.keys(D._apiReg).filter((k) => !vivos.has(k) && !semPermissao.has(k.split(":")[0]));
      if (sumidos.length > 20 && !confirm(`${sumidos.length} registros sumiram deste navegador. Apagar também na API? (Cancelar = manter na API)`)) {
        sumidos.forEach((k) => delete D._apiReg[k]); salvarLocal(); return res;
      }
      for (const k of Object.keys(D._apiReg)) {
        if (vivos.has(k) || semPermissao.has(k.split(":")[0])) continue;
        const reg = D._apiReg[k];
        await chamar(`/fazendas/${reg.fid}/registros/${reg.apiId}`, { method: "DELETE" }).catch(() => {});
        delete D._apiReg[k]; res.rem++;
      }
      // local da sede definido por você → guarda na API
      for (const f of fazendasApi) {
        const l = (D.locais || {})[nomeLocal(f.nome)];
        if (!l || l[3] !== "definido por você") continue;
        if (Number(f.latitude) === l[0] && Number(f.longitude) === l[1]) continue;
        try { const nf = await chamar(`/fazendas/${f.id}`, { method: "PATCH", body: JSON.stringify({ latitude: l[0], longitude: l[1] }) });
          f.latitude = nf.latitude; f.longitude = nf.longitude; } catch (e) { res.falhas++; }
      }
      if (res.env || res.rem) salvarLocal();
      if (res.falhas) msg(`${res.falhas} item(ns) não foram aceitos pela API agora; tento de novo no próximo salvamento.`, true);
      return res;
    } finally { sincronizando = false; }
  }

  /* ---------- ganchos nas funções do módulo ---------- */
  const salvarLocal = window.salvar;
  let timerSync = null;
  window.salvar = function () {
    salvarLocal();
    if (!sessao) return;
    clearTimeout(timerSync);
    timerSync = setTimeout(() => {
      enviarPendentes(false).then(() => sincronizarRegistros())
        .then((r) => { if (r && (r.env || r.rem)) msg(`Salvo na API às ${new Date().toLocaleTimeString("pt-BR")}.`); })
        .catch(falha);
    }, 1200);
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
  try {
    const aviso = sessionStorage.getItem("gf.aviso") || localStorage.getItem("gf.aviso");
    if (aviso) { msg(aviso, true); sessionStorage.removeItem("gf.aviso"); localStorage.removeItem("gf.aviso"); }
  } catch (e) { /* nada */ }
  if (sessao && sessao.token) carregarDaApi().catch(falha);
})();
