/* ============================================================
   GPS.dev — Admin Console
   Gate de acesso local + cofre de senhas criptografado (AES-GCM).

   IMPORTANTE (leia o README.md): isto NÃO é autenticação de servidor.
   É uma página estática. O gate apenas esconde a tela; quem souber a
   senha certa também consegue derivar a chave e decifrar o cofre no
   próprio navegador. A proteção real contra terceiros é o repositório
   ser PRIVADO e o acesso à máquina/navegador ser seu.
   ============================================================ */

const STORAGE_AUTH = 'gps_console_auth_v1';
const STORAGE_DATA = 'gps_console_data_v1';
const STORAGE_VAULT = 'gps_console_vault_v1';
const PBKDF2_ITERATIONS = 210000;
const CHECK_PLAINTEXT = 'gps-console-ok';

let appData = {
  financeiro: [],
  clientes: [],
  posts: [],
  projetos: {},
  minis: [],
  vendas: [],
  treino: [],
  config: {},
  senhas: []
};

/* ---------------- v5: vendas, API/Turing ---------------- */

const VENDAS_STATUS = ['A configurar', 'Em edição', 'No ar'];
const TREINO_ORIGENS = ['Sintético', 'Público', 'Centro-Oeste', 'Fazenda PIPE / Malanje'];
// Origens que só podem sair da fila local com autorização explícita (Altair).
const TREINO_ORIGENS_RESTRITAS = ['Fazenda PIPE / Malanje'];
const TOKEN_SERVICO = 'turing api token'; // nome do item no cofre (comparação sem maiúsculas)

// Links ficam vazios de propósito: preencha com as URLs reais pelo painel.
const SEED_VENDAS = [
  { id: 1, nome: 'Site WordPress (principal)', desc: 'Página institucional da GPS.dev no WordPress.', url: '', status: 'A configurar' },
  { id: 2, nome: 'EduTech — cursos (Tutor LMS)', desc: 'Cursos próprios: Inglês, Teologia, Filosofia, IA no agro e Tecnologia.', url: '', status: 'A configurar' },
  { id: 3, nome: 'Sistema Raiz — página de venda', desc: 'Linha de mini-softwares modulares (Mini, Cloud Mini, Pro Cloud). Página no WordPress, a editar.', url: 'https://gustavopaulasantos.com.br', status: 'Em edição' },
  { id: 4, nome: 'Turing Agro — proposta', desc: 'Inteligência e gestão para fazendas: insumos, estoque, máquinas, custos e alertas.', url: '', status: 'A configurar' }
];

const SEED_ENDPOINTS = [
  { rota: '/api/turing/training/health', metodo: 'GET', auth: 'Nenhuma (verificar)', verificado: false },
  { rota: '/api/turing/training/classificar', metodo: 'POST', auth: 'Verificar', verificado: false },
  { rota: '/api/turing/training/feedback', metodo: 'POST', auth: 'Verificar', verificado: false },
  { rota: '/api/turing/training/promote', metodo: 'POST', auth: 'TRAINING_APPROVAL_TOKEN', verificado: false },
  { rota: '/api/turing/centro-oeste', metodo: '*', auth: 'Verificar', verificado: false },
  { rota: '/api/turing/angola', metodo: '*', auth: 'Autenticar', verificado: false },
  { rota: '/api/turing/publico', metodo: '*', auth: 'Rate limit', verificado: false }
];

function configPadrao() {
  return { apiBase: '', treinoPath: '/api/turing/training/feedback', endpoints: JSON.parse(JSON.stringify(SEED_ENDPOINTS)) };
}

function normalizarConfig(cfg) {
  const base = configPadrao();
  const c = Object.assign(base, cfg || {});
  if (!Array.isArray(c.endpoints) || !c.endpoints.length) c.endpoints = base.endpoints;
  return c;
}

const MINI_STATUS = ['Publicado', 'Em desenvolvimento', 'Rascunho', 'Pausado'];
const MINI_CATEGORIAS = ['GPS.dev', 'Turing', 'Nexa Tech', 'Sistema Raiz', 'Agro', 'Outros'];

// Produtos citados nas suas notas. Links e descrições ficam em branco de propósito:
// preencha direto nos cards do painel.
const SEED_MINIS = [
  { id: 1, nome: 'Conecta (hub GPS.dev)', categoria: 'GPS.dev', desc: 'Hub oficial para organizar, apresentar e localizar projetos e mini-softwares.', url: 'https://github.com/dgustavopaula-lang/conecta', status: 'Em desenvolvimento' },
  { id: 2, nome: 'Curral Ágil', categoria: 'Agro', desc: 'PWA offline-first para gestão de gado leiteiro da agricultura familiar.', url: '', status: 'Rascunho' },
  { id: 3, nome: 'Rural Leite', categoria: 'Nexa Tech', desc: '', url: '', status: 'Rascunho' },
  { id: 4, nome: 'Aves', categoria: 'Nexa Tech', desc: '', url: '', status: 'Rascunho' },
  { id: 5, nome: 'Super Gut / Microbioma', categoria: 'Nexa Tech', desc: '', url: '', status: 'Rascunho' },
  { id: 6, nome: 'Sistema Raiz Clínica', categoria: 'Sistema Raiz', desc: '', url: '', status: 'Rascunho' },
  { id: 7, nome: 'Mini Mercado', categoria: 'Sistema Raiz', desc: '', url: '', status: 'Rascunho' },
  { id: 8, nome: 'Farmácia', categoria: 'Sistema Raiz', desc: '', url: '', status: 'Rascunho' },
  { id: 9, nome: 'Raiz Energia', categoria: 'Sistema Raiz', desc: '', url: '', status: 'Rascunho' },
  { id: 10, nome: 'Raiz Comercial', categoria: 'Sistema Raiz', desc: '', url: '', status: 'Rascunho' },
  { id: 11, nome: 'IA API', categoria: 'Turing', desc: '', url: '', status: 'Rascunho' },
  { id: 12, nome: 'Console do Turing', categoria: 'Turing', desc: '', url: '', status: 'Rascunho' },
  { id: 13, nome: 'Turing Cell', categoria: 'Turing', desc: '', url: '', status: 'Rascunho' },
  { id: 14, nome: 'Search and Optimization', categoria: 'Turing', desc: '', url: '', status: 'Rascunho' }
];

const SEED_VERSION = 2;

// Completa o catálogo salvo sem apagar nada: adiciona os itens do seed que ainda não existem
// (pelo nome) e preenche a categoria dos itens antigos.
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

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function urlSegura(url) {
  try {
    const u = new URL(url);
    return (u.protocol === 'https:' || u.protocol === 'http:') ? u.href : '';
  } catch (e) {
    return '';
  }
}

let vaultKey = null; // CryptoKey — só existe em memória, nunca é salva
let currentView = 'tela-posts';
let activeModalType = '';
let editingId = null;
let activeProjectLinkKey = null;

/* ---------------- Helpers de criptografia ---------------- */

function bufToB64(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}
function b64ToBuf(b64) {
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0)).buffer;
}

async function deriveKey(password, saltB64) {
  const salt = b64ToBuf(saltB64);
  const baseKey = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encryptJSON(key, data) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(data)));
  return { iv: bufToB64(iv), ct: bufToB64(ct) };
}

async function decryptJSON(key, record) {
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64ToBuf(record.iv) }, key, b64ToBuf(record.ct));
  return JSON.parse(new TextDecoder().decode(pt));
}

/* ---------------- Persistência ---------------- */

function persistData() {
  const { financeiro, clientes, posts, projetos, minis, vendas, treino, config } = appData;
  localStorage.setItem(STORAGE_DATA, JSON.stringify({ financeiro, clientes, posts, projetos, minis, vendas, treino, config, seedVersion: SEED_VERSION }));
}

