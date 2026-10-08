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
  senhas: []
};

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
  const { financeiro, clientes, posts, projetos, minis } = appData;
  localStorage.setItem(STORAGE_DATA, JSON.stringify({ financeiro, clientes, posts, projetos, minis, seedVersion: SEED_VERSION }));
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
      persistData();
      return;
    } catch (e) { /* cai no default abaixo */ }
  }
  appData.minis = JSON.parse(JSON.stringify(SEED_MINIS));
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
    'tela-catalogo': 'nav-catalogo'
  };
  const navEl = document.getElementById(navMap[idTela]);
  if (navEl) navEl.classList.add('active-menu');

  const titleMap = {
    'tela-posts': 'Home / Conteúdo',
    'tela-financeiro': 'Administração Financeira',
    'tela-clientes': 'Base de Clientes',
    'tela-senhas': 'Cofre de Senhas & Acessos',
    'tela-catalogo': 'Mini-softwares',
    'tela-agro': 'Projeto: Agro Digital',
    'tela-nexus': 'Projeto: NexoTerraCore',
    'tela-turin': 'Projeto: Turim (IA)',
    'tela-videos': 'Gerenciador de Vídeos',
    'tela-podcast': 'Gerenciador de Podcasts'
  };

  document.getElementById('titulo-pagina').innerText = titleMap[idTela] || 'Console';
  renderHeaderActions(idTela);
  renderCurrentView();
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

  appData.posts.forEach(item => {
    container.innerHTML += `
      <div class="project-section" style="margin-bottom: 15px;">
        <h3>${item.titulo}
          <span>
            <button class="btn-icon" onclick="editarItem('posts', ${item.id})"><i class="ph ph-pencil"></i></button>
            <button class="btn-icon" onclick="deletarItem('posts', ${item.id})"><i class="ph ph-trash"></i></button>
          </span>
        </h3>
        <p style="color: var(--text-secondary); font-size: 13px; margin-bottom: 8px;">${item.data} • <span class="badge blue">${item.tipo}</span></p>
        <p style="line-height: 1.5;">${item.desc}</p>
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
    linkList.innerHTML += `
      <div class="link-item">
        <a href="${l.url}" target="_blank" rel="noopener"><i class="ph ph-link"></i> ${l.nome}</a>
        <button class="btn-icon" onclick="deletarLink('${key}', ${index})"><i class="ph ph-trash"></i></button>
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

function abrirModalLink(key) {
  activeProjectLinkKey = key;
  activeModalType = 'link';
  const overlay = document.getElementById('modal-container');
  const body = document.getElementById('modal-body');
  const titulo = document.getElementById('modal-titulo');

  overlay.classList.add('active');
  titulo.innerText = 'Novo Link do Projeto';
  body.innerHTML = `
    <div class="form-group"><label>Nome do Link</label><input id="form-link-nome" class="form-control" placeholder="ex: Documentação, Repositório"></div>
    <div class="form-group"><label>URL</label><input id="form-link-url" class="form-control" placeholder="https://..."></div>
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
  }
}

async function salvarModal() {
  if (activeModalType === 'link') {
    const nome = document.getElementById('form-link-nome').value;
    const url = document.getElementById('form-link-url').value;
    if (nome && url && activeProjectLinkKey) {
      if (!appData.projetos[activeProjectLinkKey].links) appData.projetos[activeProjectLinkKey].links = [];
      appData.projetos[activeProjectLinkKey].links.push({ id: Date.now(), nome, url });
    }
    persistData();
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

/* ---------------- Boot ---------------- */

document.addEventListener('DOMContentLoaded', () => {
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
