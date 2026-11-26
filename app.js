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
const PANEL_LOGIN_EMAIL = 'gustavosantosdev@proton.me';
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

// Rotas reais usadas pelo painel (conferidas na API em 20/11/2026).
const SEED_ENDPOINTS = [
  { rota: '/api/health', metodo: 'GET', auth: 'Pública', uso: 'API no ar' },
  { rota: '/api/turing/conhecimento/listar', metodo: 'GET', auth: 'turing:training', uso: 'Fluxo de treino do Turing' },
  { rota: '/api/plantas', metodo: 'GET', auth: 'plantas.read', uso: 'Natureza · plantas' },
  { rota: '/api/apps', metodo: 'GET', auth: 'apps.read', uso: 'Mini-softwares' },
  { rota: '/api/imoveis', metodo: 'GET', auth: 'assets.read', uso: 'Patrimônio · imóveis' },
  { rota: '/api/turing/security/health', metodo: 'GET', auth: 'token válido', uso: 'Turing Security' },
  { rota: '/api/control-plane', metodo: 'GET', auth: 'control_plane.read', uso: 'Painel de controle da API' },
  { rota: '/api/geo/sentinel2/latest?lat=-18.90&lon=-50.65&days=30', metodo: 'GET', auth: 'token válido', uso: 'Sentinel-2 (Copernicus) · teste Paranaíguara' },
  { rota: '/api/turing/angola/resumo', metodo: 'GET', auth: 'token válido', uso: 'Turing Angola · resumo' }
];
const ENDPOINTS_VERSAO = 3;

function configPadrao() {
  return { apiBase: 'https://api.gustavopaulasantos.com.br', treinoPath: '/api/turing/training/feedback', endpoints: JSON.parse(JSON.stringify(SEED_ENDPOINTS)), endpointsVersao: ENDPOINTS_VERSAO };
}

function normalizarConfig(cfg) {
  const base = configPadrao();
  const c = Object.assign(base, cfg || {});
  if (!Array.isArray(c.endpoints) || !c.endpoints.length || c.endpointsVersao !== ENDPOINTS_VERSAO) {
    c.endpoints = base.endpoints;
    c.endpointsVersao = ENDPOINTS_VERSAO;
  }
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
  appData.financeiro = [];
  appData.clientes = [];
  appData.posts = [];
  appData.projetos = {};
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
    subtitle.textContent = 'Crie seu usuário e senha de acesso';
    aviso.hidden = false;
    campos.innerHTML = `
      <label class="login-field-label" for="login-usuario">Usuário</label>
      <input id="login-usuario" type="email" class="form-control" value="${PANEL_LOGIN_EMAIL}" autocomplete="username" readonly required />
      <label class="login-field-label">Nova senha (mín. 6 caracteres)</label>
      <input id="login-senha" type="password" class="form-control" autocomplete="new-password" />
      <label class="login-field-label">Confirmar senha</label>
      <input id="login-senha-confirma" type="password" class="form-control" autocomplete="new-password" />
    `;
  } else {
    subtitle.textContent = 'Entre com seu usuário e senha';
    aviso.hidden = true;
    campos.innerHTML = `
      <label class="login-field-label" for="login-usuario">Usuário</label>
      <input id="login-usuario" type="email" class="form-control" value="${PANEL_LOGIN_EMAIL}" autocomplete="username" readonly required />
      <label class="login-field-label">Senha de acesso</label>
      <input id="login-senha" type="password" class="form-control" autocomplete="current-password" />
    `;
  }
  const first = document.getElementById('login-usuario');
  if (first) first.focus();
}

async function fazerSetup(usuario, senha, confirma) {
  const erro = document.getElementById('login-erro');
  if (usuario.trim().toLowerCase() !== PANEL_LOGIN_EMAIL) { erro.textContent = 'Usuário inválido.'; return; }
  if (senha.length < 6) { erro.textContent = 'Use ao menos 6 caracteres.'; return; }
  if (senha !== confirma) { erro.textContent = 'As senhas não coincidem.'; return; }

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const saltB64 = bufToB64(salt);
  const key = await deriveKey(senha, saltB64);
  const check = await encryptJSON(key, CHECK_PLAINTEXT);

  localStorage.setItem(STORAGE_AUTH, JSON.stringify({ usuario: PANEL_LOGIN_EMAIL, salt: saltB64, check }));
  vaultKey = key;
  appData.senhas = [];
  await persistVault();
  loadPlainData();
  persistData();
  entrarNoApp();
}

async function fazerLogin(usuario, senha) {
  const erro = document.getElementById('login-erro');
  const auth = JSON.parse(localStorage.getItem(STORAGE_AUTH));
  try {
    if (usuario.trim().toLowerCase() !== PANEL_LOGIN_EMAIL) throw new Error('user mismatch');
    const key = await deriveKey(senha, auth.salt);
    const check = await decryptJSON(key, auth.check);
    if (check !== CHECK_PLAINTEXT) throw new Error('check mismatch');

    if (auth.usuario !== PANEL_LOGIN_EMAIL) {
      auth.usuario = PANEL_LOGIN_EMAIL;
      localStorage.setItem(STORAGE_AUTH, JSON.stringify(auth));
    }

    vaultKey = key;
    const vaultRaw = localStorage.getItem(STORAGE_VAULT);
    appData.senhas = vaultRaw ? await decryptJSON(key, JSON.parse(vaultRaw)) : [];
    loadPlainData();
    entrarNoApp();
  } catch (e) {
    erro.textContent = 'Usuário ou senha incorretos.';
    const campoUsuario = document.getElementById('login-usuario');
    if (campoUsuario) campoUsuario.focus();
    const campo = document.getElementById('login-senha');
    if (campo) { campo.value = ''; campo.focus(); }
  }
}

function entrarNoApp() {
  document.getElementById('tela-login').hidden = true;
  document.getElementById('app-root').hidden = false;
  abrirTela('tela-posts');
  if (typeof window.carregarHistoricoTuring === 'function') window.carregarHistoricoTuring();
  if (typeof verificarIntegracaoSidebar === 'function') verificarIntegracaoSidebar();
  if (typeof carregarAppsApi === 'function') carregarAppsApi();
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
    'tela-patrimonio': 'nav-patrimonio', 'tela-financeiro': 'nav-financeiro', 'tela-clientes': 'nav-clientes', 'tela-senhas': 'nav-senhas',
    'tela-satelite': 'nav-satelite', 'tela-pacotes': 'nav-pacotes',
    'tela-agro': 'nav-agro', 'tela-nexus': 'nav-nexus', 'tela-turin': 'nav-turin',
    'tela-catalogo': 'nav-catalogo', 'tela-edutech': 'nav-edutech', 'tela-angola': 'nav-angola',
    'tela-vendas': 'nav-vendas', 'tela-api': 'nav-api',
    'tela-treino': 'nav-treino', 'tela-backup': 'nav-backup',
    'tela-lab-conhecimento': 'nav-lab-conhecimento',
    'tela-plantas': 'nav-plantas',
    'tela-plantas-fila': 'nav-plantas-fila',
    'tela-plantas-toxicas': 'nav-plantas-toxicas',
    'tela-plantas-uteis': 'nav-plantas-uteis'
  };
  const navEl = document.getElementById(navMap[idTela]);
  if (navEl) {
    navEl.classList.add('active-menu');
    const grupo = navEl.closest('details.nav-group');
    if (grupo) grupo.open = true;
  }

  const titleMap = {
    'tela-posts': 'Home / Conteúdo',
    'tela-financeiro': 'Administração Financeira',
    'tela-clientes': 'Base de Clientes',
    'tela-senhas': 'Cofre de Senhas & Acessos',
    'tela-catalogo': 'Mini-softwares',
    'tela-plantas': 'Plantas do morro',
    'tela-plantas-fila': 'Identificar plantas',
    'tela-plantas-toxicas': 'Plantas tóxicas',
    'tela-plantas-uteis': 'Plantas medicinais',
    'tela-vendas': 'Vendas / WordPress',
    'tela-api': 'API / Conexão',
    'tela-treino': 'Fila de exemplos do Turing (local)',
    'tela-backup': 'Backup',
    'tela-satelite': 'Sentinel-2 · NDVI',
    'tela-patrimonio': 'Patrimônio / Imóveis',
    'tela-agro': 'Notas de testes (local)',
    'tela-nexus': 'Notas NexoTerraCore (local)',
    'tela-turin': 'Turing · Fluxo de treino',
    'tela-pacotes': 'Turing · Treinos temáticos',
    'tela-videos': 'Gerenciador de Vídeos',
    'tela-podcast': 'Gerenciador de Podcasts',
    'tela-edutech': 'EduTech · Cursos',
    'tela-angola': 'Angola · Formação e oportunidades',
    'tela-lab-conhecimento': 'Laboratório do Turing',
    'tela-patrimonio': 'Patrimônio / Imóveis'
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
    container.innerHTML = `<button class="btn-action secondary" onclick="novoApp()"><i class="ph ph-plus"></i> Novo app</button> <button class="btn-action" id="btn-verificar-apps" onclick="verificarApps()"><i class="ph ph-pulse"></i> Verificar agora</button>`;
  } else if (idTela === 'tela-vendas') {
    container.innerHTML = `<button class="btn-action" onclick="abrirModalForm('vendas')"><i class="ph ph-plus"></i> Nova página</button>`;
  } else if (idTela === 'tela-treino') {
    container.innerHTML = `<button class="btn-action" onclick="abrirModalForm('treino')"><i class="ph ph-plus"></i> Novo exemplo</button>`;
  } else if (idTela === 'tela-patrimonio') {
    container.innerHTML = `<button class="btn-action" onclick="abrirModalImovel()"><i class="ph ph-plus"></i> Novo Imóvel</button>`;
  } else if (['tela-posts', 'tela-videos', 'tela-podcast'].includes(idTela)) {
    container.innerHTML = `<button class="btn-action" onclick="abrirModalForm('posts')"><i class="ph ph-plus"></i> Novo Item / Post</button>`;
  } else {
    container.innerHTML = ``;
  }
}


function renderCurrentView() {
  if (currentView === 'tela-patrimonio') renderPatrimonio();
  if (currentView === 'tela-financeiro') renderFinanceiro();
  if (currentView === 'tela-clientes') renderClientes();
  if (currentView === 'tela-senhas') renderSenhas();
  if (currentView === 'tela-catalogo') renderCatalogoApi();
  if (currentView === 'tela-plantas') renderPlantas();
  if (currentView === 'tela-plantas-fila') renderFilaPlantas();
  if (currentView === 'tela-plantas-toxicas') renderToxicas();
  if (currentView === 'tela-plantas-uteis') renderUteis();
  if (currentView === 'tela-vendas') renderVendas();
  if (currentView === 'tela-api') { renderApi(); carregarDadosReaisApi(); desenharSatFazendas(); }
  if (currentView === 'tela-treino') renderTreino();
  if (currentView === 'tela-lab-conhecimento' && typeof window.carregarHistoricoTuring === 'function') window.carregarHistoricoTuring();
  if (currentView === 'tela-posts') {
    renderMetricasHome();
    if (!apiChecadaNaSessao) { apiChecadaNaSessao = true; checarSaudeApi(); }
  }
  if (['tela-posts', 'tela-videos', 'tela-podcast'].includes(currentView)) renderPosts();
  if (['tela-agro', 'tela-nexus'].includes(currentView)) renderProjeto(currentView.replace('tela-', ''));
  if (currentView === 'tela-turin') renderTuringVisao();
  if (currentView === 'tela-pacotes') renderPacotes();
  if (currentView === 'tela-satelite') renderSatelite();
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
    appData.minis = [
      {
        id: 101,
        nome: 'Mini Mercado',
        categoria: 'Comercial',
        desc: 'Gestão simples de produtos, vendas e estoque.',
        url: '',
        api: '/api/health',
        status: 'Rascunho'
      },
      {
        id: 102,
        nome: 'Curral Ágil',
        categoria: 'Agro',
        desc: 'Gestão operacional para propriedades e manejo rural.',
        url: '',
        api: '/api/health',
        status: 'Rascunho'
      },
      {
        id: 103,
        nome: 'Farmácia FA',
        categoria: 'Comercial',
        desc: 'Controle simplificado para farmácia e atendimento.',
        url: '',
        api: '/api/health',
        status: 'Rascunho'
      },
      {
        id: 104,
        nome: 'GluZen',
        categoria: 'Saúde',
        desc: 'Mini-software de organização e acompanhamento.',
        url: '',
        api: '/api/health',
        status: 'Rascunho'
      },
      {
        id: 105,
        nome: 'Imobiliária',
        categoria: 'Imóveis',
        desc: 'Cadastro e gerenciamento de imóveis e patrimônio.',
        url: '',
        api: '/api/health',
        status: 'Rascunho'
      },
      {
        id: 106,
        nome: 'Registro RG',
        categoria: 'Outros',
        desc: 'Cadastro e organização digital de registros.',
        url: '',
        api: '/api/health',
        status: 'Rascunho'
      }
    ];
    persistData();
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

        <div class="mini-link-row">
          <i class="ph ph-plugs-connected"></i>
          <input class="inline-input"
                 value="${escapeHtml(m.api || '/api/health')}"
                 placeholder="/api/..."
                 onchange="editarMini(${m.id}, 'api', this.value)">
          <button class="btn-action secondary"
                  onclick="testarMiniApi(${m.id})">
            <i class="ph ph-pulse"></i> Testar API
          </button>
        </div>

        <div class="mini-card-footer">
          <select class="form-control mini-status" title="Status" onchange="editarMini(${m.id}, 'status', this.value)">${statusOpts}</select>
          <select class="form-control mini-status" title="Categoria" onchange="editarMini(${m.id}, 'categoria', this.value)">${catOpts}</select>
          <div class="action-btns">
            <button class="btn-action secondary"
                    title="Aprovar"
                    onclick="aprovarMini(${m.id})">
              <i class="ph ph-check-circle"></i> Aprovar
            </button>
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

function aprovarMini(id) {
  const item = appData.minis.find(x => x.id === id);
  if (!item) return;

  item.status = 'Publicado';
  persistData();
  renderCatalogo();
}

async function testarMiniApi(id) {
  const item = appData.minis.find(x => x.id === id);
  if (!item) return;

  const rota = (item.api || '/api/health').trim();
  const url = rota.startsWith('http')
    ? rota
    : `https://api.gustavopaulasantos.com.br${rota.startsWith('/') ? rota : '/' + rota}`;

  try {
    const inicio = performance.now();
    const resposta = await fetch(url, { cache: 'no-store' });
    const ms = Math.round(performance.now() - inicio);

    alert(
      `${item.nome}\nAPI: ${resposta.status} ${resposta.ok ? 'OK' : 'ERRO'}\nLatência: ${ms} ms`
    );
  } catch (erro) {
    alert(`${item.nome}\nFalha ao conectar com a NexoTerraCore/API.`);
  }
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

function abrirModalAlterarSenha() {
  if (!vaultKey) return;
  activeModalType = 'senha-acesso';
  editingId = null;
  document.getElementById('modal-titulo').innerText = 'Alterar senha de acesso';
  document.getElementById('modal-submit').innerHTML = '<i class="ph ph-key"></i> Atualizar senha';
  document.getElementById('modal-body').innerHTML = `
    <div class="form-group"><label for="senha-atual">Senha atual</label><input id="senha-atual" type="password" class="form-control" autocomplete="current-password" required></div>
    <div class="form-group"><label for="senha-nova">Nova senha (mín. 12 caracteres)</label><input id="senha-nova" type="password" class="form-control" autocomplete="new-password" required></div>
    <div class="form-group"><label for="senha-nova-confirma">Confirmar nova senha</label><input id="senha-nova-confirma" type="password" class="form-control" autocomplete="new-password" required></div>
    <p id="senha-acesso-erro" class="login-erro" role="alert"></p>
  `;
  document.getElementById('modal-container').classList.add('active');
  document.getElementById('senha-atual').focus();
}

async function salvarSenhaAcesso() {
  const erro = document.getElementById('senha-acesso-erro');
  const senhaAtual = document.getElementById('senha-atual').value;
  const senhaNova = document.getElementById('senha-nova').value;
  const confirma = document.getElementById('senha-nova-confirma').value;

  if (!senhaAtual) { erro.textContent = 'Informe a senha atual.'; return; }
  if (senhaNova.length < 12) { erro.textContent = 'Use ao menos 12 caracteres na nova senha.'; return; }
  if (senhaNova !== confirma) { erro.textContent = 'As novas senhas não coincidem.'; return; }

  let auth;
  try {
    auth = JSON.parse(localStorage.getItem(STORAGE_AUTH));
    const chaveAtual = await deriveKey(senhaAtual, auth.salt);
    if (await decryptJSON(chaveAtual, auth.check) !== CHECK_PLAINTEXT) throw new Error('Senha atual incorreta.');

    const vaultRaw = localStorage.getItem(STORAGE_VAULT);
    const senhas = vaultRaw ? await decryptJSON(chaveAtual, JSON.parse(vaultRaw)) : appData.senhas || [];
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const saltB64 = bufToB64(salt);
    const chaveNova = await deriveKey(senhaNova, saltB64);
    const authNovo = Object.assign({}, auth, {
      salt: saltB64,
      check: await encryptJSON(chaveNova, CHECK_PLAINTEXT)
    });
    const cofreNovo = await encryptJSON(chaveNova, senhas);
    const cofreAnterior = vaultRaw;

    try {
      localStorage.setItem(STORAGE_VAULT, JSON.stringify(cofreNovo));
      localStorage.setItem(STORAGE_AUTH, JSON.stringify(authNovo));
    } catch (storageError) {
      if (cofreAnterior === null) localStorage.removeItem(STORAGE_VAULT);
      else localStorage.setItem(STORAGE_VAULT, cofreAnterior);
      throw new Error('Não foi possível salvar. A senha anterior foi mantida.');
    }

    vaultKey = chaveNova;
    appData.senhas = senhas;
    fecharModal();
    alert('Senha atualizada. O cofre foi recriptografado com a nova senha.');
  } catch (e) {
    erro.textContent = e.message === 'Senha atual incorreta.'
      ? e.message
      : (e.message === 'Não foi possível salvar. A senha anterior foi mantida.'
        ? e.message
        : 'Não foi possível validar a senha atual ou abrir o cofre. Nenhuma alteração foi aplicada.');
  }
}

async function salvarModal() {
  if (activeModalType === 'senha-acesso') {
    await salvarSenhaAcesso();
    return;
  }
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
  } else if (activeModalType === 'imoveis') {
    await salvarImovel();
    return;
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
  const submit = document.getElementById('modal-submit');
  if (submit) submit.innerText = 'Salvar Dados';
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
  appsApi = appsApi || []; conhecimentosApi = conhecimentosApi || [];
  const agoraH = Date.now();
  if (!appsApi.length && tokenDoCofre() && agoraH - (renderMetricasHome._pedido || 0) > 15000) {
    renderMetricasHome._pedido = agoraH;
    carregarAppsApi().then(() => { if (appsApi.length) renderMetricasHome(); });
  }
  if (!conhecimentosApi.length && tokenDoCofre() && agoraH - (renderMetricasHome._pedidoK || 0) > 15000) {
    renderMetricasHome._pedidoK = agoraH;
    apiConhecimento('/listar').then(d => { conhecimentosApi = d.conhecimentos || []; if (conhecimentosApi.length) renderMetricasHome(); }).catch(() => {});
  }
  const ativos = appsApi.filter(a => a.status !== 'arquivado');
  const noArApps = ativos.filter(a => classeSaude(a) === 'ok').length;
  const pwas = ativos.filter(a => a.tipo === 'pwa').length;
  const pend = conhecimentosApi.filter(k => k.status === 'rascunho').length;
  const aprov = conhecimentosApi.filter(k => k.status === 'aprovado').length;
  const est = ESTADOS_API[statusApi.estado] || ESTADOS_API['nao-configurada'];
  // Turing em destaque: primeiro e em largura total no topo
  const cardsTuring = [
    ['API / Turing', est.curto, statusApi.ms != null ? `${statusApi.ms} ms` : est.sub, 'tela-api', 'turing'],
    ['Treino do Turing', conhecimentosApi.length ? `${pend} pendente(s)` : '—', `${aprov} aprovados na API`, 'tela-turin', 'turing']
  ];
  const cardsSecundarios = [
    ['Mini-softwares', appsApi.length ? `${ativos.length}` : '—', `${pwas} PWA · ${noArApps} no ar (API)`, 'tela-catalogo', ''],
    ['Natureza', 'Plantas', 'catálogo e treino na API', 'tela-plantas', '']
  ];
  const fora = ativos.filter(a => classeSaude(a) === 'erro');
  const ultimoCheck = Math.max(0, ...ativos.map(a => a.ultimo_check_em ? Date.parse(a.ultimo_check_em) : 0));
  const parado = ativos.length && ultimoCheck && (Date.now() - ultimoCheck > 2 * 3600 * 1000);
  let alertaApps = '';
  if (fora.length) {
    alertaApps = `<div class="alerta-apps" role="alert" onclick="abrirTela('tela-catalogo')">
      <i class="ph ph-warning-circle"></i>
      <div><strong>${fora.length} app(s) fora do ar ou com erro</strong>
      <p>${fora.map(a => `${escapeHtml(a.nome)} <small>(${escapeHtml(textoSaude(a))})</small>`).join(' · ')}</p></div>
      <span class="alerta-apps-ver">Ver →</span></div>`;
  } else if (ativos.length && ultimoCheck) {
    alertaApps = `<div class="alerta-apps ok"><i class="ph ph-check-circle"></i><div><strong>Todos os ${ativos.length} apps no ar</strong>
      <p>Última verificação: ${new Date(ultimoCheck).toLocaleString('pt-BR')}</p></div></div>`;
  }
  if (parado) alertaApps += `<div class="alerta-apps aviso"><i class="ph ph-clock-countdown"></i><div><strong>A verificação automática está parada</strong><p>Última: ${new Date(ultimoCheck).toLocaleString('pt-BR')} (deveria rodar a cada hora na VPS).</p></div></div>`;
  el.innerHTML = alertaApps +
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
  el.innerHTML = ''; // bloco antigo removido: o card principal do Turing (topo) já mostra status, latência e treino
  return;
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
          <button class="btn-action secondary" onclick="abrirTela('tela-lab-conhecimento')"><i class="ph ph-flask"></i> Treinar</button>
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
          <span>Fila local</span>
          <strong>${fila} exemplo(s) neste navegador</strong>
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
  return it && it.pass ? String(it.pass).replace(/^\s*Bearer\s+/i, '').trim() : '';
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

  desenharEndpoints();
  testarTodosEndpoints();
}

function desenharEndpoints() {
  const c = appData.config;
  if (c.endpoints.length !== SEED_ENDPOINTS.length || c.endpoints.some((e, i) => e.rota !== SEED_ENDPOINTS[i].rota || !e.uso)) {
    c.endpoints = JSON.parse(JSON.stringify(SEED_ENDPOINTS));
    c.endpointsVersao = ENDPOINTS_VERSAO;
    for (const k in resultadosTeste) delete resultadosTeste[k];
    persistData();
  }
  const tbody = document.getElementById('tbody-endpoints');
  if (!tbody) return;
  tbody.innerHTML = c.endpoints.map((e, i) => {
    const r = resultadosTeste[i];
    const cls = !r ? '' : r.ok ? 'green' : 'red';
    return `<tr>
      <td><code>${escapeHtml(e.rota)}</code><br><span class="mini-sem-link">${escapeHtml(e.uso || '')}</span></td>
      <td><span class="mini-sem-link">${escapeHtml(e.auth)}</span></td>
      <td>${r ? `<span class="badge ${cls}">${escapeHtml(r.texto)}</span>` : '<span class="mini-sem-link">aguardando…</span>'}</td>
      <td><button class="btn-icon" title="Testar de novo" onclick="testarEndpoint(${i})"><i class="ph ph-arrows-clockwise"></i></button></td>
    </tr>`;
  }).join('');
  const feitos = Object.values(resultadosTeste).filter(Boolean);
  const ok = feitos.filter(r => r.ok);
  const resumo = document.getElementById('api-resumo-rotas');
  if (resumo) resumo.innerHTML =
    `<div class="metric-card"><span>Rotas OK</span><h3 style="color:var(--success-green)">${ok.length}/${c.endpoints.length}</h3></div>` +
    `<div class="metric-card"><span>Com problema</span><h3 style="color:var(--danger-red)">${feitos.length - ok.length}</h3></div>` +
    `<div class="metric-card"><span>Tempo médio</span><h3>${ok.length ? Math.round(ok.reduce((a, r) => a + r.ms, 0) / ok.length) + ' ms' : '—'}</h3></div>`;
}

async function testarTodosEndpoints() {
  desenharEndpoints();
  for (let i = 0; i < appData.config.endpoints.length; i++) await testarEndpoint(i);
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

function significadoHttp(c) {
  if (c >= 200 && c < 300) return 'OK';
  if (c === 400) return 'acesso OK (faltam parâmetros)';
  if (c === 401) return 'token inválido ou ausente';
  if (c === 403) return 'chave sem permissão';
  if (c === 404) return 'rota não existe';
  if (c === 429) return 'limite de uso';
  return c >= 500 ? 'erro na API' : 'verificar';
}

// Só GET, sem enviar dados: serve para ver se a API responde.
async function testarEndpoint(i) {
  const e = appData.config.endpoints[i];
  if (!e || e.metodo !== 'GET' || !appData.config.apiBase) return;
  const t0 = performance.now();
  try {
    const tk = tokenDoCofre();
    const res = await fetch(appData.config.apiBase + e.rota, { method: 'GET', cache: 'no-store', headers: tk ? { Authorization: 'Bearer ' + tk } : {} });
    const ms = Math.round(performance.now() - t0);
    const ok = (res.status >= 200 && res.status < 300) || (res.status === 400 && e.rota === '/api/geo/ndvi');
    resultadosTeste[i] = { ok, ms, texto: `HTTP ${res.status} · ${ms} ms · ${significadoHttp(res.status)}` };
  } catch (err) {
    resultadosTeste[i] = { ok: false, ms: 0, texto: navigator.onLine ? 'sem resposta (rede ou CORS)' : 'sem internet' };
  }
  desenharEndpoints();
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
    const usuario = document.getElementById('login-usuario').value;
    const senha = document.getElementById('login-senha').value;
    if (temSenhaCriada()) {
      await fazerLogin(usuario, senha);
    } else {
      const confirma = document.getElementById('login-senha-confirma').value;
      await fazerSetup(usuario, senha, confirma);
    }
  });
});

