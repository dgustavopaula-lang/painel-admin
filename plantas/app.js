/* Laboratório de Plantas — PWA offline-first ligado à NexoTerraCore API (/api/plantas).
   Registro para pesquisa botânica. Não indica uso, dose ou preparo de plantas. */
'use strict';

const API = 'https://api.gustavopaulasantos.com.br/api/plantas';
const CHAVE_LS = 'labplantas_chave';
const STATUS = { a_identificar: 'A identificar', identificada: 'Identificada', enviada_pesquisa: 'Enviada p/ pesquisa', descartada: 'Descartada' };
const CAMPOS = {
  'f-nome': 'nome_popular', 'f-cientifico': 'nome_cientifico', 'f-familia': 'familia', 'f-parte': 'parte_usada',
  'f-local-desc': 'local_descricao', 'f-uso': 'uso_tradicional', 'f-alerta': 'alerta', 'f-notas': 'notas', 'f-status': 'status'
};
const PARADAS = new Set('para pela pelo como mais muito pouco tambem também usado usada usa usam folha folhas casca cascas raiz raizes raízes flor flores chá cha planta plantas uma umas uns que com sem dos das nos nas por sobre contra tratar tratamento'.split(' '));

const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let fotosForm = [];          // Blobs da planta em edição
let urlsTemp = [];           // object URLs para liberar

/* ---------------- IndexedDB ---------------- */
const db = new Promise((ok, erro) => {
  const r = indexedDB.open('lab-plantas', 1);
  r.onupgradeneeded = () => {
    r.result.createObjectStore('registros', { keyPath: 'localId' });
    r.result.createObjectStore('remotas', { keyPath: 'id' });
  };
  r.onsuccess = () => ok(r.result);
  r.onerror = () => erro(r.error);
});
async function tx(loja, modo, fn) {
  const d = await db;
  return new Promise((ok, erro) => {
    const t = d.transaction(loja, modo);
    const res = fn(t.objectStore(loja));
    t.oncomplete = () => ok(res && 'result' in res ? res.result : undefined);
    t.onerror = () => erro(t.error);
  });
}
const todos = loja => tx(loja, 'readonly', s => s.getAll());
const gravar = (loja, v) => tx(loja, 'readwrite', s => s.put(v));
const limparLoja = loja => tx(loja, 'readwrite', s => s.clear());

/* ---------------- Fotos: reduz no próprio celular ---------------- */
function reduzirFoto(arquivo, max = 1280) {
  return new Promise((ok, erro) => {
    const img = new Image();
    const url = URL.createObjectURL(arquivo);
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      c.toBlob(b => b ? ok(b) : erro(new Error('falha ao converter foto')), 'image/jpeg', 0.8);
    };
    img.onerror = () => { URL.revokeObjectURL(url); erro(new Error('foto inválida')); };
    img.src = url;
  });
}
function mostrarFotosForm() {
  urlsTemp.forEach(u => URL.revokeObjectURL(u)); urlsTemp = [];
  $('f-fotos').innerHTML = fotosForm.map((b, i) => {
    const u = URL.createObjectURL(b); urlsTemp.push(u);
    return `<img src="${u}" alt="foto ${i + 1}" title="Toque para remover" data-i="${i}">`;
  }).join('');
}
$('f-foto').addEventListener('change', async e => {
  for (const f of e.target.files) {
    try { fotosForm.push(await reduzirFoto(f)); } catch (er) { $('f-msg').textContent = er.message; }
  }
  e.target.value = '';
  mostrarFotosForm();
});
$('f-fotos').addEventListener('click', e => {
  const i = e.target.dataset && e.target.dataset.i;
  if (i !== undefined && confirm('Remover esta foto?')) { fotosForm.splice(Number(i), 1); mostrarFotosForm(); }
});

/* ---------------- Formulário ---------------- */
function lerForm() {
  const d = {};
  for (const [el, campo] of Object.entries(CAMPOS)) d[campo] = $(el).value.trim();
  d.quantidade = $('f-qtd').value;
  d.latitude = $('f-lat').value;
  d.longitude = $('f-lon').value;
  d.toxica = $('f-toxica').checked;
  return d;
}
function limparForm() {
  $('form').reset(); $('f-local').value = ''; fotosForm = []; mostrarFotosForm();
  $('b-salvar').textContent = '💾 Salvar (funciona sem internet)';
}
$('b-limpar').addEventListener('click', () => { limparForm(); $('f-msg').textContent = ''; });