function loadPlainData() {
  const raw = localStorage.getItem(STORAGE_DATA);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      appData.financeiro = parsed.financeiro || [];
      appData.clientes = parsed.clientes || [];
      appData.posts = parsed.posts || [];
      appData.projetos = parsed.projetos || {};
      appData.minis = migrarMinis(parsed.minis || JSON.parse(JSON.stringify(SEED_MINIS)), parsed.seedVersion);
      appData.vendas = Array.isArray(parsed.vendas) ? parsed.vendas : JSON.parse(JSON.stringify(SEED_VENDAS));
      appData.treino = Array.isArray(parsed.treino) ? parsed.treino : [];
      appData.config = normalizarConfig(parsed.config);
      persistData();
      return;
    } catch (e) { /* cai no default abaixo */ }
  }
  appData.minis = JSON.parse(JSON.stringify(SEED_MINIS));
  appData.vendas = JSON.parse(JSON.stringify(SEED_VENDAS));
  appData.treino = [];
  appData.config = configPadrao();
  appData.financeiro = [
    { id: 1, desc: 'Desenvolvimento do Console', tipo: 'Receita', cat: 'Projetos', valor: 5000, data: new Date().toISOString().split('T')[0] }
  ];
  appData.clientes = [
    { id: 1, nome: 'Cliente Exemplo', email: 'contato@cliente.com', tel: '(11) 99999-8888', status: 'Ativo', notas: 'Projeto NexoTerraCore' }
  ];
  appData.posts = [
    { id: 1, titulo: 'Why you need to learn about AI?', tipo: 'Articles', data: new Date().toLocaleDateString('pt-BR'), desc: 'Introdução ao aprendizado prático de IA e automação.' }
  ];
  appData.projetos = {
    agro: { notas: 'Sistema de monitoramento e gestão para agronegócio inteligente.', status: 'Em Andamento', tasks: [{ id: 1, texto: 'Modelagem de API e sensores', feito: true }], links: [{ id: 1, nome: 'Repositório GitHub', url: 'https://github.com' }] },
    nexus: { notas: 'Plataforma integrada de inteligência territorial NexoTerraCore.', status: 'Em Planejamento', tasks: [{ id: 1, texto: 'Definição da estrutura do banco de dados', feito: false }], links: [] },
    turin: { notas: 'Assistente pessoal e agente especializado com IA.', status: 'Em Andamento', tasks: [{ id: 1, texto: 'Ajuste de prompts e contextos de sistema', feito: true }], links: [] }
  };
}

async function persistVault() {
  if (!vaultKey) return;
  try {
    const record = await encryptJSON(vaultKey, appData.senhas || []);
    localStorage.setItem(STORAGE_VAULT, JSON.stringify(record));
  } catch (e) {
    console.error('Falha ao salvar o cofre criptografado:', e);
    alert('Não foi possível salvar o cofre de senhas. Veja o console para detalhes.');
  }
}

/* ---------------- Gate de acesso (setup / login) ---------------- */

function temSenhaCriada() {
  return !!localStorage.getItem(STORAGE_AUTH);
}

function setLoginMode(mode) {
  const campos = document.getElementById('login-campos');
  const subtitle = document.getElementById('login-subtitle');
  const aviso = document.getElementById('login-aviso');
  document.getElementById('login-erro').textContent = '';

  if (mode === 'setup') {
    subtitle.textContent = 'Crie sua senha de acesso';
    aviso.hidden = false;
    campos.innerHTML = `
      <label class="login-field-label">Nova senha (mín. 6 caracteres)</label>
      <input id="login-senha" type="password" class="form-control" autocomplete="new-password" />
      <label class="login-field-label">Confirmar senha</label>
      <input id="login-senha-confirma" type="password" class="form-control" autocomplete="new-password" />
    `;
  } else {
    subtitle.textContent = 'Entre com sua senha de acesso';
    aviso.hidden = true;
    campos.innerHTML = `
      <label class="login-field-label">Senha de acesso</label>
      <input id="login-senha" type="password" class="form-control" autocomplete="current-password" />
    `;
  }
  const first = document.getElementById('login-senha');
  if (first) first.focus();
}

async function fazerSetup(senha, confirma) {
  const erro = document.getElementById('login-erro');
  if (senha.length < 6) { erro.textContent = 'Use ao menos 6 caracteres.'; return; }
  if (senha !== confirma) { erro.textContent = 'As senhas não coincidem.'; return; }

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const saltB64 = bufToB64(salt);
  const key = await deriveKey(senha, saltB64);
  const check = await encryptJSON(key, CHECK_PLAINTEXT);

  localStorage.setItem(STORAGE_AUTH, JSON.stringify({ salt: saltB64, check }));
  vaultKey = key;
  appData.senhas = [];
  await persistVault();
  loadPlainData();
  persistData();
  entrarNoApp();
}

async function fazerLogin(senha) {
  const erro = document.getElementById('login-erro');
  const auth = JSON.parse(localStorage.getItem(STORAGE_AUTH));
  try {
    const key = await deriveKey(senha, auth.salt);
    const check = await decryptJSON(key, auth.check);
    if (check !== CHECK_PLAINTEXT) throw new Error('check mismatch');

    vaultKey = key;
    const vaultRaw = localStorage.getItem(STORAGE_VAULT);
    appData.senhas = vaultRaw ? await decryptJSON(key, JSON.parse(vaultRaw)) : [];
    loadPlainData();
    entrarNoApp();
  } catch (e) {
    erro.textContent = 'Senha incorreta.';
    const campo = document.getElementById('login-senha');
    if (campo) { campo.value = ''; campo.focus(); }
  }
}

function entrarNoApp() {
  document.getElementById('tela-login').hidden = true;
  document.getElementById('app-root').hidden = false;
  abrirTela('tela-posts');
}

function sair() {
  vaultKey = null;
  appData.senhas = [];
  document.getElementById('app-root').hidden = true;
  const login = document.getElementById('tela-login');
  login.hidden = false;
  setLoginMode('login');
}

/* ---------------- Navegação / render ---------------- */

function abrirTela(idTela) {
  currentView = idTela;
  document.querySelectorAll('.tela-interna').forEach(el => el.classList.remove('ativa'));
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active-menu'));

  const target = document.getElementById(idTela);
  if (target) target.classList.add('ativa');
  const navMap = {
    'tela-posts': 'nav-home', 'tela-videos': 'nav-videos', 'tela-podcast': 'nav-podcast',
    'tela-financeiro': 'nav-financeiro', 'tela-clientes': 'nav-clientes', 'tela-senhas': 'nav-senhas',
    'tela-agro': 'nav-agro', 'tela-nexus': 'nav-nexus', 'tela-turin': 'nav-turin',
    'tela-catalogo': 'nav-catalogo', 'tela-vendas': 'nav-vendas', 'tela-api': 'nav-api',
    'tela-treino': 'nav-treino', 'tela-backup': 'nav-backup'
  };
  const navEl = document.getElementById(navMap[idTela]);
  if (navEl) navEl.classList.add('active-menu');

  const titleMap = {
    'tela-posts': 'Home / Conteúdo',
    'tela-financeiro': 'Administração Financeira',
    'tela-clientes': 'Base de Clientes',
    'tela-senhas': 'Cofre de Senhas & Acessos',
    'tela-catalogo': 'Mini-softwares',
    'tela-vendas': 'Vendas / WordPress',
    'tela-api': 'API / Conexão',
    'tela-treino': 'Treinamento do Turing',
    'tela-backup': 'Backup',
    'tela-agro': 'Projeto: Agro Digital',
    'tela-nexus': 'Projeto: NexoTerraCore',
    'tela-turin': 'Projeto: Turim (IA)',
    'tela-videos': 'Gerenciador de Vídeos',
    'tela-podcast': 'Gerenciador de Podcasts'
  };

  document.getElementById('titulo-pagina').innerText = titleMap[idTela] || 'Console';
  renderHeaderActions(idTela);
  renderCurrentView();
  alternarMenu(false);
}

// Menu lateral em telas pequenas (celular).
function alternarMenu(forcar) {
  const sb = document.querySelector('.sidebar');
  const bd = document.getElementById('sidebar-backdrop');
  if (!sb) return;
  const abrir = typeof forcar === 'boolean' ? forcar : !sb.classList.contains('aberta');
  sb.classList.toggle('aberta', abrir);
  if (bd) bd.classList.toggle('ativa', abrir);
}

