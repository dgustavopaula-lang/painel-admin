/* === GPS.dev Console v4 === */

// ── Constantes ──
const VERSAO = '4.0.0';
const STORAGE_KEY = 'gps_console_v4';
const HASH_PADRAO = '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8'; // sha256 de "password"

const MINI_STATUS = ['Publicado', 'Em desenvolvimento', 'Rascunho', 'Pausado'];
const MINI_CATEGORIAS = ['GPS.dev', 'Turing', 'Nexa Tech', 'Sistema Raiz', 'Agro', 'EduTech', 'Outros'];

// ── Seed: cards reais do ecossistema ──
const SEED_MINIS = [
  // GPS.dev
  { id: 1, nome: 'Conecta', categoria: 'GPS.dev', desc: 'Hub oficial para organizar, apresentar e localizar projetos e mini-softwares.', url: '', status: 'Em desenvolvimento' },
  { id: 2, nome: 'Painel Admin (Console)', categoria: 'GPS.dev', desc: 'Área administrativa central do ecossistema GPS.dev.', url: '', status: 'Publicado' },
  // Turing
  { id: 10, nome: 'Turing IA', categoria: 'Turing', desc: 'Camada de inteligência do NexoTerraCore. Consome a API central.', url: '', status: 'Em desenvolvimento' },
  { id: 11, nome: 'Console do Turing', categoria: 'Turing', desc: 'Painel de operações e monitoramento do Turing.', url: '', status: 'Rascunho' },
  { id: 12, nome: 'Turing Cell', categoria: 'Turing', desc: 'Módulo de segurança e análise do Turing.', url: '', status: 'Rascunho' },
  { id: 13, nome: 'Search & Optimization', categoria: 'Turing', desc: 'Busca e otimização via Turing.', url: '', status: 'Rascunho' },
  // Nexa Tech
  { id: 20, nome: 'Rural Leite', categoria: 'Nexa Tech', desc: 'Gestão leiteira simplificada.', url: '', status: 'Rascunho' },
  { id: 21, nome: 'Aves', categoria: 'Nexa Tech', desc: 'Controle de avicultura.', url: '', status: 'Rascunho' },
  { id: 22, nome: 'Super Gut / Microbioma', categoria: 'Nexa Tech', desc: 'Saúde e microbioma.', url: '', status: 'Rascunho' },
  // Sistema Raiz
  { id: 30, nome: 'Raiz Clínica', categoria: 'Sistema Raiz', desc: 'Mini-software para clínicas e consultórios.', url: '', status: 'Rascunho' },
  { id: 31, nome: 'Mini Mercado', categoria: 'Sistema Raiz', desc: 'PDV e estoque para mercearias.', url: '', status: 'Rascunho' },
  { id: 32, nome: 'Farmácia', categoria: 'Sistema Raiz', desc: 'Controle de estoque farmacêutico.', url: '', status: 'Rascunho' },
  { id: 33, nome: 'Raiz Energia', categoria: 'Sistema Raiz', desc: 'Gestão de energia solar.', url: '', status: 'Rascunho' },
  { id: 34, nome: 'Raiz Comercial', categoria: 'Sistema Raiz', desc: 'ERP comercial simplificado.', url: '', status: 'Rascunho' },
  // Agro
  { id: 40, nome: 'Curral Ágil', categoria: 'Agro', desc: 'PWA offline-first para gado leiteiro da agricultura familiar.', url: '', status: 'Em desenvolvimento' },
  { id: 41, nome: 'Rural Voz', categoria: 'Agro', desc: 'Registro por voz no campo. Offline-first.', url: '', status: 'Rascunho' },
  { id: 42, nome: 'Turing Agro', categoria: 'Agro', desc: 'Gestão inteligente para 4 fazendas: insumos, estoque, custos, alertas.', url: '', status: 'Rascunho' },
  // EduTech
  { id: 50, nome: 'EduTech (Cursos)', categoria: 'EduTech', desc: 'Plataforma de cursos: Inglês, Teologia, Filosofia, IA no Agro, Tech.', url: '', status: 'Em desenvolvimento' },
  { id: 51, nome: 'Mini Fazenda Play', categoria: 'EduTech', desc: 'Simulador educativo de fazenda.', url: '', status: 'Rascunho' },
];