$('b-gps').addEventListener('click', () => {
  if (!navigator.geolocation) { $('f-msg').textContent = 'Este aparelho não informa localização.'; return; }
  $('f-msg').textContent = 'Obtendo localização (o GPS funciona sem internet)…';
  navigator.geolocation.getCurrentPosition(p => {
    $('f-lat').value = p.coords.latitude.toFixed(6);
    $('f-lon').value = p.coords.longitude.toFixed(6);
    $('f-msg').textContent = 'Localização preenchida (precisão ~' + Math.round(p.coords.accuracy) + ' m).';
  }, () => { $('f-msg').textContent = 'Não foi possível obter a localização. Permita o acesso ao local.'; },
  { enableHighAccuracy: true, timeout: 20000 });
});

$('form').addEventListener('submit', async e => {
  e.preventDefault();
  const dados = lerForm();
  if (!dados.nome_popular) { $('f-msg').textContent = 'Informe o nome popular.'; return; }
  const localId = $('f-local').value || ('L' + Date.now());
  const antigo = (await todos('registros')).find(r => r.localId === localId);
  await gravar('registros', {
    localId, apiId: antigo ? antigo.apiId : null, dados, fotos: fotosForm.slice(),
    sync: 'pendente', alteradoEm: new Date().toISOString()
  });
  limparForm();
  $('f-msg').textContent = 'Salvo no celular ✅ ' + (navigator.onLine ? 'Enviando para a API…' : 'Será enviado quando houver internet.');
  await atualizarContador();
  if (navigator.onLine) sincronizar();
});

/* ---------------- Sincronização com a API ---------------- */
async function chamarApi(caminho, opcoes) {
  const chave = localStorage.getItem(CHAVE_LS);
  if (!chave) throw new Error('Cadastre a API Key em Config.');
  const o = Object.assign({ cache: 'no-store' }, opcoes || {});
  o.headers = Object.assign({ Authorization: 'Bearer ' + chave }, o.headers || {});
  const r = await fetch(API + (caminho || ''), o);
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d.ok) throw new Error(d.erro || 'HTTP ' + r.status);
  return d;
}
let sincronizando = false;
async function sincronizar() {
  if (sincronizando) return;
  if (!navigator.onLine) { $('sync-msg').textContent = 'Sem internet: os registros continuam guardados no celular.'; return; }
  sincronizando = true;
  $('sync-msg').textContent = 'Sincronizando…';
  let enviados = 0, falhas = 0, ultimoErro = '';
  try {
    for (const r of await todos('registros')) {
      if (r.sync !== 'pendente') continue;
      try {
        const corpo = JSON.stringify(r.dados);
        const res = r.apiId
          ? await chamarApi('/' + r.apiId, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: corpo })
          : await chamarApi('', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: corpo });
        r.apiId = res.planta.id; r.sync = 'ok';
        await gravar('registros', r);
        enviados++;
      } catch (er) { falhas++; ultimoErro = er.message; }
    }
    const lista = (await chamarApi('')).plantas || [];
    await limparLoja('remotas');
    for (const p of lista) await gravar('remotas', p);
    $('sync-msg').textContent = `Sincronizado: ${enviados} enviado(s), ${lista.length} na API` + (falhas ? ` · ${falhas} falha(s): ${ultimoErro}` : '') + '.';
  } catch (er) {
    $('sync-msg').textContent = 'Não foi possível sincronizar: ' + er.message;
  } finally {
    sincronizando = false;
    await atualizarContador();
    await renderLista();
  }
}
$('b-sync').addEventListener('click', sincronizar);
window.addEventListener('online', () => { atualizarRede(); sincronizar(); });
window.addEventListener('offline', atualizarRede);

