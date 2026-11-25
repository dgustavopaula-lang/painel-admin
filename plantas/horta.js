/* Horta orgânica real — App de campo. Diário de manejo ligado à NexoTerraCore API (/api/horta).
   Funciona sem internet: as ações ficam no celular e vão para a API quando houver rede. */
'use strict';
(() => {
const API_H = 'https://api.gustavopaulasantos.com.br/api/horta';
const H$ = id => document.getElementById(id);
const hesc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const DIA = 86400000;

// Ciclo real (dias desde a semeadura; "tr" = desde o transplante) e época de plantio — mesmas fichas do Play Farm.
const CULTURAS = {
  alface:     { nome: 'Alface', ic: '🥬', ciclo: [60, 80], tr: [45, 60], br: 'Cerrado: o ano todo; no calor das águas use variedades de verão e sombrite 30–50%.', ao: 'Malanje/planalto: melhor no cacimbo (maio–setembro), com rega.' },
  rucula:     { nome: 'Rúcula', ic: '🥗', ciclo: [30, 45], br: 'Abril a agosto (seca/inverno).', ao: 'Cacimbo (maio–agosto).' },
  cenoura:    { nome: 'Cenoura', ic: '🥕', ciclo: [90, 120], br: 'Variedades de verão (ex.: Brasília) nas águas; de inverno na seca. Semeadura direta.', ao: 'Semear no fim das chuvas e no cacimbo (abril–julho), com rega.' },
  tomatinho:  { nome: 'Tomate-cereja', ic: '🍅', ciclo: [100, 130], tr: [80, 100], br: 'Melhor na seca (menos doenças).', ao: 'Semear de março a maio para produzir no cacimbo.' },
  cebolinha:  { nome: 'Cebolinha', ic: '🧅', ciclo: [60, 80], br: 'O ano todo.', ao: 'O ano todo; canteiro alto nas chuvas.' },
  coentro:    { nome: 'Coentro', ic: '☘️', ciclo: [40, 60], br: 'Gosta de calor: ótimo nas águas.', ao: 'O ano todo, com drenagem nas chuvas.' },
  manjericao: { nome: 'Manjericão', ic: '🌿', ciclo: [60, 90], med: true, br: 'O ano todo, protegendo do frio.', ao: 'Início das chuvas ou o ano todo com rega.' },
  hortela:    { nome: 'Hortelã', ic: '🍃', ciclo: [60, 90], med: true, br: 'O ano todo; meia-sombra; em vaso ou canteiro só dela.', ao: 'O ano todo, com água.' },
  cidreira:   { nome: 'Erva-cidreira', ic: '🍋', ciclo: [70, 90], med: true, br: 'O ano todo. Confirme a espécie (Melissa ou Lippia alba).', ao: 'O ano todo; mudas no início das chuvas.' },
  camomila:   { nome: 'Camomila', ic: '🌼', ciclo: [70, 90], med: true, br: 'Semear no início da seca (abril–maio).', ao: 'Cacimbo: semear em abril–maio.' },
  capimsanto: { nome: 'Capim-santo', ic: '🌾', ciclo: [90, 120], med: true, br: 'O ano todo, pleno sol (mudas).', ao: 'Mudas no início das chuvas (outubro–dezembro).' },
  babosa:     { nome: 'Babosa', ic: '🪴', ciclo: [365, 730], med: true, br: 'O ano todo; pouca água.', ao: 'O ano todo; evite encharcar.' },
};
const AVISO_MED = 'Uso tradicional informativo, sem dose. Na dúvida, procure médico ou farmacêutico.';
const ACOES = [
  ['preparo', '🧹', 'Limpei/preparei'], ['composto', '🟤', 'Pus composto'], ['semeadura', '🌱', 'Semeei'], ['transplante', '🪴', 'Transplantei'],
  ['rega', '💧', 'Reguei'], ['cobertura', '🍂', 'Pus palha'], ['capina', '✂️', 'Capinei'], ['praga', '🐛', 'Vi praga'],
  ['tratamento', '🧄', 'Tratei (natural)'], ['colheita', '🧺', 'Colhi'], ['observacao', '📝', 'Anotação'],
];
const NOME_ACAO = Object.fromEntries(ACOES.map(a => [a[0], a[1] + ' ' + a[2]]));

/* ---------- armazenamento no celular (fila offline + cópia da API) ---------- */
const hdb = new Promise((ok, erro) => {
  const r = indexedDB.open('lab-horta', 1);
  r.onupgradeneeded = () => { r.result.createObjectStore('fila', { keyPath: 'cliente_id' }); r.result.createObjectStore('cache', { keyPath: 'k' }); };
  r.onsuccess = () => ok(r.result); r.onerror = () => erro(r.error);
});
async function htx(loja, modo, fn) {
  const d = await hdb;
  return new Promise((ok, erro) => { const t = d.transaction(loja, modo); const res = fn(t.objectStore(loja));
    t.oncomplete = () => ok(res && 'result' in res ? res.result : undefined); t.onerror = () => erro(t.error); });
}
const filaTodos = () => htx('fila', 'readonly', s => s.getAll());
const filaPor = v => htx('fila', 'readwrite', s => s.put(v));
const filaTira = id => htx('fila', 'readwrite', s => s.delete(id));
const cacheLe = async k => ((await htx('cache', 'readonly', s => s.get(k))) || {}).v;
const cacheGrava = (k, v) => htx('cache', 'readwrite', s => s.put({ k, v }));

async function apiH(caminho, opcoes) {
  const chave = localStorage.getItem('labplantas_chave');
  if (!chave) throw new Error('Cadastre a API Key em Config.');
  const o = Object.assign({ cache: 'no-store' }, opcoes || {});
  o.headers = Object.assign({ Authorization: 'Bearer ' + chave, 'Content-Type': 'application/json' }, o.headers || {});
  const r = await fetch(API_H + caminho, o);
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d.ok) throw new Error(d.erro || 'HTTP ' + r.status);
  return d;
}

let canteiros = [], registros = [], aberto = null, syncH = false;

async function sincronizarHorta() {
  if (syncH) return;
  syncH = true;
  try {
    if (navigator.onLine) {
      for (const f of await filaTodos()) {
        try { await apiH('/registros', { method: 'POST', body: JSON.stringify(f) }); await filaTira(f.cliente_id); }
        catch (e) { if (/não encontrado|inválid|Informe/i.test(e.message)) { await filaTira(f.cliente_id); msg('Um registro foi recusado pela API: ' + e.message); } else throw e; }
      }
      canteiros = (await apiH('/canteiros')).canteiros || [];
      registros = (await apiH('/registros?limite=500')).registros || [];
      await cacheGrava('canteiros', canteiros); await cacheGrava('registros', registros);
      msg('Horta sincronizada com a NexoTerraCore ✅');
    } else msg('Sem internet: mostrando a última cópia; suas ações ficam guardadas no celular.');
  } catch (e) { msg('Não foi possível sincronizar a horta: ' + e.message); }
  finally {
    if (!canteiros.length) { canteiros = (await cacheLe('canteiros')) || []; registros = (await cacheLe('registros')) || []; }
    syncH = false; await renderHorta();
  }
}
const msg = t => { const m = H$('h-msg'); if (m) m.textContent = t; };

/* ---------- leitura do diário: o que está plantado, quando colher, alertas ---------- */
async function regsDo(id) {
  const pend = (await filaTodos()).filter(f => f.canteiro_id === id).map(f => Object.assign({}, f, { _pendente: true }));
  return pend.concat(registros.filter(r => Number(r.canteiro_id) === id))
    .sort((a, b) => new Date(b.ocorrido_em) - new Date(a.ocorrido_em));
}
function situacao(regs) {
  const plantio = regs.find(r => r.tipo === 'semeadura' || r.tipo === 'transplante');
  const colhida = plantio && regs.find(r => r.tipo === 'colheita' && new Date(r.ocorrido_em) >= new Date(plantio.ocorrido_em) && (!r.cultura || r.cultura === plantio.cultura));
  const s = { plantio: null, alertas: [] };
  const ultimo = t => regs.find(r => r.tipo === t);
  if (plantio) {
    const c = CULTURAS[plantio.cultura];
    const dias = Math.floor((Date.now() - new Date(plantio.ocorrido_em)) / DIA);
    s.plantio = { cultura: plantio.cultura, nome: c ? c.ic + ' ' + c.nome : plantio.cultura, dias, colhida: !!colhida };
    if (c) {
      const [a, b] = plantio.tipo === 'transplante' && c.tr ? c.tr : c.ciclo;
      const ini = new Date(new Date(plantio.ocorrido_em).getTime() + a * DIA), fim = new Date(new Date(plantio.ocorrido_em).getTime() + b * DIA);
      s.plantio.previsao = `${ini.toLocaleDateString('pt-BR')} a ${fim.toLocaleDateString('pt-BR')}`;
      if (!colhida && Date.now() >= ini.getTime()) s.alertas.push('🧺 Já está na época de colher (' + s.plantio.previsao + ').');
    }
    if (!colhida) {
      const rega = ultimo('rega');
      const desde = rega && new Date(rega.ocorrido_em) > new Date(plantio.ocorrido_em) ? rega : plantio;
      const sem = Math.floor((Date.now() - new Date(desde.ocorrido_em)) / DIA);
      if (sem >= 2) s.alertas.push(`💧 Sem rega registrada há ${sem} dias (se não choveu, regue).`);
    }
  }
  const praga = ultimo('praga'), trat = ultimo('tratamento');
  if (praga && (!trat || new Date(trat.ocorrido_em) < new Date(praga.ocorrido_em))) s.alertas.push('🐛 Praga anotada e ainda sem tratamento.');
  return s;
}

/* ---------- telas ---------- */
async function renderHorta() {
  const box = H$('h-lista');
  if (!box) return;
  if (!canteiros.length) { box.innerHTML = '<p class="aviso">Nenhum canteiro ainda. Crie o primeiro abaixo.</p>'; }
  else {
    const cards = [];
    for (const c of canteiros) {
      const regs = await regsDo(Number(c.id)), s = situacao(regs);
      const area = c.largura_m && c.comprimento_m ? ` · ${Number(c.largura_m)} × ${Number(c.comprimento_m)} m` : '';
      cards.push(`<div class="item h-cant" data-id="${c.id}"><div class="semfoto">🥬</div><div class="info">
        <strong>${hesc(c.nome)}</strong><em>${hesc(c.local_descricao || '')}${area}</em><br>
        ${s.plantio ? `<span class="badge ${s.plantio.colhida ? 'b-azul' : 'b-verde'}">${hesc(s.plantio.nome)} · ${s.plantio.colhida ? 'colhido' : s.plantio.dias + ' dia(s)'}</span>` : '<span class="badge b-laranja">sem plantio</span>'}
        ${s.alertas.length ? `<span class="badge b-verm">${s.alertas.length} alerta(s)</span>` : ''}
        ${regs.some(r => r._pendente) ? '<span class="badge b-laranja">não enviado</span>' : ''}
      </div></div>`);
    }
    box.innerHTML = cards.join('');
  }
  if (aberto) await abrirCanteiro(aberto, true);
}

async function abrirCanteiro(id, silencioso) {
  aberto = id;
  const c = canteiros.find(x => Number(x.id) === id);
  const det = H$('h-detalhe');
  if (!c) { det.hidden = true; return; }
  const regs = await regsDo(id), s = situacao(regs);
  const ficha = s.plantio && CULTURAS[s.plantio.cultura];
  det.hidden = false;
  det.innerHTML = `<h3 style="margin-top:0">🥬 ${hesc(c.nome)}</h3>
    ${s.plantio ? `<p><strong>${hesc(s.plantio.nome)}</strong> · ${s.plantio.colhida ? 'já colhido' : 'há ' + s.plantio.dias + ' dia(s)'}${s.plantio.previsao && !s.plantio.colhida ? `<br><span class="aviso">Colheita prevista: ${s.plantio.previsao}</span>` : ''}</p>` : '<p class="aviso">Nada plantado ainda. Ordem: 🧹 preparar → 🟤 composto → 🌱 semear → 💧 regar → 🍂 palha.</p>'}
    ${s.alertas.map(t => `<div class="alerta">${hesc(t)}</div>`).join('')}
    ${ficha ? `<p class="aviso">🇧🇷 ${hesc(ficha.br)}<br>🇦🇴 ${hesc(ficha.ao)}${ficha.med ? '<br>⚠ ' + AVISO_MED : ''}</p>` : ''}
    <label>Cultura (para semear, transplantar ou colher)</label>
    <select id="h-cultura">${Object.entries(CULTURAS).map(([k, v]) => `<option value="${k}" ${s.plantio && s.plantio.cultura === k ? 'selected' : ''}>${v.ic} ${v.nome}${v.med ? ' (medicinal)' : ''}</option>`).join('')}</select>
    <div class="linha"><div><label>Quantidade (colheita)</label><input id="h-qtd" type="number" min="0" step="0.1" placeholder="Ex.: 2"></div>
      <div><label>Unidade</label><select id="h-un"><option value="kg">kg</option><option value="maço">maço</option><option value="unidade">unidade</option><option value="pé">pé</option><option value="g">g</option></select></div></div>
    <label>Observação (opcional)</label><input id="h-obs" maxlength="2000" placeholder="Ex.: pulgão nas folhas novas; calda de alho">
    <div class="h-acoes">${ACOES.map(([t, ic, nome]) => `<button class="btn sec h-acao" data-tipo="${t}">${ic}<br><small>${nome}</small></button>`).join('')}</div>
    <h4 style="margin:16px 0 6px">Diário deste canteiro</h4>
    ${regs.length ? '<ul class="h-diario">' + regs.slice(0, 40).map(r => `<li><strong>${NOME_ACAO[r.tipo] || r.tipo}</strong>${r.cultura ? ' · ' + hesc((CULTURAS[r.cultura] || {}).nome || r.cultura) : ''}${r.quantidade != null ? ' · ' + Number(r.quantidade) + ' ' + hesc(r.unidade || '') : ''}${r.observacao ? ' — ' + hesc(r.observacao) : ''}<br><span class="aviso">${new Date(r.ocorrido_em).toLocaleString('pt-BR')}${r._pendente ? ' · ⏳ não enviado' : ''}</span></li>`).join('') + '</ul>' : '<p class="aviso">Nenhum registro ainda.</p>'}
    <button class="btn sec" id="h-arquivar">🗄️ Arquivar canteiro</button>`;
  det.querySelectorAll('.h-acao').forEach(b => b.onclick = () => registrar(id, b.dataset.tipo));
  H$('h-arquivar').onclick = () => arquivar(id);
  if (!silencioso) det.scrollIntoView({ behavior: 'smooth' });
}

async function registrar(id, tipo) {
  const cultura = H$('h-cultura').value, qtd = H$('h-qtd').value, obs = H$('h-obs').value.trim();
  if (tipo === 'colheita' && !qtd) { msg('Informe a quantidade colhida.'); H$('h-qtd').focus(); return; }
  if ((tipo === 'praga' || tipo === 'observacao') && !obs) { msg('Escreva o que você viu em "Observação".'); H$('h-obs').focus(); return; }
  const reg = { cliente_id: 'h' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8), canteiro_id: id, tipo,
    ocorrido_em: new Date().toISOString(), observacao: obs || null };
  if (['semeadura', 'transplante', 'colheita'].includes(tipo)) reg.cultura = cultura;
  if (tipo === 'colheita') { reg.quantidade = Number(qtd); reg.unidade = H$('h-un').value; }
  await filaPor(reg);
  msg(`${NOME_ACAO[tipo]} ✅ ${navigator.onLine ? 'Enviando para a API…' : 'Guardado no celular; vai para a API quando houver internet.'}`);
  await abrirCanteiro(id, true);
  if (navigator.onLine) sincronizarHorta();
}