function renderHeaderActions(idTela) {
  const container = document.getElementById('header-actions');
  if (idTela === 'tela-financeiro') {
    container.innerHTML = `<button class="btn-action" onclick="abrirModalForm('financeiro')"><i class="ph ph-plus"></i> Nova Transação</button>`;
  } else if (idTela === 'tela-clientes') {
    container.innerHTML = `<button class="btn-action" onclick="abrirModalForm('clientes')"><i class="ph ph-user-plus"></i> Novo Cliente</button>`;
  } else if (idTela === 'tela-senhas') {
    container.innerHTML = `<button class="btn-action" onclick="abrirModalForm('senhas')"><i class="ph ph-key"></i> Nova Credencial</button>`;
  } else if (idTela === 'tela-catalogo') {
    container.innerHTML = `<button class="btn-action" onclick="adicionarMini()"><i class="ph ph-plus"></i> Novo Mini-software</button>`;
  } else if (idTela === 'tela-vendas') {
    container.innerHTML = `<button class="btn-action" onclick="abrirModalForm('vendas')"><i class="ph ph-plus"></i> Nova página</button>`;
  } else if (idTela === 'tela-treino') {
    container.innerHTML = `<button class="btn-action" onclick="abrirModalForm('treino')"><i class="ph ph-plus"></i> Novo exemplo</button>`;
  } else if (['tela-posts', 'tela-videos', 'tela-podcast'].includes(idTela)) {
    container.innerHTML = `<button class="btn-action" onclick="abrirModalForm('posts')"><i class="ph ph-plus"></i> Novo Item / Post</button>`;
  } else {
    container.innerHTML = ``;
  }
}

function renderCurrentView() {
  if (currentView === 'tela-financeiro') renderFinanceiro();
  if (currentView === 'tela-clientes') renderClientes();
  if (currentView === 'tela-senhas') renderSenhas();
  if (currentView === 'tela-catalogo') renderCatalogo();
  if (currentView === 'tela-vendas') renderVendas();
  if (currentView === 'tela-api') renderApi();
  if (currentView === 'tela-treino') renderTreino();
  if (currentView === 'tela-posts') {
    renderMetricasHome();
    if (!apiChecadaNaSessao) { apiChecadaNaSessao = true; checarSaudeApi(); }
  }
  if (['tela-posts', 'tela-videos', 'tela-podcast'].includes(currentView)) renderPosts();
  if (['tela-agro', 'tela-nexus', 'tela-turin'].includes(currentView)) renderProjeto(currentView.replace('tela-', ''));
}

function renderFinanceiro() {
  const tbody = document.getElementById('tbody-financeiro');
  tbody.innerHTML = '';
  let rec = 0, des = 0;

  appData.financeiro.forEach(item => {
    const val = parseFloat(item.valor);
    if (item.tipo === 'Receita') rec += val; else des += val;

    tbody.innerHTML += `
      <tr>
        <td><strong>${item.desc}</strong></td>
        <td><span class="badge ${item.tipo === 'Receita' ? 'green' : 'red'}">${item.tipo}</span></td>
        <td>${item.cat}</td>
        <td>R$ ${val.toFixed(2)}</td>
        <td>${item.data}</td>
        <td class="action-btns">
          <button class="btn-icon" onclick="editarItem('financeiro', ${item.id})"><i class="ph ph-pencil"></i></button>
          <button class="btn-icon" onclick="deletarItem('financeiro', ${item.id})"><i class="ph ph-trash"></i></button>
        </td>
      </tr>
    `;
  });

  document.getElementById('fin-receita').innerText = `R$ ${rec.toFixed(2)}`;
  document.getElementById('fin-despesa').innerText = `R$ ${des.toFixed(2)}`;
  const saldo = rec - des;
  const elSaldo = document.getElementById('fin-saldo');
  elSaldo.innerText = `R$ ${saldo.toFixed(2)}`;
  elSaldo.style.color = saldo >= 0 ? 'var(--success-green)' : 'var(--danger-red)';
}

function renderClientes() {
  const tbody = document.getElementById('tbody-clientes');
  tbody.innerHTML = '';
  appData.clientes.forEach(item => {
    tbody.innerHTML += `
      <tr>
        <td><strong>${item.nome}</strong></td>
        <td>${item.email}</td>
        <td>${item.tel}</td>
        <td><span class="badge orange">${item.status}</span></td>
        <td>${item.notas}</td>
        <td class="action-btns">
          <button class="btn-icon" onclick="editarItem('clientes', ${item.id})"><i class="ph ph-pencil"></i></button>
          <button class="btn-icon" onclick="deletarItem('clientes', ${item.id})"><i class="ph ph-trash"></i></button>
        </td>
      </tr>
    `;
  });
}

function renderSenhas() {
  const tbody = document.getElementById('tbody-senhas');
  tbody.innerHTML = '';
  (appData.senhas || []).forEach(item => {
    tbody.innerHTML += `
      <tr>
        <td><strong>${item.servico}</strong></td>
        <td>${item.user}</td>
        <td>
          <span id="pass-${item.id}">••••••••</span>
          <button class="btn-icon" onclick="togglePass(${item.id})"><i class="ph ph-eye"></i></button>
        </td>
        <td><span class="badge orange">${item.cat}</span></td>
        <td class="action-btns">
          <button class="btn-icon" onclick="copiarTexto(${item.id})"><i class="ph ph-copy"></i></button>
          <button class="btn-icon" onclick="editarItem('senhas', ${item.id})"><i class="ph ph-pencil"></i></button>
          <button class="btn-icon" onclick="deletarItem('senhas', ${item.id})"><i class="ph ph-trash"></i></button>
        </td>
      </tr>
    `;
  });
}

function togglePass(id) {
  const item = (appData.senhas || []).find(x => x.id === id);
  if (!item) return;
  const el = document.getElementById(`pass-${id}`);
  el.innerText = el.innerText === '••••••••' ? item.pass : '••••••••';
}

function copiarTexto(id) {
  const item = (appData.senhas || []).find(x => x.id === id);
  if (!item) return;
  const fallback = () => {
    const temp = document.createElement('textarea');
    temp.value = item.pass;
    temp.style.position = 'fixed';
    temp.style.opacity = '0';
    document.body.appendChild(temp);
    temp.select();
    try { document.execCommand('copy'); } catch (e) { /* ignore */ }
    document.body.removeChild(temp);
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(item.pass).catch(fallback);
  } else {
    fallback();
  }
}

/* ---------------- Catálogo de mini-softwares ---------------- */

function renderCatalogo() {
  const root = document.getElementById('grid-catalogo');
  if (!root) return;
  root.innerHTML = '';

  if (!appData.minis.length) {
    root.innerHTML = `<p class="catalogo-vazio">Nenhum mini-software cadastrado. Clique em "Novo Mini-software".</p>`;
    return;
  }

  const categoriasUsadas = [...new Set([...MINI_CATEGORIAS, ...appData.minis.map(m => m.categoria)])];
  categoriasUsadas.forEach(cat => {
    const itens = appData.minis.filter(m => m.categoria === cat);
    if (!itens.length) return;
    const section = document.createElement('section');
    section.className = 'catalogo-secao';
    section.innerHTML = `<h2 class="catalogo-secao-titulo">${escapeHtml(cat)} <span>${itens.length}</span></h2><div class="catalogo-grid"></div>`;
    const grid = section.querySelector('.catalogo-grid');
    itens.forEach((m, index) => {
      grid.insertAdjacentHTML('beforeend', renderMiniCard(m, index, itens.length));
    });
    root.appendChild(section);
  });
}