async function atualizarTuringHealth() {
  const statusEl = document.querySelector('#turing-lab-consolidado .metric-card:nth-child(1) h3');
  const integEl = document.querySelector('#turing-lab-consolidado .metric-card:nth-child(2) h3');

  try {
    const inicio = performance.now();
    const resp = await fetch('https://api.gustavopaulasantos.com.br/api/turing/training/health', {
      cache: 'no-store'
    });
    const fim = performance.now();

    if (!resp.ok) throw new Error('HTTP ' + resp.status);

    if (statusEl) statusEl.textContent = 'ONLINE';
    if (integEl) integEl.textContent = `NexoTerraCore API · ${Math.round(fim - inicio)} ms`;

    const badge = document.querySelector('#turing-lab-consolidado .metric-card:nth-child(1) .badge');
    if (badge) {
      badge.textContent = 'ATIVO';
      badge.classList.remove('red', 'orange');
      badge.classList.add('green');
    }

  } catch (err) {
    const isLocal = ['localhost', '127.0.0.1'].includes(location.hostname);

    const badge = document.querySelector('#turing-lab-consolidado .metric-card:nth-child(1) .badge');

    if (isLocal) {
      if (statusEl) statusEl.textContent = 'LOCAL';
      if (integEl) integEl.textContent = 'Health bloqueado por CORS no localhost';

      if (badge) {
        badge.textContent = 'LAB';
        badge.classList.remove('green', 'red');
        badge.classList.add('orange');
      }
    } else {
      if (statusEl) statusEl.textContent = 'OFFLINE';
      if (integEl) integEl.textContent = 'API indisponível';

      if (badge) {
        badge.textContent = 'ERRO';
        badge.classList.remove('green', 'orange');
        badge.classList.add('red');
      }
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  atualizarTuringHealth();
  setInterval(atualizarTuringHealth, 30000);
});


async function atualizarHomeTuring() {
  const card = document.getElementById('home-turing-card');
  if (!card) return;

  const status = document.getElementById('home-turing-status');
  const api = document.getElementById('home-turing-api');
  const badge = document.getElementById('home-turing-badge');
  const health = document.getElementById('home-turing-health');
  const latency = document.getElementById('home-turing-latency');

  const local = ['localhost', '127.0.0.1'].includes(location.hostname);

  if (local) {
    status.textContent = 'LOCAL · LAB';
    api.textContent = 'NexoTerraCore API';
    badge.innerHTML =
      '<span class="home-turing-dot"></span> LAB';
    health.textContent = 'API online · validação local limitada por CORS';
    latency.textContent = 'produção autorizada';
    return;
  }

  try {
    const inicio = performance.now();

    const resposta = await fetch(
      'https://api.gustavopaulasantos.com.br/api/turing/training/health',
      { cache: 'no-store' }
    );

    const ms = Math.round(performance.now() - inicio);

    if (!resposta.ok) {
      throw new Error('HTTP ' + resposta.status);
    }

    const dados = await resposta.json();

    status.textContent = 'ATIVO · PASS';
    api.textContent = 'NexoTerraCore API · HTTP 200';
    badge.innerHTML =
      '<span class="home-turing-dot"></span> ATIVO · PASS';
    health.textContent =
      dados.status === 'online'
        ? 'API Core online'
        : 'API respondeu';
    latency.textContent = ms + ' ms';

    card.classList.add('api-online');

  } catch (erro) {
    status.textContent = 'ERRO';
    api.textContent = 'API indisponível';
    badge.innerHTML =
      '<span class="home-turing-dot"></span> ERRO';
    health.textContent = 'Falha na verificação';
    latency.textContent = '';
  }
}

document.addEventListener('DOMContentLoaded', atualizarHomeTuring);

// ===== Satélite das fazendas (Sentinel-2 via NexoTerraCore API) =====
const SAT_FAZ_PADRAO = [
  { nome: 'Fazenda PIPE — Malanje (Angola)', lat: -9.54, lon: 16.34 },
  { nome: 'Fazenda Saudade', lat: -18.90, lon: -50.65 },
  { nome: 'Fazenda Pateirinho', lat: '', lon: '' },
  { nome: 'Fazenda Santa Luzia', lat: '', lon: '' },
  { nome: 'Fazenda do Lago', lat: '', lon: '' }
];
const resultadosSat = {};
function satFazendas() {
  const c = appData.config;
  if (!Array.isArray(c.satFaz) || !c.satFaz.length) c.satFaz = JSON.parse(JSON.stringify(SAT_FAZ_PADRAO));
  return c.satFaz;
}
function editarSatFaz(i, campo, valor) {
  const f = satFazendas()[i]; if (!f) return;
  f[campo] = String(valor).trim().replace(',', '.');
  persistData();
}
function desenharSatFazendas() {
  const tb = document.getElementById('tbody-sat-faz'); if (!tb) return;
  tb.innerHTML = satFazendas().map((f, i) => {
    const r = resultadosSat[i] || {};
    return `<tr>
      <td>${escapeHtml(f.nome)}</td>
      <td><input class="inline-input" style="width:110px" value="${escapeHtml(f.lat)}" placeholder="-18.90" onchange="editarSatFaz(${i},'lat',this.value)"></td>
      <td><input class="inline-input" style="width:110px" value="${escapeHtml(f.lon)}" placeholder="-50.65" onchange="editarSatFaz(${i},'lon',this.value)"></td>
      <td>${r.data || '—'}</td><td>${r.nuvens || '—'}</td><td>${r.situacao || '<span class="vault-hint">não consultado</span>'}</td></tr>`;
  }).join('');
}
async function consultarSatelites() {
  const base = (appData?.config?.apiBase || 'https://api.gustavopaulasantos.com.br').replace(/\/+$/, '');
  const token = tokenDoCofre();
  const lista = satFazendas();
  for (let i = 0; i < lista.length; i++) {
    const f = lista[i];
    if (f.lat === '' || f.lon === '' || isNaN(Number(f.lat)) || isNaN(Number(f.lon))) {
      resultadosSat[i] = { situacao: 'informe latitude e longitude' }; continue;
    }
    if (!token) { resultadosSat[i] = { situacao: 'sem token no cofre' }; continue; }
    resultadosSat[i] = { situacao: 'consultando...' }; desenharSatFazendas();
    try {
      const url = `${base}/api/geo/sentinel2/latest?lat=${encodeURIComponent(f.lat)}&lon=${encodeURIComponent(f.lon)}&days=30&nome=${encodeURIComponent(f.nome)}`;
      const r = await fetch(url, { headers: { Authorization: 'Bearer ' + token }, cache: 'no-store' });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.ok) { resultadosSat[i] = { situacao: `🔴 erro (${r.status})` }; }
      else if (!d.encontrado) { resultadosSat[i] = { situacao: '🟡 sem imagem em 30 dias' }; }
      else {
        const quando = d.cena.capturadaEm ? new Date(d.cena.capturadaEm) : null;
        const dias = quando ? Math.round((Date.now() - quando.getTime()) / 864e5) : null;
        const n = d.cena.nuvens;
        const sit = n === null ? '🟡 nuvens desconhecidas' : (n <= 20 ? '🟢 imagem boa' : (n <= 60 ? '🟡 nublada' : '🔴 muita nuvem'));
        resultadosSat[i] = {
          data: quando ? quando.toLocaleDateString('pt-BR') + (dias !== null ? ` (há ${dias} d)` : '') : '—',
          nuvens: n === null ? '—' : Math.round(n) + '%', situacao: sit
        };
      }
    } catch (e) { resultadosSat[i] = { situacao: '🔴 falha de rede' }; }
    desenharSatFazendas();
  }
}


// deploy-refresh: 2026-10-14T07:18:21-03:00

async function carregarDadosReaisApi() {
  const box = document.getElementById('api-dados-reais');
  if (!box) return;

  const base =
    (appData?.config?.apiBase || 'https://api.gustavopaulasantos.com.br')
      .replace(/\/+$/, '');

  const token =
    typeof tokenDoCofre === 'function'
      ? tokenDoCofre()
      : '';

  box.innerHTML = '<p class="vault-hint">Consultando API real...</p>';

  try {
    const healthResp = await fetch(base + '/api/health', {
      cache: 'no-store'
    });

    const health = await healthResp.json();

    let conhecimentos = null;

    if (token) {
      const r = await fetch(
        base + '/api/turing/conhecimento/listar',
        {
          headers: {
            Authorization: 'Bearer ' + token
          },
          cache: 'no-store'
        }
      );

      if (!r.ok) {
        throw new Error('Consulta Turing: HTTP ' + r.status);
      }
      conhecimentos = await r.json();
      if (!conhecimentos?.ok) {
        throw new Error('Resposta inválida da API Turing');
      }
    }

    const lista =
      conhecimentos?.ok && Array.isArray(conhecimentos.conhecimentos)
        ? conhecimentos.conhecimentos
        : [];

    const aprovados = lista.filter(x => x.status === 'aprovado').length;
    const rascunhos = lista.filter(x => x.status === 'rascunho').length;

    box.innerHTML = `
      <div class="metrics-grid">
        <div class="metric-card">
          <span>API</span>
          <h3>${health.api || 'indisponível'}</h3>
        </div>

        <div class="metric-card">
          <span>Banco</span>
          <h3>${health.banco || 'indisponível'}</h3>
        </div>

        <div class="metric-card">
          <span>Conhecimentos Turing</span>
          <h3>${token && conhecimentos?.ok ? lista.length : 'Não consultado'}</h3>
        </div>

        <div class="metric-card">
          <span>Aprovados</span>
          <h3>${aprovados}</h3>
        </div>

        <div class="metric-card">
          <span>Rascunhos</span>
          <h3>${rascunhos}</h3>
        </div>
      </div>

      <div class="project-section" style="margin-top:16px">
        <strong>Fonte:</strong> NexoTerraCore API + PostgreSQL
        <br>
        <small>
          Token: ${token ? 'cofre conectado' : 'não encontrado no cofre'}
        </small>
      </div>
    `;
  } catch (erro) {
    box.innerHTML =
      '<p class="vault-hint">Erro ao consultar API real: ' +
      escapeHtml(erro.message) +
      '</p>';
  }
}


/* ============================================================
   IMÓVEIS / PATRIMÔNIO
   ============================================================ */

const STORAGE_PATRIMONIO = 'gps_patrimonio_imoveis_v1';