/* ---------------- Lista e análise comparativa ---------------- */
async function plantasUnificadas() {
  const locais = await todos('registros');
  const remotas = await todos('remotas');
  const idsLocais = new Set(locais.map(r => r.apiId).filter(Boolean));
  const doCelular = locais.map(r => Object.assign({}, r.dados, { _local: r.localId, _sync: r.sync, _fotos: r.fotos || [], id: r.apiId }));
  const daApi = remotas.filter(p => !idsLocais.has(p.id)).map(p => Object.assign({}, p, { _fotos: [], _sync: 'ok' }));
  return doCelular.concat(daApi);
}
const genero = p => ((p.nome_cientifico || '').trim().split(/\s+/)[0] || '').toLowerCase();
const familia = p => (p.familia || '').trim().toLowerCase();
const tokens = (txt, minimo) => new Set(String(txt || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .split(/[^a-z0-9]+/).filter(w => w.length >= minimo && !PARADAS.has(w)));

function analisar(alvo, todas) {
  const outras = todas.filter(p => p !== alvo);
  const g = genero(alvo), f = familia(alvo);
  const mesmoGenero = g ? outras.filter(p => genero(p) === g) : [];
  const mesmaFamilia = f ? outras.filter(p => familia(p) === f && !mesmoGenero.includes(p)) : [];
  const partesAlvo = tokens(alvo.parte_usada, 3);
  const mesmaParte = partesAlvo.size ? outras.filter(p => [...tokens(p.parte_usada, 3)].some(t => partesAlvo.has(t))) : [];
  const usoAlvo = tokens(alvo.uso_tradicional, 4);
  const usoParecido = usoAlvo.size ? outras.map(p => {
    const comuns = [...tokens(p.uso_tradicional, 4)].filter(t => usoAlvo.has(t));
    return { p, comuns };
  }).filter(x => x.comuns.length).sort((a, b) => b.comuns.length - a.comuns.length).slice(0, 5) : [];
  const alertas = [];
  if (alvo.toxica) alertas.push('Esta planta está marcada com risco de toxicidade' + (alvo.alerta ? ': ' + alvo.alerta : '.'));
  for (const p of mesmoGenero.concat(mesmaFamilia)) if (p.toxica) alertas.push(`Parente registrado com risco de toxicidade: ${p.nome_popular}${p.nome_cientifico ? ' (' + p.nome_cientifico + ')' : ''}. Plantas aparentadas podem ter substâncias semelhantes.`);
  const pendencias = [];
  if (!alvo.nome_cientifico) pendencias.push('Falta o nome científico: identifique no Pl@ntNet e confirme com um especialista.');
  if (!alvo.familia) pendencias.push('Falta a família botânica: ela permite comparar com plantas aparentadas.');
  if (alvo.latitude == null || alvo.latitude === '') pendencias.push('Falta a localização: registre o GPS para voltar ao pé e para a pesquisa.');
  if (!(alvo._fotos || []).length) pendencias.push('Sem fotos neste aparelho: fotografe folha, flor, casca e a árvore inteira.');
  return { mesmoGenero, mesmaFamilia, mesmaParte, usoParecido, alertas, pendencias };
}

const nomeCurto = p => `${esc(p.nome_popular)}${p.nome_cientifico ? ' <em>(' + esc(p.nome_cientifico) + ')</em>' : ''}`;
const listaHtml = arr => arr.length ? '<ul>' + arr.map(p => `<li>${nomeCurto(p)}</li>`).join('') + '</ul>' : '<p class="aviso">Nenhuma ainda.</p>';

async function renderLista() {
  const todas = await plantasUnificadas();
  const q = $('busca').value.trim().toLowerCase();
  const filtradas = todas.filter(p => !q || [p.nome_popular, p.nome_cientifico, p.familia, p.uso_tradicional, p.parte_usada]
    .some(v => String(v || '').toLowerCase().includes(q)));
  $('lista').innerHTML = filtradas.length ? filtradas.map((p, i) => {
    const thumb = p._fotos.length ? `<img src="${URL.createObjectURL(p._fotos[0])}" alt="">` : '<div class="semfoto">🌿</div>';
    return `<div class="item" data-i="${todas.indexOf(p)}">${thumb}<div class="info">
      <strong>${esc(p.nome_popular)}</strong><em>${esc(p.nome_cientifico || 'nome científico a confirmar')}</em><br>
      <span class="badge ${p.status === 'identificada' ? 'b-verde' : p.status === 'enviada_pesquisa' ? 'b-azul' : p.status === 'descartada' ? 'b-verm' : 'b-laranja'}">${esc(STATUS[p.status] || p.status || 'A identificar')}</span>
      ${p.toxica ? '<span class="badge b-verm">⚠ tóxica</span>' : ''}
      ${p._sync === 'pendente' ? '<span class="badge b-laranja">não enviada</span>' : ''}
    </div></div>`;
  }).join('') : '<p class="aviso">Nenhuma planta encontrada.</p>';
  $('lista').onclick = e => {
    const el = e.target.closest('.item');
    if (el) mostrarDetalhe(todas[Number(el.dataset.i)], todas);
  };
}
$('busca').addEventListener('input', renderLista);

function mostrarDetalhe(p, todas) {
  const a = analisar(p, todas);
  const fotos = p._fotos.map(b => `<img src="${URL.createObjectURL(b)}" alt="">`).join('');
  $('detalhe').hidden = false;
  $('detalhe').innerHTML = `
    <h3 style="margin-top:0">${nomeCurto(p)}</h3>
    ${fotos ? `<div class="fotos">${fotos}</div>` : ''}
    <p class="aviso">${[p.familia ? 'Família: ' + esc(p.familia) : '', p.parte_usada ? 'Parte: ' + esc(p.parte_usada) : '', p.quantidade ? esc(p.quantidade) + ' pé(s)' : '', p.local_descricao ? esc(p.local_descricao) : ''].filter(Boolean).join(' · ')}</p>
    ${p.uso_tradicional ? `<p class="aviso"><strong>Uso tradicional relatado:</strong> ${esc(p.uso_tradicional)}</p>` : ''}
    ${a.alertas.map(t => `<div class="alerta">⚠ ${esc(t)}</div>`).join('')}
    <div class="rel">
      <h4>Mesmo gênero (${a.mesmoGenero.length})</h4>${listaHtml(a.mesmoGenero)}
      <h4>Mesma família (${a.mesmaFamilia.length})</h4>${listaHtml(a.mesmaFamilia)}
      <h4>Mesma parte de interesse (${a.mesmaParte.length})</h4>${listaHtml(a.mesmaParte)}
      <h4>Usos tradicionais parecidos (${a.usoParecido.length})</h4>
      ${a.usoParecido.length ? '<ul>' + a.usoParecido.map(x => `<li>${nomeCurto(x.p)} — em comum: ${esc(x.comuns.join(', '))}</li>`).join('') + '</ul>' : '<p class="aviso">Nenhum ainda.</p>'}
      <h4>O que falta para a pesquisa</h4>
      ${a.pendencias.length ? '<ul>' + a.pendencias.map(t => `<li>${esc(t)}</li>`).join('') + '</ul>' : '<p class="aviso">Registro completo ✅</p>'}
    </div>
    <p class="aviso">A comparação aponta parentesco e semelhanças para orientar a pesquisa. Ela não indica que a planta funciona ou é segura.</p>
    ${p._local ? `<button class="btn sec" id="b-editar">✏️ Editar este registro</button>` : ''}`;
  if (p._local) $('b-editar').onclick = () => editar(p._local);
  $('detalhe').scrollIntoView({ behavior: 'smooth' });
}

async function editar(localId) {
  const r = (await todos('registros')).find(x => x.localId === localId);
  if (!r) return;
  limparForm();
  $('f-local').value = r.localId;
  for (const [el, campo] of Object.entries(CAMPOS)) $(el).value = r.dados[campo] ?? '';
  $('f-qtd').value = r.dados.quantidade ?? ''; $('f-lat').value = r.dados.latitude ?? ''; $('f-lon').value = r.dados.longitude ?? '';
  $('f-toxica').checked = !!r.dados.toxica;
  fotosForm = (r.fotos || []).slice(); mostrarFotosForm();
  $('b-salvar').textContent = '💾 Salvar alterações';
  abrir('t-registrar');
}

/* ---------------- Config, navegação e estado ---------------- */
$('b-chave').addEventListener('click', () => {
  const v = $('c-chave').value.trim().replace(/^Bearer\s+/i, '');
  if (!/^ntc_live_[A-Za-z0-9_-]{20,}$/.test(v)) { $('c-msg').textContent = 'A chave deve começar com ntc_live_.'; return; }
  localStorage.setItem(CHAVE_LS, v); $('c-chave').value = '';
  $('c-msg').textContent = 'Chave salva neste aparelho ✅';
});
$('b-testar').addEventListener('click', async () => {
  $('c-msg').textContent = 'Testando…';
  try { const d = await chamarApi(''); $('c-msg').textContent = `Conectado ✅ ${d.total} planta(s) na API.`; }
  catch (e) { $('c-msg').textContent = 'Falhou: ' + e.message; }
});

function abrir(id) {
  document.querySelectorAll('.tela').forEach(t => t.classList.toggle('ativa', t.id === id));
  document.querySelectorAll('nav button').forEach(b => b.classList.toggle('ativo', b.dataset.tela === id));
  if (id === 't-plantas') { $('detalhe').hidden = true; renderLista(); }
}
document.querySelectorAll('nav button').forEach(b => b.addEventListener('click', () => abrir(b.dataset.tela)));

function atualizarRede() {
  const on = navigator.onLine;
  $('rede').textContent = on ? 'online' : 'offline';
  $('rede').className = 'pill ' + (on ? 'on' : 'off');
}
async function atualizarContador() {
  const n = (await todos('registros')).filter(r => r.sync === 'pendente').length;
  $('pendentes').hidden = !n;
  $('pendentes').textContent = n + ' a enviar';
}

atualizarRede();
atualizarContador();
if (!localStorage.getItem(CHAVE_LS)) abrir('t-config');
if ('serviceWorker' in navigator) navigator.serviceWorker.register('/plantas/sw.js', { scope: '/plantas/' }).catch(() => {});
if (navigator.onLine && localStorage.getItem(CHAVE_LS)) sincronizar();