const SEED_VERSION = 4;

// ── Projetos (cards fixos da tela Projetos) ──
const PROJETOS = [
  { nome: 'NexoTerraCore / API', icone: 'ph-plugs-connected', desc: 'Core multitenant: auth, tenants, auditoria, metering. PostgreSQL.', badge: 'Núcleo', badgeCor: 'green', url: '' },
  { nome: 'Turing', icone: 'ph-brain', desc: 'Inteligência do NexoTerraCore. Segurança, análise, decisão.', badge: 'IA', badgeCor: 'blue', url: '' },
  { nome: 'Fazenda PIPE — Malanje', icone: 'ph-farm', desc: 'Piloto agrícola real em Angola. Dados dependem de autorização do Altair.', badge: 'Angola', badgeCor: 'orange', url: '' },
  { nome: 'Agro 5 Fazendas', icone: 'ph-chart-line-up', desc: 'Plataforma multi-fazenda: financeiro, insumos, administração.', badge: 'Proposta', badgeCor: 'orange', url: '' },
  { nome: 'Loteamento Campanha', icone: 'ph-map-trifold', desc: 'Projeto imobiliário ~20.000 m². Aguardando viabilidade municipal.', badge: 'Imóvel', badgeCor: 'orange', url: '' },
  { nome: 'Tourim Protect', icone: 'ph-shield-check', desc: 'Automação WhatsApp e segurança. Separado até Core + Turing estáveis.', badge: 'Separado', badgeCor: 'red', url: '' },
  { nome: 'Paranagel', icone: 'ph-warehouse', desc: 'Prospecção de armazém em Paranaiguara.', badge: 'Prospecção', badgeCor: 'orange', url: '' },
];

// ── Endpoints Turing (mapeados ontem) ──
const ENDPOINTS_TURING = [
  { rota: '/api/turing/training/health', metodo: 'GET', auth: 'Nenhuma (verificar)', status: 'Mapeado' },
  { rota: '/api/turing/training/classificar', metodo: 'POST', auth: 'Verificar', status: 'Mapeado' },
  { rota: '/api/turing/training/feedback', metodo: 'POST', auth: 'Verificar', status: 'Mapeado' },
  { rota: '/api/turing/training/promote', metodo: 'POST', auth: 'TRAINING_APPROVAL_TOKEN', status: 'Protegido' },
  { rota: '/api/turing/centro-oeste', metodo: '*', auth: 'Verificar', status: 'Mapeado' },
  { rota: '/api/turing/angola', metodo: '*', auth: 'autenticar', status: 'Protegido' },
  { rota: '/api/turing/publico', metodo: '*', auth: 'Rate limit', status: 'Público' },
];

// ── Cards API/Turing ──
const CARDS_API = [
  { nome: 'NexoTerraCore API', icone: 'ph-plugs-connected', desc: 'Endpoints, autenticação, tenants, auditoria.', badge: 'Core', badgeCor: 'green', url: '' },
  { nome: 'Turing Training', icone: 'ph-brain', desc: 'Treino com dados sintéticos. Proteger /classificar e /feedback.', badge: 'Pendente', badgeCor: 'orange', url: '' },
  { nome: 'NTCoin / Metering', icone: 'ph-coin', desc: 'Créditos, wallet, ledger PostgreSQL, checkout.', badge: 'Módulo', badgeCor: 'blue', url: '' },
];