const PATRIMONIO_SEED = [
  {
    id: 1001,
    nome: 'Fazenda do Lago',
    municipio: 'São Simão',
    uf: 'GO',
    areaHa: 2478,
    latitude: '',
    longitude: '',
    valor: '',
    status: 'Confirmado',
    tipo: 'Rural',
    fonte: 'Cadastro/documentação a validar no backend',
    observacoes: 'Propriedade rural real. Coordenadas e documentação detalhada pendentes de vinculação segura à API.'
  },
  {
    id: 1002,
    nome: 'Fazenda Saudade',
    municipio: 'Paranaiguara',
    uf: 'GO',
    areaHa: 330.84,
    latitude: '',
    longitude: '',
    valor: '',
    status: 'Confirmado',
    tipo: 'Rural',
    fonte: 'Cadastro/documentação a validar no backend',
    observacoes: 'Propriedade rural real. Possui referência ambiental e hídrica; identificadores sensíveis não são exibidos no frontend.'
  },
  {
    id: 1003,
    nome: 'Fazenda Porteirinho / Poteirinho',
    municipio: '',
    uf: 'GO',
    areaHa: '',
    latitude: '',
    longitude: '',
    valor: '',
    status: 'Pendente de validação',
    tipo: 'Rural',
    fonte: 'Informação fornecida pelo proprietário',
    observacoes: 'Área, município e coordenadas ainda pendentes de confirmação.'
  }
];

function carregarPatrimonio() {
  try {
    const raw = localStorage.getItem(STORAGE_PATRIMONIO);
    if (raw) return JSON.parse(raw);
  } catch (e) {}

  localStorage.setItem(
    STORAGE_PATRIMONIO,
    JSON.stringify(PATRIMONIO_SEED)
  );

  return JSON.parse(JSON.stringify(PATRIMONIO_SEED));
}

/* ============================================================
   Patrimônio / Imóveis — conectado à NexoTerraCore API
   ============================================================ */

let _imovelEditandoId = null;
let _imovelModalAberto = false;

function _apiBasePatrimonio() {
  return (appData.config.apiBase || 'https://api.gustavopaulasantos.com.br').replace(/\/+$/, '');
}

function _moeda(v) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0
    ? n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : '—';
}

async function renderPatrimonio() {
  const resumo = document.getElementById('patrimonio-resumo');
  const tbody = document.getElementById('tbody-imoveis');
  const statusEl = document.getElementById('patrimonio-status-api');

  if (!tbody) return;

  const token = tokenDoCofre();
  if (!token) {
    if (statusEl) statusEl.innerHTML = '<i class="ph ph-warning"></i> Token da API não encontrado no cofre. Cadastre o token em <button class="link-inline" onclick="abrirTela(\'tela-api\')">API / Conexão</button>.';
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text-secondary)">Sem token configurado.</td></tr>';
    return;
  }

  if (statusEl) statusEl.innerHTML = '<i class="ph ph-spinner"></i> Consultando API…';
  tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text-secondary)">Carregando…</td></tr>';

  try {
    const resp = await fetch(_apiBasePatrimonio() + '/api/imoveis', {
      headers: { Authorization: 'Bearer ' + token },
      cache: 'no-store'
    });

    if (!resp.ok) {
      if (statusEl) statusEl.innerHTML = `<i class="ph ph-warning"></i> Erro HTTP ${resp.status}. Verifique o token e a URL da API.`;
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--text-secondary)">Erro ao consultar API (${resp.status}).</td></tr>`;
      return;
    }

    const dadosImoveis = await resp.json();
    const imoveis = (Array.isArray(dadosImoveis) ? dadosImoveis
      : (Array.isArray(dadosImoveis && dadosImoveis.imoveis) ? dadosImoveis.imoveis : [])).filter(i => i.ativo !== false);
    window._imoveisCache = imoveis;

    if (statusEl) statusEl.innerHTML = `<i class="ph ph-check-circle"></i> ${imoveis.length} imóvel(is) · NexoTerraCore API`;

    const conjuntos = {};
    imoveis.forEach(i => { const x = i.dados_extras || {}; if (x.conjunto && Number(x.valor_conjunto) > 0) conjuntos[x.conjunto] = Number(x.valor_conjunto); });
    const valorTotal = imoveis.reduce((s, i) => {
      const n = Number(i.valor);
      return s + (Number.isFinite(n) ? n : 0);
    }, 0) + Object.values(conjuntos).reduce((a, b) => a + b, 0);

    if (resumo) {
      resumo.innerHTML = `
        <div class="metric-card">
          <span>Imóveis</span>
          <h3>${imoveis.length}</h3>
          <p class="metric-sub">cadastrados</p>
        </div>
        <div class="metric-card">
          <span>Valor total</span>
          <h3>${_moeda(valorTotal)}</h3>
          <p class="metric-sub">${Object.keys(conjuntos).length ? 'inclui conjunto ' + Object.keys(conjuntos).map(escapeHtml).join(', ') : 'portfólio'}</p>
        </div>
        <div class="metric-card">
          <span>API</span>
          <h3>Online</h3>
          <p class="metric-sub">NexoTerraCore</p>
        </div>
      `;
    }

    if (!imoveis.length) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text-secondary)">Nenhum imóvel cadastrado.</td></tr>';
      return;
    }

    tbody.innerHTML = imoveis.map(im => {
      const mapsBtn = `<button class="btn-action secondary" onclick="abrirMapaImovel(${im.id}, 'maps')" title="Google Maps"><i class="ph ph-map-pin"></i></button>`;
      const earthBtn = `<button class="btn-action secondary" onclick="abrirMapaImovel(${im.id}, 'earth')" title="Google Earth"><i class="ph ph-globe"></i></button>`;
      return `
        <tr>
          <td><strong>${escapeHtml(im.matricula || '—')}</strong></td>
          <td>${escapeHtml(im.titulo || im.tipo || '—')}</td>
          <td>${escapeHtml([im.cidade, im.uf].filter(Boolean).join(' / ') || '—')}</td>
          <td>${escapeHtml(im.tipo || '—')}</td>
          <td>${_moeda(im.valor)}</td>
          <td><span class="badge ${im.status === 'Ativo' ? 'green' : 'blue'}">${escapeHtml(im.status || 'Rascunho')}</span></td>
          <td>
            ${mapsBtn}${earthBtn}
            <button class="btn-action secondary" onclick="abrirModalImovel(${im.id})" title="Editar"><i class="ph ph-pencil"></i></button>
            <button class="btn-action secondary" onclick="excluirImovel(${im.id}, '${escapeHtml(im.titulo || im.matricula || 'este imóvel').replace(/'/g, "\\'")}')" title="Excluir"><i class="ph ph-trash"></i></button>
          </td>
        </tr>`;
    }).join('');
  } catch (e) {
    if (statusEl) statusEl.innerHTML = '<i class="ph ph-warning"></i> Sem conexão com a API.';
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text-secondary)">Erro de conexão.</td></tr>';
  }
}

function abrirModalImovel(id = null) {
  _imovelEditandoId = id;
  const overlay = document.getElementById('modal-container');
  const titulo = document.getElementById('modal-titulo');
  const body = document.getElementById('modal-body');
  if (!overlay || !body) return;

  titulo.innerText = id ? 'Editar Imóvel' : 'Novo Imóvel';

  const im = { titulo: '', matricula: '', tipo: 'Casa', status: 'Rascunho', endereco: '', numero: '', bairro: '', cidade: '', uf: '', cep: '', terreno: '', area: '', valor: '', cartorio: '', titular: '', observacao: '' };

  if (id) {
    const token = tokenDoCofre();
    if (!token) { alert('Token não configurado.'); return; }
    fetch(_apiBasePatrimonio() + '/api/imoveis', { headers: { Authorization: 'Bearer ' + token }, cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        const lista = Array.isArray(d) ? d : (d && d.imoveis) || [];
        const found = lista.find(x => x.id === id);
        if (found) {
          Object.assign(im, {
            titulo: found.titulo || '',
            matricula: found.matricula || '',
            tipo: found.tipo || 'Casa',
            status: found.status || 'Rascunho',
            endereco: found.endereco || '',
            numero: found.numero || '',
            bairro: found.bairro || '',
            cidade: found.cidade || '',
            uf: found.uf || '',
            cep: found.cep || '',
            terreno: found.terreno || '',
            area: found.area || '',
            valor: found.valor || '',
            cartorio: found.cartorio || '',
            titular: found.titular || '',
            observacao: found.observacao || ''
          });
          _preencherFormImovel(body, im);
        }
      })
      .catch(() => {});
  }

  _preencherFormImovel(body, im);
  overlay.classList.add('active');
  activeModalType = 'imoveis';
}

function _preencherFormImovel(body, im) {
  const tipos = ['Casa', 'Apartamento', 'Terreno', 'Fazenda', 'Comercial', 'Lote', 'Galpão', 'Outro'];
  const statuses = ['Rascunho', 'Ativo', 'À Venda', 'Alugado', 'Vendido'];
  body.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div class="form-group" style="grid-column:1/-1"><label>Título / Identificação *</label><input id="im-titulo" class="form-control" value="${escapeHtml(im.titulo)}" required></div>
      <div class="form-group"><label>Matrícula (opcional)</label><input id="im-matricula" class="form-control" value="${escapeHtml(im.matricula)}"></div>
      <div class="form-group"><label>Tipo</label><select id="im-tipo" class="form-control">${tipos.map(t => `<option${t === im.tipo ? ' selected' : ''}>${t}</option>`).join('')}</select></div>
      <div class="form-group"><label>Status</label><select id="im-status" class="form-control">${statuses.map(s => `<option${s === im.status ? ' selected' : ''}>${s}</option>`).join('')}</select></div>
      <div class="form-group"><label>Valor (R$)</label><input id="im-valor" class="form-control" type="number" min="0" step="0.01" value="${escapeHtml(String(im.valor))}"></div>
      <div class="form-group"><label>Endereço</label><input id="im-endereco" class="form-control" value="${escapeHtml(im.endereco)}"></div>
      <div class="form-group"><label>Número</label><input id="im-numero" class="form-control" value="${escapeHtml(im.numero)}"></div>
      <div class="form-group"><label>Bairro</label><input id="im-bairro" class="form-control" value="${escapeHtml(im.bairro)}"></div>
      <div class="form-group"><label>Cidade</label><input id="im-cidade" class="form-control" value="${escapeHtml(im.cidade)}"></div>
      <div class="form-group"><label>UF</label><input id="im-uf" class="form-control" maxlength="2" value="${escapeHtml(im.uf)}"></div>
      <div class="form-group"><label>CEP</label><input id="im-cep" class="form-control" value="${escapeHtml(im.cep)}"></div>
      <div class="form-group"><label>Terreno (m²)</label><input id="im-terreno" class="form-control" type="number" min="0" step="0.01" value="${escapeHtml(String(im.terreno))}"></div>
      <div class="form-group"><label>Área construída (m²)</label><input id="im-area" class="form-control" type="number" min="0" step="0.01" value="${escapeHtml(String(im.area))}"></div>
      <div class="form-group"><label>Cartório</label><input id="im-cartorio" class="form-control" value="${escapeHtml(im.cartorio)}"></div>
      <div class="form-group"><label>Titular</label><input id="im-titular" class="form-control" value="${escapeHtml(im.titular)}"></div>
      <div class="form-group" style="grid-column:1/-1"><label>Observação</label><textarea id="im-observacao" class="form-control" style="min-height:70px">${escapeHtml(im.observacao)}</textarea></div>
      <div style="grid-column:1/-1;display:flex;gap:8px;flex-wrap:wrap">
        <button type="button" class="btn-action secondary" onclick="abrirMapsImovelForm()"><i class="ph ph-map-pin"></i> Google Maps</button>
        <button type="button" class="btn-action secondary" onclick="abrirEarthImovelForm()"><i class="ph ph-globe"></i> Google Earth</button>
      </div>
    </div>
    <p id="im-mensagem" style="margin-top:8px;color:var(--text-secondary);font-size:13px"></p>
  `;
}

async function salvarImovel() {
  const token = tokenDoCofre();
  if (!token) { alert('Token não configurado no cofre.'); return; }

  const titulo = document.getElementById('im-titulo')?.value.trim();
  const matricula = document.getElementById('im-matricula')?.value.trim();
  if (!titulo) { alert('O título é obrigatório.'); return; }

  const num = v => { const n = parseFloat(v); return Number.isFinite(n) ? n : null; };

  const dados = {
    titulo,
    matricula: matricula || null,
    tipo: document.getElementById('im-tipo')?.value || 'Casa',
    status: document.getElementById('im-status')?.value || 'Rascunho',
    endereco: document.getElementById('im-endereco')?.value.trim() || null,
    numero: document.getElementById('im-numero')?.value.trim() || null,
    bairro: document.getElementById('im-bairro')?.value.trim() || null,
    cidade: document.getElementById('im-cidade')?.value.trim() || null,
    uf: (document.getElementById('im-uf')?.value.trim() || '').toUpperCase() || null,
    cep: document.getElementById('im-cep')?.value.trim() || null,
    terreno: num(document.getElementById('im-terreno')?.value),
    area: num(document.getElementById('im-area')?.value),
    valor: num(document.getElementById('im-valor')?.value),
    cartorio: document.getElementById('im-cartorio')?.value.trim() || null,
    titular: document.getElementById('im-titular')?.value.trim() || null,
    observacao: document.getElementById('im-observacao')?.value.trim() || null
  };

  const msgEl = document.getElementById('im-mensagem');
  if (msgEl) msgEl.textContent = 'Salvando…';

  try {
    const url = _imovelEditandoId
      ? _apiBasePatrimonio() + '/api/imoveis/' + _imovelEditandoId
      : _apiBasePatrimonio() + '/api/imoveis';

    const resp = await fetch(url, {
      method: _imovelEditandoId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify(dados)
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      if (msgEl) msgEl.textContent = 'Erro: ' + (err.erro || resp.status);
      return;
    }

    fecharModal();
    await renderPatrimonio();
  } catch (e) {
    if (msgEl) msgEl.textContent = 'Erro de conexão com a API.';
  }
}

async function excluirImovel(id, nome) {
  if (!confirm(`Excluir "${nome}"?\nEsta ação não pode ser desfeita.`)) return;

  const token = tokenDoCofre();
  if (!token) { alert('Token não configurado.'); return; }

  try {
    const resp = await fetch(_apiBasePatrimonio() + '/api/imoveis/' + id, {
      method: 'DELETE',
      headers: { Authorization: 'Bearer ' + token }
    });
    if (resp.status === 403) { alert('Exclusão bloqueada para API Key por segurança. Exclua com login de usuário.'); return; }
    if (!resp.ok) { alert('Erro ao excluir: HTTP ' + resp.status); return; }
    await renderPatrimonio();
  } catch (e) {
    alert('Erro de conexão ao excluir.');
  }
}



/* ============================================================
   Imóveis — Maps / Earth helpers
   ============================================================ */

function _enderecoImovelForm() {
  return [
    document.getElementById('im-endereco')?.value.trim(),
    document.getElementById('im-numero')?.value.trim(),
    document.getElementById('im-bairro')?.value.trim(),
    document.getElementById('im-cidade')?.value.trim(),
    document.getElementById('im-uf')?.value.trim()
  ].filter(Boolean).join(', ');
}

function abrirMapsImovelForm() {
  const end = _enderecoImovelForm();
  if (!end) { alert('Preencha o endereço primeiro.'); return; }
  window.open('https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(end), '_blank', 'noopener,noreferrer');
}

function abrirEarthImovelForm() {
  const end = _enderecoImovelForm();
  if (!end) { alert('Preencha o endereço primeiro.'); return; }
  window.open('https://earth.google.com/web/search/' + encodeURIComponent(end), '_blank', 'noopener,noreferrer');
}

function abrirMapaImovel(id, onde) {
  const im = (window._imoveisCache || []).find(x => x.id === id);
  if (!im) return;
  const x = im.dados_extras || {};
  let lat = Number(x.lat), lon = Number(x.lon);
  if (!(Number.isFinite(lat) && Number.isFinite(lon)) && im.mapa) {
    const m = String(im.mapa).match(/(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)/);
    if (m) { lat = Number(m[1]); lon = Number(m[2]); }
  }
  const temCoord = Number.isFinite(lat) && Number.isFinite(lon) && (lat || lon);
  const end = [im.endereco, im.numero, im.bairro, im.cidade, im.uf].filter(Boolean).join(', ');
  let url;
  if (onde === 'earth') url = temCoord ? `https://earth.google.com/web/@${lat},${lon},800a,1500d,35y,0h,0t,0r` : 'https://earth.google.com/web/search/' + encodeURIComponent(end);
  else url = temCoord ? `https://www.google.com/maps?q=${lat},${lon}` : (im.mapa && /^https:\/\//.test(im.mapa) ? im.mapa : 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(end));
  if (!temCoord && !end && !im.mapa) { alert('Sem endereço nem coordenadas. Use Editar para completar.'); return; }
  window.open(url, '_blank', 'noopener,noreferrer');
}

function abrirMapsEndereco(end) {
  if (!end) return;
  window.open('https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(end), '_blank', 'noopener,noreferrer');
}

function abrirEarthEndereco(end) {
  if (!end) return;
  window.open('https://earth.google.com/web/search/' + encodeURIComponent(end), '_blank', 'noopener,noreferrer');
}

/* ============================================================
   Sentinel-2 · NDVI
   ============================================================ */

const STORAGE_NDVI_PRESETS = 'gps_ndvi_presets_v1';

function renderSatelite() {
  _renderNdviPresets();
}

function _ndviPresets() {
  try { return JSON.parse(localStorage.getItem(STORAGE_NDVI_PRESETS) || '[]'); } catch { return []; }
}

function _renderNdviPresets() {
  const el = document.getElementById('ndvi-presets');
  if (!el) return;
  const lista = _ndviPresets();
  if (!lista.length) { el.innerHTML = '<p class="vault-hint" style="font-size:12px">Nenhuma área salva.</p>'; return; }
  el.innerHTML = lista.map((p, i) => `
    <div class="metric-card" style="cursor:pointer" onclick="_carregarPreset(${i})" title="Carregar">
      <span>${escapeHtml(p.nome)}</span>
      <h3 style="font-size:14px">${p.lat}, ${p.lon}</h3>
      <button class="btn-action secondary" style="margin-top:6px;padding:2px 8px;font-size:11px"
        onclick="event.stopPropagation();_removerPreset(${i})"><i class="ph ph-trash"></i></button>
    </div>`).join('');
}

function _carregarPreset(idx) {
  const p = _ndviPresets()[idx];
  if (!p) return;
  const lat = document.getElementById('ndvi-lat');
  const lon = document.getElementById('ndvi-lon');
  if (lat) lat.value = p.lat;
  if (lon) lon.value = p.lon;
}

function salvarPresetNdvi() {
  const nome = document.getElementById('ndvi-preset-nome')?.value.trim();
  const lat  = document.getElementById('ndvi-preset-lat')?.value.trim();
  const lon  = document.getElementById('ndvi-preset-lon')?.value.trim();
  if (!nome || !lat || !lon) { alert('Preencha nome, latitude e longitude.'); return; }
  const lista = _ndviPresets();
  lista.push({ nome, lat, lon });
  localStorage.setItem(STORAGE_NDVI_PRESETS, JSON.stringify(lista));
  document.getElementById('ndvi-preset-nome').value = '';
  document.getElementById('ndvi-preset-lat').value = '';
  document.getElementById('ndvi-preset-lon').value = '';
  _renderNdviPresets();
}

function _removerPreset(idx) {
  const lista = _ndviPresets();
  lista.splice(idx, 1);
  localStorage.setItem(STORAGE_NDVI_PRESETS, JSON.stringify(lista));
  _renderNdviPresets();
}

async function buscarEditaisTuring() {
  const out = document.getElementById('editais-resultado');
  const token = tokenDoCofre();
  if (!token) { if (out) out.innerHTML = '<i class="ph ph-warning"></i> Token não configurado.'; return; }
  if (out) out.innerHTML = '<i class="ph ph-spinner"></i> Consultando Turing…';
  try {
    const r = await fetch(_apiBase() + '/api/turing/angola/sinais?setor=edital&limite=20', {
      headers: { Authorization: 'Bearer ' + token }, cache: 'no-store'
    });
    if (!r.ok) { out.textContent = 'Erro HTTP ' + r.status; return; }
    const { sinais } = await r.json();
    if (!sinais?.length) { out.textContent = 'Nenhum edital encontrado no radar Angola.'; return; }
    out.innerHTML = sinais.map(s => `<div style="margin:6px 0;padding:8px;background:var(--card-bg);border-radius:6px">
      <strong>${escapeHtml(s.palavra_chave || s.tema || '—')}</strong> · ${escapeHtml(s.setor || '')}
      <br><small>${escapeHtml(s.sinal || s.resumo || '')}${s.url ? ` · <a href="${escapeHtml(s.url)}" target="_blank" rel="noopener">Ver</a>` : ''}</small>
    </div>`).join('');
  } catch (e) {
    if (out) out.textContent = 'Erro de conexão.';
  }
}

async function consultarNdvi() {
  const lat = document.getElementById('ndvi-lat')?.value.trim();
  const lon = document.getElementById('ndvi-lon')?.value.trim();
  const out = document.getElementById('ndvi-resultado');

  if (!lat || !lon) { if (out) out.textContent = 'Informe latitude e longitude.'; return; }

  const token = tokenDoCofre();
  if (!token) {
    if (out) out.innerHTML = '<i class="ph ph-warning"></i> Token não configurado no cofre.';
    return;
  }

  if (out) out.innerHTML = '<i class="ph ph-spinner"></i> Consultando Sentinel-2…';

  try {
    const base = _apiBasePatrimonio();
    const resp = await fetch(
      `${base}/api/geo/ndvi?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`,
      { headers: { Authorization: 'Bearer ' + token }, cache: 'no-store' }
    );

    if (!resp.ok) {
      out.innerHTML = `<i class="ph ph-warning"></i> Erro HTTP ${resp.status}.`;
      return;
    }

    const dados = await resp.json();
    const ndvi = dados.ndvi ?? dados.value ?? dados.resultado ?? JSON.stringify(dados);
    const data = dados.data || dados.date || dados.captura || '';

    out.innerHTML = `
      <strong>NDVI: ${typeof ndvi === 'number' ? ndvi.toFixed(4) : escapeHtml(String(ndvi))}</strong>
      ${data ? ` · Captura: ${escapeHtml(String(data))}` : ''}
      <br><small>Lat ${escapeHtml(lat)} · Lon ${escapeHtml(lon)}</small>
    `;
  } catch (e) {
    out.innerHTML = '<i class="ph ph-warning"></i> Sem conexão com a API.';
  }
}

function abrirMapsCoords() {
  const lat = document.getElementById('ndvi-lat')?.value.trim();
  const lon = document.getElementById('ndvi-lon')?.value.trim();
  if (!lat || !lon) { alert('Informe as coordenadas primeiro.'); return; }
  window.open(`https://www.google.com/maps?q=${encodeURIComponent(lat)},${encodeURIComponent(lon)}`, '_blank', 'noopener,noreferrer');
}

function abrirEarthCoords() {
  const lat = document.getElementById('ndvi-lat')?.value.trim();
  const lon = document.getElementById('ndvi-lon')?.value.trim();
  if (!lat || !lon) { alert('Informe as coordenadas primeiro.'); return; }
  window.open(`https://earth.google.com/web/search/${encodeURIComponent(lat)},${encodeURIComponent(lon)}`, '_blank', 'noopener,noreferrer');
}

/* ============================================================
   Angola · Malanje — Radar de Palavras-chave & Oportunidades
   ============================================================ */

function _apiBase() {
  return (appData.config?.apiBase || 'https://api.gustavopaulasantos.com.br').replace(/\/+$/, '');
}

function dadosFormularioPatrimonio() {
  const form = document.getElementById('form-patrimonio');
  if (!form) return null;
  const dados = Object.fromEntries(new FormData(form).entries());
  for (const campo of ['terreno', 'area', 'valor']) {
    dados[campo] = dados[campo] === '' ? null : Number(dados[campo]);
  }
  dados.uf = (dados.uf || '').trim().toUpperCase();
  return dados;
}

function atualizarCalculoPatrimonio() {
  const dados = dadosFormularioPatrimonio();
  const saida = document.getElementById('patrimonio-valor-m2');
  if (!dados || !saida) return;
  const area = dados.area > 0 ? dados.area : dados.terreno;
  const valorM2 = area > 0 && dados.valor != null
    ? dados.valor / area : null;
  saida.textContent = valorM2 === null
    ? 'Valor por m²: —'
    : 'Valor por m² (' + (dados.area > 0 ? 'área construída' : 'terreno') +
      '): ' + valorM2.toLocaleString('pt-BR', {
        style: 'currency', currency: 'BRL'
      });
}

function enderecoPatrimonio() {
  const d = dadosFormularioPatrimonio();
  return d ? [
    d.endereco, d.numero, d.bairro, d.cidade, d.uf, d.cep
  ].filter(Boolean).join(', ') : '';
}

function abrirMapaPatrimonio() {
  const endereco = enderecoPatrimonio();
  if (!endereco) return alert('Informe o endereço primeiro.');
  window.open(
    'https://www.google.com/maps/search/?api=1&query=' +
    encodeURIComponent(endereco),
    '_blank', 'noopener,noreferrer'
  );
}

function abrirEarthPatrimonio() {
  const endereco = enderecoPatrimonio();
  if (!endereco) return alert('Informe o endereço primeiro.');
  window.open(
    'https://earth.google.com/web/search/' +
    encodeURIComponent(endereco),
    '_blank', 'noopener,noreferrer'
  );
}

async function salvarPatrimonio() {
  const form = document.getElementById('form-patrimonio');
  const mensagem = document.getElementById('patrimonio-mensagem');
  if (!form || !mensagem || !form.reportValidity()) return;

  const token = tokenDoCofre();
  if (!token) {
    mensagem.textContent = 'Token da API não configurado no cofre.';
    return;
  }

  const dados = dadosFormularioPatrimonio();
  if (!dados.titulo.trim() || !dados.matricula.trim()) {
    mensagem.textContent = 'Identificação e matrícula são obrigatórias.';
    return;
  }

  const base = appData.config.apiBase.replace(/\/+$/, '');
  mensagem.textContent = 'Salvando na API Central...';

  try {
    const resposta = await fetch(base + '/api/imoveis', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + token
      },
      body: JSON.stringify(dados)
    });

    if (!resposta.ok) {
      mensagem.textContent = 'Cadastro não concluído. HTTP ' + resposta.status;
      return;
    }

    mensagem.textContent = 'Imóvel cadastrado com sucesso.';
    form.reset();
    atualizarCalculoPatrimonio();
    await renderPatrimonio();
  } catch (erro) {
    mensagem.textContent = 'Erro de conexão. Verifique API e CORS.';
  }
}