function renderMiniCard(m, index, total) {
    const href = urlSegura(m.url);
    const statusOpts = MINI_STATUS.map(s =>
      `<option ${s === m.status ? 'selected' : ''}>${escapeHtml(s)}</option>`
    ).join('');
    const catOpts = MINI_CATEGORIAS.map(c =>
      `<option ${c === m.categoria ? 'selected' : ''}>${escapeHtml(c)}</option>`
    ).join('');
    const statusClass = m.status === 'Publicado' ? 'green' : (m.status === 'Pausado' ? 'red' : 'orange');

    return `
      <article class="mini-card">
        <div class="mini-card-top">
          <input class="inline-input mini-nome" value="${escapeHtml(m.nome)}"
                 placeholder="Nome do mini-software"
                 onchange="editarMini(${m.id}, 'nome', this.value)">
          <span class="badge ${statusClass}">${escapeHtml(m.status)}</span>
        </div>

        <textarea class="inline-input mini-desc" rows="2"
                  placeholder="Descrição curta (uma ou duas frases)"
                  onchange="editarMini(${m.id}, 'desc', this.value)">${escapeHtml(m.desc)}</textarea>

        <div class="mini-link-row">
          <i class="ph ph-link"></i>
          <input class="inline-input" value="${escapeHtml(m.url)}"
                 placeholder="https://..."
                 onchange="editarMini(${m.id}, 'url', this.value)">
          ${href
            ? `<a class="btn-action secondary mini-abrir" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer"><i class="ph ph-arrow-square-out"></i> Abrir</a>`
            : `<span class="mini-sem-link">sem link</span>`}
        </div>

        <div class="mini-card-footer">
          <select class="form-control mini-status" title="Status" onchange="editarMini(${m.id}, 'status', this.value)">${statusOpts}</select>
          <select class="form-control mini-status" title="Categoria" onchange="editarMini(${m.id}, 'categoria', this.value)">${catOpts}</select>
          <div class="action-btns">
            <button class="btn-icon" title="Editar" onclick="editarItem('minis', ${m.id})"><i class="ph ph-pencil"></i></button>
            <button class="btn-icon" title="Subir" onclick="moverMini(${m.id}, -1)" ${index === 0 ? 'disabled' : ''}><i class="ph ph-arrow-up"></i></button>
            <button class="btn-icon" title="Descer" onclick="moverMini(${m.id}, 1)" ${index === total - 1 ? 'disabled' : ''}><i class="ph ph-arrow-down"></i></button>
            <button class="btn-icon" title="Excluir" onclick="deletarMini(${m.id})"><i class="ph ph-trash"></i></button>
          </div>
        </div>
      </article>
    `;
}

function editarMini(id, campo, valor) {
  const item = appData.minis.find(x => x.id === id);
  if (!item) return;
  item[campo] = valor.trim();
  persistData();
  renderCatalogo();
}

function adicionarMini() {
  appData.minis.unshift({ id: Date.now(), nome: 'Novo mini-software', categoria: 'Outros', desc: '', url: '', status: 'Rascunho' });
  persistData();
  if (currentView !== 'tela-catalogo') abrirTela('tela-catalogo');
  renderCatalogo();
}

// Reordena apenas dentro da categoria do item (vizinho do mesmo grupo).
function moverMini(id, direcao) {
  const item = appData.minis.find(x => x.id === id);
  if (!item) return;
  const grupo = appData.minis.filter(x => x.categoria === item.categoria);
  const pos = grupo.indexOf(item);
  const vizinho = grupo[pos + direcao];
  if (!vizinho) return;
  const i = appData.minis.indexOf(item);
  const j = appData.minis.indexOf(vizinho);
  [appData.minis[i], appData.minis[j]] = [appData.minis[j], appData.minis[i]];
  persistData();
  renderCatalogo();
}

function deletarMini(id) {
  const item = appData.minis.find(x => x.id === id);
  if (!item) return;
  if (!confirm(`Excluir "${item.nome}" do catálogo?`)) return;
  appData.minis = appData.minis.filter(x => x.id !== id);
  persistData();
  renderCatalogo();
}

function renderPosts() {
  const container = document.getElementById(currentView === 'tela-posts' ? 'container-posts' : (currentView === 'tela-videos' ? 'container-videos' : 'container-podcast'));
  if (!container) return;
  container.innerHTML = '';

  const filtroTipo = currentView === 'tela-videos' ? 'Video' : (currentView === 'tela-podcast' ? 'Podcast' : null);
  appData.posts.filter(p => !filtroTipo || p.tipo === filtroTipo).forEach(item => {
    container.innerHTML += `
      <div class="project-section" style="margin-bottom: 15px;">
        <h3>${escapeHtml(item.titulo)}
          <span>
            <button class="btn-icon" onclick="editarItem('posts', ${item.id})"><i class="ph ph-pencil"></i></button>
            <button class="btn-icon" onclick="deletarItem('posts', ${item.id})"><i class="ph ph-trash"></i></button>
          </span>
        </h3>
        <p style="color: var(--text-secondary); font-size: 13px; margin-bottom: 8px;">${escapeHtml(item.data)} • <span class="badge blue">${escapeHtml(item.tipo)}</span></p>
        <p style="line-height: 1.5;">${escapeHtml(item.desc)}</p>
      </div>
    `;
  });
}

function renderProjeto(key) {
  const proj = appData.projetos[key] || { notas: '', status: 'Em Planejamento', tasks: [], links: [] };
  document.getElementById(`${key}-notas`).value = proj.notas || '';
  document.getElementById(`${key}-status`).value = proj.status || 'Em Planejamento';

  const taskList = document.getElementById(`tasks-${key}`);
  taskList.innerHTML = '';
  (proj.tasks || []).forEach((t, index) => {
    taskList.innerHTML += `
      <div class="task-item">
        <input type="checkbox" ${t.feito ? 'checked' : ''} onchange="toggleTask('${key}', ${index})">
        <input type="text" value="${t.texto}" onchange="atualizarTaskText('${key}', ${index}, this.value)">
        <button class="btn-icon" onclick="deletarTask('${key}', ${index})"><i class="ph ph-trash"></i></button>
      </div>
    `;
  });

  const linkList = document.getElementById(`links-${key}`);
  linkList.innerHTML = '';
  (proj.links || []).forEach((l, index) => {
    const href = urlSegura(l.url);
    linkList.innerHTML += `
      <div class="link-item">
        ${href
          ? `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer"><i class="ph ph-link"></i> ${escapeHtml(l.nome)}</a>`
          : `<span class="mini-sem-link"><i class="ph ph-link-break"></i> ${escapeHtml(l.nome)} (link inválido)</span>`}
        <span class="action-btns">
          <button class="btn-icon" title="Editar" onclick="abrirModalLink('${key}', ${index})"><i class="ph ph-pencil"></i></button>
          <button class="btn-icon" title="Excluir" onclick="deletarLink('${key}', ${index})"><i class="ph ph-trash"></i></button>
        </span>
      </div>
    `;
  });
}

function salvarProjeto(key) {
  if (!appData.projetos[key]) appData.projetos[key] = { tasks: [], links: [] };
  appData.projetos[key].notas = document.getElementById(`${key}-notas`).value;
  appData.projetos[key].status = document.getElementById(`${key}-status`).value;
  persistData();
}

function adicionarTask(key) {
  if (!appData.projetos[key].tasks) appData.projetos[key].tasks = [];
  appData.projetos[key].tasks.push({ id: Date.now(), texto: 'Nova Tarefa', feito: false });
  persistData();
  renderProjeto(key);
}

function toggleTask(key, idx) {
  appData.projetos[key].tasks[idx].feito = !appData.projetos[key].tasks[idx].feito;
  persistData();
}

function atualizarTaskText(key, idx, txt) {
  appData.projetos[key].tasks[idx].texto = txt;
  persistData();
}

function deletarTask(key, idx) {
  appData.projetos[key].tasks.splice(idx, 1);
  persistData();
  renderProjeto(key);
}

let editingLinkIdx = null;

function abrirModalLink(key, idx = null) {
  activeProjectLinkKey = key;
  activeModalType = 'link';
  editingLinkIdx = idx;
  const overlay = document.getElementById('modal-container');
  const body = document.getElementById('modal-body');
  const titulo = document.getElementById('modal-titulo');
  const atual = idx !== null ? (appData.projetos[key].links || [])[idx] || {} : {};

  overlay.classList.add('active');
  titulo.innerText = idx !== null ? 'Editar Link do Projeto' : 'Novo Link do Projeto';
  body.innerHTML = `
    <div class="form-group"><label>Nome do Link</label><input id="form-link-nome" class="form-control" placeholder="ex: Documentação, Repositório" value="${escapeHtml(atual.nome || '')}"></div>
    <div class="form-group"><label>URL</label><input id="form-link-url" class="form-control" placeholder="https://..." value="${escapeHtml(atual.url || '')}"></div>
  `;
}

function deletarLink(key, idx) {
  appData.projetos[key].links.splice(idx, 1);
  persistData();
  renderProjeto(key);
}

function abrirModalQuickAdd() {
  abrirModalForm('financeiro');
}

function abrirModalForm(tipo, id = null) {
  activeModalType = tipo;
  editingId = id;
  const overlay = document.getElementById('modal-container');
  const body = document.getElementById('modal-body');
  const titulo = document.getElementById('modal-titulo');

  overlay.classList.add('active');
  let item = id ? appData[tipo].find(x => x.id === id) : {};

  if (tipo === 'financeiro') {
    titulo.innerText = id ? 'Editar Transação' : 'Nova Transação';
    body.innerHTML = `
      <div class="form-group"><label>Descrição</label><input id="form-desc" class="form-control" value="${item.desc || ''}"></div>
      <div class="form-group"><label>Tipo</label><select id="form-tipo" class="form-control"><option ${item.tipo === 'Receita' ? 'selected' : ''}>Receita</option><option ${item.tipo === 'Despesa' ? 'selected' : ''}>Despesa</option></select></div>
      <div class="form-group"><label>Categoria</label><input id="form-cat" class="form-control" value="${item.cat || 'Geral'}"></div>
      <div class="form-group"><label>Valor (R$)</label><input id="form-valor" type="number" class="form-control" value="${item.valor || ''}"></div>
      <div class="form-group"><label>Data</label><input id="form-data" type="date" class="form-control" value="${item.data || new Date().toISOString().split('T')[0]}"></div>
    `;
  } else if (tipo === 'clientes') {
    titulo.innerText = id ? 'Editar Cliente' : 'Novo Cliente';
    body.innerHTML = `
      <div class="form-group"><label>Nome</label><input id="form-nome" class="form-control" value="${item.nome || ''}"></div>
      <div class="form-group"><label>Email</label><input id="form-email" class="form-control" value="${item.email || ''}"></div>
      <div class="form-group"><label>Telefone</label><input id="form-tel" class="form-control" value="${item.tel || ''}"></div>
      <div class="form-group"><label>Status</label><input id="form-status" class="form-control" value="${item.status || 'Ativo'}"></div>
      <div class="form-group"><label>Notas</label><input id="form-notas" class="form-control" value="${item.notas || ''}"></div>
    `;
  } else if (tipo === 'senhas') {
    titulo.innerText = id ? 'Editar Credencial' : 'Nova Credencial';
    body.innerHTML = `
      <div class="form-group"><label>Serviço</label><input id="form-servico" class="form-control" value="${item.servico || ''}"></div>
      <div class="form-group"><label>Usuário / Email</label><input id="form-user" class="form-control" value="${item.user || ''}"></div>
      <div class="form-group"><label>Senha / Key</label><input id="form-pass" class="form-control" value="${item.pass || ''}"></div>
      <div class="form-group"><label>Categoria</label><input id="form-cat" class="form-control" value="${item.cat || 'Geral'}"></div>
    `;
  } else if (tipo === 'posts') {
    titulo.innerText = id ? 'Editar Item / Post' : 'Novo Item / Post';
    body.innerHTML = `
      <div class="form-group"><label>Título</label><input id="form-titulo" class="form-control" value="${item.titulo || ''}"></div>
      <div class="form-group"><label>Tipo</label><select id="form-tipo" class="form-control"><option ${item.tipo === 'Articles' ? 'selected' : ''}>Articles</option><option ${item.tipo === 'Video' ? 'selected' : ''}>Video</option><option ${item.tipo === 'Podcast' ? 'selected' : ''}>Podcast</option></select></div>
      <div class="form-group"><label>Descrição / Conteúdo</label><textarea id="form-desc" class="form-control" style="min-height: 90px;">${item.desc || ''}</textarea></div>
    `;
  } else if (tipo === 'minis') {
    titulo.innerText = 'Editar Mini-software';
    const cats = [...new Set([...MINI_CATEGORIAS, item.categoria].filter(Boolean))];
    body.innerHTML = `
      <div class="form-group"><label>Nome</label><input id="form-mini-nome" class="form-control" value="${escapeHtml(item.nome)}"></div>
      <div class="form-group"><label>Categoria</label><select id="form-mini-cat" class="form-control">${cats.map(c => `<option ${c === item.categoria ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('')}</select></div>
      <div class="form-group"><label>Status</label><select id="form-mini-status" class="form-control">${MINI_STATUS.map(s => `<option ${s === item.status ? 'selected' : ''}>${escapeHtml(s)}</option>`).join('')}</select></div>
      <div class="form-group"><label>Link (https://...)</label><input id="form-mini-url" class="form-control" value="${escapeHtml(item.url)}" placeholder="https://..."></div>
      <div class="form-group"><label>Descrição</label><textarea id="form-mini-desc" class="form-control" style="min-height: 80px;">${escapeHtml(item.desc)}</textarea></div>
    `;
  } else if (tipo === 'vendas') {
    titulo.innerText = id ? 'Editar página de venda' : 'Nova página de venda';
    body.innerHTML = `
      <div class="form-group"><label>Nome</label><input id="form-venda-nome" class="form-control" value="${escapeHtml(item.nome)}"></div>
      <div class="form-group"><label>Status</label><select id="form-venda-status" class="form-control">${VENDAS_STATUS.map(s => `<option ${s === (item.status || 'A configurar') ? 'selected' : ''}>${escapeHtml(s)}</option>`).join('')}</select></div>
      <div class="form-group"><label>Link da página (https://...)</label><input id="form-venda-url" class="form-control" value="${escapeHtml(item.url)}" placeholder="https://..."></div>
      <div class="form-group"><label>Descrição</label><textarea id="form-venda-desc" class="form-control" style="min-height: 80px;">${escapeHtml(item.desc)}</textarea></div>
    `;
  } else if (tipo === 'treino') {
    titulo.innerText = id ? 'Editar exemplo de treinamento' : 'Novo exemplo de treinamento';
    body.innerHTML = `
      <div class="form-group"><label>Texto do exemplo</label><textarea id="form-treino-texto" class="form-control" style="min-height: 90px;">${escapeHtml(item.texto)}</textarea></div>
      <div class="form-group"><label>Rótulo / classificação</label><input id="form-treino-rotulo" class="form-control" value="${escapeHtml(item.rotulo)}" placeholder="ex: anomalia, normal, exposição"></div>
      <div class="form-group"><label>Origem dos dados</label><select id="form-treino-origem" class="form-control">${TREINO_ORIGENS.map(o => `<option ${o === (item.origem || 'Sintético') ? 'selected' : ''}>${escapeHtml(o)}</option>`).join('')}</select></div>
      <div class="form-group"><label><input id="form-treino-autorizado" type="checkbox" ${item.autorizado ? 'checked' : ''}> Uso autorizado (obrigatório para Fazenda PIPE / Malanje — autorização do Altair)</label></div>
    `;
  }
}

