/* Turing · Segurança — tela só-leitura ligada à API NexoTerraCore (control-plane) */
(function () {
  'use strict';
  var API = 'https://api.gustavopaulasantos.com.br';
  var KEY = 'tseg_sessao';
  var LOCAL = /^(127\.0\.0\.1|localhost)$/.test(location.hostname);
  var timer = null, modo = 'real', pend = null, aba = 'eventos', soAlertas = false, dados = null, erro = '';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function fmt(d) { if (!d) return '—'; var x = new Date(d); return isNaN(x) ? '—' : x.toLocaleString('pt-BR'); }
  function sessao() {
    try {
      var s = JSON.parse(sessionStorage.getItem(KEY) || 'null');
      if (s && s.token && (!s.expiraEm || new Date(s.expiraEm) > new Date())) return s;
    } catch (e) {}
    return null;
  }
  function guardar(j) {
    try {
      sessionStorage.setItem(KEY, JSON.stringify({ token: j.token, expiraEm: j.expiraEm, nome: (j.usuario && j.usuario.nome) || '' }));
    } catch (e) {}
  }
  function parar() { if (timer) { clearInterval(timer); timer = null; } }
  function sair(chamarApi) {
    var s = sessao();
    if (chamarApi && s) {
      fetch(API + '/api/auth/logout', { method: 'POST', headers: { Authorization: 'Bearer ' + s.token } }).catch(function () {});
    }
    try { sessionStorage.removeItem(KEY); } catch (e) {}
    dados = null; modo = 'real'; pend = null; parar(); render();
  }
  function api(path, opts) {
    opts = opts || {};
    var h = {};
    if (opts.body) h['Content-Type'] = 'application/json';
    var s = sessao();
    if (s) h.Authorization = 'Bearer ' + s.token;
    return fetch(API + path, { method: opts.method || 'GET', headers: h, body: opts.body }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok) { var e = new Error(j.erro || ('Erro ' + r.status)); e.status = r.status; throw e; }
        return j;
      });
    });
  }
  function msgErro(e) {
    return e && e.status ? e.message : 'Sem conexão com a API (ou acesso bloqueado pelo CORS: só funciona no domínio publicado).';
  }

  function entrar(ev) {
    ev.preventDefault();
    var em = document.getElementById('tseg-email').value;
    var se = document.getElementById('tseg-senha').value;
    document.getElementById('tseg-senha').value = '';
    erro = '';
    api('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: em, senha: se }) })
      .then(function (j) {
        if (j.requerSelecaoFazenda) { pend = { desafio: j.desafio, lista: j.fazendas || [] }; render(); return; }
        guardar(j); pend = null; carregar();
      })
      .catch(function (e) { erro = msgErro(e); render(); });
  }
  function escolher(id) {
    if (!pend) return;
    erro = '';
    api('/api/auth/selecionar-fazenda', { method: 'POST', body: JSON.stringify({ desafio: pend.desafio, fazendaId: Number(id) }) })
      .then(function (j) { guardar(j); pend = null; carregar(); })
      .catch(function (e) { erro = msgErro(e); if (e.status === 401) pend = null; render(); });
  }

  function carregar() {
    if (modo === 'exemplo') { dados = exemplo(); render(); return; }
    if (!sessao()) { render(); return; }
    Promise.all([
      api('/api/control-plane'),
      api('/api/turing/security/health').catch(function () { return null; })
    ]).then(function (r) {
      dados = { cp: r[0], saude: r[1], em: new Date() };
      erro = ''; render(); iniciar();
    }).catch(function (e) {
      if (e.status === 401) { sair(false); erro = 'Sessão expirada. Entre de novo.'; render(); }
      else if (e.status === 403) { erro = 'Seu papel de usuário não tem acesso ao control-plane.'; render(); }
      else { erro = msgErro(e); render(); }
    });
  }
  function iniciar() {
    if (timer) return;
    timer = setInterval(function () {
      if (typeof currentView !== 'undefined' && currentView !== 'tela-turing-seg') return;
      if (modo === 'real' && sessao()) carregar();
    }, 30000);
  }

  function estado(e) {
    var m = { PASS: ['✓ PASS', '#1e8449'], WARN: ['⚠ WARN', '#b9770e'], ALERT: ['✖ ALERT', '#c0392b'] }[e] || [esc(e), 'inherit'];
    return '<strong style="color:' + m[1] + '">' + m[0] + '</strong>';
  }
  function card(t, v, x) {
    return '<div style="flex:1 1 150px;padding:14px;border:1px solid rgba(128,128,128,.35);border-radius:10px">' +
      '<div style="opacity:.75;font-size:.85em">' + t + '</div><div style="font-size:1.6em;font-weight:700">' + v + '</div>' +
      (x ? '<div style="opacity:.7;font-size:.8em">' + x + '</div>' : '') + '</div>';
  }

  function login() {
    var h = '<div style="max-width:420px;margin:24px auto;padding:20px;border:1px solid rgba(128,128,128,.35);border-radius:10px">';
    h += '<h3 style="margin-top:0">Turing · Segurança</h3>';
    h += '<p style="opacity:.8">Entre com seu usuário da API NexoTerraCore. A senha não é guardada; a sessão fica só nesta aba.</p>';
    if (erro) h += '<p role="alert" style="color:#c0392b">' + esc(erro) + '</p>';
    if (pend) {
      h += '<div class="form-group"><label>Escolha o ambiente de acesso</label>';
      pend.lista.forEach(function (f) {
        var id = Number(f.id != null ? f.id : f.fazendaId);
        if (!id) return;
        var nome = f.nome || f.fazenda_nome || f.fazendaNome || ('Ambiente #' + id);
        h += '<button type="button" class="btn-action" style="margin:4px 4px 0 0" onclick="turingSeg.escolher(' + id + ')">' + esc(nome) + '</button>';
      });
      h += '</div>';
    } else {
      h += '<form onsubmit="turingSeg.entrar(event)">' +
        '<div class="form-group"><label>E-mail</label><input id="tseg-email" type="email" class="form-control" autocomplete="username" required></div>' +
        '<div class="form-group"><label>Senha</label><input id="tseg-senha" type="password" class="form-control" autocomplete="current-password" required></div>' +
        '<button class="btn-action" type="submit">Entrar</button></form>';
    }
    if (LOCAL) h += '<p style="margin-top:16px"><button type="button" class="btn-action secondary" onclick="turingSeg.exemplo()">Ver com dados de exemplo (só teste local)</button></p>';
    return h + '</div>';
  }

  function painel() {
    var cp = dados && dados.cp;
    var h = '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:12px">' +
      '<span style="opacity:.75">' + (modo === 'exemplo' ? 'DADOS DE EXEMPLO · ' : '') + 'Atualizado: ' + (dados ? fmt(dados.em) : '—') + ' · auto 30s</span>' +
      '<span style="flex:1"></span>' +
      '<button class="btn-action secondary" onclick="turingSeg.atualizar()">Atualizar</button>' +
      '<button class="btn-action secondary" onclick="turingSeg.sair()">Sair</button></div>';
    if (erro) h += '<p role="alert" style="color:#c0392b">' + esc(erro) + '</p>';
    if (!cp) return h + '<p>Carregando…</p>';
    var r = (cp.turingSecurity && cp.turingSecurity.resumo) || {};
    var ev = (cp.turingSecurity && cp.turingSecurity.eventos) || [];
    var ativo = dados.saude && dados.saude.status;
    h += '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px">' +
      card('Turing', ativo === 'ativo' ? '<span style="color:#1e8449">● ativo</span>' : '<span style="color:#c0392b">● ' + esc(ativo || 'sem resposta') + '</span>', dados.saude && dados.saude.modo ? 'modo: ' + esc(dados.saude.modo) : '') +
      card('Eventos 24h', esc(r.eventos_24h != null ? r.eventos_24h : '—'), 'total: ' + esc(r.total != null ? r.total : '—')) +
      card('PASS', esc(r.pass != null ? r.pass : '—'), '') +
      card('WARN', esc(r.warn != null ? r.warn : '—'), '') +
      card('ALERT', esc(r.alert != null ? r.alert : '—'), '') +
      card('Último evento', '<span style="font-size:.6em">' + fmt(r.ultimo_evento_em) + '</span>', '') + '</div>';
    h += '<div style="margin-bottom:10px">' +
      '<button class="btn-action' + (aba === 'eventos' ? '' : ' secondary') + '" onclick="turingSeg.aba(\'eventos\')">Eventos</button> ' +
      '<button class="btn-action' + (aba === 'chaves' ? '' : ' secondary') + '" onclick="turingSeg.aba(\'chaves\')">Chaves e consumo</button></div>';
    return h + (aba === 'eventos' ? tabEventos(ev) : tabChaves(cp));
  }

  function tabEventos(ev) {
    var lista = soAlertas ? ev.filter(function (e) { return e.estado !== 'PASS'; }) : ev;
    var h = '<label style="display:block;margin-bottom:8px"><input type="checkbox" ' + (soAlertas ? 'checked' : '') +
      ' onchange="turingSeg.filtro(this.checked)"> Mostrar só WARN e ALERT (esconde os batimentos normais)</label>';
    if (!lista.length) return h + '<p style="opacity:.8">' + (soAlertas ? 'Nenhum WARN ou ALERT entre os últimos 30 eventos.' : 'Sem eventos.') + '</p>';
    h += '<div style="overflow:auto"><table style="width:100%;border-collapse:collapse;font-size:.9em"><thead><tr style="text-align:left">' +
      '<th>Quando</th><th>Agente</th><th>Evento</th><th>Estado</th><th>Modo</th><th>ms</th><th>Contexto</th></tr></thead><tbody>';
    lista.forEach(function (e) {
      var c = e.contexto == null ? '' : (typeof e.contexto === 'string' ? e.contexto : JSON.stringify(e.contexto));
      h += '<tr style="border-top:1px solid rgba(128,128,128,.25)"><td>' + fmt(e.criado_em) + '</td><td>' + esc(e.agente) + '</td><td>' + esc(e.evento) +
        '</td><td>' + estado(e.estado) + '</td><td>' + esc(e.modo) + '</td><td>' + esc(e.duracao_ms) +
        '</td><td title="' + esc(c) + '">' + esc(c.length > 60 ? c.slice(0, 60) + '…' : c) + '</td></tr>';
    });
    return h + '</tbody></table></div>';
  }

  function tabChaves(cp) {
    var k = cp.apiKeys || [], c = cp.consumo || {};
    var h = '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px">' +
      card('Requisições 24h', esc(c.requisicoes_24h != null ? c.requisicoes_24h : '—'), '') +
      card('Requisições total', esc(c.total_requisicoes != null ? c.total_requisicoes : '—'), '') +
      card('Último consumo', '<span style="font-size:.6em">' + fmt(c.ultimo_consumo_em) + '</span>', '') +
      card('Rate limit', cp.rateLimit ? esc(cp.rateLimit.limite) + '/' + esc(cp.rateLimit.janelaSegundos) + 's' : '—', '') + '</div>';
    if (!k.length) return h + '<p>Nenhuma chave.</p>';
    h += '<div style="overflow:auto"><table style="width:100%;border-collapse:collapse;font-size:.9em"><thead><tr style="text-align:left">' +
      '<th>Nome</th><th>Prefixo</th><th>Escopos</th><th>Situação</th><th>Último uso</th><th>Expira</th></tr></thead><tbody>';
    k.forEach(function (x) {
      var sit = x.revogado_em ? '✖ revogada' : (x.ativo ? '✓ ativa' : '— inativa');
      h += '<tr style="border-top:1px solid rgba(128,128,128,.25)"><td>' + esc(x.nome) + '</td><td>' + esc(x.prefixo) + '</td><td>' +
        esc(Array.isArray(x.scopes) ? x.scopes.join(', ') : x.scopes) + '</td><td>' + sit + '</td><td>' + fmt(x.ultimo_uso_em) +
        '</td><td>' + fmt(x.expira_em) + '</td></tr>';
    });
    return h + '</tbody></table></div>';
  }

  function exemplo() {
    var agora = Date.now(), ev = [];
    for (var i = 0; i < 30; i++) {
      ev.push({ id: i, agente: 'turing-security', evento: i === 4 ? 'login_falho_repetido' : 'security_worker_cycle',
        estado: i === 4 ? 'WARN' : 'PASS', banco: 'ok', modo: 'observacao', duracao_ms: 12 + i, contexto: i === 4 ? { tentativas: 5 } : { ciclo: i },
        criado_em: new Date(agora - i * 300000).toISOString() });
    }
    return { em: new Date(), saude: { status: 'ativo', modo: 'observacao' }, cp: {
      turingSecurity: { resumo: { total: 96924, eventos_24h: 288, pass: 96800, warn: 100, alert: 24, ultimo_evento_em: ev[0].criado_em }, eventos: ev },
      apiKeys: [{ nome: 'exemplo', prefixo: 'ntc_live_ab12', scopes: ['assets.read'], ativo: true, ultimo_uso_em: null, expira_em: null, revogado_em: null }],
      consumo: { total_requisicoes: 1000, requisicoes_24h: 40, ultimo_consumo_em: ev[0].criado_em }, rateLimit: { limite: 60, janelaSegundos: 60 } } };
  }

  function render() {
    var root = document.getElementById('turing-seg-root');
    if (!root) return;
    root.innerHTML = (modo === 'exemplo' || sessao()) ? painel() : login();
  }

  window.turingSeg = {
    entrar: entrar, escolher: escolher, sair: function () { sair(true); },
    atualizar: function () { carregar(); },
    aba: function (a) { aba = a; render(); },
    filtro: function (v) { soAlertas = !!v; render(); },
    exemplo: function () { modo = 'exemplo'; carregar(); },
    abrir: function () { render(); if (modo === 'real' && sessao()) carregar(); }
  };
})();