document.addEventListener('input', function(evento) {
  if (evento.target.closest('#form-patrimonio')) {
    atualizarCalculoPatrimonio();
  }
});


/* ---------------- Status da API na barra lateral (somente leitura: GET /api/health) ---------------- */
async function verificarStatusApi() {
  const dot = document.getElementById('gps-api-dot');
  const txt = document.getElementById('gps-api-status');
  if (!dot || !txt) return;
  const ini = performance.now();
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const r = await fetch('https://api.gustavopaulasantos.com.br/api/health', { cache: 'no-store', signal: ctrl.signal });
    clearTimeout(t);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    dot.className = 'gps-status-dot';
    txt.textContent = 'API online · ' + Math.round(performance.now() - ini) + ' ms';
  } catch (e) {
    dot.className = 'gps-status-dot off';
    txt.textContent = 'API sem resposta';
  }
}
verificarStatusApi();
setInterval(verificarStatusApi, 60000);


/* ---------------- Sidebar: um grupo aberto por vez ---------------- */
document.addEventListener('DOMContentLoaded', () => {
  const grupos = document.querySelectorAll('.gps-sidebar-nav details.nav-group');
  grupos.forEach(g => g.addEventListener('toggle', () => {
    if (!g.open) return;
    grupos.forEach(outro => { if (outro !== g) outro.open = false; });
  }));
});


/* ---------------- Sidebar: conexão real de cada tela com a API ----------------
   Testa com GET (sem gravar nada) usando o token do cofre.
   Verde = a chave tem acesso · Vermelho = sem acesso ou erro. */
const ROTAS_SIDEBAR = {
  'nav-lab-conhecimento': '/api/turing/conhecimento/listar',
  'nav-turin': '/api/turing/conhecimento/aprovados',
  'nav-catalogo': '/api/apps',
  'nav-plantas': '/api/plantas',
  'nav-plantas-fila': '/api/plantas',
  'nav-plantas-toxicas': '/api/plantas',
  'nav-plantas-uteis': '/api/plantas',
  'nav-api': '/api/health',
  'nav-patrimonio': '/api/imoveis',
  'nav-pacotes': '/api/turing/conhecimento/listar'
};

async function verificarIntegracaoSidebar() {
  const tk = tokenDoCofre();
  const base = (appData.config && appData.config.apiBase) || 'https://api.gustavopaulasantos.com.br';
  for (const [navId, rota] of Object.entries(ROTAS_SIDEBAR)) {
    const badge = document.querySelector('#' + navId + ' .nav-badge.api');
    if (!badge) continue;
    badge.classList.remove('ok', 'erro');
    try {
      const r = await fetch(base.replace(/\/+$/, '') + rota, {
        cache: 'no-store',
        headers: tk ? { Authorization: 'Bearer ' + tk } : {}
      });
      const ok = (r.status >= 200 && r.status < 300) || r.status === 400;
      badge.classList.add(ok ? 'ok' : 'erro');
      badge.title = rota + ' · HTTP ' + r.status + ' · ' + significadoHttp(r.status);
    } catch (e) {
      badge.classList.add('erro');
      badge.title = rota + ' · sem resposta';
    }
  }
}
window.verificarIntegracaoSidebar = verificarIntegracaoSidebar;
setInterval(() => { if (vaultKey) verificarIntegracaoSidebar(); }, 300000);


/* ---------------- Turing · Visão geral (dados reais da API) ---------------- */
function _baseTuring() {
  return ((appData.config && appData.config.apiBase) || 'https://api.gustavopaulasantos.com.br').replace(/\/+$/, '');
}

var conhecimentosApi = [];
let fluxoNoAtual = 'rascunhos';

async function apiConhecimento(caminho, opcoes) {
  const tk = tokenDoCofre();
  if (!tk) throw new Error('Token "Turing API token" não encontrado no cofre.');
  const o = Object.assign({ cache: 'no-store' }, opcoes || {});
  o.headers = Object.assign({ Authorization: 'Bearer ' + tk }, o.headers || {});
  const t0 = performance.now();
  const r = await fetch(_baseTuring() + '/api/turing/conhecimento' + caminho, o);
  const ms = Math.round(performance.now() - t0);
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d.ok) throw new Error(d.erro || 'HTTP ' + r.status);
  d._ms = ms;
  return d;
}

async function renderTuringVisao() {
  const painel = document.getElementById('fluxo-painel');
  if (!painel) return;
  document.querySelectorAll('#fluxo-turing .fluxo-no').forEach(b => { b.onclick = () => abrirNoFluxo(b.dataset.no); });
  try {
    const d = await apiConhecimento('/listar');
    conhecimentosApi = d.conhecimentos || [];
    const conta = s => conhecimentosApi.filter(k => k.status === s).length;
    const ap = conta('aprovado'), ra = conta('rascunho'), rj = conta('rejeitado');
    document.getElementById('fx-rascunhos').textContent = ra;
    document.getElementById('fx-aprovados').textContent = ap;
    document.getElementById('fx-taxa').textContent = (ap + rj) ? Math.round(100 * ap / (ap + rj)) + '%' : '—';
    document.getElementById('fx-areas').textContent = new Set(conhecimentosApi.filter(k => k.status === 'aprovado').map(k => k.area)).size + ' áreas';
    document.getElementById('fx-ms').textContent = d._ms + ' ms';
    const lc = document.getElementById('turin-lab-contagem'); if (lc) lc.textContent = `${ap} aprovados · ${ra} rascunhos`;
    abrirNoFluxo(fluxoNoAtual);
  } catch (e) {
    painel.innerHTML = '<p class="vault-hint">Não foi possível consultar a API: ' + escapeHtml(e.message) + '</p>';
  }
}

function abrirNoFluxo(no) {
  fluxoNoAtual = no;
  document.querySelectorAll('#fluxo-turing .fluxo-no').forEach(b => b.classList.toggle('ativo', b.dataset.no === no));
  const p = document.getElementById('fluxo-painel');
  if (no === 'fontes') {
    p.innerHTML = `
      <h4 style="margin-top:0"><i class="ph ph-plus-circle"></i> Entrada de conhecimento</h4>
      <form onsubmit="ensinarRapido(event)">
        <div class="config-grid">
          <div class="form-group"><label for="fx-area">Área</label>
            <select id="fx-area" class="form-control">${['Segurança da API','Abuso e ataques','Contexto NexoTerraCore','Agro','Angola · Fazenda PIPE','Agro Centro-Oeste','Edutech Angola','Edutech Brasil','SEO'].map(a => `<option>${a}</option>`).join('')}</select></div>
          <div class="form-group"><label for="fx-classe">Classificação</label>
            <select id="fx-classe" class="form-control"><option value="informativo">informativo</option><option value="procedimento">procedimento</option><option value="alerta">alerta</option><option value="bloqueio">bloqueio</option></select></div>
        </div>
        <div class="form-group"><label for="fx-pergunta">Cenário / pergunta</label><textarea id="fx-pergunta" class="form-control" rows="2" maxlength="2000" required></textarea></div>
        <div class="form-group"><label for="fx-resposta">Resposta esperada do Turing</label><textarea id="fx-resposta" class="form-control" rows="3" maxlength="4000" required></textarea></div>
        <div class="btn-row">
          <button type="submit" class="btn-action"><i class="ph ph-paper-plane-tilt"></i> Enviar para revisão</button>
          <button type="button" class="btn-action secondary" onclick="importarPlantasTuring()"><i class="ph ph-plant"></i> Importar plantas identificadas</button>
          <button type="button" class="btn-action secondary" onclick="abrirTela('tela-lab-conhecimento')"><i class="ph ph-flask"></i> Laboratório completo</button>
        </div>
        <p id="fx-msg" class="vault-hint" role="status"></p>
      </form>`;
  } else if (no === 'rascunhos') {
    const lista = conhecimentosApi.filter(k => k.status === 'rascunho');
    p.innerHTML = `<h4 style="margin-top:0"><i class="ph ph-hourglass"></i> Pendentes de revisão (${lista.length})</h4>` + (lista.length ? lista.map(k => `
      <div class="fluxo-item">
        <p><strong>#${k.id} · ${escapeHtml(k.area || '')}</strong></p>
        <p><em>${escapeHtml(k.pergunta)}</em></p>
        <p>${escapeHtml(k.resposta)}</p>
        <div class="btn-row"><button class="btn-action" onclick="revisarConhecimento(${k.id},'aprovado')"><i class="ph ph-check"></i> Aprovar</button>
        <button class="btn-action secondary" onclick="revisarConhecimento(${k.id},'rejeitado')"><i class="ph ph-x"></i> Rejeitar</button></div>
      </div>`).join('') : '<p class="vault-hint">Nada pendente. Use o bloco 1 · Entrada para ensinar algo novo.</p>');
  } else if (no === 'revisao') {
    const c = s => conhecimentosApi.filter(k => k.status === s).length;
    const recentes = conhecimentosApi.filter(k => k.status !== 'rascunho').slice(0, 10);
    p.innerHTML = `<h4 style="margin-top:0"><i class="ph ph-check-square"></i> Revisão</h4>
      <div class="metrics-grid"><div class="metric-card"><span>Aprovados</span><h3>${c('aprovado')}</h3></div><div class="metric-card"><span>Rejeitados</span><h3>${c('rejeitado')}</h3></div><div class="metric-card"><span>Pendentes</span><h3>${c('rascunho')}</h3></div></div>
      <p class="vault-hint">Últimas decisões:</p>` + recentes.map(k => `<div class="fluxo-item"><p><span class="badge ${k.status === 'aprovado' ? 'green' : 'red'}">${escapeHtml(k.status)}</span> #${k.id} · ${escapeHtml(k.area || '')} · <em>${escapeHtml(String(k.pergunta).slice(0, 120))}</em></p></div>`).join('');
  } else if (no === 'aprovados') {
    const porArea = {};
    conhecimentosApi.filter(k => k.status === 'aprovado').forEach(k => { porArea[k.area || 'Sem área'] = (porArea[k.area || 'Sem área'] || 0) + 1; });
    p.innerHTML = `<h4 style="margin-top:0"><i class="ph ph-seal-check"></i> O que o Turing sabe, por área</h4><div class="metrics-grid">` +
      Object.entries(porArea).sort((a, b) => b[1] - a[1]).map(([a, n]) => `<div class="metric-card" style="cursor:pointer" onclick="abrirNoFluxo('consulta');setTimeout(()=>{document.getElementById('turing-consulta-q').value=${JSON.stringify(a).replace(/"/g, '&quot;')};consultarTuring();},50)"><span>${escapeHtml(a)}</span><h3>${n}</h3><p class="metric-sub">aprovados</p></div>`).join('') + '</div>';
  } else {
    p.innerHTML = `<h4 style="margin-top:0"><i class="ph ph-robot"></i> Pergunte ao Turing</h4>
      <p class="vault-hint">Busca só nos conhecimentos <strong>aprovados</strong>. Ex.: <em>login</em>, <em>Malanje</em>, <em>mamona</em>.</p>
      <form class="btn-row" onsubmit="consultarTuring(event)">
        <input id="turing-consulta-q" class="form-control" maxlength="500" placeholder="Palavra-chave (vazio = mais recentes)" style="flex:1;min-width:220px">
        <button type="submit" class="btn-action"><i class="ph ph-magnifying-glass"></i> Consultar</button>
      </form>
      <div id="turing-consulta-resultado" style="margin-top:12px"></div>`;
  }
}