async function salvarModal() {
  if (activeModalType === 'link') {
    const nome = document.getElementById('form-link-nome').value;
    const url = document.getElementById('form-link-url').value;
    if (nome && url && activeProjectLinkKey) {
      if (!appData.projetos[activeProjectLinkKey]) appData.projetos[activeProjectLinkKey] = { tasks: [], links: [] };
      if (!appData.projetos[activeProjectLinkKey].links) appData.projetos[activeProjectLinkKey].links = [];
      const lista = appData.projetos[activeProjectLinkKey].links;
      if (editingLinkIdx !== null && lista[editingLinkIdx]) {
        lista[editingLinkIdx] = Object.assign({}, lista[editingLinkIdx], { nome, url });
      } else {
        lista.push({ id: Date.now(), nome, url });
      }
    }
    editingLinkIdx = null;
    persistData();
  } else if (activeModalType === 'minis') {
    const item = appData.minis.find(x => x.id === editingId);
    if (item) {
      item.nome = document.getElementById('form-mini-nome').value.trim() || item.nome;
      item.categoria = document.getElementById('form-mini-cat').value;
      item.status = document.getElementById('form-mini-status').value;
      item.url = document.getElementById('form-mini-url').value.trim();
      item.desc = document.getElementById('form-mini-desc').value.trim();
    }
    persistData();
  } else if (activeModalType === 'vendas') {
    const dados = {
      nome: document.getElementById('form-venda-nome').value.trim() || 'Nova página',
      status: document.getElementById('form-venda-status').value,
      url: document.getElementById('form-venda-url').value.trim(),
      desc: document.getElementById('form-venda-desc').value.trim()
    };
    const existente = editingId ? appData.vendas.find(x => x.id === editingId) : null;
    if (existente) Object.assign(existente, dados); else appData.vendas.push(Object.assign({ id: Date.now() }, dados));
    persistData();
  } else if (activeModalType === 'treino') {
    const texto = document.getElementById('form-treino-texto').value.trim();
    if (!texto) { alert('Escreva o texto do exemplo.'); return; }
    const dados = {
      texto,
      rotulo: document.getElementById('form-treino-rotulo').value.trim(),
      origem: document.getElementById('form-treino-origem').value,
      autorizado: document.getElementById('form-treino-autorizado').checked
    };
    const existente = editingId ? appData.treino.find(x => x.id === editingId) : null;
    if (existente) { Object.assign(existente, dados); existente.enviado = false; }
    else appData.treino.push(Object.assign({ id: Date.now(), enviado: false, criado: new Date().toISOString() }, dados));
    persistData();
  } else if (activeModalType === 'preview') {
    /* só visualização */
  } else if (activeModalType === 'financeiro') {
    const newItem = {
      id: editingId || Date.now(),
      desc: document.getElementById('form-desc').value,
      tipo: document.getElementById('form-tipo').value,
      cat: document.getElementById('form-cat').value,
      valor: parseFloat(document.getElementById('form-valor').value) || 0,
      data: document.getElementById('form-data').value
    };
    if (editingId) {
      const idx = appData.financeiro.findIndex(x => x.id === editingId);
      appData.financeiro[idx] = newItem;
    } else {
      appData.financeiro.push(newItem);
    }
    persistData();
  } else if (activeModalType === 'clientes') {
    const newItem = {
      id: editingId || Date.now(),
      nome: document.getElementById('form-nome').value,
      email: document.getElementById('form-email').value,
      tel: document.getElementById('form-tel').value,
      status: document.getElementById('form-status').value,
      notas: document.getElementById('form-notas').value
    };
    if (editingId) {
      const idx = appData.clientes.findIndex(x => x.id === editingId);
      appData.clientes[idx] = newItem;
    } else {
      appData.clientes.push(newItem);
    }
    persistData();
  } else if (activeModalType === 'senhas') {
    const newItem = {
      id: editingId || Date.now(),
      servico: document.getElementById('form-servico').value,
      user: document.getElementById('form-user').value,
      pass: document.getElementById('form-pass').value,
      cat: document.getElementById('form-cat').value
    };
    if (editingId) {
      const idx = appData.senhas.findIndex(x => x.id === editingId);
      appData.senhas[idx] = newItem;
    } else {
      appData.senhas.push(newItem);
    }
    await persistVault();
  } else if (activeModalType === 'posts') {
    const newItem = {
      id: editingId || Date.now(),
      titulo: document.getElementById('form-titulo').value,
      tipo: document.getElementById('form-tipo').value,
      data: new Date().toLocaleDateString('pt-BR'),
      desc: document.getElementById('form-desc').value
    };
    if (editingId) {
      const idx = appData.posts.findIndex(x => x.id === editingId);
      appData.posts[idx] = newItem;
    } else {
      appData.posts.push(newItem);
    }
    persistData();
  }

  fecharModal();
  renderCurrentView();
}

