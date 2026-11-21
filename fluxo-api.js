/* =====================================================================
   Fluxos da API · editor visual estilo n8n (GPS.dev · NexoTerraCore)
   Arquivo independente: injeta o item na sidebar e a tela no painel.
   Usa do app.js: abrirTela, tokenDoCofre, _baseTuring, escapeHtml.
   Fluxos ficam salvos neste navegador (localStorage) e podem ser
   exportados/importados em JSON. Escrita na API começa em SIMULAÇÃO.
   ===================================================================== */
(function () {
  'use strict';

  const CHAVE_FLUXOS = 'gps-fluxos-api-v1';
  const esc = s => (typeof escapeHtml === 'function' ? escapeHtml(String(s)) : String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));

  /* ---------------- Tipos de nó (a "paleta") ---------------- */
  const TIPOS = {
    gatilho: { nome: 'Início (manual)', icone: 'ph-play-circle', cor: '#34d399', saidas: ['saída'],
      ajuda: 'Todo fluxo começa aqui. Ao clicar em Executar, este nó entrega um objeto vazio {} para o próximo.',
      campos: [] },
    http: { nome: 'Requisição API', icone: 'ph-globe', cor: '#60a5fa', saidas: ['saída'],
      ajuda: 'Chama a NexoTerraCore API. GET lê (desce dados). POST cria (sobe dados novos). PATCH altera. DELETE apaga. Escritas obedecem ao Modo simulação.',
      campos: [
        { id: 'metodo', rotulo: 'Método', tipo: 'select', opcoes: ['GET', 'POST', 'PATCH', 'DELETE'], padrao: 'GET' },
        { id: 'caminho', rotulo: 'Caminho (começa com /api/)', tipo: 'text', padrao: '/api/health' },
        { id: 'corpo', rotulo: 'Corpo JSON (POST/PATCH) · aceita {{campo}}', tipo: 'textarea', padrao: '' }
      ] },
    campo: { nome: 'Pegar campo', icone: 'ph-cursor-click', cor: '#a78bfa', saidas: ['saída'],
      ajuda: 'Extrai uma parte do JSON que chegou. Ex.: "plantas" pega a lista; "plantas.0.nome_popular" pega o nome da primeira planta.',
      campos: [{ id: 'caminho', rotulo: 'Caminho do campo', tipo: 'text', padrao: 'plantas' }] },
    filtro: { nome: 'Filtrar lista', icone: 'ph-funnel', cor: '#f59e0b', saidas: ['saída'],
      ajuda: 'Recebe uma lista e mantém só os itens que passam na regra. Ex.: campo "toxica", operador "=", valor "true".',
      campos: [
        { id: 'lista', rotulo: 'Onde está a lista (vazio = a própria entrada)', tipo: 'text', padrao: '' },
        { id: 'campo', rotulo: 'Campo de cada item', tipo: 'text', padrao: 'toxica' },
        { id: 'op', rotulo: 'Operador', tipo: 'select', opcoes: ['=', '≠', 'contém', '>', '<', 'existe'], padrao: '=' },
        { id: 'valor', rotulo: 'Valor', tipo: 'text', padrao: 'true' }
      ] },
    contar: { nome: 'Contar / agrupar', icone: 'ph-chart-bar', cor: '#f472b6', saidas: ['saída'],
      ajuda: 'Conta os itens de uma lista. Se informar um campo, agrupa: ex. "familia" mostra quantas plantas há em cada família.',
      campos: [
        { id: 'lista', rotulo: 'Onde está a lista (vazio = a própria entrada)', tipo: 'text', padrao: '' },
        { id: 'agrupar', rotulo: 'Agrupar por campo (opcional)', tipo: 'text', padrao: '' }
      ] },
    condicao: { nome: 'SE (condição)', icone: 'ph-git-fork', cor: '#fb923c', saidas: ['verdadeiro', 'falso'],
      ajuda: 'Divide o caminho em dois. Se a regra for verdadeira, segue pela saída de cima; se for falsa, pela de baixo.',
      campos: [
        { id: 'campo', rotulo: 'Campo', tipo: 'text', padrao: 'total' },
        { id: 'op', rotulo: 'Operador', tipo: 'select', opcoes: ['=', '≠', 'contém', '>', '<', 'existe'], padrao: '>' },
        { id: 'valor', rotulo: 'Valor', tipo: 'text', padrao: '0' }
      ] },
    definir: { nome: 'Definir dados', icone: 'ph-pencil-simple-line', cor: '#22d3ee', saidas: ['saída'],
      ajuda: 'Monta um JSON novo. Use {{campo}} para copiar valores da entrada e {{$entrada}} para o JSON inteiro.',
      campos: [{ id: 'json', rotulo: 'JSON de saída', tipo: 'textarea', padrao: '{\n  "mensagem": "olá"\n}' }] },
    turing: { nome: 'Ensinar ao Turing', icone: 'ph-brain', cor: '#34d399', saidas: ['saída'],
      ajuda: 'Cria um exemplo PENDENTE no Laboratório do Turing (POST /api/turing/conhecimento/ensinar). Só vira resposta depois de aprovado no Fluxo de treino.',
      campos: [
        { id: 'area', rotulo: 'Área', tipo: 'text', padrao: 'Treino de fluxos' },
        { id: 'pergunta', rotulo: 'Pergunta · aceita {{campo}}', tipo: 'text', padrao: 'O que é {{nome_popular}}?' },
        { id: 'resposta', rotulo: 'Resposta · aceita {{campo}}', tipo: 'textarea', padrao: '{{nome_popular}} ({{nome_cientifico}}), família {{familia}}.' }
      ] },
    saida: { nome: 'Resultado', icone: 'ph-flag-checkered', cor: '#e5e7eb', saidas: [],
      ajuda: 'Fim do fluxo. Mostra o JSON que chegou aqui no painel de resultado.',
      campos: [] }
  };

  /* ---------------- Modelos prontos para treinar ---------------- */
  function no(id, tipo, x, y, nome, cfg) { return { id, tipo, x, y, nome: nome || TIPOS[tipo].nome, cfg: cfg || {} }; }
  function li(de, para, saida) { return { de, para, saida: saida || 0 }; }
  const MODELOS = [
    { nome: '1 · Saúde da API (GET)', nos: [no('a', 'gatilho', 40, 120), no('b', 'http', 300, 120, 'GET /api/health', { metodo: 'GET', caminho: '/api/health' }), no('c', 'saida', 560, 120)], ligacoes: [li('a', 'b'), li('b', 'c')] },
    { nome: '2 · Plantas tóxicas por família', nos: [
        no('a', 'gatilho', 30, 140), no('b', 'http', 250, 140, 'GET /api/plantas', { metodo: 'GET', caminho: '/api/plantas' }),
        no('c', 'filtro', 470, 140, 'Só tóxicas', { lista: 'plantas', campo: 'toxica', op: '=', valor: 'true' }),
        no('d', 'contar', 690, 140, 'Contar por família', { lista: '', agrupar: 'familia' }), no('e', 'saida', 910, 140)],
      ligacoes: [li('a', 'b'), li('b', 'c'), li('c', 'd'), li('d', 'e')] },
    { nome: '3 · Apps com problema (SE)', nos: [
        no('a', 'gatilho', 30, 160), no('b', 'http', 230, 160, 'GET /api/apps', { metodo: 'GET', caminho: '/api/apps' }),
        no('c', 'filtro', 430, 160, 'Ativos fora do ar', { lista: 'apps', campo: 'ultimo_http', op: '=', valor: '0' }),
        no('d', 'contar', 630, 160, 'Contar'), no('e', 'condicao', 830, 160, 'Tem problema?', { campo: 'total', op: '>', valor: '0' }),
        no('f', 'definir', 1040, 60, 'Alerta', { json: '{\n  "alerta": "Há {{total}} app(s) fora do ar"\n}' }),
        no('g', 'definir', 1040, 270, 'Tudo certo', { json: '{\n  "ok": "Todos os apps no ar"\n}' }),
        no('h', 'saida', 1250, 60), no('i', 'saida', 1250, 270)],
      ligacoes: [li('a', 'b'), li('b', 'c'), li('c', 'd'), li('d', 'e'), li('e', 'f', 0), li('e', 'g', 1), li('f', 'h'), li('g', 'i')] },
    { nome: '4 · Criar planta (POST simulado)', nos: [
        no('a', 'gatilho', 40, 140), no('b', 'definir', 260, 140, 'Dados da planta', { json: '{\n  "nome_popular": "Planta de teste",\n  "status": "a_identificar"\n}' }),
        no('c', 'http', 480, 140, 'POST /api/plantas', { metodo: 'POST', caminho: '/api/plantas', corpo: '{{$entrada}}' }), no('d', 'saida', 700, 140)],
      ligacoes: [li('a', 'b'), li('b', 'c'), li('c', 'd')] },
    { nome: '5 · Ensinar o Turing a partir da API', nos: [
        no('a', 'gatilho', 30, 140), no('b', 'http', 230, 140, 'GET /api/plantas', { metodo: 'GET', caminho: '/api/plantas' }),
        no('c', 'filtro', 430, 140, 'Só o Tamarindo', { lista: 'plantas', campo: 'nome_popular', op: '=', valor: 'Tamarindo' }),
        no('d', 'campo', 630, 140, 'Primeiro item', { caminho: '0' }),
        no('e', 'turing', 830, 140, 'Ensinar ao Turing', { area: 'Botânica', pergunta: 'O que é a planta {{nome_popular}}?', resposta: '{{nome_popular}} ({{nome_cientifico}}), família {{familia}}. {{notas}}' }),
        no('f', 'saida', 1040, 140)],
      ligacoes: [li('a', 'b'), li('b', 'c'), li('c', 'd'), li('d', 'e'), li('e', 'f')] }
  ];

  /* ---------------- Estado ---------------- */
  let fluxos = carregar();
  let atual = fluxos[0];
  let selecionado = null;
  let ligando = null;        // { de, saida } enquanto o usuário liga dois nós
  let resultados = {};       // id do nó -> { entrada, saida, status, msg }
  let simulacao = true;

  function carregar() {
    try {
      const d = JSON.parse(localStorage.getItem(CHAVE_FLUXOS) || 'null');
      if (Array.isArray(d) && d.length) return d;
    } catch (e) { /* ignora */ }
    return MODELOS.map(m => JSON.parse(JSON.stringify(m)));
  }
  function salvar() { try { localStorage.setItem(CHAVE_FLUXOS, JSON.stringify(fluxos)); } catch (e) { /* ignora */ } }

  /* ---------------- Utilitários de dados ---------------- */
  function pegar(obj, caminho) {
    if (!caminho) return obj;
    return String(caminho).split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
  }
  function modelo(texto, entrada) {
    return String(texto || '').replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, exp) => {
      if (exp === '$entrada') return JSON.stringify(entrada);
      const v = pegar(entrada, exp);
      return v == null ? '' : (typeof v === 'object' ? JSON.stringify(v) : String(v));
    });
  }
  function comparar(a, op, b) {
    if (op === 'existe') return a !== undefined && a !== null && a !== '';
    const sa = a == null ? '' : String(a), sb = String(b);
    if (op === '=') return sa === sb;
    if (op === '≠') return sa !== sb;
    if (op === 'contém') return sa.toLowerCase().includes(sb.toLowerCase());
    if (op === '>') return Number(a) > Number(b);
    if (op === '<') return Number(a) < Number(b);
    return false;
  }
  function comoLista(v) { return Array.isArray(v) ? v : (v == null ? [] : [v]); }

  /* ---------------- Execução de cada nó ---------------- */
  async function executarNo(n, entrada) {
    const c = n.cfg || {};
    switch (n.tipo) {
      case 'gatilho': return { saida: {}, ramo: 0 };
      case 'campo': return { saida: pegar(entrada, c.caminho), ramo: 0 };
      case 'filtro': {
        const lista = comoLista(pegar(entrada, c.lista));
        return { saida: lista.filter(it => comparar(pegar(it, c.campo), c.op || '=', c.valor)), ramo: 0 };
      }
      case 'contar': {
        const lista = comoLista(pegar(entrada, c.lista));
        if (!c.agrupar) return { saida: { total: lista.length }, ramo: 0 };
        const grupos = {};
        lista.forEach(it => { const k = String(pegar(it, c.agrupar) ?? '(vazio)'); grupos[k] = (grupos[k] || 0) + 1; });
        return { saida: { total: lista.length, grupos }, ramo: 0 };
      }
      case 'condicao': {
        const ok = comparar(pegar(entrada, c.campo), c.op || '=', c.valor);
        return { saida: entrada, ramo: ok ? 0 : 1, msg: ok ? 'verdadeiro' : 'falso' };
      }
      case 'definir': {
        const texto = modelo(c.json || '{}', entrada);
        try { return { saida: JSON.parse(texto), ramo: 0 }; }
        catch (e) { throw new Error('JSON inválido depois de preencher os {{campos}}: ' + e.message); }
      }
      case 'http': return requisicao(c.metodo || 'GET', c.caminho || '', c.corpo || '', entrada);
      case 'turing': {
        const corpo = JSON.stringify({ area: modelo(c.area, entrada) || 'Treino de fluxos', pergunta: modelo(c.pergunta, entrada), resposta: modelo(c.resposta, entrada), fonte: 'Fluxos da API · painel' });
        return requisicao('POST', '/api/turing/conhecimento/ensinar', corpo, {}, true);
      }
      case 'saida': return { saida: entrada, ramo: 0 };
      default: throw new Error('Tipo de nó desconhecido: ' + n.tipo);
    }
  }

  async function requisicao(metodo, caminho, corpoModelo, entrada, corpoPronto) {
    const rota = modelo(caminho, entrada).trim();
    if (!/^\/api\/[A-Za-z0-9/_\-.?=&%]*$/.test(rota)) throw new Error('Caminho deve começar com /api/ e não pode ter espaços.');
    const url = (typeof _baseTuring === 'function' ? _baseTuring() : 'https://api.gustavopaulasantos.com.br') + rota;
    let corpo;
    if (metodo !== 'GET' && metodo !== 'DELETE') {
      const txt = corpoPronto ? corpoModelo : modelo(corpoModelo || '{}', entrada);
      try { corpo = JSON.stringify(JSON.parse(txt || '{}')); } catch (e) { throw new Error('Corpo não é JSON válido: ' + e.message); }
    }
    if (metodo !== 'GET') {
      if (simulacao) return { saida: { simulado: true, metodo, url: rota, corpo: corpo ? JSON.parse(corpo) : null, aviso: 'Modo simulação ligado: nada foi enviado à API.' }, ramo: 0, msg: 'simulado' };
      if (!confirm(`${metodo} ${rota}\n\nIsso vai ALTERAR dados reais na API. Continuar?`)) throw new Error('Cancelado por você.');
    }
    const tk = typeof tokenDoCofre === 'function' ? tokenDoCofre() : '';
    const headers = {};
    if (tk) headers.Authorization = 'Bearer ' + tk;
    if (corpo) headers['Content-Type'] = 'application/json';
    const t0 = performance.now();
    const r = await fetch(url, { method: metodo, headers, body: corpo, cache: 'no-store' });
    const ms = Math.round(performance.now() - t0);
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(`HTTP ${r.status} em ${ms} ms: ${d.erro || r.statusText}`);
    return { saida: d, ramo: 0, msg: `HTTP ${r.status} · ${ms} ms` };
  }

  async function executarFluxo() {
    resultados = {};
    desenhar();
    const log = document.getElementById('fx-log');
    log.innerHTML = '';
    const escreve = (t, cls) => { log.insertAdjacentHTML('beforeend', `<div class="fx-log-l ${cls || ''}">${esc(t)}</div>`); };
    const inicios = atual.nos.filter(n => n.tipo === 'gatilho');
    if (!inicios.length) { escreve('Coloque um nó "Início (manual)" para começar.', 'erro'); return; }
    const fila = inicios.map(n => ({ n, entrada: {} }));
    let passos = 0;
    while (fila.length && passos < 100) {
      passos++;
      const { n, entrada } = fila.shift();
      resultados[n.id] = { entrada, status: 'rodando' };
      desenhar();
      try {
        const r = await executarNo(n, entrada);
        resultados[n.id] = { entrada, saida: r.saida, status: r.msg === 'simulado' ? 'simulado' : 'ok', msg: r.msg || '' };
        escreve(`✔ ${n.nome}${r.msg ? ' · ' + r.msg : ''}`, r.msg === 'simulado' ? 'sim' : 'ok');
        atual.ligacoes.filter(l => l.de === n.id && (TIPOS[n.tipo].saidas.length < 2 || l.saida === r.ramo))
          .forEach(l => { const prox = atual.nos.find(x => x.id === l.para); if (prox) fila.push({ n: prox, entrada: r.saida }); });
      } catch (e) {
        resultados[n.id] = { entrada, status: 'erro', msg: e.message };
        escreve(`✖ ${n.nome}: ${e.message}`, 'erro');
      }
      desenhar();
    }
    if (passos >= 100) escreve('Parado: o fluxo passou de 100 passos (verifique se há um laço).', 'erro');
    escreve('Fim da execução. Clique em um nó para ver a entrada e a saída.', '');
    if (selecionado) mostrarNo(selecionado);
  }

  /* ---------------- Desenho do canvas ---------------- */
  const LARG = 180, ALT = 64;
  function portaSaida(n, i) { const k = TIPOS[n.tipo].saidas.length; return { x: n.x + LARG, y: n.y + (k > 1 ? (i === 0 ? 18 : ALT - 18) : ALT / 2) }; }
  function portaEntrada(n) { return { x: n.x, y: n.y + ALT / 2 }; }

  function desenhar() {
    const area = document.getElementById('fx-area');
    if (!area || !atual) return;
    let w = 900, h = 420;
    atual.nos.forEach(n => { w = Math.max(w, n.x + LARG + 80); h = Math.max(h, n.y + ALT + 80); });
    let svg = `<svg class="fx-svg" width="${w}" height="${h}">`;
    atual.ligacoes.forEach((l, i) => {
      const a = atual.nos.find(n => n.id === l.de), b = atual.nos.find(n => n.id === l.para);
      if (!a || !b) return;
      const p = portaSaida(a, l.saida), q = portaEntrada(b);
      const dx = Math.max(40, (q.x - p.x) / 2);
      const ativo = resultados[a.id] && resultados[b.id];
      const d = `M${p.x},${p.y} C${p.x + dx},${p.y} ${q.x - dx},${q.y} ${q.x},${q.y}`;
      svg += `<path d="${d}" class="fx-lig ${ativo ? 'ativa' : ''}"></path><path d="${d}" class="fx-lig-alvo" data-lig="${i}"><title>Clique para remover a ligação</title></path>`;
      if (TIPOS[a.tipo].saidas.length > 1) svg += `<text x="${p.x + 8}" y="${p.y - 6}" class="fx-rotulo">${esc(TIPOS[a.tipo].saidas[l.saida])}</text>`;
    });
    svg += '</svg>';
    const nos = atual.nos.map(n => {
      const t = TIPOS[n.tipo], r = resultados[n.id];
      const st = r ? `<span class="fx-st ${r.status}">${r.status === 'ok' ? '✔' : r.status === 'erro' ? '✖' : r.status === 'simulado' ? 'sim' : '…'}</span>` : '';
      const saidas = t.saidas.map((s, i) => { const p = portaSaida(n, i); return `<span class="fx-porta saida" style="top:${p.y - n.y - 10}px" data-no="${n.id}" data-saida="${i}" title="Saída: ${esc(s)} — clique e depois clique na entrada de outro nó"></span>`; }).join('');
      return `<div class="fx-no ${selecionado === n.id ? 'sel' : ''} ${ligando ? 'ligando' : ''}" data-no="${n.id}" style="left:${n.x}px;top:${n.y}px;border-left-color:${t.cor}">
        ${n.tipo !== 'gatilho' ? `<span class="fx-porta entrada" data-no="${n.id}" title="Entrada"></span>` : ''}
        <i class="ph ${t.icone}" style="color:${t.cor}"></i>
        <div class="fx-no-txt"><strong>${esc(n.nome)}</strong><small>${esc(resumoNo(n))}</small></div>${st}${saidas}</div>`;
    }).join('');
    area.style.width = w + 'px';
    area.style.height = h + 'px';
    area.innerHTML = svg + nos;
    document.getElementById('fx-dica').textContent = ligando ? 'Agora clique na ENTRADA (bolinha da esquerda) do nó de destino. Esc cancela.' : 'Arraste os nós. Para ligar: clique na bolinha da direita de um nó e depois na bolinha da esquerda de outro.';
  }
  function resumoNo(n) {
    const c = n.cfg || {};
    if (n.tipo === 'http') return `${c.metodo || 'GET'} ${c.caminho || ''}`;
    if (n.tipo === 'filtro' || n.tipo === 'condicao') return `${c.campo || ''} ${c.op || ''} ${c.op === 'existe' ? '' : (c.valor || '')}`;
    if (n.tipo === 'campo') return c.caminho || '(entrada inteira)';
    if (n.tipo === 'contar') return c.agrupar ? 'por ' + c.agrupar : 'total';
    return TIPOS[n.tipo].nome;
  }

  /* ---------------- Painel do nó selecionado ---------------- */
  function mostrarNo(id) {
    selecionado = id;
    const n = atual.nos.find(x => x.id === id);
    const box = document.getElementById('fx-config');
    if (!n) { box.innerHTML = '<p class="vault-hint">Clique em um nó para configurar.</p>'; return; }
    const t = TIPOS[n.tipo], r = resultados[n.id];
    const campos = t.campos.map(f => {
      const v = n.cfg[f.id] != null ? n.cfg[f.id] : f.padrao;
      if (f.tipo === 'select') return `<div class="form-group"><label>${esc(f.rotulo)}</label><select class="form-control" data-cfg="${f.id}">${f.opcoes.map(o => `<option ${o === v ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select></div>`;
      if (f.tipo === 'textarea') return `<div class="form-group"><label>${esc(f.rotulo)}</label><textarea class="form-control fx-mono" rows="4" data-cfg="${f.id}">${esc(v)}</textarea></div>`;
      return `<div class="form-group"><label>${esc(f.rotulo)}</label><input class="form-control" data-cfg="${f.id}" value="${esc(v)}"></div>`;
    }).join('');
    const json = v => esc(JSON.stringify(v, null, 2) ?? 'undefined').slice(0, 12000);
    box.innerHTML = `
      <div class="fx-cab"><i class="ph ${t.icone}" style="color:${t.cor}"></i> <strong>${esc(t.nome)}</strong></div>
      <p class="vault-hint">${esc(t.ajuda)}</p>
      <div class="form-group"><label>Nome do nó</label><input class="form-control" data-cfg="__nome" value="${esc(n.nome)}"></div>
      ${campos}
      <h4 class="fx-h4">Ligações deste nó</h4>
      ${(() => { const ls = atual.ligacoes.map((l, i) => ({ l, i })).filter(o => o.l.de === n.id || o.l.para === n.id);
        if (!ls.length) return '<p class="vault-hint">Nenhuma ligação.</p>';
        return ls.map(o => { const outro = atual.nos.find(x => x.id === (o.l.de === n.id ? o.l.para : o.l.de));
          return `<div class="fx-ligrow">${o.l.de === n.id ? 'sai para →' : '← vem de'} <strong>${esc(outro ? outro.nome : '?')}</strong> <button class="btn-action secondary cat2-perigo" data-desligar="${o.i}">Desligar</button></div>`; }).join(''); })()}
      ${t.saidas.length ? `<div class="fx-ligar"><label>Ligar a saída deste nó em:</label>
        ${t.saidas.length > 1 ? `<select class="form-control" id="fx-lig-saida">${t.saidas.map((x, i) => `<option value="${i}">saída: ${esc(x)}</option>`).join('')}</select>` : ''}
        <select class="form-control" id="fx-lig-dest"><option value="">— escolha o nó —</option>${atual.nos.filter(x => x.id !== n.id && x.tipo !== 'gatilho').map(x => `<option value="${esc(x.id)}">${esc(x.nome)}</option>`).join('')}</select>
        <button class="btn-action" id="fx-lig-ok"><i class="ph ph-link"></i> Ligar</button></div>` : ''}
      <div class="btn-row"><button class="btn-action secondary cat2-perigo" id="fx-del-no"><i class="ph ph-trash"></i> Remover nó</button></div>
      ${r ? `<h4 class="fx-h4">Entrada</h4><pre class="fx-pre">${json(r.entrada)}</pre>
             <h4 class="fx-h4">Saída ${r.msg ? '· ' + esc(r.msg) : ''}</h4><pre class="fx-pre ${r.status}">${r.status === 'erro' ? esc(r.msg) : json(r.saida)}</pre>` : '<p class="vault-hint">Execute o fluxo para ver a entrada e a saída deste nó.</p>'}`;
    box.querySelectorAll('[data-cfg]').forEach(el => el.addEventListener('input', () => {
      if (el.dataset.cfg === '__nome') n.nome = el.value; else n.cfg[el.dataset.cfg] = el.value;
      salvar(); desenhar();
    }));
    box.querySelectorAll('[data-desligar]').forEach(bt => bt.onclick = () => { atual.ligacoes.splice(Number(bt.dataset.desligar), 1); salvar(); mostrarNo(n.id); });
    const okLig = box.querySelector('#fx-lig-ok');
    if (okLig) okLig.onclick = () => {
      const para = box.querySelector('#fx-lig-dest').value; if (!para) return;
      const sel = box.querySelector('#fx-lig-saida'); const saida = sel ? Number(sel.value) : 0;
      if (!atual.ligacoes.some(l => l.de === n.id && l.para === para && l.saida === saida)) atual.ligacoes.push({ de: n.id, para, saida });
      salvar(); mostrarNo(n.id);
    };
    box.querySelector('#fx-del-no').onclick = () => {
      atual.nos = atual.nos.filter(x => x.id !== n.id);
      atual.ligacoes = atual.ligacoes.filter(l => l.de !== n.id && l.para !== n.id);
      selecionado = null; salvar(); desenhar(); mostrarNo(null);
    };
    desenhar();
  }

  /* ---------------- Interações ---------------- */
  function ligarEventos() {
    const area = document.getElementById('fx-area');
    let arrasto = null;
    area.addEventListener('pointerdown', ev => {
      const porta = ev.target.closest('.fx-porta');
      if (porta) {
        ev.stopPropagation();
        if (porta.classList.contains('saida')) { ligando = { de: porta.dataset.no, saida: Number(porta.dataset.saida) }; desenhar(); return; }
        if (porta.classList.contains('entrada') && ligando) {
          const para = porta.dataset.no;
          if (para !== ligando.de && !atual.ligacoes.some(l => l.de === ligando.de && l.para === para && l.saida === ligando.saida)) {
            atual.ligacoes.push({ de: ligando.de, para, saida: ligando.saida }); salvar();
          }
          ligando = null; desenhar(); return;
        }
      }
      const caminho = ev.target.closest('.fx-lig-alvo');
      if (caminho) { atual.ligacoes.splice(Number(caminho.dataset.lig), 1); salvar(); desenhar(); return; }
      const el = ev.target.closest('.fx-no');
      if (!el) { if (ligando) { ligando = null; desenhar(); } return; }
      const n = atual.nos.find(x => x.id === el.dataset.no);
      arrasto = { n, dx: ev.clientX - n.x, dy: ev.clientY - n.y, moveu: false };
      el.setPointerCapture(ev.pointerId);
    });
    area.addEventListener('pointermove', ev => {
      if (!arrasto) return;
      arrasto.n.x = Math.max(0, Math.round(ev.clientX - arrasto.dx));
      arrasto.n.y = Math.max(0, Math.round(ev.clientY - arrasto.dy));
      arrasto.moveu = true; desenhar();
    });
    area.addEventListener('pointerup', () => {
      if (!arrasto) return;
      const n = arrasto.n, moveu = arrasto.moveu; arrasto = null;
      if (moveu) salvar();
      mostrarNo(n.id);
    });
    document.addEventListener('keydown', ev => { if (ev.key === 'Escape' && ligando) { ligando = null; desenhar(); } });
  }

  function novoId() { return 'n' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); }
  function adicionarNo(tipo) {
    const t = TIPOS[tipo], cfg = {};
    t.campos.forEach(f => { cfg[f.id] = f.padrao; });
    const ultimo = atual.nos[atual.nos.length - 1];
    const n = { id: novoId(), tipo, x: ultimo ? ultimo.x + 220 : 40, y: ultimo ? ultimo.y : 120, nome: t.nome, cfg };
    atual.nos.push(n);
    if (ultimo && TIPOS[ultimo.tipo].saidas.length === 1) atual.ligacoes.push({ de: ultimo.id, para: n.id, saida: 0 });
    salvar(); desenhar(); mostrarNo(n.id);
  }

  function preencherSeletor() {
    const sel = document.getElementById('fx-sel');
    sel.innerHTML = fluxos.map((f, i) => `<option value="${i}" ${f === atual ? 'selected' : ''}>${esc(f.nome)}</option>`).join('');
  }
  function trocar(i) { atual = fluxos[i]; selecionado = null; resultados = {}; ligando = null; preencherSeletor(); desenhar(); mostrarNo(null); document.getElementById('fx-log').innerHTML = ''; }

  /* ---------------- Montagem da tela ---------------- */
  function montarTela() {
    const tela = document.createElement('div');
    tela.id = 'tela-fluxo-api';
    tela.className = 'tela-interna';
    tela.innerHTML = `
      <p class="vault-hint"><i class="ph ph-info"></i> Monte fluxos ligando blocos, como no n8n. Cada bloco recebe o JSON do anterior, faz uma coisa e passa o resultado adiante. <strong>Modo simulação</strong> ligado: POST, PATCH e DELETE não alteram nada; só mostram o que seria enviado.</p>
      <div class="fx-barra">
        <select id="fx-sel" class="form-control"></select>
        <button class="btn-action secondary" data-acao="novo"><i class="ph ph-file-plus"></i> Novo</button>
        <button class="btn-action secondary" data-acao="renomear"><i class="ph ph-textbox"></i> Renomear</button>
        <button class="btn-action secondary" data-acao="duplicar"><i class="ph ph-copy"></i> Duplicar</button>
        <button class="btn-action secondary cat2-perigo" data-acao="apagar"><i class="ph ph-trash"></i> Apagar</button>
        <button class="btn-action secondary" data-acao="exportar"><i class="ph ph-download-simple"></i> Exportar</button>
        <button class="btn-action secondary" data-acao="importar"><i class="ph ph-upload-simple"></i> Importar</button>
        <button class="btn-action secondary" data-acao="modelos"><i class="ph ph-arrow-counter-clockwise"></i> Restaurar modelos</button>
        <button class="btn-action secondary" data-acao="foco" id="fx-btn-foco"><i class="ph ph-sidebar-simple"></i> Recolher menu</button>
        <label class="fx-sim"><input type="checkbox" id="fx-simulacao" checked> Modo simulação</label>
        <button class="btn-action" data-acao="executar"><i class="ph ph-play"></i> Executar</button>
      </div>
      <div class="fx-grade">
        <aside class="fx-paleta">
          <h4 class="fx-h4">Blocos</h4>
          ${Object.entries(TIPOS).map(([k, t]) => `<button class="fx-bloco" data-tipo="${k}" title="${esc(t.ajuda)}"><i class="ph ${t.icone}" style="color:${t.cor}"></i> ${esc(t.nome)}</button>`).join('')}
          <p class="vault-hint" style="margin-top:10px">Clique num bloco para colocá-lo depois do último nó, já ligado.</p>
        </aside>
        <section class="fx-canvas-box"><p id="fx-dica" class="fx-dica"></p><div class="fx-canvas"><div id="fx-area" class="fx-area"></div></div>
          <h4 class="fx-h4">Execução</h4><div id="fx-log" class="fx-log"></div></section>
        <aside id="fx-config" class="fx-config"></aside>
      </div>
      <input type="file" id="fx-arquivo" accept="application/json" hidden>`;
    const ref = document.getElementById('tela-api') || document.querySelector('.tela-interna');
    if (ref && ref.parentNode) ref.parentNode.appendChild(tela); else document.body.appendChild(tela);

    tela.querySelector('.fx-paleta').addEventListener('click', ev => { const b = ev.target.closest('.fx-bloco'); if (b) adicionarNo(b.dataset.tipo); });
    document.getElementById('fx-sel').addEventListener('change', ev => trocar(Number(ev.target.value)));
    document.getElementById('fx-simulacao').addEventListener('change', ev => {
      if (!ev.target.checked && !confirm('Desligar a simulação faz POST, PATCH e DELETE alterarem dados REAIS na API (cada um ainda pede confirmação). Continuar?')) { ev.target.checked = true; return; }
      simulacao = ev.target.checked;
    });
    tela.querySelector('.fx-barra').addEventListener('click', ev => {
      const b = ev.target.closest('[data-acao]'); if (!b) return;
      const a = b.dataset.acao;
      if (a === 'executar') executarFluxo();
      if (a === 'foco') alternarFoco();
      if (a === 'novo') { const nome = prompt('Nome do novo fluxo:', 'Meu fluxo'); if (!nome) return; fluxos.push({ nome, nos: [{ id: novoId(), tipo: 'gatilho', x: 40, y: 140, nome: TIPOS.gatilho.nome, cfg: {} }], ligacoes: [] }); salvar(); trocar(fluxos.length - 1); }
      if (a === 'renomear') { const nome = prompt('Novo nome:', atual.nome); if (nome) { atual.nome = nome; salvar(); preencherSeletor(); } }
      if (a === 'duplicar') { const c = JSON.parse(JSON.stringify(atual)); c.nome += ' (cópia)'; fluxos.push(c); salvar(); trocar(fluxos.length - 1); }
      if (a === 'apagar') { if (fluxos.length < 2) { alert('Mantenha pelo menos um fluxo.'); return; } if (confirm('Apagar o fluxo "' + atual.nome + '"?')) { fluxos.splice(fluxos.indexOf(atual), 1); salvar(); trocar(0); } }
      if (a === 'exportar') { const blob = new Blob([JSON.stringify(atual, null, 2)], { type: 'application/json' }); const l = document.createElement('a'); l.href = URL.createObjectURL(blob); l.download = 'fluxo-' + atual.nome.replace(/[^a-z0-9]+/gi, '-').toLowerCase() + '.json'; l.click(); URL.revokeObjectURL(l.href); }
      if (a === 'importar') document.getElementById('fx-arquivo').click();
      if (a === 'modelos') { if (confirm('Adicionar de novo os 5 modelos de treino? (seus fluxos continuam)')) { MODELOS.forEach(m => fluxos.push(JSON.parse(JSON.stringify(m)))); salvar(); trocar(fluxos.length - MODELOS.length); } }
    });
    document.getElementById('fx-arquivo').addEventListener('change', async ev => {
      const f = ev.target.files[0]; if (!f) return;
      try {
        const d = JSON.parse(await f.text());
        if (!d || !Array.isArray(d.nos) || !Array.isArray(d.ligacoes) || d.nos.some(n => !TIPOS[n.tipo])) throw new Error('arquivo não é um fluxo válido');
        d.nome = String(d.nome || 'Importado'); fluxos.push(d); salvar(); trocar(fluxos.length - 1);
      } catch (e) { alert('Não foi possível importar: ' + e.message); }
      ev.target.value = '';
    });
    ligarEventos();
  }

  function alternarFoco(forcar, semSalvar) {
    const ligar = typeof forcar === 'boolean' ? forcar : !document.body.classList.contains('fx-foco');
    document.body.classList.toggle('fx-foco', ligar);
    document.documentElement.classList.toggle('fx-foco', ligar);
    document.querySelectorAll('.sidebar, .sidebar-backdrop').forEach(el => { el.style.setProperty('display', ligar ? 'none' : '', ligar ? 'important' : ''); });
    const main = document.querySelector('.main-content');
    if (main) ['margin-left', 'max-width'].forEach(p => main.style.setProperty(p, ligar ? (p === 'margin-left' ? '0' : 'none') : '', ligar ? 'important' : ''));
    if (main && ligar) main.style.setProperty('width', '100%', 'important'); else if (main) main.style.removeProperty('width');
    if (!semSalvar) { try { localStorage.setItem('gps-fluxos-foco', ligar ? '1' : '0'); } catch (e) { /* ignora */ } }
    const bt = document.getElementById('fx-btn-foco');
    if (bt) bt.innerHTML = ligar ? '<i class="ph ph-sidebar-simple"></i> Mostrar menu' : '<i class="ph ph-sidebar-simple"></i> Recolher menu';
  }

  function montarMenu() {
    const grupo = document.querySelector('details.nav-group[data-grupo="NexoTerraCore"]');
    if (!grupo || document.getElementById('nav-fluxo-api')) return;
    const b = document.createElement('button');
    b.className = 'nav-item'; b.id = 'nav-fluxo-api';
    b.setAttribute('onclick', "abrirTela('tela-fluxo-api')");
    b.innerHTML = '<i class="ph ph-flow-arrow"></i> Fluxos da API <em class="nav-badge api">API</em>';
    grupo.appendChild(b);
  }

  function montarCss() {
    const st = document.createElement('style');
    st.id = 'fluxo-api-css';
    st.textContent = `
#tela-fluxo-api .fx-barra{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:12px 0}
#tela-fluxo-api .fx-barra select{max-width:280px}
#tela-fluxo-api .fx-sim{display:flex;gap:6px;align-items:center;margin-left:auto;font-size:.85rem}
#tela-fluxo-api .fx-grade{display:grid;grid-template-columns:200px minmax(0,1fr) 340px;gap:14px;align-items:start}
@media(max-width:1100px){#tela-fluxo-api .fx-grade{grid-template-columns:1fr}}
#tela-fluxo-api .fx-paleta,#tela-fluxo-api .fx-config{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:12px}
#tela-fluxo-api .fx-config{max-height:78vh;overflow:auto}
#tela-fluxo-api .fx-bloco{display:flex;gap:8px;align-items:center;width:100%;text-align:left;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);color:inherit;border-radius:8px;padding:8px;margin-bottom:6px;cursor:pointer;font:inherit;font-size:.85rem}
#tela-fluxo-api .fx-bloco:hover{border-color:rgba(52,211,153,.6)}
#tela-fluxo-api .fx-canvas{overflow:auto;border:1px solid rgba(255,255,255,.08);border-radius:12px;height:460px;background-color:#1b1916;background-image:radial-gradient(rgba(255,255,255,.12) 1px,transparent 1px);background-size:18px 18px}
#tela-fluxo-api .fx-area{position:relative;min-width:100%;min-height:100%;touch-action:none}
#tela-fluxo-api .fx-svg{position:absolute;left:0;top:0;z-index:1}
#tela-fluxo-api .fx-no{z-index:2}
#tela-fluxo-api .fx-lig{fill:none;stroke:rgba(255,255,255,.35);stroke-width:2.5;cursor:pointer}
#tela-fluxo-api .fx-lig-alvo{fill:none;stroke:transparent;stroke-width:16;cursor:pointer;pointer-events:stroke}
#tela-fluxo-api .fx-lig-alvo:hover{stroke:rgba(248,113,113,.45)}
#tela-fluxo-api .fx-lig.ativa{stroke:#34d399}
#tela-fluxo-api .fx-rotulo{fill:#cfc8bc;font-size:11px}
#tela-fluxo-api .fx-no{position:absolute;width:180px;height:64px;display:flex;gap:10px;align-items:center;padding:8px 12px;background:#2a2722;border:1px solid rgba(255,255,255,.14);border-left:4px solid;border-radius:10px;cursor:grab;user-select:none;box-sizing:border-box}
#tela-fluxo-api .fx-no.sel{box-shadow:0 0 0 2px rgba(52,211,153,.6)}
#tela-fluxo-api .fx-no i{font-size:1.4rem}
#tela-fluxo-api .fx-no-txt{min-width:0;display:flex;flex-direction:column}
#tela-fluxo-api .fx-no-txt strong{font-size:.85rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#tela-fluxo-api .fx-no-txt small{font-size:.7rem;opacity:.7;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#tela-fluxo-api .fx-porta{position:absolute;width:20px;height:20px;z-index:3;border-radius:50%;background:#1b1916;border:2px solid #cfc8bc;cursor:crosshair}
#tela-fluxo-api .fx-porta.entrada{left:-11px;top:21px}
#tela-fluxo-api .fx-porta.saida{right:-11px}
#tela-fluxo-api .fx-no.ligando .fx-porta.entrada{border-color:#34d399;background:#34d399}
#tela-fluxo-api .fx-st{position:absolute;top:-9px;right:8px;font-size:.7rem;padding:1px 6px;border-radius:999px;background:#444}
#tela-fluxo-api .fx-st.ok{background:#065f46;color:#d1fae5}
#tela-fluxo-api .fx-st.erro{background:#7f1d1d;color:#fee2e2}
#tela-fluxo-api .fx-st.simulado{background:#78350f;color:#fef3c7}
#tela-fluxo-api .fx-dica{font-size:.8rem;opacity:.75;margin:0 0 6px}
#tela-fluxo-api .fx-log{font-family:ui-monospace,monospace;font-size:.8rem;background:rgba(0,0,0,.25);border-radius:8px;padding:8px;min-height:60px;max-height:180px;overflow:auto}
#tela-fluxo-api .fx-log-l.ok{color:#34d399}#tela-fluxo-api .fx-log-l.erro{color:#f87171}#tela-fluxo-api .fx-log-l.sim{color:#fbbf24}
#tela-fluxo-api .fx-pre{font-family:ui-monospace,monospace;font-size:.75rem;background:rgba(0,0,0,.3);border-radius:8px;padding:8px;max-height:260px;overflow:auto;white-space:pre-wrap;word-break:break-word}
#tela-fluxo-api .fx-pre.erro{color:#f87171}
#tela-fluxo-api .fx-mono{font-family:ui-monospace,monospace;font-size:.8rem}
#tela-fluxo-api .fx-h4{margin:12px 0 6px;font-size:.85rem;opacity:.85}
body.fx-foco .sidebar,body.fx-foco .sidebar-backdrop{display:none !important}
body.fx-foco .main-content{margin-left:0 !important;width:100% !important;max-width:none !important;grid-column:1 / -1 !important;flex:1 1 auto !important}
body.fx-foco #tela-fluxo-api .fx-canvas{height:calc(100vh - 330px);min-height:460px}
#tela-fluxo-api .fx-ligrow{display:flex;gap:8px;align-items:center;justify-content:space-between;margin:4px 0;font-size:.85rem}
#tela-fluxo-api .fx-ligrow .btn-action{padding:4px 10px;font-size:.75rem}
#tela-fluxo-api .fx-ligar{display:grid;gap:6px;margin:10px 0;padding:10px;border:1px dashed rgba(52,211,153,.5);border-radius:8px}
#tela-fluxo-api .fx-cab{display:flex;gap:8px;align-items:center;font-size:1rem;margin-bottom:6px}`;
    document.head.appendChild(st);
  }

  function iniciar() {
    if (typeof window.abrirTela !== 'function' || document.getElementById('tela-fluxo-api')) return;
    montarCss(); montarMenu(); montarTela();
    const original = window.abrirTela;
    window.abrirTela = function (id) {
      original(id);
      if (id !== 'tela-fluxo-api') { if (document.body.classList.contains('fx-foco')) alternarFoco(false, true); return; }
      let foco = false; try { foco = localStorage.getItem('gps-fluxos-foco') === '1'; } catch (e) { /* ignora */ }
      alternarFoco(foco);
      const nav = document.getElementById('nav-fluxo-api');
      if (nav) { nav.classList.add('active-menu'); const g = nav.closest('details.nav-group'); if (g) g.open = true; }
      const t = document.getElementById('titulo-pagina'); if (t) t.innerText = 'Fluxos da API · estilo n8n';
      const h = document.getElementById('header-actions'); if (h) h.innerHTML = '';
      preencherSeletor(); desenhar(); mostrarNo(selecionado);
    };
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