async function revisarConhecimento(id, status) {
  try {
    await apiConhecimento('/' + encodeURIComponent(id) + '/revisar', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
    await renderTuringVisao();
  } catch (e) { alert('Falha na revisão: ' + e.message); }
}

async function ensinarRapido(ev) {
  ev.preventDefault();
  const msg = document.getElementById('fx-msg');
  const pergunta = document.getElementById('fx-pergunta').value.trim();
  const resposta = document.getElementById('fx-resposta').value.trim();
  if (!pergunta || !resposta) return;
  msg.textContent = 'Enviando…';
  try {
    const d = await apiConhecimento('/ensinar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
      area: document.getElementById('fx-area').value,
      pergunta: `[${document.getElementById('fx-classe').value}] ${pergunta}`, resposta, fonte: 'Fluxo de treino · painel' }) });
    msg.textContent = `Enviado ✅ #${d.conhecimento && d.conhecimento.id} está em Pendentes.`;
    document.getElementById('fx-pergunta').value = ''; document.getElementById('fx-resposta').value = '';
    await renderTuringVisao(); abrirNoFluxo('fontes');
    document.getElementById('fx-msg').textContent = msg.textContent;
  } catch (e) { msg.textContent = 'Falhou: ' + e.message; }
}

function textoTreinoPlanta(p, todas) {
  const parentes = todas.filter(o => o.id !== p.id && _fam(p) && _fam(o) === _fam(p)).map(o => o.nome_popular + (o.nome_cientifico ? ' (' + o.nome_cientifico + ')' : ''));
  return [
    `No catálogo Plantas do morro, "${p.nome_popular}" está registrada como ${p.nome_cientifico}` + (p.familia ? `, família ${p.familia}.` : '.'),
    parentes.length ? `Outras plantas da mesma família no catálogo: ${parentes.slice(0, 8).join(', ')}.` : '',
    p.toxica ? `Atenção: marcada com risco de toxicidade${p.alerta ? ' (' + p.alerta + ')' : ''}.` : (p.alerta ? 'Alerta: ' + p.alerta : ''),
    'Identificação a confirmar com especialista. Este registro não indica uso, dose ou segurança da planta.'
  ].filter(Boolean).join(' ');
}

async function importarPlantasTuring() {
  const msg = document.getElementById('fx-msg');
  try {
    msg.textContent = 'Lendo plantas da API…';
    const plantas = (await apiPlantas('')).plantas || [];
    const ja = new Set(conhecimentosApi.map(k => (String(k.pergunta).match(/planta "(.+?)" do catálogo/) || [])[1]).filter(Boolean));
    const faltam = plantas.filter(p => p.nome_cientifico && p.status !== 'descartada' && !ja.has(p.nome_popular));
    if (!faltam.length) { msg.textContent = 'Todas as plantas identificadas já estão no treino.'; return; }
    if (!confirm(`Enviar ${faltam.length} planta(s) para Pendentes do Turing? (vai devagar para respeitar o limite da API)`)) { msg.textContent = ''; return; }
    let ok = 0; const falhas = [];
    for (const p of faltam) {
      msg.textContent = `Enviando ${ok + falhas.length + 1}/${faltam.length}: ${p.nome_popular}…`;
      try {
        await apiConhecimento('/ensinar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
          area: 'Agro', pergunta: `[botânica] O que é a planta "${p.nome_popular}" do catálogo Plantas do morro?`,
          resposta: textoTreinoPlanta(p, plantas), fonte: 'Plantas do morro · painel' }) });
        ok++;
      } catch (e) { falhas.push(p.nome_popular + ' (' + e.message + ')'); if (/429|limite|muitas/i.test(e.message)) break; }
      await new Promise(r => setTimeout(r, 1200));
    }
    await renderTuringVisao(); abrirNoFluxo('fontes');
    document.getElementById('fx-msg').textContent = `${ok} planta(s) enviadas para Pendentes.` + (falhas.length ? ' Falharam: ' + falhas.join('; ') + ' — clique de novo em 1 minuto para continuar.' : '');
  } catch (e) { msg.textContent = 'Falhou: ' + e.message; }
}

async function consultarTuring(ev) {
  if (ev) ev.preventDefault();
  const out = document.getElementById('turing-consulta-resultado');
  const q = (document.getElementById('turing-consulta-q').value || '').trim();
  const tk = tokenDoCofre();
  if (!tk) { out.textContent = 'Token não encontrado no cofre.'; return; }
  out.textContent = 'Consultando…';
  try {
    const r = await fetch(_baseTuring() + '/api/turing/conhecimento/aprovados?q=' + encodeURIComponent(q), {
      headers: { Authorization: 'Bearer ' + tk }, cache: 'no-store'
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok || !d.ok) throw new Error(d.erro || 'HTTP ' + r.status);
    const lista = d.conhecimentos || [];
    if (!lista.length) {
      out.innerHTML = '<p class="vault-hint">O Turing ainda não tem conhecimento aprovado com essa palavra. Ensine no Laboratório.</p>';
      return;
    }
    out.innerHTML = `<p class="vault-hint">${lista.length} resultado(s) — até 20, os mais recentes primeiro.</p>` +
      lista.map(k => `<article class="lab-registro" style="margin-bottom:10px">
        <p><strong>#${k.id} · ${escapeHtml(k.area)}</strong></p>
        <p><strong>Situação:</strong> ${escapeHtml(k.pergunta)}</p>
        <p><strong>O Turing responde:</strong> ${escapeHtml(k.resposta)}</p>
      </article>`).join('');
  } catch (e) {
    out.textContent = 'Erro na consulta: ' + e.message;
  }
}


/* ---------------- Catálogo de apps (NexoTerraCore API: /api/apps) ---------------- */
var appsApi = [];
const TIPO_ROTULO = { pwa: 'PWA', site: 'Site', projeto: 'Projeto', pessoal: 'Pessoal' };
const STATUS_APP = ['ativo', 'em_desenvolvimento', 'pausado', 'arquivado'];

function classeSaude(a) {
  if (a.ultimo_http == null) return '';
  return ((a.ultimo_http >= 200 && a.ultimo_http < 400) || a.ultimo_http === 401 || a.ultimo_http === 403) ? 'ok' : 'erro';
}

function textoSaude(a) {
  if (a.ultimo_http == null) return 'ainda não verificado';
  const quando = a.ultimo_check_em ? new Date(a.ultimo_check_em).toLocaleString('pt-BR') : '';
  if (a.ultimo_http === 0) return 'sem resposta · ' + quando;
  if (a.ultimo_http === 401 || a.ultimo_http === 403) return 'no ar (protegido) · ' + quando;
  return 'HTTP ' + a.ultimo_http + (a.ultimo_ms != null ? ' · ' + a.ultimo_ms + ' ms' : '') + ' · ' + quando;
}

async function apiApps(caminho, opcoes) {
  const tk = tokenDoCofre();
  if (!tk) throw new Error('Token não encontrado no cofre.');
  const o = Object.assign({ cache: 'no-store' }, opcoes || {});
  o.headers = Object.assign({ Authorization: 'Bearer ' + tk }, o.headers || {});
  const r = await fetch(_baseTuring() + '/api/apps' + (caminho || ''), o);
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d.ok) throw new Error(d.erro || 'HTTP ' + r.status);
  return d;
}

async function carregarAppsApi() {
  try {
    const d = await apiApps('');
    appsApi = d.apps || [];
  } catch (e) {
    appsApi = [];
    const box = document.getElementById('nav-apps-lista');
    if (box) box.innerHTML = '<p class="nav-app-cat">Apps: ' + escapeHtml(e.message) + '</p>';
    return;
  }
  montarSidebarApps();
  if (currentView === 'tela-catalogo') desenharCatalogo();
}

function montarSidebarApps() {
  const box = document.getElementById('nav-apps-lista');
  if (!box) return;
  const ativos = appsApi.filter(a => a.status !== 'arquivado');
  const noAr = ativos.filter(a => classeSaude(a) === 'ok').length;
  const fora = ativos.filter(a => classeSaude(a) === 'erro');
  const FAVORITOS = ['paranagel', 'minifazenda', 'edutech', 'conecta'];
  const atalhos = FAVORITOS.map(sl => ativos.find(a => a.slug === sl)).filter(a => a && urlSegura(a.url));
  box.innerHTML = (atalhos.length ? `<div class="nav-app-cat">Atalhos</div>` + atalhos.map(a =>
    `<a class="nav-item nav-externo nav-app" href="${escapeHtml(urlSegura(a.url))}" target="_blank" rel="noopener noreferrer" title="${escapeHtml(a.descricao || textoSaude(a))}"><span class="app-dot ${classeSaude(a)}"></span> ${escapeHtml(a.nome)} ↗</a>`).join('') : '') +
    `<div class="nav-app-cat">${ativos.length} apps · ${noAr} no ar${fora.length ? ' · ' + fora.length + ' com problema' : ''}</div>` +
    fora.map(a => `<a class="nav-item nav-externo nav-app" href="#" onclick="abrirTela('tela-catalogo');return false" title="${escapeHtml(textoSaude(a))}"><span class="app-dot erro"></span> ${escapeHtml(a.nome)}</a>`).join('');
}

async function renderCatalogoApi() {
  const root = document.getElementById('grid-catalogo');
  if (!root) return;
  root.innerHTML = '<p class="vault-hint">Carregando catálogo da API…</p>';
  await carregarAppsApi();
  desenharCatalogo();
  const ultimo = Math.max(0, ...appsApi.map(a => a.ultimo_check_em ? Date.parse(a.ultimo_check_em) : 0));
  if (appsApi.length && Date.now() - ultimo > 15 * 60 * 1000) verificarApps();
}

function desenharCatalogo() {
  const root = document.getElementById('grid-catalogo');
  const resumo = document.getElementById('catalogo-resumo');
  if (!root) return;
  if (!appsApi.length) { root.innerHTML = '<p class="vault-hint">Nenhum app retornado pela API. Confira o token e o escopo apps.read.</p>'; return; }
  const vivos = appsApi.filter(a => a.status !== 'arquivado');
  const noAr = vivos.filter(a => classeSaude(a) === 'ok').length;
  const fora = vivos.filter(a => classeSaude(a) === 'erro').length;
  const arq = appsApi.length - vivos.length;
  if (resumo) resumo.innerHTML =
    `<div class="metric-card"><span>Apps em uso</span><h3>${vivos.length}</h3></div>` +
    `<div class="metric-card"><span>No ar</span><h3 style="color:var(--success-green)">${noAr}</h3></div>` +
    `<div class="metric-card"><span>Com problema</span><h3 style="color:${fora ? 'var(--danger-red)' : 'var(--success-green)'}">${fora}</h3></div>` +
    `<div class="metric-card"><span>Arquivados</span><h3>${arq}</h3></div>`;

  const cats = [...new Set(appsApi.map(a => a.categoria))].sort((x, y) => x.localeCompare(y, 'pt-BR'));
  const selCat = document.getElementById('catalogo-categoria');
  if (selCat) {
    const atual = selCat.value;
    selCat.innerHTML = '<option value="">Todas as categorias</option>' + cats.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
    selCat.value = cats.includes(atual) ? atual : '';
  }
  const dl = document.getElementById('ap-categorias');
  if (dl) dl.innerHTML = cats.map(c => `<option value="${escapeHtml(c)}">`).join('');

  const val = id => ((document.getElementById(id) || {}).value || '');
  const q = val('catalogo-busca').trim().toLowerCase();
  const cat = val('catalogo-categoria'), tipo = val('catalogo-tipo'), st = val('catalogo-status'), saude = val('catalogo-saude');
  const lista = appsApi.filter(a =>
    (!q || [a.nome, a.slug, a.categoria, a.descricao, a.url].some(v => String(v || '').toLowerCase().includes(q))) &&
    (!cat || a.categoria === cat) &&
    (!tipo || a.tipo === tipo) &&
    (st === 'todos' ? true : st === 'arquivado' ? a.status === 'arquivado' : a.status !== 'arquivado') &&
    (!saude || (saude === 'nv' ? classeSaude(a) === '' : classeSaude(a) === saude)))
    .sort((x, y) => x.categoria.localeCompare(y.categoria, 'pt-BR') || x.nome.localeCompare(y.nome, 'pt-BR'));
  root.innerHTML = lista.length ? '<div class="cat2-grid">' + lista.map(cartaoApp).join('') + '</div>'
    : '<p class="vault-hint">Nenhum app com esse filtro.</p>';
}

const STATUS_ROTULO = { ativo: 'Ativo', em_desenvolvimento: 'Em desenvolvimento', pausado: 'Pausado', arquivado: 'Arquivado' };

function cartaoApp(a) {
  const href = urlSegura(a.url);
  let host = '';
  try { host = new URL(a.url).hostname.replace('.gustavopaulasantos.com.br', ''); } catch {}
  return `
    <article class="cat2-card ${a.status === 'arquivado' ? 'arq' : ''}">
      <div class="cat2-topo">
        <div class="cat2-nome"><span class="app-dot ${classeSaude(a)}"></span><span class="t" title="${escapeHtml(a.nome)}">${escapeHtml(a.nome)}</span></div>
        <span class="badge ${a.tipo === 'pwa' ? 'green' : a.tipo === 'pessoal' ? 'red' : 'blue'}">${escapeHtml(TIPO_ROTULO[a.tipo] || a.tipo)}</span>
      </div>
      <div class="cat2-tags">
        <span class="cat2-tag">${escapeHtml(a.categoria)}</span>
        <span class="cat2-tag st-${escapeHtml(a.status)}">${escapeHtml(STATUS_ROTULO[a.status] || a.status)}</span>
        ${a.publico ? '<span class="cat2-tag">Vitrine</span>' : ''}
        ${host ? `<span class="cat2-tag" title="${escapeHtml(a.url)}">${escapeHtml(host)}</span>` : ''}
      </div>
      <p class="cat2-desc">${a.descricao ? escapeHtml(a.descricao) : '<em>sem descrição</em>'}</p>
      <div class="cat2-saude"><i class="ph ph-pulse"></i> ${escapeHtml(textoSaude(a))}</div>
      <div class="cat2-rodape">
        ${href ? `<a class="btn-action secondary" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer"><i class="ph ph-arrow-square-out"></i> Abrir</a>` : '<span></span>'}
        <button type="button" class="btn-action secondary" onclick="editarApp('${a.id}')"><i class="ph ph-pencil"></i> Editar</button>
        <button type="button" class="btn-action secondary" onclick="enviarAppTuring('${a.id}')"><i class="ph ph-brain"></i> Turing</button>
      </div>
      <p class="cat2-msg" id="ap-cmsg-${a.id}" role="status"></p>
    </article>`;
}

async function alterarApp(id, dados) {
  try {
    await apiApps('/' + id, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dados) });
    await carregarAppsApi();
  } catch (e) {
    alert('Não foi possível salvar na API: ' + e.message);
    desenharCatalogo();
  }
}

function _appForm(a) {
  const box = document.getElementById('app-form-box');
  document.getElementById('ap-id').value = a ? a.id : '';
  document.getElementById('ap-nome').value = a ? a.nome : '';
  document.getElementById('ap-url').value = a ? a.url : 'https://';
  document.getElementById('ap-categoria').value = a ? a.categoria : '';
  document.getElementById('ap-tipo').value = a ? a.tipo : 'pwa';
  document.getElementById('ap-status').value = a ? a.status : 'em_desenvolvimento';
  document.getElementById('ap-publico').checked = a ? !!a.publico : false;
  document.getElementById('ap-descricao').value = a ? (a.descricao || '') : '';
  document.getElementById('app-form-titulo').innerHTML = a ? `<i class="ph ph-pencil"></i> Editar: ${escapeHtml(a.nome)}` : '<i class="ph ph-plus"></i> Novo app';
  document.getElementById('ap-salvar').innerHTML = a ? '<i class="ph ph-floppy-disk"></i> Salvar alterações' : '<i class="ph ph-floppy-disk"></i> Criar na API';
  document.getElementById('ap-excluir').hidden = !(a && a.status === 'arquivado');
  document.getElementById('ap-msg').textContent = '';
  box.hidden = false;
  box.scrollIntoView({ behavior: 'smooth', block: 'start' });
  setTimeout(() => document.getElementById('ap-nome').focus({ preventScroll: true }), 400);
}

function editarApp(id) {
  const a = appsApi.find(x => String(x.id) === String(id));
  if (a) _appForm(a);
}
function novoApp() { abrirTela('tela-catalogo'); setTimeout(() => _appForm(null), 200); }
function fecharAppForm() { document.getElementById('app-form-box').hidden = true; }
function editarDescricaoApp(id) { editarApp(id); }

async function salvarAppForm(ev) {
  if (ev) ev.preventDefault();
  const msg = document.getElementById('ap-msg');
  const id = document.getElementById('ap-id').value;
  const dados = {
    nome: document.getElementById('ap-nome').value.trim(),
    url: document.getElementById('ap-url').value.trim(),
    categoria: document.getElementById('ap-categoria').value.trim(),
    tipo: document.getElementById('ap-tipo').value,
    status: document.getElementById('ap-status').value,
    publico: document.getElementById('ap-publico').checked,
    descricao: document.getElementById('ap-descricao').value.trim()
  };
  if (!/^https:\/\/[^\s]+\.[^\s]+/.test(dados.url)) { msg.textContent = 'O endereço precisa começar com https://'; return; }
  msg.textContent = 'Salvando na API…';
  try {
    await apiApps(id ? '/' + id : '', { method: id ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dados) });
    msg.textContent = id ? 'Salvo na API ✅' : 'Criado na API ✅';
    await carregarAppsApi();
    desenharCatalogo();
    setTimeout(fecharAppForm, 900);
  } catch (e) { msg.textContent = 'Não foi possível salvar: ' + e.message; }
}

async function excluirApp() {
  const id = document.getElementById('ap-id').value;
  const a = appsApi.find(x => String(x.id) === String(id));
  if (!a || a.status !== 'arquivado') return;
  const msg = document.getElementById('ap-msg');
  if (!confirm('Excluir "' + a.nome + '" da API? Isso não pode ser desfeito.')) return;
  msg.textContent = 'Excluindo…';
  try {
    await apiApps('/' + id, { method: 'DELETE' });
    await carregarAppsApi();
    desenharCatalogo();
    fecharAppForm();
  } catch (e) { msg.textContent = 'Não foi possível excluir: ' + e.message; }
}

async function enviarAppTuring(id) {
  const a = appsApi.find(x => String(x.id) === String(id));
  const msg = document.getElementById('ap-cmsg-' + id);
  if (!a) return;
  const resposta = [
    `"${a.nome}" é um ${TIPO_ROTULO[a.tipo] || a.tipo} do ecossistema GPS.dev / NexoTerraCore, na categoria ${a.categoria}.`,
    a.descricao ? a.descricao.replace(/\s+/g, ' ').trim() : '',
    `Situação: ${STATUS_ROTULO[a.status] || a.status}. Endereço: ${a.url}.`
  ].filter(Boolean).join(' ');
  msg.textContent = 'Enviando ao Turing…';
  try {
    const d = await apiConhecimento('/ensinar', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ area: 'NexoTerraCore', pergunta: `[apps] O que é o "${a.nome}"?`, resposta, fonte: 'Mini-softwares · painel' })
    });
    msg.textContent = `Enviado ✅ #${d.conhecimento && d.conhecimento.id} pendente no Fluxo de treino.`;
  } catch (e) { msg.textContent = 'Falhou: ' + e.message; }
}