function fecharModal() {
  document.getElementById('modal-container').classList.remove('active');
}

function editarItem(tipo, id) {
  abrirModalForm(tipo, id);
}

async function deletarItem(tipo, id) {
  appData[tipo] = appData[tipo].filter(x => x.id !== id);
  if (tipo === 'senhas') {
    await persistVault();
  } else {
    persistData();
  }
  renderCurrentView();
}

/* ============================================================
   v5 — Vendas, API/Turing, Backup, tema, offline
   ============================================================ */

function baixarJSON(nome, obj) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

/* ---------- Home: métricas ---------- */

function renderMetricasHome() {
  const el = document.getElementById('home-metricas');
  if (!el) return;
  const minis = appData.minis || [];
  const publicados = minis.filter(m => m.status === 'Publicado').length;
  const comLink = minis.filter(m => urlSegura(m.url)).length;
  const noAr = (appData.vendas || []).filter(v => v.status === 'No ar').length;
  const fila = (appData.treino || []).filter(t => !t.enviado).length;
  const est = ESTADOS_API[statusApi.estado] || ESTADOS_API['nao-configurada'];
  // Turing em destaque: primeiro e em largura total no topo
  const cardsTuring = [
    ['API / Turing', est.curto, statusApi.ms != null ? `${statusApi.ms} ms` : est.sub, 'tela-api', 'turing'],
    ['Fila do Turing', `${fila}`, 'exemplos aguardando envio', 'tela-treino', 'turing']
  ];
  const cardsSecundarios = [
    ['Mini-softwares', `${minis.length}`, `${publicados} publicado(s) · ${comLink} com link`, 'tela-catalogo', ''],
    ['Páginas de venda', `${(appData.vendas || []).length}`, `${noAr} no ar`, 'tela-vendas', '']
  ];
  el.innerHTML =
    `<div class="metrics-row-turing">` +
    cardsTuring.map(([rot, val, sub, alvo]) =>
      `<button type="button" class="metric-card clicavel metric-turing" onclick="abrirTela('${alvo}')"><span>${escapeHtml(rot)}</span><h3>${escapeHtml(val)}</h3><p class="metric-sub">${escapeHtml(sub)}</p></button>`
    ).join('') +
    `</div>` +
    cardsSecundarios.map(([rot, val, sub, alvo]) =>
      `<button type="button" class="metric-card clicavel" onclick="abrirTela('${alvo}')"><span>${escapeHtml(rot)}</span><h3>${escapeHtml(val)}</h3><p class="metric-sub">${escapeHtml(sub)}</p></button>`
    ).join('');
  renderHomeApi();
}

/* ---------- Home: painel de status da API / Turing ---------- */

const ESTADOS_API = {
  'online':          { curto: 'Online',         txt: 'Online',                    cls: 'green',  sub: 'respondendo' },
  'erro':            { curto: 'Com erro',       txt: 'Respondeu com erro',        cls: 'red',    sub: 'veja o código HTTP' },
  'sem-resposta':    { curto: 'Sem resposta',   txt: 'Sem resposta (rede ou CORS)', cls: 'red',  sub: 'rede ou CORS' },
  'sem-internet':    { curto: 'Sem internet',   txt: 'Sem internet',              cls: 'orange', sub: 'modo offline' },
  'verificando':     { curto: 'Verificando…',   txt: 'Verificando…',              cls: 'blue',   sub: 'aguarde' },
  'nao-configurada': { curto: 'Configurar',     txt: 'Não configurada',           cls: 'orange', sub: 'preencha a URL da API' }
};

let statusApi = { estado: 'nao-configurada', ms: null, http: null, quando: null };
let apiChecadaNaSessao = false;

function rotaSaude() {
  const e = (appData.config.endpoints || []).find(x => x.metodo === 'GET' && /\/health$/.test(x.rota));
  return e ? e.rota : null;
}

// Só GET na rota de saúde: não envia nenhum dado.
async function checarSaudeApi() {
  const base = appData.config.apiBase;
  const rota = rotaSaude();
  if (!base || !rota) {
    statusApi = { estado: 'nao-configurada', ms: null, http: null, quando: null };
  } else if (!navigator.onLine) {
    statusApi = { estado: 'sem-internet', ms: null, http: null, quando: new Date() };
  } else {
    statusApi = Object.assign({}, statusApi, { estado: 'verificando' });
    renderHomeApi();
    const t0 = performance.now();
    try {
      const res = await fetch(base + rota, { method: 'GET', cache: 'no-store' });
      statusApi = { estado: res.ok ? 'online' : 'erro', ms: Math.round(performance.now() - t0), http: res.status, quando: new Date() };
    } catch (e) {
      statusApi = { estado: 'sem-resposta', ms: null, http: null, quando: new Date() };
    }
  }
  if (currentView === 'tela-posts') renderMetricasHome();
}

