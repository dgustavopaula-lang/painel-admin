/* =====================================================================
   Ajustes de celular (até 800px) · Painel GPS.dev
   Só CSS: não muda dados nem chamadas à API. Remover o <script> desfaz tudo.
   Telas: API Central (saúde das rotas), Documentação, Fluxos da API.
   ===================================================================== */
(function () {
  'use strict';
  if (document.getElementById('gps-celular-css')) return;
  const st = document.createElement('style');
  st.id = 'gps-celular-css';
  st.textContent = `
@media (max-width:800px){
  html body .data-table-container{overflow-x:auto;-webkit-overflow-scrolling:touch;max-width:100%}

  /* API Central: tabela de rotas vira cartões */
  html body #tela-api .metrics-grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
  html body #tela-api .metrics-grid .metric-card{padding:10px}
  html body #tela-api .metrics-grid .metric-card h3{font-size:1.1rem}
  html body #tela-api .metrics-grid .metric-card span{font-size:.65rem}
  html body table:has(#tbody-endpoints) thead{display:none}
  html body table:has(#tbody-endpoints),html body table:has(#tbody-endpoints) tbody{display:block;width:100%}
  html body #tbody-endpoints tr{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:4px 10px;padding:10px 4px;border-bottom:1px solid rgba(255,255,255,.08)}
  html body #tbody-endpoints td{display:block;padding:0;border:0}
  html body #tbody-endpoints td:nth-child(1){grid-column:1 / -1;overflow-wrap:anywhere}
  html body #tbody-endpoints td:nth-child(2){grid-column:1}
  html body #tbody-endpoints td:nth-child(3){grid-column:1}
  html body #tbody-endpoints td:nth-child(4){grid-column:2;grid-row:2 / span 2;align-self:center}
  html body #tbody-endpoints .btn-icon{min-width:44px;min-height:44px}

  /* Documentação */
  html body #tela-docs-api .dc-barra{display:grid;grid-template-columns:1fr 1fr;gap:8px}
  html body #tela-docs-api .dc-barra input{grid-column:1 / -1;min-height:44px;font-size:16px}
  html body #tela-docs-api .dc-barra select{min-height:44px;font-size:16px}
  html body #tela-docs-api .dc-total{margin:0;align-self:center;text-align:right}
  html body #tela-docs-api #dc-baixar{grid-column:1 / -1;justify-content:center}
  html body #tela-docs-api .dc-legenda .vault-hint{flex-basis:100%}
  html body #tela-docs-api .dc-linha{grid-template-columns:auto minmax(0,1fr);gap:6px 10px;padding:12px}
  html body #tela-docs-api .dc-linha code{grid-column:2;font-size:.8rem}
  html body #tela-docs-api .dc-r{grid-column:1 / -1;font-size:.85rem}
  html body #tela-docs-api .dc-auth{grid-column:1 / -1;justify-self:start}
  html body #tela-docs-api .dc-m{min-width:54px}
  html body #tela-docs-api .dc-det .btn-row{display:grid;gap:8px}
  html body #tela-docs-api .dc-det .btn-row .btn-action{min-height:44px;justify-content:center}

  /* Fluxos da API */
  html body #tela-fluxo-api .fx-grade{grid-template-columns:minmax(0,1fr)}
  html body #tela-fluxo-api .fx-barra{display:grid;grid-template-columns:1fr 1fr;gap:6px}
  html body #tela-fluxo-api .fx-barra select{grid-column:1 / -1;max-width:none;min-height:44px;font-size:16px}
  html body #tela-fluxo-api .fx-barra .btn-action{min-height:40px;padding:6px 8px;font-size:.8rem;justify-content:center}
  html body #tela-fluxo-api .fx-barra [data-acao="foco"]{display:none}
  html body #tela-fluxo-api .fx-sim{grid-column:1 / -1;margin:4px 0;font-size:.9rem}
  html body #tela-fluxo-api .fx-barra [data-acao="executar"]{grid-column:1 / -1;min-height:48px;font-size:1rem}
  html body #tela-fluxo-api .fx-paleta{display:flex;gap:6px;overflow-x:auto;padding:8px;-webkit-overflow-scrolling:touch}
  html body #tela-fluxo-api .fx-paleta .fx-h4,html body #tela-fluxo-api .fx-paleta .vault-hint{display:none}
  html body #tela-fluxo-api .fx-bloco{flex:0 0 auto;width:auto;margin:0;min-height:44px;white-space:nowrap}
  html body #tela-fluxo-api .fx-canvas{height:340px}
  html body #tela-fluxo-api .fx-area{touch-action:pan-x pan-y}
  html body #tela-fluxo-api .fx-no,html body #tela-fluxo-api .fx-porta{touch-action:none}
  html body #tela-fluxo-api .fx-porta{width:26px;height:26px}
  html body #tela-fluxo-api .fx-porta.entrada{left:-14px;top:18px}
  html body #tela-fluxo-api .fx-porta.saida{right:-14px}
  html body #tela-fluxo-api .fx-config{max-height:none}
  html body #tela-fluxo-api .fx-config input,html body #tela-fluxo-api .fx-config select,html body #tela-fluxo-api .fx-config textarea{font-size:16px}
}`;
  document.head.appendChild(st);
})();