async function arquivar(id) {
  if (!confirm('Arquivar este canteiro? O diário continua guardado na API.')) return;
  try { await apiH('/canteiros/' + id, { method: 'PATCH', body: JSON.stringify({ ativo: false }) }); aberto = null; H$('h-detalhe').hidden = true; await sincronizarHorta(); }
  catch (e) { msg('Não foi possível arquivar: ' + e.message); }
}

async function criarCanteiro(ev) {
  ev.preventDefault();
  if (!navigator.onLine) { msg('Para criar um canteiro novo é preciso internet (as ações do dia a dia funcionam sem).'); return; }
  const corpo = { nome: H$('hc-nome').value.trim(), largura_m: H$('hc-larg').value || null, comprimento_m: H$('hc-comp').value || null,
    local_descricao: H$('hc-local').value.trim() || null, latitude: H$('hc-lat').value || null, longitude: H$('hc-lon').value || null };
  if (!corpo.nome) { msg('Dê um nome ao canteiro.'); return; }
  try {
    const d = await apiH('/canteiros', { method: 'POST', body: JSON.stringify(corpo) });
    H$('h-form').reset(); msg('Canteiro criado na API ✅'); await sincronizarHorta(); abrirCanteiro(Number(d.canteiro.id));
  } catch (e) { msg('Não foi possível criar: ' + e.message); }
}

function gpsCanteiro() {
  if (!navigator.geolocation) return msg('Este aparelho não informa localização.');
  msg('Obtendo localização…');
  navigator.geolocation.getCurrentPosition(p => { H$('hc-lat').value = p.coords.latitude.toFixed(6); H$('hc-lon').value = p.coords.longitude.toFixed(6); msg('Localização preenchida.'); },
    () => msg('Não foi possível obter a localização.'), { enableHighAccuracy: true, timeout: 20000 });
}

H$('h-lista').addEventListener('click', e => { const el = e.target.closest('.h-cant'); if (el) abrirCanteiro(Number(el.dataset.id)); });
H$('h-form').addEventListener('submit', criarCanteiro);
H$('hc-gps').addEventListener('click', gpsCanteiro);
H$('h-sync').addEventListener('click', sincronizarHorta);
document.querySelector('nav button[data-tela="t-horta"]').addEventListener('click', sincronizarHorta);
window.addEventListener('online', sincronizarHorta);
window.PF_HORTA = { sincronizarHorta, situacao, CULTURAS }; // para testes
})();