// ── Cards Vendas ──
const CARDS_VENDAS_SEED = [
  { id: 'v1', nome: 'Página de Vendas — WordPress', icone: 'ph-storefront', desc: 'Página principal de apresentação e venda dos produtos GPS.dev.', url: '', status: 'Configurar link' },
  { id: 'v2', nome: 'EduTech — Cursos', icone: 'ph-graduation-cap', desc: 'Landing page dos cursos na plataforma Tutor LMS.', url: '', status: 'Configurar link' },
  { id: 'v3', nome: 'Sistema Raiz — Comercial', icone: 'ph-shopping-bag', desc: 'Página de apresentação da linha Sistema Raiz.', url: '', status: 'Configurar link' },
  { id: 'v4', nome: 'Turing Agro — Proposta', icone: 'ph-chart-line-up', desc: 'Página de proposta comercial do Turing Agro.', url: '', status: 'Configurar link' },
];

// ── Estado ──
let appData = {};
let currentView = 'tela-dashboard';

function carregarDados() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    appData = raw ? JSON.parse(raw) : {};
  } catch { appData = {}; }
  if (!appData.senhaHash) appData.senhaHash = HASH_PADRAO;
  if (!appData.tema) appData.tema = 'auto';
  appData.minis = migrarMinis(appData.minis, appData.seedVersion);
  appData.seedVersion = SEED_VERSION;
  appData.vendas = appData.vendas || JSON.parse(JSON.stringify(CARDS_VENDAS_SEED));
  persistData();
}

function persistData() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(appData)); } catch {}
}

function migrarMinis(minis, seedVersion) {
  const lista = Array.isArray(minis) ? minis : [];
  lista.forEach(m => {
    if (!m.categoria) {
      const ref = SEED_MINIS.find(s => s.nome === m.nome);
      m.categoria = ref ? ref.categoria : 'Outros';
    }
  });
  if ((seedVersion || 0) < SEED_VERSION) {
    const nomes = new Set(lista.map(m => m.nome));
    SEED_MINIS.forEach(s => {
      if (!nomes.has(s.nome)) lista.push(JSON.parse(JSON.stringify(s)));
    });
  }
  return lista;
}

// ── SHA-256 ──
async function sha256(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ── Escape ──
function esc(s) { const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }

function urlSegura(u) {
  if (!u) return '';
  try { const p = new URL(u); return ['http:', 'https:'].includes(p.protocol) ? p.href : ''; } catch { return ''; }
}

// ── Gate ──
async function tentarLogin() {
  const input = document.getElementById('gate-pass');
  const hash = await sha256(input.value);
  if (hash === appData.senhaHash) {
    document.getElementById('gate').classList.add('escondido');
    document.getElementById('app').classList.remove('escondido');
    renderTudo();
  } else {
    document.getElementById('gate-erro').textContent = 'Senha incorreta';
    input.value = '';
    input.focus();
  }
}
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !document.getElementById('gate').classList.contains('escondido')) tentarLogin();
});

function sair() {
  document.getElementById('app').classList.add('escondido');
  document.getElementById('gate').classList.remove('escondido');
  document.getElementById('gate-pass').value = '';
  document.getElementById('gate-erro').textContent = '';
}

// ── Navegação ──
document.querySelectorAll('.menu-item').forEach(item => {
  item.addEventListener('click', e => {
    e.preventDefault();
    const tela = item.dataset.tela;
    if (tela) abrirTela(tela);
  });
});

function abrirTela(id) {
  document.querySelectorAll('.tela').forEach(t => t.classList.add('escondido'));
  document.getElementById(id)?.classList.remove('escondido');
  document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('ativo'));
  document.querySelector(`[data-tela="${id}"]`)?.classList.add('ativo');
  currentView = id;
}

// ── Render completo ──
function renderTudo() {
  renderMetricas();
  renderCardsRapidos();
  renderCatalogo();
  renderProjetos();
  renderApi();
  renderVendas();
  aplicarTema();
  preencherFiltros();
}