function renderHomeApi() {
  const el = document.getElementById('home-api');
  if (!el) return;
  const est = ESTADOS_API[statusApi.estado] || ESTADOS_API['nao-configurada'];
  const fila = (appData.treino || []).filter(t => !t.enviado).length;
  const hora = statusApi.quando ? statusApi.quando.toLocaleTimeString('pt-BR') : '—';
  const semConfig = statusApi.estado === 'nao-configurada';
  const statusIcone = statusApi.estado === 'online' ? 'ph-check-circle' :
                      statusApi.estado === 'verificando' ? 'ph-arrows-clockwise' :
                      statusApi.estado === 'sem-internet' ? 'ph-wifi-slash' : 'ph-warning';
  el.innerHTML = `
    <div class="project-section turing-painel">
      <div class="turing-painel-header">
        <div class="turing-identidade">
          <div class="turing-avatar"><i class="ph ph-robot"></i></div>
          <div>
            <div class="turing-nome">Turing <span class="badge orange">Agente de Segurança</span></div>
            <div class="turing-sub">NexoTerraCore Intelligence Layer</div>
          </div>
        </div>
        <span class="btn-row-inline">
          <button class="btn-action secondary" onclick="checarSaudeApi()"><i class="ph ph-arrows-clockwise"></i> Atualizar</button>
          <button class="btn-action secondary" onclick="abrirTela('tela-api')"><i class="ph ph-gear"></i> Configurar</button>
          <button class="btn-action secondary" onclick="abrirTela('tela-treino')"><i class="ph ph-brain"></i> Treinar</button>
        </span>
      </div>
      <div class="api-status-grid">
        <div class="api-status-item">
          <span>Status</span>
          <strong><i class="ph ${statusIcone}"></i> <span class="badge ${est.cls}">${escapeHtml(est.txt)}</span></strong>
        </div>
        <div class="api-status-item">
          <span>Função</span>
          <strong>Segurança</strong>
        </div>
        <div class="api-status-item">
          <span>Proteção</span>
          <strong>API Core · Sistema · Proprietário</strong>
        </div>
        <div class="api-status-item">
          <span>Latência</span>
          <strong>${statusApi.ms != null ? statusApi.ms + ' ms' : '—'}${statusApi.http ? ' · HTTP ' + statusApi.http : ''}</strong>
        </div>
        <div class="api-status-item">
          <span>Fila de treino</span>
          <strong>${fila} exemplo(s) aguardando</strong>
        </div>
        <div class="api-status-item">
          <span>Última checagem</span>
          <strong>${escapeHtml(hora)}</strong>
        </div>
      </div>
      ${semConfig ? `<div class="turing-aviso"><i class="ph ph-warning"></i> Configure a URL base da API em <button class="link-inline" onclick="abrirTela('tela-api')">Conexão da API</button> para ativar o monitoramento do Turing.</div>` : ''}
      ${statusApi.estado === 'sem-resposta' ? `<div class="turing-aviso"><i class="ph ph-x-circle"></i> Sem resposta — verifique se a API está online e se o CORS permite <strong>${location.origin}</strong>.</div>` : ''}
    </div>`;
}

/* ---------- Vendas / WordPress ---------- */