async function verificarApps() {
  const btn = document.getElementById('btn-verificar-apps');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="ph ph-hourglass"></i> Verificando…'; }
  try {
    await apiApps('/verificar', { method: 'POST' });
    await carregarAppsApi();
  } catch (e) {
    alert('Falha na verificação: ' + e.message);
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ph ph-pulse"></i> Verificar agora'; }
  }
}


/* ---------------- Plantas do morro (NexoTerraCore API: /api/plantas) ---------------- */
let plantasApi = [];
const STATUS_PLANTA = {
  a_identificar: 'A identificar', identificada: 'Identificada',
  enviada_pesquisa: 'Enviada para pesquisa', descartada: 'Descartada'
};
const CAMPOS_PLANTA = {
  'pl-nome': 'nome_popular', 'pl-cientifico': 'nome_cientifico', 'pl-familia': 'familia',
  'pl-parte': 'parte_usada', 'pl-local': 'local_descricao', 'pl-uso': 'uso_tradicional',
  'pl-alerta': 'alerta', 'pl-notas': 'notas', 'pl-status': 'status'
};

async function apiPlantas(caminho, opcoes) {
  const tk = tokenDoCofre();
  if (!tk) throw new Error('Token não encontrado no cofre.');
  const o = Object.assign({ cache: 'no-store' }, opcoes || {});
  o.headers = Object.assign({ Authorization: 'Bearer ' + tk }, o.headers || {});
  const r = await fetch(_baseTuring() + '/api/plantas' + (caminho || ''), o);
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d.ok) throw new Error(d.erro || 'HTTP ' + r.status);
  return d;
}

async function renderPlantas() {
  const box = document.getElementById('plantas-lista');
  if (!box) return;
  box.innerHTML = '<p class="vault-hint">Carregando plantas da API…</p>';
  try {
    plantasApi = (await apiPlantas('')).plantas || [];
  } catch (e) {
    box.innerHTML = '<p class="vault-hint">Erro: ' + escapeHtml(e.message) + '</p>';
    return;
  }
  const conta = s => plantasApi.filter(p => p.status === s).length;
  const resumo = document.getElementById('plantas-resumo');
  if (resumo) resumo.innerHTML = Object.keys(STATUS_PLANTA).filter(s => s !== 'descartada').map(s =>
    `<div class="metric-card"><span>${STATUS_PLANTA[s]}</span><h3>${conta(s)}</h3></div>`).join('') +
    `<div class="metric-card"><span>Com alerta de toxicidade</span><h3 style="color:var(--danger-red)">${plantasApi.filter(p => p.toxica).length}</h3></div>`;
  renderCadastroRapido();
  if (!plantasApi.length) { box.innerHTML = '<p class="vault-hint">Nenhuma planta registrada ainda.</p>'; return; }
  box.innerHTML = '<div class="catalogo-grid">' + plantasApi.map(p => {
    const coords = (p.latitude != null && p.longitude != null) ? `${Number(p.latitude).toFixed(5)}, ${Number(p.longitude).toFixed(5)}` : '';
    const mapa = coords ? `<a class="btn-action secondary mini-abrir" href="https://www.google.com/maps?q=${encodeURIComponent(coords)}" target="_blank" rel="noopener noreferrer"><i class="ph ph-map-pin"></i> Mapa</a>` : '<span></span>';
    return `<article class="mini-card">
      <div class="mini-card-top">
        <strong class="venda-nome">${escapeHtml(p.nome_popular)}</strong>
        <span class="badge ${p.status === 'identificada' ? 'green' : p.status === 'enviada_pesquisa' ? 'blue' : p.status === 'descartada' ? 'red' : 'orange'}">${escapeHtml(STATUS_PLANTA[p.status] || p.status)}</span>
      </div>
      <p class="venda-desc"><em>${p.nome_cientifico ? escapeHtml(p.nome_cientifico) : 'nome científico a confirmar'}</em>${p.familia ? ' · ' + escapeHtml(p.familia) : ''}</p>
      ${p.toxica ? `<p class="venda-desc" style="color:var(--danger-red)"><i class="ph ph-warning"></i> Risco de toxicidade${p.alerta ? ': ' + escapeHtml(p.alerta) : ''}</p>` : ''}
      <p class="mini-sem-link">${[p.parte_usada ? 'Parte: ' + escapeHtml(p.parte_usada) : '', p.quantidade != null ? p.quantidade + ' pé(s)' : '', p.local_descricao ? escapeHtml(p.local_descricao) : ''].filter(Boolean).join(' · ')}</p>
      <div class="mini-card-footer">${mapa}<button class="btn-icon" title="Editar" onclick="editarPlanta(${p.id})"><i class="ph ph-pencil"></i></button></div>
    </article>`;
  }).join('') + '</div>';
}

function limparFormPlanta() {
  const f = document.getElementById('form-planta');
  if (f) f.reset();
  document.getElementById('pl-id').value = '';
  document.getElementById('pl-salvar').innerHTML = '<i class="ph ph-floppy-disk"></i> Salvar na API';
  document.getElementById('pl-msg').textContent = '';
}

function editarPlanta(id) {
  const p = plantasApi.find(x => String(x.id) === String(id));
  if (!p) return;
  limparFormPlanta();
  document.getElementById('pl-id').value = p.id;
  for (const [el, campo] of Object.entries(CAMPOS_PLANTA)) document.getElementById(el).value = p[campo] ?? '';
  document.getElementById('pl-qtd').value = p.quantidade ?? '';
  document.getElementById('pl-lat').value = p.latitude ?? '';
  document.getElementById('pl-lon').value = p.longitude ?? '';
  document.getElementById('pl-toxica').checked = !!p.toxica;
  document.getElementById('pl-salvar').innerHTML = '<i class="ph ph-floppy-disk"></i> Salvar alterações';
  const form = document.getElementById('form-planta') || document.getElementById('pl-nome');
  form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  document.getElementById('pl-msg').textContent = 'Editando: ' + p.nome_popular + ' — altere e clique em Salvar alterações.';
  setTimeout(() => document.getElementById('pl-nome').focus({ preventScroll: true }), 400);
}

async function salvarPlanta(ev) {
  if (ev) ev.preventDefault();
  const msg = document.getElementById('pl-msg');
  const dados = {};
  for (const [el, campo] of Object.entries(CAMPOS_PLANTA)) dados[campo] = document.getElementById(el).value.trim();
  dados.quantidade = document.getElementById('pl-qtd').value;
  dados.latitude = document.getElementById('pl-lat').value;
  dados.longitude = document.getElementById('pl-lon').value;
  dados.toxica = document.getElementById('pl-toxica').checked;
  if (!dados.nome_popular) { msg.textContent = 'Informe o nome popular.'; return; }
  const id = document.getElementById('pl-id').value;
  msg.textContent = 'Salvando na API…';
  try {
    const r = await apiPlantas(id ? '/' + id : '', {
      method: id ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados)
    });
    limparFormPlanta();
    document.getElementById('pl-msg').textContent = 'Salvo na API: #' + r.planta.id + ' · ' + r.planta.nome_popular;
    await renderPlantas();
  } catch (e) {
    msg.textContent = 'Não foi possível salvar: ' + e.message;
  }
}

function usarLocalizacaoPlanta() {
  const msg = document.getElementById('pl-msg');
  if (!navigator.geolocation) { msg.textContent = 'Este aparelho não informa localização.'; return; }
  msg.textContent = 'Obtendo localização…';
  navigator.geolocation.getCurrentPosition(pos => {
    document.getElementById('pl-lat').value = pos.coords.latitude.toFixed(6);
    document.getElementById('pl-lon').value = pos.coords.longitude.toFixed(6);
    msg.textContent = 'Localização preenchida (precisão de ~' + Math.round(pos.coords.accuracy) + ' m).';
  }, () => { msg.textContent = 'Não foi possível obter a localização (permita o acesso no navegador).'; },
  { enableHighAccuracy: true, timeout: 15000 });
}


/* ---------------- Cadastro rápido: várias plantas de uma vez (POST /api/plantas) ---------------- */
// [nome popular, nome científico provável, família, parte de interesse, marcada por padrão, alerta de toxicidade]
const PLANTAS_RAPIDAS = [
  ['Mangueira', 'Mangifera indica', 'Anacardiaceae', 'fruto, folha', true, ''],
  ['Tamarindo', 'Tamarindus indica', 'Fabaceae', 'fruto', true, ''],
  ['Eucalipto', 'Eucalyptus spp.', 'Myrtaceae', 'folha, madeira', true, ''],
  ['Manto-de-rei', 'Thunbergia erecta', 'Acanthaceae', 'flor (ornamental)', true, ''],
  ['Bambu', 'Bambusa spp.', 'Poaceae', 'colmo', true, ''],
  ['Bananeira', 'Musa spp.', 'Musaceae', 'fruto, folha', false, ''],
  ['Goiabeira', 'Psidium guajava', 'Myrtaceae', 'fruto, folha', false, ''],
  ['Limoeiro', 'Citrus spp.', 'Rutaceae', 'fruto, folha', false, ''],
  ['Jabuticabeira', 'Plinia cauliflora', 'Myrtaceae', 'fruto', false, ''],
  ['Pequizeiro', 'Caryocar brasiliense', 'Caryocaraceae', 'fruto', false, ''],
  ['Ipê-amarelo', 'Handroanthus spp.', 'Bignoniaceae', 'flor, casca', false, ''],
  ['Abacateiro', 'Persea americana', 'Lauraceae', 'fruto', false, 'Folhas e caroço podem intoxicar animais (cavalos, aves, coelhos).'],
  ['Mamona', 'Ricinus communis', 'Euphorbiaceae', 'semente (não consumir)', false, 'Sementes contêm ricina, muito tóxica para pessoas e animais.'],
  ['Leucena', 'Leucaena leucocephala', 'Fabaceae', 'folha (forragem)', false, 'Contém mimosina: em excesso intoxica ruminantes e é tóxica para cavalos.']
];

function renderCadastroRapido() {
  const box = document.getElementById('cr-lista');
  if (!box) return;
  const ja = new Set((plantasApi || []).map(p => String(p.nome_popular).trim().toLowerCase()));
  box.innerHTML = PLANTAS_RAPIDAS.map((p, i) => {
    const existe = ja.has(p[0].toLowerCase());
    return `<div class="fluxo-item" style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
      <label style="display:flex;gap:10px;align-items:center;cursor:pointer;flex:1;min-width:240px">
        <input type="checkbox" class="cr-check" data-i="${i}" ${existe ? 'disabled' : (p[4] ? 'checked' : '')}>
        <span><strong>${escapeHtml(p[0])}</strong> <em class="mini-sem-link">${escapeHtml(p[1])} · ${escapeHtml(p[2])}</em>
        ${existe ? ' <span class="badge green">já na API</span>' : ''}${p[5] ? ' <span class="badge red">tóxica</span>' : ''}</span>
      </label>
      <input type="number" class="form-control cr-qtd" data-i="${i}" min="0" step="1" placeholder="pés" style="width:90px" ${existe ? 'disabled' : ''}>
    </div>`;
  }).join('');
}

async function cadastroRapidoPlantas() {
  const msg = document.getElementById('cr-msg');
  const marcadas = [...document.querySelectorAll('.cr-check:checked:not(:disabled)')].map(c => Number(c.dataset.i));
  if (!marcadas.length) { msg.textContent = 'Nenhuma planta marcada.'; return; }
  const local = document.getElementById('cr-local').value.trim();
  let ok = 0; const falhas = [];
  for (const i of marcadas) {
    const [nome, cientifico, familia, parte, , alerta] = PLANTAS_RAPIDAS[i];
    const qtd = document.querySelector(`.cr-qtd[data-i="${i}"]`).value;
    msg.textContent = `Cadastrando ${ok + falhas.length + 1}/${marcadas.length}: ${nome}…`;
    try {
      await apiPlantas('', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
        nome_popular: nome, nome_cientifico: cientifico, familia, parte_usada: parte, quantidade: qtd,
        local_descricao: local, status: 'a_identificar', toxica: !!alerta, alerta,
        notas: 'Cadastro rápido: nome científico provável, confirmar com Pl@ntNet.' }) });
      ok++;
    } catch (e) { falhas.push(nome + ' (' + e.message + ')'); }
  }
  await renderPlantas();
  msg.textContent = `${ok} planta(s) cadastrada(s) na API.` + (falhas.length ? ' Falharam: ' + falhas.join('; ') : '');
}

/* ---------------- Identificar plantas: fila + treino do Turing ---------------- */
const _gen = p => ((p.nome_cientifico || '').trim().split(/\s+/)[0] || '').toLowerCase();
const _fam = p => (p.familia || '').trim().toLowerCase();

async function adicionarFilaPlantas() {
  const msg = document.getElementById('fila-msg');
  const nomes = [...new Set(document.getElementById('fila-nomes').value.split('\n').map(n => n.trim()).filter(Boolean))];
  const local = document.getElementById('fila-local').value.trim();
  if (!nomes.length) { msg.textContent = 'Escreva pelo menos um nome.'; return; }
  if (nomes.length > 50) { msg.textContent = 'Máximo de 50 nomes por vez.'; return; }
  let ok = 0; const falhas = [];
  for (const nome of nomes) {
    msg.textContent = `Enviando ${ok + falhas.length + 1}/${nomes.length}…`;
    try {
      await apiPlantas('', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome_popular: nome.slice(0, 160), status: 'a_identificar', local_descricao: local }) });
      ok++;
    } catch (e) { falhas.push(nome + ' (' + e.message + ')'); }
  }
  msg.textContent = `${ok} planta(s) adicionada(s) à fila.` + (falhas.length ? ' Falharam: ' + falhas.join('; ') : '');
  if (ok) document.getElementById('fila-nomes').value = '';
  await renderFilaPlantas();
}

async function renderFilaPlantas() {
  const caixa = document.getElementById('fila-identificar');
  const caixaId = document.getElementById('fila-identificadas');
  if (!caixa || !caixaId) return;
  caixa.innerHTML = '<p class="vault-hint">Carregando da API…</p>';
  try { plantasApi = (await apiPlantas('')).plantas || []; }
  catch (e) { caixa.innerHTML = '<p class="vault-hint">Erro: ' + escapeHtml(e.message) + '</p>'; caixaId.innerHTML = ''; return; }

  const fila = plantasApi.filter(p => p.status === 'a_identificar');
  caixa.innerHTML = fila.length ? fila.map(p => `
    <div class="mini-card" style="margin-bottom:10px">
      <div class="mini-card-top"><strong class="venda-nome">#${p.id} · ${escapeHtml(p.nome_popular)}</strong>
        ${p.local_descricao ? `<span class="mini-sem-link">${escapeHtml(p.local_descricao)}</span>` : ''}</div>
      <div class="config-grid">
        <div class="form-group"><label for="fi-c-${p.id}">Nome científico</label><input id="fi-c-${p.id}" class="form-control" maxlength="200" value="${escapeHtml(p.nome_cientifico || '')}" placeholder="Gênero espécie"></div>
        <div class="form-group"><label for="fi-f-${p.id}">Família</label><input id="fi-f-${p.id}" class="form-control" maxlength="120" value="${escapeHtml(p.familia || '')}" placeholder="Ex.: Fabaceae"></div>
        <div class="form-group"><label for="fi-p-${p.id}">Parte observada</label><input id="fi-p-${p.id}" class="form-control" maxlength="120" value="${escapeHtml(p.parte_usada || '')}" placeholder="folha, caule, flor"></div>
      </div>
      <div class="btn-row">
        <button type="button" class="btn-action" onclick="salvarIdentificacao(${p.id})"><i class="ph ph-floppy-disk"></i> Salvar</button>
        <a class="btn-action secondary" href="https://www.gbif.org/species/search?q=${encodeURIComponent(p.nome_cientifico || p.nome_popular)}" target="_blank" rel="noopener noreferrer"><i class="ph ph-globe"></i> GBIF</a>
        <button type="button" class="btn-action secondary" onclick="abrirTela('tela-plantas'); setTimeout(() => editarPlanta(${p.id}), 300)"><i class="ph ph-pencil"></i> Ficha completa</button>
      </div>
      <p id="fi-msg-${p.id}" class="vault-hint" role="status"></p>
    </div>`).join('') : '<p class="vault-hint">Fila vazia. Anote nomes acima ou registre pelo app de campo.</p>';

  const ident = plantasApi.filter(p => p.status === 'identificada' || p.status === 'enviada_pesquisa');
  caixaId.innerHTML = ident.length ? '<div class="catalogo-grid">' + ident.map(p => {
    const parentes = plantasApi.filter(o => o.id !== p.id && ((_gen(p) && _gen(o) === _gen(p)) || (_fam(p) && _fam(o) === _fam(p))));
    const toxParente = parentes.some(o => o.toxica);
    return `<article class="mini-card">
      <div class="mini-card-top"><strong class="venda-nome">${escapeHtml(p.nome_popular)}</strong>
        <span class="badge ${p.status === 'identificada' ? 'green' : 'blue'}">${escapeHtml(STATUS_PLANTA[p.status])}</span></div>
      <p class="venda-desc"><em>${escapeHtml(p.nome_cientifico || '')}</em>${p.familia ? ' · ' + escapeHtml(p.familia) : ''}</p>
      <p class="mini-sem-link">Parentes no catálogo: ${parentes.length ? parentes.map(o => escapeHtml(o.nome_popular)).join(', ') : 'nenhum ainda'}</p>
      ${p.toxica || toxParente ? `<p class="venda-desc" style="color:var(--danger-red)"><i class="ph ph-warning"></i> ${p.toxica ? 'Marcada com risco de toxicidade' : 'Tem parente marcado como tóxico'}</p>` : ''}
      <div class="mini-card-footer"><span></span>
        <button class="btn-action secondary" onclick="enviarPlantaTuring(${p.id})"><i class="ph ph-brain"></i> Enviar ao Turing</button></div>
      <p id="fi-msg-${p.id}" class="vault-hint" role="status"></p>
    </article>`;
  }).join('') + '</div>' : '<p class="vault-hint">Nenhuma planta identificada ainda.</p>';
}