// ── Dashboard: Métricas ──
function renderMetricas() {
  const el = document.getElementById('metricas');
  const total = appData.minis.length;
  const pub = appData.minis.filter(m => m.status === 'Publicado').length;
  const dev = appData.minis.filter(m => m.status === 'Em desenvolvimento').length;
  const cats = new Set(appData.minis.map(m => m.categoria)).size;
  el.innerHTML = `
    <div class="metrica-card"><div class="valor">${total}</div><div class="rotulo">Mini-softwares</div></div>
    <div class="metrica-card"><div class="valor">${pub}</div><div class="rotulo">Publicados</div></div>
    <div class="metrica-card"><div class="valor">${dev}</div><div class="rotulo">Em desenvolvimento</div></div>
    <div class="metrica-card"><div class="valor">${cats}</div><div class="rotulo">Categorias</div></div>
  `;
}

// ── Dashboard: Cards rápidos ──
function renderCardsRapidos() {
  const el = document.getElementById('cards-rapidos');
  const rapidos = [
    { nome: 'Mini-softwares', icone: 'ph-package', desc: `${appData.minis.length} cadastrados`, acao: () => abrirTela('tela-catalogo') },
    { nome: 'API / Turing', icone: 'ph-plugs-connected', desc: `${ENDPOINTS_TURING.length} endpoints mapeados`, acao: () => abrirTela('tela-api') },
    { nome: 'Projetos', icone: 'ph-folders', desc: `${PROJETOS.length} frentes ativas`, acao: () => abrirTela('tela-projetos') },
    { nome: 'Vendas', icone: 'ph-storefront', desc: 'Páginas de venda e WordPress', acao: () => abrirTela('tela-vendas') },
  ];
  el.innerHTML = rapidos.map((c, i) => `
    <div class="card" style="cursor:pointer" onclick="document.querySelectorAll('.cards-rapidos-fn')[${i}]?.click()">
      <div class="card-titulo"><i class="ph ${c.icone}"></i> ${esc(c.nome)}</div>
      <div class="card-desc">${esc(c.desc)}</div>
    </div>
  `).join('');
  // bind clicks
  el.querySelectorAll('.card').forEach((card, i) => {
    card.onclick = () => rapidos[i].acao();
  });
}

// ── Catálogo ──
function preencherFiltros() {
  const catSel = document.getElementById('filtro-categoria');
  const stSel = document.getElementById('filtro-status');
  const catVal = catSel.value;
  const stVal = stSel.value;
  catSel.innerHTML = '<option value="">Todas as categorias</option>' + MINI_CATEGORIAS.map(c => `<option ${c === catVal ? 'selected' : ''}>${esc(c)}</option>`).join('');
  stSel.innerHTML = '<option value="">Todos os status</option>' + MINI_STATUS.map(s => `<option ${s === stVal ? 'selected' : ''}>${esc(s)}</option>`).join('');
}