function renderVendas() {
  const root = document.getElementById('grid-vendas');
  if (!root) return;
  if (!appData.vendas.length) {
    root.innerHTML = `<p class="catalogo-vazio">Nenhuma página cadastrada. Clique em "Nova página".</p>`;
    return;
  }
  root.innerHTML = appData.vendas.map(v => {
    const href = urlSegura(v.url);
    const cls = v.status === 'No ar' ? 'green' : (v.status === 'Em edição' ? 'blue' : 'orange');
    return `
      <article class="mini-card">
        <div class="mini-card-top">
          <strong class="venda-nome">${escapeHtml(v.nome)}</strong>
          <span class="badge ${cls}">${escapeHtml(v.status)}</span>
        </div>
        <p class="venda-desc">${v.desc ? escapeHtml(v.desc) : '<span class="mini-sem-link">sem descrição</span>'}</p>
        <div class="mini-link-row">
          <i class="ph ph-link"></i>
          <span class="venda-url">${href ? escapeHtml(href) : '<span class="mini-sem-link">link pendente — clique no lápis</span>'}</span>
        </div>
        <div class="mini-card-footer">
          ${href ? `<a class="btn-action secondary mini-abrir" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer"><i class="ph ph-arrow-square-out"></i> Abrir</a>` : '<span></span>'}
          <div class="action-btns">
            <button class="btn-icon" title="Editar" onclick="editarItem('vendas', ${v.id})"><i class="ph ph-pencil"></i></button>
            <button class="btn-icon" title="Excluir" onclick="confirmarExcluir('vendas', ${v.id})"><i class="ph ph-trash"></i></button>
          </div>
        </div>
      </article>`;
  }).join('');
}

function confirmarExcluir(tipo, id) {
  if (confirm('Excluir este item?')) deletarItem(tipo, id);
}

/* ---------- API: conexão e endpoints ---------- */

function apiBaseValida(v) {
  if (!v) return true;
  try {
    const u = new URL(v);
    if (u.protocol === 'https:') return true;
    return u.protocol === 'http:' && (u.hostname === 'localhost' || u.hostname === '127.0.0.1');
  } catch (e) { return false; }
}

function tokenDoCofre() {
  const it = (appData.senhas || []).find(s => String(s.servico || '').trim().toLowerCase() === TOKEN_SERVICO);
  return it && it.pass ? it.pass : '';
}

const resultadosTeste = {};

function renderApi() {
  const c = appData.config;
  document.getElementById('cfg-apibase').value = c.apiBase || '';
  document.getElementById('cfg-treinopath').value = c.treinoPath || '';
  const st = document.getElementById('api-token-status');
  st.innerHTML = tokenDoCofre()
    ? `<i class="ph ph-shield-check"></i> Token encontrado no cofre (item "Turing API token"). Ele nunca é gravado fora do cofre criptografado.`
    : `<i class="ph ph-warning"></i> Nenhum token no cofre. Cadastre um item chamado "Turing API token" em Senhas e Acessos.`;

  const tbody = document.getElementById('tbody-endpoints');
  tbody.innerHTML = c.endpoints.map((e, i) => `
    <tr>
      <td><code>${escapeHtml(e.rota)}</code></td>
      <td><span class="badge blue">${escapeHtml(e.metodo)}</span></td>
      <td><input class="inline-input" value="${escapeHtml(e.auth)}" onchange="atualizarEndpoint(${i}, 'auth', this.value)"></td>
      <td><input type="checkbox" ${e.verificado ? 'checked' : ''} onchange="atualizarEndpoint(${i}, 'verificado', this.checked)"></td>
      <td>${e.metodo === 'GET'
        ? `<button class="btn-action secondary" onclick="testarEndpoint(${i})"><i class="ph ph-pulse"></i> Testar</button> <span id="teste-${i}" class="teste-res">${escapeHtml(resultadosTeste[i] || '')}</span>`
        : '<span class="mini-sem-link">só GET</span>'}</td>
    </tr>`).join('');
}

function salvarConfig() {
  const base = document.getElementById('cfg-apibase').value.trim().replace(/\/+$/, '');
  const path = document.getElementById('cfg-treinopath').value.trim();
  if (!apiBaseValida(base)) {
    alert('Use uma URL https:// (ou http://localhost para testes).');
    document.getElementById('cfg-apibase').value = appData.config.apiBase || '';
    return;
  }
  appData.config.apiBase = base;
  appData.config.treinoPath = path.startsWith('/') || !path ? path : '/' + path;
  persistData();
  renderApi();
}

function atualizarEndpoint(i, campo, valor) {
  const e = appData.config.endpoints[i];
  if (!e) return;
  e[campo] = valor;
  persistData();
}

// Só GET, sem enviar dados: serve para ver se a API responde.
async function testarEndpoint(i) {
  const e = appData.config.endpoints[i];
  const out = document.getElementById(`teste-${i}`);
  if (!e || e.metodo !== 'GET') return;
  if (!appData.config.apiBase) { alert('Configure a URL base da API primeiro.'); return; }
  out.textContent = '...';
  const t0 = performance.now();
  try {
    const res = await fetch(appData.config.apiBase + e.rota, { method: 'GET', cache: 'no-store' });
    resultadosTeste[i] = `HTTP ${res.status} · ${Math.round(performance.now() - t0)} ms`;
  } catch (err) {
    resultadosTeste[i] = navigator.onLine ? 'sem resposta (rede ou CORS)' : 'sem internet';
  }
  out.textContent = resultadosTeste[i];
}

function cadastrarTokenNoCofre() {
  abrirTela('tela-senhas');
  abrirModalForm('senhas');
  document.getElementById('form-servico').value = 'Turing API token';
  document.getElementById('form-cat').value = 'API';
}

/* ---------- Treinamento do Turing (fila local + envio protegido) ---------- */

const treinoRestrito = t => TREINO_ORIGENS_RESTRITAS.includes(t.origem);
const treinoElegiveis = () => appData.treino.filter(t => !t.enviado && (!treinoRestrito(t) || t.autorizado));
const treinoRetidos = () => appData.treino.filter(t => !t.enviado && treinoRestrito(t) && !t.autorizado);
const endpointTreino = () => appData.config.endpoints.find(e => e.rota === appData.config.treinoPath);

function checksEnvio() {
  const c = appData.config;
  const ep = endpointTreino();
  const el = treinoElegiveis().length;
  const ret = treinoRetidos().length;
  return [
    { ok: !!c.apiBase && apiBaseValida(c.apiBase), texto: 'URL base da API configurada (https)' },
    { ok: !!ep, texto: 'Rota de envio cadastrada nos endpoints' },
    { ok: !!ep && !!ep.verificado, texto: 'Autenticação da rota verificada' },
    { ok: !!tokenDoCofre(), texto: 'Token "Turing API token" no cofre' },
    { ok: navigator.onLine, texto: 'Conectado à internet' },
    { ok: el > 0, texto: `${el} exemplo(s) pronto(s) para envio` + (ret ? ` · ${ret} retido(s) sem autorização` : '') }
  ];
}

function renderTreino() {
  const tbody = document.getElementById('tbody-treino');
  if (!tbody) return;
  if (!appData.treino.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="mini-sem-link">Nenhum exemplo na fila. Use "Novo exemplo".</td></tr>`;
  } else {
    tbody.innerHTML = appData.treino.map(t => {
      const restrito = treinoRestrito(t);
      const envio = t.enviado ? '<span class="badge green">Enviado</span>'
        : (restrito && !t.autorizado ? '<span class="badge red">Retido</span>' : '<span class="badge orange">Na fila</span>');
      const texto = t.texto.length > 90 ? t.texto.slice(0, 90) + '…' : t.texto;
      return `
        <tr>
          <td>${escapeHtml(texto)}</td>
          <td>${escapeHtml(t.rotulo || '—')}</td>
          <td><span class="badge ${restrito ? 'red' : 'blue'}">${escapeHtml(t.origem)}</span></td>
          <td><input type="checkbox" ${t.autorizado ? 'checked' : ''} onchange="autorizarTreino(${t.id}, this.checked)"></td>
          <td>${envio}</td>
          <td class="action-btns">
            <button class="btn-icon" title="Editar" onclick="editarItem('treino', ${t.id})"><i class="ph ph-pencil"></i></button>
            <button class="btn-icon" title="Excluir" onclick="confirmarExcluir('treino', ${t.id})"><i class="ph ph-trash"></i></button>
          </td>
        </tr>`;
    }).join('');
  }

  const checks = checksEnvio();
  document.getElementById('treino-checks').innerHTML = checks.map(c =>
    `<div class="check-item ${c.ok ? 'ok' : 'pendente'}"><i class="ph ${c.ok ? 'ph-check-circle' : 'ph-x-circle'}"></i> ${escapeHtml(c.texto)}</div>`
  ).join('');
  const btn = document.getElementById('btn-enviar-treino');
  btn.disabled = !checks.every(c => c.ok);
}

function autorizarTreino(id, valor) {
  const t = appData.treino.find(x => x.id === id);
  if (!t) return;
  t.autorizado = !!valor;
  persistData();
  renderTreino();
}

function montarPayloadTreino() {
  return {
    origem_painel: 'GPS.dev Console',
    gerado_em: new Date().toISOString(),
    exemplos: treinoElegiveis().map(t => ({ id: t.id, texto: t.texto, rotulo: t.rotulo, origem: t.origem }))
  };
}

function exportarTreino() {
  const p = montarPayloadTreino();
  if (!p.exemplos.length) { alert('Nenhum exemplo pronto para exportar.'); return; }
  baixarJSON(`turing-lote-${new Date().toISOString().slice(0, 10)}.json`, p);
}

function previewTreino() {
  activeModalType = 'preview';
  editingId = null;
  document.getElementById('modal-container').classList.add('active');
  document.getElementById('modal-titulo').innerText = 'Pré-visualização do lote';
  const p = montarPayloadTreino();
  const ret = treinoRetidos().length;
  document.getElementById('modal-body').innerHTML = `
    <p class="vault-hint"><i class="ph ph-info"></i> Este é o corpo (JSON) que seria enviado para ${escapeHtml((appData.config.apiBase || '(API não configurada)') + (appData.config.treinoPath || ''))}. Confira o formato com o contrato da rota antes de enviar.${ret ? ` ${ret} exemplo(s) retido(s) por falta de autorização não entram.` : ''}</p>
    <textarea class="form-control" readonly style="min-height: 220px; font-family: monospace; font-size: 12px;">${escapeHtml(JSON.stringify(p, null, 2))}</textarea>`;
}

async function enviarTreino() {
  const checks = checksEnvio();
  if (!checks.every(c => c.ok)) { renderTreino(); return; }
  const ep = endpointTreino();
  const lote = treinoElegiveis();
  const url = appData.config.apiBase + appData.config.treinoPath;
  if (!confirm(`Enviar ${lote.length} exemplo(s) para ${url}?`)) return;
  const btn = document.getElementById('btn-enviar-treino');
  btn.disabled = true;
  try {
    const res = await fetch(url, {
      method: ep && ep.metodo !== '*' ? ep.metodo : 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tokenDoCofre() },
      body: JSON.stringify(montarPayloadTreino())
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const ids = new Set(lote.map(t => t.id));
    appData.treino.forEach(t => { if (ids.has(t.id)) t.enviado = true; });
    persistData();
    alert(`Lote enviado (${lote.length}).`);
  } catch (err) {
    alert('Não foi possível enviar: ' + err.message + '. Nada foi marcado como enviado.');
  }
  renderTreino();
}

/* ---------- Backup ---------- */

function exportarBackup() {
  const { financeiro, clientes, posts, projetos, minis, vendas, treino, config } = appData;
  baixarJSON(`gps-console-backup-${new Date().toISOString().slice(0, 10)}.json`,
    { versao: 5, exportado_em: new Date().toISOString(), financeiro, clientes, posts, projetos, minis, vendas, treino, config });
}

function importarBackup(ev) {
  const arq = ev.target.files && ev.target.files[0];
  ev.target.value = '';
  if (!arq) return;
  const leitor = new FileReader();
  leitor.onload = () => {
    try {
      const d = JSON.parse(leitor.result);
      if (!d || typeof d !== 'object' || Array.isArray(d)) throw new Error('formato inválido');
      if (!confirm('Importar este backup substitui os dados atuais do painel (o cofre de senhas não é alterado). Continuar?')) return;
      ['financeiro', 'clientes', 'posts', 'vendas', 'treino'].forEach(k => { if (Array.isArray(d[k])) appData[k] = d[k]; });
      if (Array.isArray(d.minis)) appData.minis = migrarMinis(d.minis, SEED_VERSION);
      if (d.projetos && typeof d.projetos === 'object') appData.projetos = d.projetos;
      if (d.config && typeof d.config === 'object') appData.config = normalizarConfig(d.config);
      persistData();
      renderCurrentView();
      alert('Backup importado.');
    } catch (e) {
      alert('Arquivo de backup inválido: ' + e.message);
    }
  };
  leitor.readAsText(arq);
}

/* ---------- Tema e offline ---------- */

const STORAGE_TEMA = 'gps_console_tema_v1';

function lerTema() {
  try { return localStorage.getItem(STORAGE_TEMA) === 'verde' ? 'verde' : 'laranja'; } catch (e) { return 'laranja'; }
}

function aplicarTema(t) {
  document.documentElement.setAttribute('data-tema', t);
  try { localStorage.setItem(STORAGE_TEMA, t); } catch (e) { /* ignora */ }
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', t === 'verde' ? '#07161a' : '#0f0f0f');
}

function alternarTema() {
  aplicarTema(lerTema() === 'verde' ? 'laranja' : 'verde');
}

function atualizarOnline() {
  const b = document.getElementById('offline-badge');
  if (b) b.hidden = navigator.onLine;
  if (currentView === 'tela-treino') renderTreino();
  if (currentView === 'tela-posts') renderMetricasHome();
}

/* ---------------- Boot ---------------- */

window.addEventListener('online', atualizarOnline);
window.addEventListener('offline', atualizarOnline);

if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(err => console.warn('Service Worker não registrado:', err));
  });
}

document.addEventListener('DOMContentLoaded', () => {
  aplicarTema(lerTema());
  atualizarOnline();
  if (!window.crypto || !window.crypto.subtle) {
    document.getElementById('login-erro').textContent =
      'Este navegador/contexto não suporta criptografia (Web Crypto). Acesse via HTTPS.';
    return;
  }

  setLoginMode(temSenhaCriada() ? 'login' : 'setup');

  document.getElementById('form-login').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const senha = document.getElementById('login-senha').value;
    if (temSenhaCriada()) {
      await fazerLogin(senha);
    } else {
      const confirma = document.getElementById('login-senha-confirma').value;
      await fazerSetup(senha, confirma);
    }
  });
});