async function salvarIdentificacao(id) {
  const msg = document.getElementById('fi-msg-' + id);
  const cientifico = document.getElementById('fi-c-' + id).value.trim().replace(/\s+/g, ' ');
  const dados = {
    nome_cientifico: cientifico,
    familia: document.getElementById('fi-f-' + id).value.trim(),
    parte_usada: document.getElementById('fi-p-' + id).value.trim()
  };
  if (cientifico) dados.status = 'identificada';
  msg.textContent = 'Salvando…';
  try {
    await apiPlantas('/' + id, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dados) });
    msg.textContent = cientifico ? 'Salvo e marcada como identificada ✅' : 'Salvo (continua na fila até ter nome científico).';
    if (cientifico) setTimeout(renderFilaPlantas, 600);
  } catch (e) { msg.textContent = 'Não foi possível salvar: ' + e.message; }
}

async function enviarPlantaTuring(id) {
  const p = plantasApi.find(x => String(x.id) === String(id));
  const msg = document.getElementById('fi-msg-' + id);
  if (!p || !p.nome_cientifico) return;
  const tk = tokenDoCofre();
  if (!tk) { msg.textContent = 'Token não encontrado no cofre.'; return; }
  const parentes = plantasApi.filter(o => o.id !== p.id && _fam(p) && _fam(o) === _fam(p)).map(o => o.nome_popular + (o.nome_cientifico ? ' (' + o.nome_cientifico + ')' : ''));
  const resposta = [
    `No catálogo Plantas do morro, "${p.nome_popular}" está registrada como ${p.nome_cientifico}` + (p.familia ? `, família ${p.familia}.` : '.'),
    parentes.length ? `Outras plantas da mesma família no catálogo: ${parentes.join(', ')}.` : '',
    p.notas ? `Origem e história: ${String(p.notas).replace(/\s+/g, ' ').trim()}` : '',
    p.toxica ? `Atenção: marcada com risco de toxicidade${p.alerta ? ' (' + p.alerta + ')' : ''}.` : '',
    'Identificação feita por foto e a confirmar com especialista. Este registro não indica uso, dose ou segurança da planta.'
  ].filter(Boolean).join(' ');
  msg.textContent = 'Enviando ao Laboratório do Turing…';
  try {
    const r = await fetch(_baseTuring() + '/api/turing/conhecimento/ensinar', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tk },
      body: JSON.stringify({ area: 'Agro', pergunta: `[botânica] O que é a planta "${p.nome_popular}" do catálogo Plantas do morro?`, resposta, fonte: 'Plantas do morro · painel' })
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok || !d.ok) throw new Error(d.erro || 'HTTP ' + r.status);
    msg.textContent = `Enviado ✅ exemplo #${d.conhecimento && d.conhecimento.id} pendente de revisão no Laboratório do Turing.`;
  } catch (e) { msg.textContent = 'Falhou: ' + e.message; }
}


/* ---------------- Plantas tóxicas: referência de precaução ---------------- */
const TOXICAS_REF = [
  ['Comigo-ninguém-pode', 'Dieffenbachia spp.', 'Araceae', 'toda a planta', 'Seiva queima boca e garganta; inchaço pode dificultar a respiração.'],
  ['Copo-de-leite', 'Zantedeschia aethiopica', 'Araceae', 'toda a planta', 'Irritação intensa de boca e garganta.'],
  ['Tinhorão', 'Caladium bicolor', 'Araceae', 'toda a planta', 'Irritação intensa de boca e garganta.'],
  ['Antúrio', 'Anthurium spp.', 'Araceae', 'toda a planta', 'Irritação de boca e garganta.'],
  ['Mamona', 'Ricinus communis', 'Euphorbiaceae', 'sementes', 'Sementes contêm ricina; poucas sementes mastigadas podem ser graves.'],
  ['Pinhão-roxo', 'Jatropha gossypiifolia', 'Euphorbiaceae', 'sementes, látex', 'Sementes causam vômito e diarreia intensos.'],
  ['Pinhão-manso', 'Jatropha curcas', 'Euphorbiaceae', 'sementes, látex', 'Sementes causam vômito e diarreia intensos.'],
  ['Mandioca-brava', 'Manihot esculenta (variedades bravas)', 'Euphorbiaceae', 'raiz e folhas cruas', 'Libera cianeto se consumida crua ou mal processada; perigosa para animais.'],
  ['Coroa-de-cristo', 'Euphorbia milii', 'Euphorbiaceae', 'látex', 'Látex irrita pele e olhos.'],
  ['Avelós', 'Euphorbia tirucalli', 'Euphorbiaceae', 'látex', 'Látex causa queimadura na pele e lesão grave nos olhos.'],
  ['Bico-de-papagaio', 'Euphorbia pulcherrima', 'Euphorbiaceae', 'látex', 'Látex irritante para pele, olhos e boca.'],
  ['Espirradeira', 'Nerium oleander', 'Apocynaceae', 'toda a planta', 'Afeta o coração; perigosa para pessoas e animais.'],
  ['Chapéu-de-napoleão', 'Cascabela thevetia (Thevetia peruviana)', 'Apocynaceae', 'toda a planta, sementes', 'Afeta o coração; sementes muito perigosas.'],
  ['Oficial-de-sala', 'Asclepias curassavica', 'Apocynaceae', 'toda a planta, látex', 'Afeta o coração.'],
  ['Saia-branca (trombeteira)', 'Brugmansia suaveolens', 'Solanaceae', 'toda a planta', 'Causa delírio, alucinação e taquicardia.'],
  ['Figueira-do-inferno (estramônio)', 'Datura stramonium', 'Solanaceae', 'toda a planta, sementes', 'Causa delírio, alucinação e taquicardia.'],
  ['Jequiriti', 'Abrus precatorius', 'Fabaceae', 'sementes', 'Sementes vermelhas e pretas contêm abrina; muito perigosas se mastigadas.'],
  ['Fedegoso', 'Senna occidentalis', 'Fabaceae', 'sementes', 'Intoxica gado, cavalos e aves (lesão muscular).'],
  ['Barbatimão', 'Stryphnodendron spp.', 'Fabaceae', 'frutos (vagens)', 'Vagens intoxicam gado e podem causar aborto.'],
  ['Erva-de-rato', 'Palicourea marcgravii', 'Rubiaceae', 'folhas', 'Principal causa de morte súbita de gado no Brasil.'],
  ['Samambaia-do-campo', 'Pteridium esculentum subsp. arachnoideum', 'Dennstaedtiaceae', 'folhas', 'Intoxica gado (sangue na urina, tumores) com consumo prolongado.'],
  ['Cambará (lantana)', 'Lantana camara', 'Verbenaceae', 'folhas, frutos verdes', 'Lesão no fígado e sensibilidade ao sol em gado; frutos verdes perigosos para crianças.']
];
const _norm = t => String(t || '').toLowerCase().replace(/\(.*?\)/g, '').replace(/spp\.?/g, '').trim().split(/\s+/).slice(0, 2).join(' ');

async function renderToxicas() {
  const caixa = document.getElementById('tox-lista');
  if (!caixa) return;
  try { plantasApi = (await apiPlantas('')).plantas || []; } catch (e) { document.getElementById('tox-msg').textContent = 'Erro ao ler a API: ' + e.message; }
  const naApi = new Set(plantasApi.map(p => _norm(p.nome_cientifico)));
  const naPropriedade = plantasApi.filter(p => p.toxica && !/^Referência/.test(p.local_descricao || ''));
  caixa.innerHTML = (naPropriedade.length ? `<p class="vault-hint" style="color:var(--danger-red)"><i class="ph ph-warning"></i> Registradas na propriedade com risco: ${naPropriedade.map(p => escapeHtml(p.nome_popular)).join(', ')}</p>` : '') +
    '<div class="catalogo-grid">' + TOXICAS_REF.map(([pop, cient, fam, parte, alerta]) => `
    <article class="mini-card">
      <div class="mini-card-top"><strong class="venda-nome">${escapeHtml(pop)}</strong>
        <span class="badge ${naApi.has(_norm(cient)) ? 'green' : 'orange'}">${naApi.has(_norm(cient)) ? 'na API' : 'não inserida'}</span></div>
      <p class="venda-desc"><em>${escapeHtml(cient)}</em> · ${escapeHtml(fam)}</p>
      <p class="venda-desc" style="color:var(--danger-red)"><i class="ph ph-warning"></i> ${escapeHtml(parte)}: ${escapeHtml(alerta)}</p>
    </article>`).join('') + '</div>';
}

async function inserirToxicas() {
  const msg = document.getElementById('tox-msg');
  const naApi = new Set(plantasApi.map(p => _norm(p.nome_cientifico)));
  const faltam = TOXICAS_REF.filter(t => !naApi.has(_norm(t[1])));
  if (!faltam.length) { msg.textContent = 'Todas já estão na API.'; return; }
  if (!confirm(`Inserir ${faltam.length} planta(s) tóxica(s) de referência na API?`)) return;
  let ok = 0; const falhas = [];
  for (const [pop, cient, fam, parte, alerta] of faltam) {
    msg.textContent = `Inserindo ${ok + falhas.length + 1}/${faltam.length}…`;
    try {
      await apiPlantas('', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
        nome_popular: pop, nome_cientifico: cient, familia: fam, parte_usada: parte, status: 'identificada',
        toxica: true, alerta, local_descricao: 'Referência (não confirmada na propriedade)',
        notas: 'Lista de precaução do painel. Fontes de referência: SINITOX/Fiocruz e Embrapa (plantas tóxicas para animais).' }) });
      ok++;
    } catch (e) { falhas.push(pop + ' (' + e.message + ')'); }
  }
  msg.textContent = `${ok} inserida(s).` + (falhas.length ? ' Falharam: ' + falhas.join('; ') : '');
  await renderToxicas();
}


/* ---------------- Plantas medicinais: referência (não tóxicas) ----------------
   [popular, científico, família, parte, uso tradicional relatado, alerta] */
const UTEIS_REF = [
  ['Erva-cidreira (melissa)', 'Melissa officinalis', 'Lamiaceae', 'folhas', 'calmante, digestão', ''],
  ['Erva-cidreira-brasileira', 'Lippia alba', 'Verbenaceae', 'folhas', 'calmante, digestão', ''],
  ['Capim-santo (capim-limão)', 'Cymbopogon citratus', 'Poaceae', 'folhas', 'calmante, digestão', ''],
  ['Hortelã', 'Mentha spp.', 'Lamiaceae', 'folhas', 'digestão, gases', ''],
  ['Boldo-brasileiro', 'Plectranthus barbatus', 'Lamiaceae', 'folhas', 'digestão, fígado', 'Evitar na gravidez e em uso prolongado.'],
  ['Camomila', 'Matricaria chamomilla', 'Asteraceae', 'flores', 'calmante, digestão', 'Pode dar alergia em quem tem alergia a margaridas.'],
  ['Erva-doce (funcho)', 'Foeniculum vulgare', 'Apiaceae', 'frutos', 'digestão, gases', ''],
  ['Alecrim', 'Salvia rosmarinus', 'Lamiaceae', 'folhas', 'digestão, circulação', 'Evitar na gravidez e em pressão alta.'],
  ['Gengibre', 'Zingiber officinale', 'Zingiberaceae', 'rizoma', 'náusea, garganta', 'Cuidado junto com anticoagulantes.'],
  ['Açafrão-da-terra', 'Curcuma longa', 'Zingiberaceae', 'rizoma', 'inflamação, digestão', 'Cuidado junto com anticoagulantes e com problemas de vesícula.'],
  ['Guaco', 'Mikania glomerata', 'Asteraceae', 'folhas', 'tosse, garganta', 'Contém cumarina: não usar junto com anticoagulantes.'],
  ['Espinheira-santa', 'Monteverdia ilicifolia (Maytenus ilicifolia)', 'Celastraceae', 'folhas', 'azia, estômago', 'Evitar na gravidez e na amamentação.'],
  ['Carqueja', 'Baccharis crispa', 'Asteraceae', 'partes aéreas', 'digestão, fígado', 'Evitar na gravidez; pode baixar a glicose.'],
  ['Pata-de-vaca', 'Bauhinia forficata', 'Fabaceae', 'folhas', 'glicose (relato popular)', 'Pode somar efeito com remédios e insulina para diabetes: só com orientação médica.'],
  ['Maracujá', 'Passiflora edulis', 'Passifloraceae', 'folhas', 'calmante, sono', 'Efeito sedativo: não combinar com remédios para dormir ou ansiedade sem orientação médica.'],
  ['Mulungu', 'Erythrina mulungu', 'Fabaceae', 'casca', 'calmante, sono', 'Efeito sedativo: não combinar com remédios para dormir ou ansiedade sem orientação médica.'],
  ['Calêndula', 'Calendula officinalis', 'Asteraceae', 'flores', 'pele, cicatrização (uso externo)', ''],
  ['Babosa', 'Aloe vera', 'Asphodelaceae', 'gel das folhas', 'queimaduras, pele (uso externo)', 'O suco amarelo da folha é laxante forte: não ingerir.'],
  ['Tanchagem', 'Plantago major', 'Plantaginaceae', 'folhas', 'garganta, pele', ''],
  ['Quebra-pedra', 'Phyllanthus niruri', 'Phyllanthaceae', 'planta inteira', 'rins, cálculo (relato popular)', 'Evitar na gravidez.'],
  ['Pequi', 'Caryocar brasiliense', 'Caryocaraceae', 'fruto', 'alimento do Cerrado', 'Caroço tem espinhos: nunca morder.'],
  ['Copaíba', 'Copaifera langsdorffii', 'Fabaceae', 'óleo-resina', 'pele, inflamação (uso externo)', 'Não ingerir sem orientação.'],
  ['Sucupira', 'Pterodon emarginatus', 'Fabaceae', 'sementes', 'dores, garganta (relato popular)', 'Uso interno sem estudos suficientes.'],
  ['Jatobá-do-cerrado', 'Hymenaea stigonocarpa', 'Fabaceae', 'casca, fruto', 'tosse; fruto é alimento', '']
];

async function renderUteis() {
  const caixa = document.getElementById('uteis-lista');
  if (!caixa) return;
  try { plantasApi = (await apiPlantas('')).plantas || []; } catch (e) { document.getElementById('uteis-msg').textContent = 'Erro ao ler a API: ' + e.message; }
  const naApi = new Set(plantasApi.map(p => _norm(p.nome_cientifico)));
  caixa.innerHTML = '<div class="catalogo-grid">' + UTEIS_REF.map(([pop, cient, fam, parte, uso, alerta]) => `
    <article class="mini-card">
      <div class="mini-card-top"><strong class="venda-nome">${escapeHtml(pop)}</strong>
        <span class="badge ${naApi.has(_norm(cient)) ? 'green' : 'orange'}">${naApi.has(_norm(cient)) ? 'na API' : 'não inserida'}</span></div>
      <p class="venda-desc"><em>${escapeHtml(cient)}</em> · ${escapeHtml(fam)}</p>
      <p class="mini-sem-link">Parte: ${escapeHtml(parte)} · uso relatado: ${escapeHtml(uso)}</p>
      ${alerta ? `<p class="venda-desc" style="color:var(--danger-red)"><i class="ph ph-warning"></i> ${escapeHtml(alerta)}</p>` : ''}
    </article>`).join('') + '</div>';
}

async function inserirUteis() {
  const msg = document.getElementById('uteis-msg');
  const naApi = new Set(plantasApi.map(p => _norm(p.nome_cientifico)));
  const faltam = UTEIS_REF.filter(t => !naApi.has(_norm(t[1])));
  if (!faltam.length) { msg.textContent = 'Todas já estão na API.'; return; }
  if (!confirm(`Inserir ${faltam.length} planta(s) medicinal(is) de referência na API?`)) return;
  let ok = 0; const falhas = [];
  for (const [pop, cient, fam, parte, uso, alerta] of faltam) {
    msg.textContent = `Inserindo ${ok + falhas.length + 1}/${faltam.length}…`;
    try {
      await apiPlantas('', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
        nome_popular: pop, nome_cientifico: cient, familia: fam, parte_usada: parte, status: 'identificada',
        toxica: false, uso_tradicional: 'Relatado: ' + uso, alerta,
        local_descricao: 'Referência (não confirmada na propriedade)',
        notas: 'Lista de referência do painel. Conferir monografia no Formulário de Fitoterápicos da ANVISA (3ª ed.). Não é indicação de uso.' }) });
      ok++;
    } catch (e) { falhas.push(pop + ' (' + e.message + ')'); }
  }
  msg.textContent = `${ok} inserida(s).` + (falhas.length ? ' Falharam: ' + falhas.join('; ') : '');
  await renderUteis();
}