function renderCatalogo() {
  const grid = document.getElementById('grid-catalogo');
  const busca = (document.getElementById('busca-catalogo')?.value || '').toLowerCase();
  const catFiltro = document.getElementById('filtro-categoria')?.value || '';
  const stFiltro = document.getElementById('filtro-status')?.value || '';

  let lista = appData.minis.filter(m => {
    if (busca && !m.nome.toLowerCase().includes(busca) && !(m.desc || '').toLowerCase().includes(busca)) return false;
    if (catFiltro && m.categoria !== catFiltro) return false;
    if (stFiltro && m.status !== stFiltro) return false;
    return true;
  });

  if (!lista.length) {
    grid.innerHTML = '<p style="color:var(--text-secondary);padding:20px;">Nenhum mini-software encontrado.</p>';
    return;
  }

  // Agrupar por categoria
  const grupos = {};
  lista.forEach(m => {
    const cat = m.categoria || 'Outros';
    if (!grupos[cat]) grupos[cat] = [];
    grupos[cat].push(m);
  });

  const catOpts = MINI_CATEGORIAS.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
  const statusOpts = s => MINI_STATUS.map(st => `<option ${st === s ? 'selected' : ''}>${esc(st)}</option>`).join('');

  let html = '';
  const ordemCat = MINI_CATEGORIAS.filter(c => grupos[c]);
  ordemCat.forEach(cat => {
    const items = grupos[cat];
    html += `<div class="catalogo-secao">
      <div class="catalogo-secao-titulo">${esc(cat)} <span>${items.length}</span></div>
      <div class="cards-grid">`;
    items.forEach((m, idx) => {
      const href = urlSegura(m.url);
      const statusClass = m.status === 'Publicado' ? 'green' : (m.status === 'Pausado' ? 'red' : 'orange');
      html += `
        <article class="mini-card">
          <div class="mini-card-nome" contenteditable="true" onblur="editarMini(${m.id}, 'nome', this.textContent)">${esc(m.nome)}</div>
          <div class="mini-card-desc" contenteditable="true" onblur="editarMini(${m.id}, 'desc', this.textContent)" data-placeholder="Descrição...">${esc(m.desc)}</div>
          <div class="mini-card-url">
            <input type="url" value="${esc(m.url)}" placeholder="https://..." onchange="editarMini(${m.id}, 'url', this.value)">
          </div>
          ${href ? `<a href="${href}" target="_blank" rel="noopener" class="card-link"><i class="ph ph-arrow-square-out"></i> Abrir</a>` : ''}
          <div class="mini-card-footer">
            <select class="mini-status" title="Status" onchange="editarMini(${m.id}, 'status', this.value)">${statusOpts(m.status)}</select>
            <select class="mini-status" title="Categoria" onchange="editarMini(${m.id}, 'categoria', this.value)">${MINI_CATEGORIAS.map(c => `<option ${c === m.categoria ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select>
            <div class="action-btns">
              <button class="btn-icon" title="Excluir" onclick="deletarMini(${m.id})"><i class="ph ph-trash"></i></button>
            </div>
          </div>
        </article>`;
    });
    html += '</div></div>';
  });
  grid.innerHTML = html;
  renderMetricas();
}

function editarMini(id, campo, valor) {
  const item = appData.minis.find(x => x.id === id);
  if (!item) return;
  item[campo] = (valor || '').trim();
  persistData();
  if (campo === 'status' || campo === 'categoria') renderCatalogo();
}

function adicionarMini() {
  appData.minis.unshift({ id: Date.now(), nome: 'Novo mini-software', categoria: 'Outros', desc: '', url: '', status: 'Rascunho' });
  persistData();
  if (currentView !== 'tela-catalogo') abrirTela('tela-catalogo');
  renderCatalogo();
}

function deletarMini(id) {
  if (!confirm('Excluir este mini-software?')) return;
  appData.minis = appData.minis.filter(x => x.id !== id);
  persistData();
  renderCatalogo();
}

// ── Projetos ──
function renderProjetos() {
  const el = document.getElementById('cards-projetos');
  el.innerHTML = PROJETOS.map(p => `
    <div class="card">
      <div class="card-titulo"><i class="ph ${p.icone}"></i> ${esc(p.nome)}</div>
      <div class="card-desc">${esc(p.desc)}</div>
      <div class="card-footer">
        <span class="badge badge-${p.badgeCor}">${esc(p.badge)}</span>
        ${p.url ? `<a href="${urlSegura(p.url)}" target="_blank" rel="noopener" class="card-link"><i class="ph ph-arrow-square-out"></i> Abrir</a>` : '<span class="card-link pendente"><i class="ph ph-link-simple"></i> Link pendente</span>'}
      </div>
    </div>
  `).join('');
}

// ── API / Turing ──
function renderApi() {
  const el = document.getElementById('cards-api');
  el.innerHTML = CARDS_API.map(c => `
    <div class="card">
      <div class="card-titulo"><i class="ph ${c.icone}"></i> ${esc(c.nome)}</div>
      <div class="card-desc">${esc(c.desc)}</div>
      <div class="card-footer">
        <span class="badge badge-${c.badgeCor}">${esc(c.badge)}</span>
        ${c.url ? `<a href="${urlSegura(c.url)}" target="_blank" rel="noopener" class="card-link"><i class="ph ph-arrow-square-out"></i> Abrir</a>` : '<span class="card-link pendente"><i class="ph ph-link-simple"></i> Link pendente</span>'}
      </div>
    </div>
  `).join('');

  const tbody = document.querySelector('#tabela-endpoints tbody');
  tbody.innerHTML = ENDPOINTS_TURING.map(e => `
    <tr>
      <td><code>${esc(e.rota)}</code></td>
      <td>${esc(e.metodo)}</td>
      <td>${esc(e.auth)}</td>
      <td><span class="badge badge-${e.status === 'Protegido' ? 'green' : (e.status === 'Público' ? 'blue' : 'orange')}">${esc(e.status)}</span></td>
    </tr>
  `).join('');
}

// ── Vendas ──
function renderVendas() {
  const el = document.getElementById('cards-vendas');
  el.innerHTML = appData.vendas.map(v => {
    const href = urlSegura(v.url);
    return `
      <div class="card">
        <div class="card-titulo"><i class="ph ${v.icone}"></i> ${esc(v.nome)}</div>
        <div class="card-desc">${esc(v.desc)}</div>
        <div style="margin-top:6px;">
          <input type="url" value="${esc(v.url)}" placeholder="https://seudominio.com.br/pagina"
            onchange="editarVenda('${v.id}', this.value)" style="width:100%;padding:6px 10px;font-size:12px;border:1px solid var(--border);border-radius:4px;background:var(--bg);color:var(--text);">
        </div>
        <div class="card-footer">
          <span class="badge ${href ? 'badge-green' : 'badge-orange'}">${href ? 'Configurado' : 'Configurar link'}</span>
          ${href ? `<a href="${href}" target="_blank" rel="noopener" class="card-link"><i class="ph ph-arrow-square-out"></i> Abrir</a>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

function editarVenda(id, url) {
  const item = appData.vendas.find(v => v.id === id);
  if (item) { item.url = (url || '').trim(); persistData(); renderVendas(); }
}

// ── Tema ──
function aplicarTema() {
  if (appData.tema === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
  else if (appData.tema === 'light') document.documentElement.setAttribute('data-theme', 'light');
  else document.documentElement.removeAttribute('data-theme');
}

function alternarTema() {
  const temas = ['auto', 'dark', 'light'];
  const idx = temas.indexOf(appData.tema || 'auto');
  appData.tema = temas[(idx + 1) % temas.length];
  persistData();
  aplicarTema();
}

// ── Backup ──
function exportarBackup() {
  const blob = new Blob([JSON.stringify(appData, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `gps-console-backup-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function importarBackup(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const dados = JSON.parse(reader.result);
      if (!confirm('Substituir todos os dados do console pelo backup?')) return;
      appData = dados;
      persistData();
      renderTudo();
      alert('Backup restaurado.');
    } catch { alert('Arquivo inválido.'); }
  };
  reader.readAsText(file);
}

// ── Senha ──
async function mudarSenha() {
  const nova = prompt('Nova senha:');
  if (!nova || nova.length < 4) { alert('Mínimo 4 caracteres.'); return; }
  appData.senhaHash = await sha256(nova);
  persistData();
  alert('Senha alterada.');
}

// ── Limpar dados ──
function limparDados() {
  if (!confirm('ATENÇÃO: Isso apaga TODOS os dados do console. Tem certeza?')) return;
  if (!confirm('Última chance. Continuar?')) return;
  localStorage.removeItem(STORAGE_KEY);
  location.reload();
}

// ── Offline ──
function atualizarBadgeOffline() {
  const badge = document.getElementById('offline-badge');
  if (badge) badge.classList.toggle('visivel', !navigator.onLine);
}
window.addEventListener('online', atualizarBadgeOffline);
window.addEventListener('offline', atualizarBadgeOffline);

// ── Service Worker ──
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

// ── Init ──
carregarDados();
atualizarBadgeOffline();