/* ---------------- Treinos temáticos (pacotes prontos → Pendentes) ---------------- */
const PACOTES_TREINO = [
  { titulo: 'Goiás · Fazenda Saudade (Paranaiguara)', icone: 'ph-plant', area: 'Goiás · Fazenda Saudade', itens: [
    ['Qual é o calendário da soja em Goiás na safra 2026/27?', 'Vazio sanitário de 27/06 a 24/09/2026. Semeadura liberada a partir de 20/09/2026 (antecipação excepcional pela IN Agrodefesa nº 5/2026) até 02/01/2027. Cadastro da lavoura no Sidago até 17/01/2027.'],
    ['Por que existe o vazio sanitário da soja?', 'Para interromper o ciclo da ferrugem asiática, a principal doença da soja. Durante o vazio é proibido manter qualquer planta viva de soja no campo, inclusive as que nascem sozinhas (tigueras).'],
    ['Quando plantar a soja se a chuva ainda não firmou?', 'Esperar o solo ter umidade adequada. Plantar no seco arrisca germinação ruim e replantio, que é um custo alto. A decisão final é do agrônomo responsável.'],
    ['O que é o cadastro no Sidago e por que importa?', 'É o registro obrigatório de cada lavoura de soja na Agrodefesa, feito até 15 dias após o fim da semeadura. Sem o cadastro o produtor fica irregular e sujeito a penalidades.'],
    ['O que o CAR da Fazenda Saudade mostra?', '330,84 ha no CAR (cerca de 68 alqueires goianos), 307,95 ha de uso consolidado, 21,56 ha de vegetação nativa e 20,33 ha de APP. O CAR tem 2 sobreposições com outros CARs e está aguardando análise. A área precisa ser conferida na matrícula.'],
    ['O que fazer com focos de queimada registrados na fazenda?', 'Verificar data e local de cada foco no Inpe, conferir se foi dentro da propriedade ou em vizinhos e manter aceiros. Queimadas podem gerar multa ambiental e problemas no CAR.'],
    ['Qual é o sistema de produção comum na região de Paranaiguara?', 'Soja na safra de verão seguida de milho safrinha logo após a colheita da soja. Na Fazenda Saudade isso ainda precisa ser confirmado com a família.'],
    ['Quais alertas o Turing deve dar para a Fazenda Saudade?', 'Prazos (semeadura e Sidago), falta de chuva no plantio, focos de queimada próximos, queda de vigor da lavoura nas imagens de satélite e preço da soja muito fora da média. O Turing nunca deve inventar números da fazenda.']
  ]},
  { titulo: 'Angola · Fazenda PIPE (Malanje)', icone: 'ph-tractor', area: 'Angola · Fazenda PIPE', itens: [
    ['Qual é o calendário de chuvas em Malanje e quando plantar?', 'Em Malanje a estação chuvosa vai, em geral, de outubro/novembro a abril, e a seca (cacimbo) de maio a setembro. Culturas de sequeiro devem ser plantadas no início das chuvas. Antes de decidir, conferir a previsão do ano e o histórico da própria fazenda.'],
    ['Quais culturas são adequadas para a Fazenda PIPE em Malanje?', 'Culturas tradicionais da região: mandioca, milho, feijão, ginguba (amendoim) e batata-doce. A escolha deve considerar análise de solo, mercado comprador e capacidade de transporte da fazenda.'],
    ['Como rastrear um lote de produção na Fazenda PIPE?', 'Cada lote recebe um código único e registra: talhão, data de plantio, variedade, insumos aplicados (produto, lote e dose conforme o rótulo), colheita, quantidade e destino. Esse histórico permite responder a compradores, apurar custos e localizar problemas.'],
    ['Como planejar a logística entre Malanje e Luanda?', 'São cerca de 400 km por estrada, e há ligação ferroviária (Caminho de Ferro de Luanda). Na época de chuvas as estradas pioram, então escoar a produção e trazer insumos preferencialmente na seca, com frete contratado com antecedência.'],
    ['Como registrar a compra de insumos na Fazenda PIPE?', 'Registrar fornecedor, produto, quantidade, data, preço em kwanzas e o equivalente em dólar do dia (muitos insumos são importados e o câmbio varia). Cotar com antecedência por causa do prazo de entrega até Malanje.'],
    ['Quais indicadores acompanhar na Fazenda PIPE?', 'Custo por hectare, produtividade (t/ha), perdas na colheita e no armazenamento, preço de venda e margem por cultura. O Turing deve pedir os dados reais da fazenda antes de tirar conclusões e nunca inventar números.'],
    ['Quem pode ver os dados da Fazenda PIPE?', 'Somente usuários e chaves da organização na NexoTerraCore API, com o menor escopo necessário. Dados da fazenda não devem ser expostos em páginas públicas.'],
    ['Qual a diferença entre a Fazenda PIPE e as fazendas do Brasil no Turing?', 'São organizações e contextos diferentes: Malanje usa kwanza, calendário de chuvas próprio e logística até Luanda; as fazendas do Centro-Oeste usam real, ZARC e cotações CEPEA/B3. O Turing deve sempre perguntar de qual fazenda se trata antes de responder.'],
    ['Como registrar uma perda de colheita na Fazenda PIPE?', 'Registrar lote, cultura, data, quantidade perdida, causa (praga, chuva, transporte, armazenamento) e foto se houver. Com esse histórico o Turing ajuda a achar onde a perda se repete e quanto ela custa.']
  ]},
  { titulo: 'EduTech Angola', icone: 'ph-graduation-cap', area: 'Edutech Angola', itens: [
    ['Como estruturar um curso de manejo do solo para jovens de Malanje?', 'Módulos curtos: 1) o que é o solo e a matéria orgânica; 2) erosão e curvas de nível; 3) análise de solo e correção; 4) adubação e cobertura do solo; 5) prática na Fazenda PIPE. Cada módulo com aula curta, exercício prático e avaliação simples.'],
    ['Como dar aulas com pouca internet em Angola?', 'Conteúdo leve para celular, que funcione offline (PWA), com vídeos curtos e textos que podem ser baixados uma vez e estudados sem rede. As atividades sincronizam quando houver conexão.'],
    ['Como ensinar inglês técnico agrícola?', 'Vocabulário do dia a dia da fazenda (soil, seed, harvest, fertilizer, yield, irrigation), frases de compra e venda e leitura de rótulos e manuais em inglês, sempre ligando a palavra à prática no campo.'],
    ['Como ligar a EduTech à Fazenda PIPE?', 'Os alunos aplicam o conteúdo em estágio prático na fazenda: registram lotes, medem produtividade e participam da logística. A fazenda vira laboratório de ensino e o aluno sai com experiência real.']
  ]},
  { titulo: 'Agro Centro-Oeste (Brasil)', icone: 'ph-plant', area: 'Agro Centro-Oeste', itens: [
    ['Qual é o calendário da soja e do milho safrinha no Centro-Oeste?', 'A soja é plantada em geral de setembro a dezembro, com o início das chuvas, e o milho safrinha logo após a colheita da soja, de janeiro a março. As datas exatas dependem do zoneamento agrícola (ZARC) de cada município.'],
    ['Como é o clima do Cerrado para o agro?', 'Chuvas de outubro a abril e seca de maio a setembro. A seca limita a segunda safra e a pastagem, o que torna importantes a reserva de água, a irrigação e o planejamento de forragem.'],
    ['Como corrigir o solo do Cerrado?', 'O solo do Cerrado costuma ser ácido e pobre em nutrientes. A correção (calagem e, quando indicado, gessagem) deve ser feita com base em análise de solo e recomendação de um agrônomo.'],
    ['De onde tirar preços de commodities?', 'O Turing não inventa cotações. Preços devem vir de fontes do dia, como o CEPEA/ESALQ e a B3, sempre com data e fonte.'],
    ['O que é integração lavoura-pecuária (ILP)?', 'Sistema que alterna ou combina lavoura e pastagem na mesma área, comum em Goiás. Melhora o solo, reduz custos e diversifica a renda.'],
    ['O que é o vazio sanitário da soja em Goiás?', 'Período do ano em que é proibido ter plantas vivas de soja no campo, para quebrar o ciclo da ferrugem asiática. As datas são definidas pela Agrodefesa (Goiás) e pelo Ministério da Agricultura e devem ser conferidas a cada safra.'],
    ['O que é o ZARC?', 'Zoneamento Agrícola de Risco Climático: estudo oficial que indica, por município e cultura, as datas de plantio com menor risco climático. É usado para crédito rural e seguro agrícola.']
  ]},
  { titulo: 'SEO para GPS.dev e mini-softwares', icone: 'ph-magnifying-glass', area: 'SEO', itens: [
    ['Quais são as regras básicas de SEO em uma página?', 'Um título único com cerca de 60 caracteres, meta description de 150 a 160 caracteres, um único H1, texto útil com a palavra-chave natural e links internos para páginas relacionadas.'],
    ['Como fazer SEO para um mini-software do Sistema Raiz?', 'Uma página por produto, com a busca que o cliente faz (ex.: "sistema para farmácia que funciona offline"), benefícios claros, perguntas frequentes, preço ou contato e prints reais.'],
    ['Como a velocidade do site afeta o SEO?', 'O Google considera a experiência da página (Core Web Vitals). Páginas leves, imagens comprimidas e PWA bem feito ajudam no posicionamento e na conversão.'],
    ['O que são dados estruturados?', 'Marcação schema.org (ex.: SoftwareApplication, LocalBusiness) que ajuda o Google a entender a página. Deve descrever só o que é real na página.'],
    ['Como medir resultados de SEO?', 'Pelo Google Search Console (impressões, cliques, posição média). Nenhuma ação garante posição: o Turing deve recomendar e medir, nunca prometer primeiro lugar.']
  ]},
  { titulo: 'Botânica · Plantas do morro', icone: 'ph-leaf', area: 'Botânica', itens: [
    ['Como se escreve um nome científico de planta?', 'Duas palavras em latim (sistema de Lineu, 1753): o gênero com inicial maiúscula e a espécie toda em minúscula, ex.: Mangifera indica. Em texto impresso vai em itálico. "spp." indica várias espécies do mesmo gênero.'],
    ['O que é família botânica?', 'Grupo de gêneros aparentados; o nome termina em -aceae. Ex.: Myrtaceae reúne goiaba, jabuticaba, eucalipto e cravo-da-índia. No catálogo, a família ajuda a avisar quando uma planta tem parente tóxico.'],
    ['Como identificar uma planta com o Pl@ntNet?', 'Enviar de 1 a 4 fotos da mesma planta (flor, fruto, folha de perto, casca), marcar o órgão de cada foto e escolher a flora (Brasil para nativas, Flora mundial para cultivadas). Regra do catálogo: 90% ou mais = identificada; 50 a 89% = fica a identificar com nome provável; abaixo de 50% = refazer as fotos.'],
    ['Qual a diferença entre planta nativa, naturalizada e cultivada?', 'Nativa: ocorre naturalmente no Brasil (ex.: pequi). Naturalizada: veio de fora e se espalha sozinha (ex.: mamona). Cultivada: veio de fora e depende do plantio (ex.: mangueira). A fonte oficial é a Flora e Funga do Brasil, do Jardim Botânico do Rio de Janeiro.'],
    ['O Turing pode recomendar dose de planta medicinal?', 'Não. O Turing informa nome, família, origem e usos tradicionais registrados, mas não indica dose, preparo como tratamento nem substituição de remédio. Para uso medicinal, orientar a procurar médico ou farmacêutico e consultar o Formulário de Fitoterápicos da Anvisa.'],
    ['Quais plantas do Cerrado intoxicam o gado?', 'Entre as mais conhecidas: erva-de-rato (Palicourea marcgravii), samambaia-do-campo (Pteridium), sementes de fedegoso (Senna occidentalis) e cambará (Lantana camara). Ao suspeitar de intoxicação, retirar os animais da área e chamar o veterinário.'],
    ['O que fazer em caso de intoxicação por planta?', 'Ligar para o Disque-Intoxicação 0800 722 6001 (gratuito, 24 h) ou SAMU 192 e levar a planta ou uma foto. Não provocar vômito por conta própria.']
  ]},
  { titulo: 'Play Farm Agro', icone: 'ph-game-controller', area: 'Play Farm Agro', itens: [
    ['O que é o Play Farm Agro?', 'Jogo de fazenda da GPS.dev (PWA e app Android) inspirado no agro real: lavouras como soja, milho e café, animais, maquinário com diesel e revisão, silo, missões diárias, estações do Cerrado e o Turing como conselheiro.'],
    ['De onde vêm os preços do Play Farm Agro?', 'De cotações reais de referência (CEPEA/Esalq e B3), atualizadas pela equipe com data e fonte. Servem para aprender, não são recomendação de compra ou venda.'],
    ['O Play Farm Agro usa a NexoTerraCore API?', 'Sim, desde 25/11/2026. O progresso (save) e o ranking ficam na API, na tabela playfarm_saves, pela rota /api/playfarm com chave própria do jogo guardada só no servidor. O conselheiro Turing também consulta a API, com cache de 5 minutos. Se a API cair, o jogo continua salvando uma cópia no servidor do jogo. As cotações ainda vêm de arquivo fixo.'],
    ['Qual a rotina diária no Play Farm Agro?', 'Regar e colher as lavouras, cuidar dos animais, cumprir as missões diárias, abastecer e revisar as máquinas e vender no momento de melhor preço. Guardar no silo evita perder a colheita quando o celeiro enche.']
  ]},
  { titulo: 'Segurança da API · dia 1', icone: 'ph-shield-check', area: 'Segurança da API', itens: [
    ['O que fazer quando chega uma requisição sem chave (sem Authorization) na API?', 'Bloquear com 401 (não autenticado). Nenhum dado é lido ou gravado. Registrar IP e rota; se o mesmo IP repetir muitas vezes em pouco tempo, tratar como tentativa de abuso e alertar o administrador.'],
    ['O que fazer quando uma chave válida tenta uma ação fora do seu escopo?', 'Bloquear com 403 (escopo insuficiente). Ex.: chave só com playfarm.read tentando gravar save. Pode ser erro de configuração ou uso indevido: registrar e avisar o dono da chave.'],
    ['Qual a diferença entre 401 e 403?', '401 = a API não sabe quem você é (sem chave, chave inválida ou expirada). 403 = a API sabe quem você é, mas você não tem permissão para aquela ação (falta escopo ou perfil).'],
    ['Posso reaproveitar a chave do painel em outro app?', 'Não. Cada app tem a própria chave com o menor escopo necessário (menor privilégio). Ex. real: o Play Farm Agro usa a chave id 10, só com playfarm.read e playfarm.write. Se vazar, o estrago fica limitado ao jogo e basta revogar só ela.'],
    ['Onde deve ficar a API Key de um site ou jogo que roda no navegador?', 'Nunca no navegador (HTML, JavaScript, localStorage ou repositório público). A chave fica só no servidor, em .env protegido, e o servidor chama a API. Ex. real: no Play Farm o navegador fala com o servidor do jogo, e só o servidor tem a chave.'],
    ['O que fazer se uma API Key aparecer num print, commit ou conversa?', 'Tratar como comprometida: revogar na hora (ativo=false, revogado_em), criar chave nova com os mesmos escopos, atualizar o .env do serviço, reiniciar e testar. Depois conferir ultimo_uso_em e os logs para ver se alguém usou a chave vazada.'],
    ['O que fazer antes de alterar a API em produção?', '1) Backup dos arquivos que vão mudar. 2) node --check. 3) Migration idempotente (IF NOT EXISTS). 4) Reiniciar e testar com curl: com chave 200, sem chave 401. 5) Saber como voltar ao backup se algo falhar.'],
    ['Por que a API guarda só o hash da chave (chave_hash)?', 'Se o banco vazar, o hash SHA-256 não vira a chave de volta, então ninguém consegue usá-la. A API calcula o hash da chave recebida e compara. Por isso chave perdida não se recupera: cria-se outra.'],
    ['O que fazer com dados de entrada estranhos (identificador inválido, versão errada, texto gigante)?', 'Rejeitar com 400 (ou 413 se for grande demais) e não gravar. Toda entrada é validada no servidor: formato, tipo, versão e tamanho. Validar só no navegador não protege, porque o atacante chama a API direto.'],
    ['O Turing pode bloquear sozinho um IP que está errando muito a chave?', 'Não, por enquanto. O Turing registra, resume o padrão (IP, rotas, horários, quantidade) e alerta o administrador sugerindo a ação. Bloqueios de segurança precisam de autorização humana e de registro de auditoria. Primeiro audit_only, depois ação automática.']
  ]},
  { titulo: 'NexoTerraCore · operação', icone: 'ph-plugs-connected', area: 'NexoTerraCore', itens: [
    ['A NexoTerraCore API fica no ar 24 horas?', 'Sim. Ela roda na VPS como serviço do sistema, que reinicia sozinho se cair. Uma verificação automática testa os apps a cada hora e o banco de dados tem backup diário, guardado por 7 dias.'],
    ['Como o Turing aprende algo novo?', 'Pelo Fluxo de treino: entrada (ensinar ou importar) → pendente → revisão humana → aprovado. Só o conteúdo aprovado vira resposta do Turing.'],
    ['Quais são as regras de credenciais da API?', 'Cada app usa uma API Key própria com o menor escopo necessário. Chaves nunca aparecem em páginas, prints ou conversas; ficam no cofre ou em arquivo protegido no servidor. Chave exposta ou sem uso deve ser revogada.'],
    ['Onde fica a lista oficial de apps do ecossistema?', 'Na tabela apps da NexoTerraCore API, exibida no painel em Mini-softwares, com situação (no ar ou com problema), categoria e status. Apps fora de uso ficam arquivados, não apagados.']
  ]}
];

async function renderPacotes() {
  const box = document.getElementById('pac-lista');
  if (!box) return;
  try { conhecimentosApi = (await apiConhecimento('/listar')).conhecimentos || []; }
  catch (e) { box.innerHTML = '<p class="vault-hint">Erro ao ler a API: ' + escapeHtml(e.message) + '</p>'; return; }
  const ja = new Set(conhecimentosApi.map(k => String(k.pergunta).replace(/^\[[^\]]*\]\s*/, '').trim()));
  box.innerHTML = PACOTES_TREINO.map((p, pi) => {
    const enviados = p.itens.filter(it => ja.has(it[0])).length;
    return `<div class="project-section" style="margin:14px 0">
      <h3><i class="ph ${p.icone}"></i> ${escapeHtml(p.titulo)} <span class="badge ${enviados === p.itens.length ? 'green' : 'blue'}">${enviados}/${p.itens.length} no treino</span></h3>
      <p class="mini-sem-link">Área no Turing: ${escapeHtml(p.area)}</p>
      ${p.itens.map((it, ii) => `<div class="fluxo-item">
        <label style="display:flex;gap:10px;align-items:flex-start;cursor:pointer">
          <input type="checkbox" class="pac-check" data-p="${pi}" data-i="${ii}" ${ja.has(it[0]) ? 'disabled' : 'checked'} style="margin-top:4px">
          <span><strong>${escapeHtml(it[0])}</strong>${ja.has(it[0]) ? ' <span class="badge green">já no treino</span>' : ''}<br><span class="mini-sem-link">${escapeHtml(it[1])}</span></span>
        </label></div>`).join('')}
      <div class="btn-row"><button class="btn-action" onclick="enviarPacote(${pi})"><i class="ph ph-paper-plane-tilt"></i> Enviar marcados para Pendentes</button></div>
    </div>`;
  }).join('');
}

async function enviarPacote(pi) {
  const p = PACOTES_TREINO[pi];
  const msg = document.getElementById('pac-msg');
  const marcados = [...document.querySelectorAll(`.pac-check[data-p="${pi}"]:checked:not(:disabled)`)].map(c => p.itens[Number(c.dataset.i)]);
  if (!marcados.length) { msg.textContent = 'Nada marcado neste pacote.'; return; }
  let ok = 0; const falhas = [];
  for (const [pergunta, resposta] of marcados) {
    msg.textContent = `${p.titulo}: enviando ${ok + falhas.length + 1}/${marcados.length}…`;
    try {
      await apiConhecimento('/ensinar', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ area: p.area, pergunta: `[informativo] ${pergunta}`, resposta, fonte: 'Treinos temáticos · painel' }) });
      ok++;
    } catch (e) { falhas.push(e.message); if (/429|limite/i.test(e.message)) break; }
    await new Promise(r => setTimeout(r, 1200));
  }
  await renderPacotes();
  document.getElementById('pac-msg').textContent = `${p.titulo}: ${ok} enviado(s) para Pendentes.` + (falhas.length ? ' Falhas: ' + falhas.join('; ') : ' Aprove no Fluxo de treino.');
}
