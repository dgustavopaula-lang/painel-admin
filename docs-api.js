/* =====================================================================
   Documentação da API · NexoTerraCore (interna)
   Arquivo independente: injeta "Documentação" no grupo NexoTerraCore.
   Fonte: lista de rotas do código da VPS em 21/11/2026 (rotas-api.txt).
   Detalhe de campos só onde o código foi lido (apps, plantas, conhecimento).
   ===================================================================== */
(function () {
  'use strict';
  const ROTAS = [{"tag": "Sistema", "m": "GET", "p": "/api/health", "r": "Saúde da API (está no ar?)", "auth": "público", "esc": "", "corpo": null, "notas": ""}, {"tag": "Sistema", "m": "GET", "p": "/api/turing/security/health", "r": "Saúde da camada de segurança do Turing", "auth": "token", "esc": "", "corpo": null, "notas": ""}, {"tag": "Sistema", "m": "GET", "p": "/api/control-plane", "r": "Painel de controle: visão geral da organização", "auth": "token", "esc": "control_plane · GET", "corpo": null, "notas": ""}, {"tag": "Autenticação", "m": "POST", "p": "/api/auth/login", "r": "Entrar com e-mail e senha", "auth": "público", "esc": "", "corpo": {"email": "string", "senha": "string"}, "notas": "Tem limite de tentativas (proteção contra força bruta)."}, {"tag": "Autenticação", "m": "POST", "p": "/api/auth/selecionar-fazenda", "r": "Escolher a fazenda depois do login", "auth": "público", "esc": "", "corpo": {"desafio": "string", "fazendaId": "número"}, "notas": "Tem limite de tentativas."}, {"tag": "Autenticação", "m": "GET", "p": "/api/auth/me", "r": "Quem sou eu (usuário da sessão)", "auth": "token", "esc": "", "corpo": null, "notas": ""}, {"tag": "Autenticação", "m": "GET", "p": "/api/auth/fazendas", "r": "Fazendas que o usuário pode acessar", "auth": "token", "esc": "", "corpo": null, "notas": ""}, {"tag": "Autenticação", "m": "POST", "p": "/api/auth/trocar-fazenda", "r": "Trocar a fazenda ativa", "auth": "token", "esc": "", "corpo": {"fazendaId": "número"}, "notas": ""}, {"tag": "Autenticação", "m": "POST", "p": "/api/auth/logout", "r": "Sair (encerra a sessão)", "auth": "token", "esc": "", "corpo": null, "notas": ""}, {"tag": "Catálogo de apps", "m": "GET", "p": "/api/apps", "r": "Lista os apps do ecossistema", "auth": "token", "esc": "apps.read", "corpo": null, "notas": "Filtro opcional: ?tipo=pwa|site|projeto|pessoal"}, {"tag": "Catálogo de apps", "m": "POST", "p": "/api/apps", "r": "Cria um app", "auth": "token", "esc": "apps.write", "corpo": {"nome": "texto*", "url": "https://…*", "categoria": "texto*", "tipo": "pwa|site|projeto|pessoal*", "status": "ativo|em_desenvolvimento|pausado|arquivado", "publico": "true|false", "descricao": "texto"}, "notas": "O slug é gerado a partir do nome."}, {"tag": "Catálogo de apps", "m": "PATCH", "p": "/api/apps/{id}", "r": "Altera campos de um app", "auth": "token", "esc": "apps.write", "corpo": {"nome": "texto", "url": "https://…", "categoria": "texto", "tipo": "…", "status": "…", "publico": "true|false", "descricao": "texto"}, "notas": ""}, {"tag": "Catálogo de apps", "m": "DELETE", "p": "/api/apps/{id}", "r": "Exclui um app (só se estiver arquivado)", "auth": "token", "esc": "apps.write", "corpo": null, "notas": "Responde 409 se o app não estiver arquivado."}, {"tag": "Catálogo de apps", "m": "POST", "p": "/api/apps/verificar", "r": "Testa agora se cada app está no ar", "auth": "token", "esc": "apps.write", "corpo": null, "notas": ""}, {"tag": "Plantas", "m": "GET", "p": "/api/plantas", "r": "Lista o catálogo Plantas do morro", "auth": "token", "esc": "plantas.read", "corpo": null, "notas": ""}, {"tag": "Plantas", "m": "POST", "p": "/api/plantas", "r": "Cadastra uma planta", "auth": "token", "esc": "plantas.write", "corpo": {"nome_popular": "texto*", "nome_cientifico": "texto", "familia": "texto", "parte_usada": "texto", "local_descricao": "texto", "status": "a_identificar|identificada|enviada_pesquisa|descartada", "toxica": "true|false", "alerta": "texto", "uso_tradicional": "texto", "notas": "texto"}, "notas": ""}, {"tag": "Plantas", "m": "PATCH", "p": "/api/plantas/{id}", "r": "Altera uma planta", "auth": "token", "esc": "plantas.write", "corpo": {"…": "os mesmos campos do POST"}, "notas": ""}, {"tag": "Turing · conhecimento", "m": "POST", "p": "/api/turing/conhecimento/ensinar", "r": "Cria um exemplo pendente (rascunho)", "auth": "token", "esc": "turing:training", "corpo": {"area": "texto", "pergunta": "texto", "resposta": "texto", "fonte": "texto"}, "notas": "Nada vira resposta antes de ser aprovado."}, {"tag": "Turing · conhecimento", "m": "GET", "p": "/api/turing/conhecimento/listar", "r": "Lista os exemplos (pendentes, aprovados, rejeitados)", "auth": "token", "esc": "turing:training", "corpo": null, "notas": "Até 1000 itens."}, {"tag": "Turing · conhecimento", "m": "PATCH", "p": "/api/turing/conhecimento/{id}/revisar", "r": "Aprova ou rejeita um exemplo", "auth": "token", "esc": "turing:training", "corpo": null, "notas": ""}, {"tag": "Turing · conhecimento", "m": "GET", "p": "/api/turing/conhecimento/aprovados", "r": "Só os aprovados (o que o Turing responde)", "auth": "token", "esc": "turing:training", "corpo": null, "notas": "Usado pelo conselheiro do Play Farm Agro."}, {"tag": "Turing · treino e segurança", "m": "GET", "p": "/api/turing/training/health", "r": "Saúde do módulo de treino", "auth": "público", "esc": "", "corpo": null, "notas": ""}, {"tag": "Turing · treino e segurança", "m": "POST", "p": "/api/turing/training/classificar", "r": "Classifica um cenário (normal, suspeito, ataque)", "auth": "token", "esc": "", "corpo": null, "notas": ""}, {"tag": "Turing · treino e segurança", "m": "POST", "p": "/api/turing/training/feedback", "r": "Registra correção de uma classificação", "auth": "token", "esc": "", "corpo": null, "notas": ""}, {"tag": "Turing · treino e segurança", "m": "POST", "p": "/api/turing/training/promote", "r": "Promove exemplos revisados", "auth": "token", "esc": "", "corpo": null, "notas": ""}, {"tag": "Turing · treino e segurança", "m": "POST", "p": "/api/turing/publico", "r": "Turing público (congelado)", "auth": "público", "esc": "", "corpo": null, "notas": "Responde 410: rota desativada."}, {"tag": "Turing · treino e segurança", "m": "POST", "p": "/api/assistente/perguntar", "r": "Pergunta ao assistente", "auth": "token", "esc": "", "corpo": {"pergunta": "texto"}, "notas": ""}, {"tag": "Turing · regiões", "m": "GET", "p": "/api/turing/angola/resumo", "r": "Resumo da frente Angola", "auth": "token", "esc": "", "corpo": null, "notas": ""}, {"tag": "Turing · regiões", "m": "GET", "p": "/api/turing/angola/sinais", "r": "Sinais e alertas de Angola", "auth": "token", "esc": "", "corpo": null, "notas": ""}, {"tag": "Turing · regiões", "m": "GET", "p": "/api/turing/centro-oeste/oportunidades", "r": "Oportunidades no Centro-Oeste", "auth": "token", "esc": "", "corpo": null, "notas": ""}, {"tag": "Turing · regiões", "m": "GET", "p": "/api/turing/centro-oeste/resumo", "r": "Resumo do Centro-Oeste", "auth": "token", "esc": "", "corpo": null, "notas": ""}, {"tag": "Imóveis", "m": "GET", "p": "/api/imoveis", "r": "Lista os imóveis", "auth": "token", "esc": "imoveis · GET", "corpo": null, "notas": "Tem limite por chave e medição de consumo."}, {"tag": "Imóveis", "m": "POST", "p": "/api/imoveis", "r": "Cadastra um imóvel", "auth": "token", "esc": "imoveis · POST", "corpo": null, "notas": ""}, {"tag": "Imóveis", "m": "PUT", "p": "/api/imoveis/{id}", "r": "Substitui os dados de um imóvel", "auth": "token", "esc": "imoveis · PUT", "corpo": null, "notas": ""}, {"tag": "Imóveis", "m": "DELETE", "p": "/api/imoveis/{id}", "r": "Exclui um imóvel", "auth": "token", "esc": "imoveis · DELETE", "corpo": null, "notas": ""}, {"tag": "Gestão rural", "m": "GET", "p": "/api/fazendas", "r": "Lista as fazendas", "auth": "token", "esc": "fazendas · GET", "corpo": null, "notas": ""}, {"tag": "Gestão rural", "m": "GET", "p": "/api/maquinas", "r": "Lista as máquinas", "auth": "token", "esc": "maquinas · GET", "corpo": null, "notas": ""}, {"tag": "Gestão rural", "m": "POST", "p": "/api/maquinas", "r": "Cadastra uma máquina", "auth": "token", "esc": "maquinas · POST", "corpo": null, "notas": ""}, {"tag": "Gestão rural", "m": "GET", "p": "/api/maquinas/{id}", "r": "Uma máquina", "auth": "token", "esc": "maquinas · GET", "corpo": null, "notas": ""}, {"tag": "Gestão rural", "m": "PUT", "p": "/api/maquinas/{id}", "r": "Substitui uma máquina", "auth": "token", "esc": "maquinas · PUT", "corpo": null, "notas": ""}, {"tag": "Gestão rural", "m": "DELETE", "p": "/api/maquinas/{id}", "r": "Exclui uma máquina", "auth": "token", "esc": "maquinas · DELETE", "corpo": null, "notas": ""}, {"tag": "Gestão rural", "m": "GET", "p": "/api/financeiro/resumo", "r": "Resumo financeiro", "auth": "token", "esc": "financeiro · GET", "corpo": null, "notas": ""}, {"tag": "Gestão rural", "m": "GET", "p": "/api/financeiro", "r": "Lista lançamentos", "auth": "token", "esc": "financeiro · GET", "corpo": null, "notas": ""}, {"tag": "Gestão rural", "m": "POST", "p": "/api/financeiro", "r": "Cria lançamento", "auth": "token", "esc": "financeiro · POST", "corpo": null, "notas": ""}, {"tag": "Gestão rural", "m": "GET", "p": "/api/financeiro/{id}", "r": "Um lançamento", "auth": "token", "esc": "financeiro · GET", "corpo": null, "notas": ""}, {"tag": "Gestão rural", "m": "PUT", "p": "/api/financeiro/{id}", "r": "Substitui lançamento", "auth": "token", "esc": "financeiro · PUT", "corpo": null, "notas": ""}, {"tag": "Gestão rural", "m": "DELETE", "p": "/api/financeiro/{id}", "r": "Exclui lançamento", "auth": "token", "esc": "financeiro · DELETE", "corpo": null, "notas": ""}, {"tag": "Gestão rural", "m": "GET", "p": "/api/clientes", "r": "Lista clientes", "auth": "token", "esc": "clientes · GET", "corpo": null, "notas": ""}, {"tag": "Gestão rural", "m": "POST", "p": "/api/clientes", "r": "Cadastra cliente", "auth": "token", "esc": "clientes · POST", "corpo": null, "notas": ""}, {"tag": "Gestão rural", "m": "PUT", "p": "/api/clientes/{id}", "r": "Substitui cliente", "auth": "token", "esc": "clientes · PUT", "corpo": null, "notas": ""}, {"tag": "Gestão rural", "m": "DELETE", "p": "/api/clientes/{id}", "r": "Exclui cliente", "auth": "token", "esc": "clientes · DELETE", "corpo": null, "notas": ""}, {"tag": "AgroConex", "m": "GET", "p": "/api/agroconex/status", "r": "Estado do módulo AgroConex", "auth": "token", "esc": "", "corpo": null, "notas": ""}, {"tag": "AgroConex", "m": "GET", "p": "/api/agroconex/sync/health", "r": "Saúde da sincronização", "auth": "token", "esc": "", "corpo": null, "notas": ""}, {"tag": "AgroConex", "m": "POST", "p": "/api/agroconex/sync/registros", "r": "Envia registros de campo (offline → API)", "auth": "token", "esc": "", "corpo": null, "notas": ""}, {"tag": "AgroConex", "m": "GET", "p": "/api/agroconex/sync/registros", "r": "Lê registros sincronizados", "auth": "token", "esc": "", "corpo": null, "notas": ""}, {"tag": "WhatsApp", "m": "GET", "p": "/api/whatsapp/health", "r": "Saúde da integração", "auth": "público", "esc": "", "corpo": null, "notas": ""}, {"tag": "WhatsApp", "m": "GET", "p": "/api/whatsapp/webhook", "r": "Verificação do webhook (feita pelo provedor)", "auth": "público", "esc": "", "corpo": null, "notas": ""}, {"tag": "WhatsApp", "m": "POST", "p": "/api/whatsapp/webhook", "r": "Recebe mensagens do provedor (webhook)", "auth": "público", "esc": "", "corpo": null, "notas": "Quem chama é o WhatsApp, não você."}, {"tag": "A confirmar (montagem não encontrada)", "m": "GET", "p": "(prefixo?)/sentinel2/latest", "r": "Última imagem Sentinel-2 (NDVI)", "auth": "token", "esc": "", "corpo": null, "notas": "O arquivo de rotas existe, mas o grep não achou onde ele é montado no server.js. Confirmar o prefixo antes de usar."}, {"tag": "A confirmar (montagem não encontrada)", "m": "GET", "p": "(prefixo?)/me", "r": "NTCoins: minha carteira", "auth": "token", "esc": "", "corpo": null, "notas": "O arquivo de rotas existe, mas o grep não achou onde ele é montado no server.js. Confirmar o prefixo antes de usar."}, {"tag": "A confirmar (montagem não encontrada)", "m": "GET", "p": "(prefixo?)/saldo", "r": "NTCoins: saldo", "auth": "token", "esc": "", "corpo": null, "notas": "O arquivo de rotas existe, mas o grep não achou onde ele é montado no server.js. Confirmar o prefixo antes de usar."}, {"tag": "A confirmar (montagem não encontrada)", "m": "GET", "p": "(prefixo?)/extrato", "r": "NTCoins: extrato", "auth": "token", "esc": "", "corpo": null, "notas": "O arquivo de rotas existe, mas o grep não achou onde ele é montado no server.js. Confirmar o prefixo antes de usar."}, {"tag": "A confirmar (montagem não encontrada)", "m": "GET", "p": "(prefixo?)/catalogo", "r": "NTCoins: catálogo", "auth": "token", "esc": "", "corpo": null, "notas": "O arquivo de rotas existe, mas o grep não achou onde ele é montado no server.js. Confirmar o prefixo antes de usar."}, {"tag": "A confirmar (montagem não encontrada)", "m": "POST", "p": "(prefixo?)/consumir", "r": "NTCoins: consumir créditos", "auth": "token", "esc": "", "corpo": null, "notas": "O arquivo de rotas existe, mas o grep não achou onde ele é montado no server.js. Confirmar o prefixo antes de usar."}, {"tag": "A confirmar (montagem não encontrada)", "m": "GET", "p": "(prefixo?)/pacotes", "r": "NTCoins: pacotes", "auth": "token", "esc": "", "corpo": null, "notas": "O arquivo de rotas existe, mas o grep não achou onde ele é montado no server.js. Confirmar o prefixo antes de usar."}, {"tag": "A confirmar (montagem não encontrada)", "m": "POST", "p": "(prefixo?)/comprar", "r": "NTCoins: comprar", "auth": "token", "esc": "", "corpo": null, "notas": "O arquivo de rotas existe, mas o grep não achou onde ele é montado no server.js. Confirmar o prefixo antes de usar."}, {"tag": "A confirmar (montagem não encontrada)", "m": "GET", "p": "(prefixo?)/compras", "r": "NTCoins: compras", "auth": "token", "esc": "", "corpo": null, "notas": "O arquivo de rotas existe, mas o grep não achou onde ele é montado no server.js. Confirmar o prefixo antes de usar."}, {"tag": "A confirmar (montagem não encontrada)", "m": "POST", "p": "(prefixo?)/criar", "r": "NTCoins PayPal: criar pedido", "auth": "token", "esc": "", "corpo": null, "notas": "O arquivo de rotas existe, mas o grep não achou onde ele é montado no server.js. Confirmar o prefixo antes de usar."}, {"tag": "A confirmar (montagem não encontrada)", "m": "POST", "p": "(prefixo?)/capturar", "r": "NTCoins PayPal: capturar", "auth": "token", "esc": "", "corpo": null, "notas": "O arquivo de rotas existe, mas o grep não achou onde ele é montado no server.js. Confirmar o prefixo antes de usar."}, {"tag": "A confirmar (montagem não encontrada)", "m": "GET", "p": "(prefixo?)/checkout/iniciar", "r": "NTCoins: iniciar checkout", "auth": "token", "esc": "", "corpo": null, "notas": "O arquivo de rotas existe, mas o grep não achou onde ele é montado no server.js. Confirmar o prefixo antes de usar."}, {"tag": "A confirmar (montagem não encontrada)", "m": "GET", "p": "(prefixo?)/checkout/retorno", "r": "NTCoins: retorno do checkout", "auth": "token", "esc": "", "corpo": null, "notas": "O arquivo de rotas existe, mas o grep não achou onde ele é montado no server.js. Confirmar o prefixo antes de usar."}, {"tag": "A confirmar (montagem não encontrada)", "m": "GET", "p": "(prefixo?)/", "r": "Smart stations: lista", "auth": "token", "esc": "", "corpo": null, "notas": "O arquivo de rotas existe, mas o grep não achou onde ele é montado no server.js. Confirmar o prefixo antes de usar."}, {"tag": "A confirmar (montagem não encontrada)", "m": "GET", "p": "(prefixo?)/{id}/medicoes", "r": "Smart stations: medições", "auth": "token", "esc": "", "corpo": null, "notas": "O arquivo de rotas existe, mas o grep não achou onde ele é montado no server.js. Confirmar o prefixo antes de usar."}];
  const OPENAPI = {
  "openapi": "3.0.3",
  "info": {
    "title": "NexoTerraCore API",
    "version": "2026-11-21",
    "description": "Documento interno. Gerado do código em 21/11/2026 (lista de rotas). Campos detalhados só para apps, plantas e conhecimento do Turing; o resto a completar."
  },
  "servers": [
    {
      "url": "https://api.gustavopaulasantos.com.br"
    }
  ],
  "components": {
    "securitySchemes": {
      "bearer": {
        "type": "http",
        "scheme": "bearer",
        "description": "API Key ntc_live_… ou token de sessão"
      }
    }
  },
  "security": [
    {
      "bearer": []
    }
  ],
  "paths": {
    "/api/health": {
      "get": {
        "tags": [
          "Sistema"
        ],
        "summary": "Saúde da API (está no ar?)",
        "security": [],
        "responses": {
          "200": {
            "description": "OK"
          }
        }
      }
    },
    "/api/turing/security/health": {
      "get": {
        "tags": [
          "Sistema"
        ],
        "summary": "Saúde da camada de segurança do Turing",
        "responses": {
          "200": {
            "description": "OK"
          },
          "400": {
            "description": "Dado inválido"
          },
          "401": {
            "description": "Sem token"
          },
          "403": {
            "description": "Sem escopo"
          }
        }
      }
    },
    "/api/control-plane": {
      "get": {
        "tags": [
          "Sistema"
        ],
        "summary": "Painel de controle: visão geral da organização",
        "x-escopo": "control_plane · GET",
        "responses": {
          "200": {
            "description": "OK"
          },
          "400": {
            "description": "Dado inválido"
          },
          "401": {
            "description": "Sem token"
          },
          "403": {
            "description": "Sem escopo"
          }
        }
      }
    },
    "/api/auth/login": {
      "post": {
        "tags": [
          "Autenticação"
        ],
        "summary": "Entrar com e-mail e senha",
        "security": [],
        "description": "Tem limite de tentativas (proteção contra força bruta).",
        "requestBody": {
          "content": {
            "application/json": {
              "example": {
                "email": "string",
                "senha": "string"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "OK"
          }
        }
      }
    },
    "/api/auth/selecionar-fazenda": {
      "post": {
        "tags": [
          "Autenticação"
        ],
        "summary": "Escolher a fazenda depois do login",
        "security": [],
        "description": "Tem limite de tentativas.",
        "requestBody": {
          "content": {
            "application/json": {
              "example": {
                "desafio": "string",
                "fazendaId": "número"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "OK"
          }
        }
      }
    },
    "/api/auth/me": {
      "get": {
        "tags": [
          "Autenticação"
        ],
        "summary": "Quem sou eu (usuário da sessão)",
        "responses": {
          "200": {
            "description": "OK"
          },
          "400": {
            "description": "Dado inválido"
          },
          "401": {
            "description": "Sem token"
          },
          "403": {
            "description": "Sem escopo"
          }
        }
      }
    },
    "/api/auth/fazendas": {
      "get": {
        "tags": [
          "Autenticação"
        ],
        "summary": "Fazendas que o usuário pode acessar",
        "responses": {
          "200": {
            "description": "OK"
          },
          "400": {
            "description": "Dado inválido"
          },
          "401": {
            "description": "Sem token"
          },
          "403": {
            "description": "Sem escopo"
          }
        }
      }
    },
    "/api/auth/trocar-fazenda": {
      "post": {
        "tags": [
          "Autenticação"
        ],
        "summary": "Trocar a fazenda ativa",
        "requestBody": {
          "content": {
            "application/json": {
              "example": {
                "fazendaId": "número"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "OK"
          },
          "400": {
            "description": "Dado inválido"
          },
          "401": {
            "description": "Sem token"
          },
          "403": {
            "description": "Sem escopo"
          }
        }
      }
    },
    "/api/auth/logout": {
      "post": {
        "tags": [
          "Autenticação"
        ],
        "summary": "Sair (encerra a sessão)",
        "responses": {
          "200": {
            "description": "OK"
          },
          "400": {
            "description": "Dado inválido"
          },
          "401": {
            "description": "Sem token"
          },
          "403": {
            "description": "Sem escopo"
          }
        }
      }
    },
    "/api/apps": {
      "get": {
        "tags": [
          "Catálogo de apps"
        ],
        "summary": "Lista os apps do ecossistema",
        "x-escopo": "apps.read",
        "description": "Filtro opcional: ?tipo=pwa|site|projeto|pessoal",
        "responses": {
          "200": {
            "description": "OK"
          },
          "400": {
            "description": "Dado inválido"
          },
          "401": {
            "description": "Sem token"
          },
          "403": {
            "description": "Sem escopo"
          }
        }
      },
      "post": {
        "tags": [
          "Catálogo de apps"
        ],
        "summary": "Cria um app",
        "x-escopo": "apps.write",
        "description": "O slug é gerado a partir do nome.",
        "requestBody": {
          "content": {
            "application/json": {
              "example": {
                "nome": "texto*",
                "url": "https://…*",
                "categoria": "texto*",
                "tipo": "pwa|site|projeto|pessoal*",
                "status": "ativo|em_desenvolvimento|pausado|arquivado",
                "publico": "true|false",
                "descricao": "texto"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "OK"
          },
          "400": {
            "description": "Dado inválido"
          },
          "401": {
            "description": "Sem token"
          },
          "403": {
            "description": "Sem escopo"
          }
        }
      }
    },
    "/api/apps/{id}": {
      "patch": {
        "tags": [
          "Catálogo de apps"
        ],
        "summary": "Altera campos de um app",
        "x-escopo": "apps.write",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "integer"
            }
          }
        ],
        "requestBody": {
          "content": {
            "application/json": {
              "example": {
                "nome": "texto",
                "url": "https://…",
                "categoria": "texto",
                "tipo": "…",
                "status": "…",
                "publico": "true|false",
                "descricao": "texto"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "OK"
          },
          "400": {
            "description": "Dado inválido"
          },
          "401": {
            "description": "Sem token"
          },
          "403": {
            "description": "Sem escopo"
          }
        }
      },
      "delete": {
        "tags": [
          "Catálogo de apps"
        ],
        "summary": "Exclui um app (só se estiver arquivado)",
        "x-escopo": "apps.write",
        "description": "Responde 409 se o app não estiver arquivado.",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "integer"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "OK"
          },
          "400": {
            "description": "Dado inválido"
          },
          "401": {
            "description": "Sem token"
          },
          "403": {
            "description": "Sem escopo"
          }
        }
      }
    },
    "/api/apps/verificar": {
      "post": {
        "tags": [
          "Catálogo de apps"
        ],
        "summary": "Testa agora se cada app está no ar",
        "x-escopo": "apps.write",
        "responses": {
          "200": {
            "description": "OK"
          },
          "400": {
            "description": "Dado inválido"
          },
          "401": {
            "description": "Sem token"
          },
          "403": {
            "description": "Sem escopo"
          }
        }
      }
    },
    "/api/plantas": {
      "get": {
        "tags": [
          "Plantas"
        ],
        "summary": "Lista o catálogo Plantas do morro",
        "x-escopo": "plantas.read",
        "responses": {
          "200": {
            "description": "OK"
          },
          "400": {
            "description": "Dado inválido"
          },
          "401": {
            "description": "Sem token"
          },
          "403": {
            "description": "Sem escopo"
          }
        }
      },
      "post": {
        "tags": [
          "Plantas"
        ],
        "summary": "Cadastra uma planta",
        "x-escopo": "plantas.write",
        "requestBody": {
          "content": {
            "application/json": {
              "example": {
                "nome_popular": "texto*",
                "nome_cientifico": "texto",
                "familia": "texto",
                "parte_usada": "texto",
                "local_descricao": "texto",
                "status": "a_identificar|identificada|enviada_pesquisa|descartada",
                "toxica": "true|false",
                "alerta": "texto",
                "uso_tradicional": "texto",
                "notas": "texto"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "OK"
          },
          "400": {
            "description": "Dado inválido"
          },
          "401": {
            "description": "Sem token"
          },
          "403": {
            "description": "Sem escopo"
          }
        }
      }
    },
    "/api/plantas/{id}": {
      "patch": {
        "tags": [
          "Plantas"
        ],
        "summary": "Altera uma planta",
        "x-escopo": "plantas.write",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "integer"
            }
          }
        ],
        "requestBody": {
          "content": {
            "application/json": {
              "example": {
                "…": "os mesmos campos do POST"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "OK"
          },
          "400": {
            "description": "Dado inválido"
          },
          "401": {
            "description": "Sem token"
          },
          "403": {
            "description": "Sem escopo"
          }
        }
      }
    },
    "/api/turing/conhecimento/ensinar": {
      "post": {
        "tags": [
          "Turing · conhecimento"
        ],
        "summary": "Cria um exemplo pendente (rascunho)",
        "x-escopo": "turing:training",
        "description": "Nada vira resposta antes de ser aprovado.",
        "requestBody": {
          "content": {
            "application/json": {
              "example": {
                "area": "texto",
                "pergunta": "texto",
                "resposta": "texto",
                "fonte": "texto"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "OK"
          },
          "400": {
            "description": "Dado inválido"
          },
          "401": {
            "description": "Sem token"
          },
          "403": {
            "description": "Sem escopo"
          }
        }
      }
    },
    "/api/turing/conhecimento/listar": {
      "get": {
        "tags": [
          "Turing · conhecimento"
        ],
        "summary": "Lista os exemplos (pendentes, aprovados, rejeitados)",
        "x-escopo": "turing:training",
        "description": "Até 1000 itens.",
        "responses": {
          "200": {
            "description": "OK"
          },
          "400": {
            "description": "Dado inválido"
          },
          "401": {
            "description": "Sem token"
          },
          "403": {
            "description": "Sem escopo"
          }
        }
      }
    },
    "/api/turing/conhecimento/{id}/revisar": {
      "patch": {
        "tags": [
          "Turing · conhecimento"
        ],
        "summary": "Aprova ou rejeita um exemplo",
        "x-escopo": "turing:training",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "integer"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "OK"
          },
          "400": {
            "description": "Dado inválido"
          },
          "401": {
            "description": "Sem token"
          },
          "403": {
            "description": "Sem escopo"
          }
        }
      }
    },
    "/api/turing/conhecimento/aprovados": {
      "get": {
        "tags": [
          "Turing · conhecimento"
        ],
        "summary": "Só os aprovados (o que o Turing responde)",
        "x-escopo": "turing:training",
        "description": "Usado pelo conselheiro do Play Farm Agro.",
        "responses": {
          "200": {
            "description": "OK"
          },
          "400": {
            "description": "Dado inválido"
          },
          "401": {
            "description": "Sem token"
          },
          "403": {
            "description": "Sem escopo"
          }
        }
      }
    },
    "/api/turing/training/health": {
      "get": {
        "tags": [
          "Turing · treino e segurança"
        ],
        "summary": "Saúde do módulo de treino",
        "security": [],
        "responses": {
          "200": {
            "description": "OK"
          }
        }
      }
    },
    "/api/turing/training/classificar": {
      "post": {
        "tags": [
          "Turing · treino e segurança"
        ],
        "summary": "Classifica um cenário (normal, suspeito, ataque)",
        "responses": {
          "200": {
            "description": "OK"
          },
          "400": {
            "description": "Dado inválido"
          },
          "401": {
            "description": "Sem token"
          },
          "403": {
            "description": "Sem escopo"
          }
        }
      }
    },
    "/api/turing/training/feedback": {
      "post": {
        "tags": [
          "Turing · treino e segurança"
        ],
        "summary": "Registra correção de uma classificação",
        "responses": {
          "200": {
            "description": "OK"
          },
          "400": {
            "description": "Dado inválido"
          },
          "401": {
            "description": "Sem token"
          },
          "403": {
            "description": "Sem escopo"
          }
        }
      }
    },
    "/api/turing/training/promote": {
      "post": {
        "tags": [
          "Turing · treino e segurança"
        ],
        "summary": "Promove exemplos revisados",
        "responses": {
          "200": {
            "description": "OK"
          },
          "400": {
            "description": "Dado inválido"
          },
          "401": {
            "description": "Sem token"
          },
          "403": {
            "description": "Sem escopo"
          }
        }
      }
    },
    "/api/turing/publico": {
      "post": {
        "tags": [
          "Turing · treino e segurança"
        ],
        "summary": "Turing público (congelado)",
        "security": [],
        "description": "Responde 410: rota desativada.",
        "responses": {
          "200": {
            "description": "OK"
          }
        }
      }
    },
    "/api/assistente/perguntar": {
      "post": {
        "tags": [
          "Turing · treino e segurança"
        ],
        "summary": "Pergunta ao assistente",
        "requestBody": {
          "content": {
            "application/json": {
              "example": {
                "pergunta": "texto"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "OK"
          },
          "400": {
            "description": "Dado inválido"
          },
          "401": {
            "description": "Sem token"
          },
          "403": {
            "description": "Sem escopo"
          }
        }
      }
    },
    "/api/turing/angola/resumo": {
      "get": {
        "tags": [
          "Turing · regiões"
        ],
        "summary": "Resumo da frente Angola",
        "responses": {
          "200": {
            "description": "OK"
          },
          "400": {
            "description": "Dado inválido"
          },
          "401": {
            "description": "Sem token"
          },
          "403": {
            "description": "Sem escopo"
          }
        }
      }
    },
    "/api/turing/angola/sinais": {
      "get": {
        "tags": [
          "Turing · regiões"
        ],
        "summary": "Sinais e alertas de Angola",
        "responses": {
          "200": {
            "description": "OK"
          },
          "400": {
            "description": "Dado inválido"
          },
          "401": {
            "description": "Sem token"
          },
          "403": {
            "description": "Sem escopo"
          }
        }
      }
    },
    "/api/turing/centro-oeste/oportunidades": {
      "get": {
        "tags": [
          "Turing · regiões"
        ],
        "summary": "Oportunidades no Centro-Oeste",
        "responses": {
          "200": {
            "description": "OK"
          },
          "400": {
            "description": "Dado inválido"
          },
          "401": {
            "description": "Sem token"
          },
          "403": {
            "description": "Sem escopo"
          }
        }
      }
    },
    "/api/turing/centro-oeste/resumo": {
      "get": {
        "tags": [
          "Turing · regiões"
        ],
        "summary": "Resumo do Centro-Oeste",
        "responses": {
          "200": {
            "description": "OK"
          },
          "400": {
            "description": "Dado inválido"
          },
          "401": {
            "description": "Sem token"
          },
          "403": {
            "description": "Sem escopo"
          }
        }
      }
    },
    "/api/imoveis": {
      "get": {
        "tags": [
          "Imóveis"
        ],
        "summary": "Lista os imóveis",
        "x-escopo": "imoveis · GET",
        "description": "Tem limite por chave e medição de consumo.",
        "responses": {
          "200": {
            "description": "OK"
          },
          "400": {
            "description": "Dado inválido"
          },
          "401": {
            "description": "Sem token"
          },
          "403": {
            "description": "Sem escopo"
          }
        }
      },
      "post": {
        "tags": [
          "Imóveis"
        ],
        "summary": "Cadastra um imóvel",
        "x-escopo": "imoveis · POST",
        "responses": {
          "200": {
            "description": "OK"
          },
          "400": {
            "description": "Dado inválido"
          },
          "401": {
            "description": "Sem token"
          },
          "403": {
            "description": "Sem escopo"
          }
        }
      }
    },
    "/api/imoveis/{id}": {
      "put": {
        "tags": [
          "Imóveis"
        ],
        "summary": "Substitui os dados de um imóvel",
        "x-escopo": "imoveis · PUT",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "integer"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "OK"
          },
          "400": {
            "description": "Dado inválido"
          },
          "401": {
            "description": "Sem token"
          },
          "403": {
            "description": "Sem escopo"
          }
        }
      },
      "delete": {
        "tags": [
          "Imóveis"
        ],
        "summary": "Exclui um imóvel",
        "x-escopo": "imoveis · DELETE",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "integer"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "OK"
          },
          "400": {
            "description": "Dado inválido"
          },
          "401": {
            "description": "Sem token"
          },
          "403": {
            "description": "Sem escopo"
          }
        }
      }
    },
    "/api/fazendas": {
      "get": {
        "tags": [
          "Gestão rural"
        ],
        "summary": "Lista as fazendas",
        "x-escopo": "fazendas · GET",
        "responses": {
          "200": {
            "description": "OK"
          },
          "400": {
            "description": "Dado inválido"
          },
          "401": {
            "description": "Sem token"
          },
          "403": {
            "description": "Sem escopo"
          }
        }
      }
    },
    "/api/maquinas": {
      "get": {
        "tags": [
          "Gestão rural"
        ],
        "summary": "Lista as máquinas",
        "x-escopo": "maquinas · GET",
        "responses": {
          "200": {
            "description": "OK"
          },
          "400": {
            "description": "Dado inválido"
          },
          "401": {
            "description": "Sem token"
          },
          "403": {
            "description": "Sem escopo"
          }
        }
      },
      "post": {
        "tags": [
          "Gestão rural"
        ],
        "summary": "Cadastra uma máquina",
        "x-escopo": "maquinas · POST",
        "responses": {
          "200": {
            "description": "OK"
          },
          "400": {
            "description": "Dado inválido"
          },
          "401": {
            "description": "Sem token"
          },
          "403": {
            "description": "Sem escopo"
          }
        }
      }
    },
    "/api/maquinas/{id}": {
      "get": {
        "tags": [
          "Gestão rural"
        ],
        "summary": "Uma máquina",
        "x-escopo": "maquinas · GET",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "integer"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "OK"
          },
          "400": {
            "description": "Dado inválido"
          },
          "401": {
            "description": "Sem token"
          },
          "403": {
            "description": "Sem escopo"
          }
        }
      },
      "put": {
        "tags": [
          "Gestão rural"
        ],
        "summary": "Substitui uma máquina",
        "x-escopo": "maquinas · PUT",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "integer"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "OK"
          },
          "400": {
            "description": "Dado inválido"
          },
          "401": {
            "description": "Sem token"
          },
          "403": {
            "description": "Sem escopo"
          }
        }
      },
      "delete": {
        "tags": [
          "Gestão rural"
        ],
        "summary": "Exclui uma máquina",
        "x-escopo": "maquinas · DELETE",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "integer"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "OK"
          },
          "400": {
            "description": "Dado inválido"
          },
          "401": {
            "description": "Sem token"
          },
          "403": {
            "description": "Sem escopo"
          }
        }
      }
    },
    "/api/financeiro/resumo": {
      "get": {
        "tags": [
          "Gestão rural"
        ],
        "summary": "Resumo financeiro",
        "x-escopo": "financeiro · GET",
        "responses": {
          "200": {
            "description": "OK"
          },
          "400": {
            "description": "Dado inválido"
          },
          "401": {
            "description": "Sem token"
          },
          "403": {
            "description": "Sem escopo"
          }
        }
      }
    },
    "/api/financeiro": {
      "get": {
        "tags": [
          "Gestão rural"
        ],
        "summary": "Lista lançamentos",
        "x-escopo": "financeiro · GET",
        "responses": {
          "200": {
            "description": "OK"
          },
          "400": {
            "description": "Dado inválido"
          },
          "401": {
            "description": "Sem token"
          },
          "403": {
            "description": "Sem escopo"
          }
        }
      },
      "post": {
        "tags": [
          "Gestão rural"
        ],
        "summary": "Cria lançamento",
        "x-escopo": "financeiro · POST",
        "responses": {
          "200": {
            "description": "OK"
          },
          "400": {
            "description": "Dado inválido"
          },
          "401": {
            "description": "Sem token"
          },
          "403": {
            "description": "Sem escopo"
          }
        }
      }
    },
    "/api/financeiro/{id}": {
      "get": {
        "tags": [
          "Gestão rural"
        ],
        "summary": "Um lançamento",
        "x-escopo": "financeiro · GET",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "integer"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "OK"
          },
          "400": {
            "description": "Dado inválido"
          },
          "401": {
            "description": "Sem token"
          },
          "403": {
            "description": "Sem escopo"
          }
        }
      },
      "put": {
        "tags": [
          "Gestão rural"
        ],
        "summary": "Substitui lançamento",
        "x-escopo": "financeiro · PUT",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "integer"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "OK"
          },
          "400": {
            "description": "Dado inválido"
          },
          "401": {
            "description": "Sem token"
          },
          "403": {
            "description": "Sem escopo"
          }
        }
      },
      "delete": {
        "tags": [
          "Gestão rural"
        ],
        "summary": "Exclui lançamento",
        "x-escopo": "financeiro · DELETE",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "integer"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "OK"
          },
          "400": {
            "description": "Dado inválido"
          },
          "401": {
            "description": "Sem token"
          },
          "403": {
            "description": "Sem escopo"
          }
        }
      }
    },
    "/api/clientes": {
      "get": {
        "tags": [
          "Gestão rural"
        ],
        "summary": "Lista clientes",
        "x-escopo": "clientes · GET",
        "responses": {
          "200": {
            "description": "OK"
          },
          "400": {
            "description": "Dado inválido"
          },
          "401": {
            "description": "Sem token"
          },
          "403": {
            "description": "Sem escopo"
          }
        }
      },
      "post": {
        "tags": [
          "Gestão rural"
        ],
        "summary": "Cadastra cliente",
        "x-escopo": "clientes · POST",
        "responses": {
          "200": {
            "description": "OK"
          },
          "400": {
            "description": "Dado inválido"
          },
          "401": {
            "description": "Sem token"
          },
          "403": {
            "description": "Sem escopo"
          }
        }
      }
    },
    "/api/clientes/{id}": {
      "put": {
        "tags": [
          "Gestão rural"
        ],
        "summary": "Substitui cliente",
        "x-escopo": "clientes · PUT",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "integer"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "OK"
          },
          "400": {
            "description": "Dado inválido"
          },
          "401": {
            "description": "Sem token"
          },
          "403": {
            "description": "Sem escopo"
          }
        }
      },
      "delete": {
        "tags": [
          "Gestão rural"
        ],
        "summary": "Exclui cliente",
        "x-escopo": "clientes · DELETE",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "integer"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "OK"
          },
          "400": {
            "description": "Dado inválido"
          },
          "401": {
            "description": "Sem token"
          },
          "403": {
            "description": "Sem escopo"
          }
        }
      }
    },
    "/api/agroconex/status": {
      "get": {
        "tags": [
          "AgroConex"
        ],
        "summary": "Estado do módulo AgroConex",
        "responses": {
          "200": {
            "description": "OK"
          },
          "400": {
            "description": "Dado inválido"
          },
          "401": {
            "description": "Sem token"
          },
          "403": {
            "description": "Sem escopo"
          }
        }
      }
    },
    "/api/agroconex/sync/health": {
      "get": {
        "tags": [
          "AgroConex"
        ],
        "summary": "Saúde da sincronização",
        "responses": {
          "200": {
            "description": "OK"
          },
          "400": {
            "description": "Dado inválido"
          },
          "401": {
            "description": "Sem token"
          },
          "403": {
            "description": "Sem escopo"
          }
        }
      }
    },
    "/api/agroconex/sync/registros": {
      "post": {
        "tags": [
          "AgroConex"
        ],
        "summary": "Envia registros de campo (offline → API)",
        "responses": {
          "200": {
            "description": "OK"
          },
          "400": {
            "description": "Dado inválido"
          },
          "401": {
            "description": "Sem token"
          },
          "403": {
            "description": "Sem escopo"
          }
        }
      },
      "get": {
        "tags": [
          "AgroConex"
        ],
        "summary": "Lê registros sincronizados",
        "responses": {
          "200": {
            "description": "OK"
          },
          "400": {
            "description": "Dado inválido"
          },
          "401": {
            "description": "Sem token"
          },
          "403": {
            "description": "Sem escopo"
          }
        }
      }
    },
    "/api/whatsapp/health": {
      "get": {
        "tags": [
          "WhatsApp"
        ],
        "summary": "Saúde da integração",
        "security": [],
        "responses": {
          "200": {
            "description": "OK"
          }
        }
      }
    },
    "/api/whatsapp/webhook": {
      "get": {
        "tags": [
          "WhatsApp"
        ],
        "summary": "Verificação do webhook (feita pelo provedor)",
        "security": [],
        "responses": {
          "200": {
            "description": "OK"
          }
        }
      },
      "post": {
        "tags": [
          "WhatsApp"
        ],
        "summary": "Recebe mensagens do provedor (webhook)",
        "security": [],
        "description": "Quem chama é o WhatsApp, não você.",
        "responses": {
          "200": {
            "description": "OK"
          }
        }
      }
    }
  }
};
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const COR = { GET: '#1d9e75', POST: '#378add', PATCH: '#ba7517', PUT: '#7f77dd', DELETE: '#e24b4a' };
  let aberto = null;

  function desenhar() {
    const q = (document.getElementById('dc-busca').value || '').toLowerCase();
    const met = document.getElementById('dc-metodo').value;
    const lista = ROTAS.map((r, i) => Object.assign({ i }, r)).filter(r =>
      (!met || r.m === met) && (!q || [r.p, r.r, r.tag, r.esc].some(v => String(v || '').toLowerCase().includes(q))));
    const tags = [...new Set(lista.map(r => r.tag))];
    document.getElementById('dc-total').textContent = lista.length + ' de ' + ROTAS.length + ' rotas';
    document.getElementById('dc-lista').innerHTML = tags.map(t => `
      <section class="dc-grupo"><h3>${esc(t)} <small>${lista.filter(r => r.tag === t).length}</small></h3>
      ${lista.filter(r => r.tag === t).map(r => `
        <div class="dc-rota ${aberto === r.i ? 'aberta' : ''}" data-i="${r.i}">
          <button class="dc-linha" data-abrir="${r.i}" aria-expanded="${aberto === r.i}">
            <span class="dc-m" style="background:${COR[r.m] || '#888'}">${r.m}</span>
            <code>${esc(r.p)}</code><span class="dc-r">${esc(r.r)}</span>
            <span class="dc-auth ${r.auth === 'público' ? 'pub' : ''}">${r.auth === 'público' ? 'público' : (r.esc ? esc(r.esc) : 'token')}</span>
          </button>
          ${aberto === r.i ? detalhe(r) : ''}
        </div>`).join('')}</section>`).join('') || '<p class="vault-hint">Nenhuma rota com esse filtro.</p>';
  }

  function detalhe(r) {
    const temPrefixo = !r.p.startsWith('(prefixo?)');
    const corpo = r.corpo ? `<h4>Corpo (JSON)</h4><pre class="dc-pre">${esc(JSON.stringify(r.corpo, null, 2))}</pre><p class="vault-hint">* = obrigatório</p>` : '';
    return `<div class="dc-det">
      <p><strong>O que faz:</strong> ${esc(r.r)}.</p>
      <p><strong>Autenticação:</strong> ${r.auth === 'público' ? 'não precisa de token.' : 'cabeçalho <code>Authorization: Bearer &lt;token&gt;</code>' + (r.esc ? ' com permissão <code>' + esc(r.esc) + '</code>.' : '.')}</p>
      ${r.notas ? `<p><strong>Atenção:</strong> ${esc(r.notas)}</p>` : ''}
      ${corpo}
      <h4>Respostas comuns</h4>
      <p class="dc-codes"><span>200 ok</span>${r.auth === 'público' ? '' : '<span>401 sem token</span><span>403 sem permissão</span>'}${r.corpo ? '<span>400 dado inválido</span>' : ''}${r.p.includes('{id}') ? '<span>404 não existe</span>' : ''}</p>
      <div class="btn-row">
        ${temPrefixo ? `<button class="btn-action" data-testar="${r.i}"><i class="ph ph-flow-arrow"></i> Testar nos Fluxos</button>` : ''}
        <button class="btn-action secondary" data-copiar="${r.i}"><i class="ph ph-copy"></i> Copiar caminho</button>
      </div>
      ${r.m !== 'GET' && temPrefixo ? '<p class="vault-hint">Nos Fluxos, o Modo simulação impede que este método altere dados.</p>' : ''}
      ${r.p.includes('{id}') ? '<p class="vault-hint">Nos Fluxos, troque o 1 no caminho pelo id real.</p>' : ''}
    </div>`;
  }

  function montar() {
    const grupo = document.querySelector('details.nav-group[data-grupo="NexoTerraCore"]');
    if (grupo && !document.getElementById('nav-docs-api')) {
      const b = document.createElement('button');
      b.className = 'nav-item'; b.id = 'nav-docs-api';
      b.setAttribute('onclick', "abrirTela('tela-docs-api')");
      b.innerHTML = '<i class="ph ph-book-open-text"></i> Documentação <em class="nav-badge api">API</em>';
      grupo.appendChild(b);
    }
    const tela = document.createElement('div');
    tela.id = 'tela-docs-api'; tela.className = 'tela-interna';
    tela.innerHTML = `
      <p class="vault-hint"><i class="ph ph-info"></i> Documento interno da NexoTerraCore API, gerado do código em 21/11/2026. Campos detalhados em Apps, Plantas e Turing · conhecimento; nas demais rotas, só método, caminho e permissão, por enquanto.</p>
      <div class="dc-barra">
        <input id="dc-busca" class="form-control" placeholder="Buscar rota, palavra ou permissão…">
        <select id="dc-metodo" class="form-control"><option value="">Todos os métodos</option><option>GET</option><option>POST</option><option>PATCH</option><option>PUT</option><option>DELETE</option></select>
        <span id="dc-total" class="dc-total"></span>
        <button class="btn-action secondary" id="dc-baixar"><i class="ph ph-download-simple"></i> Baixar openapi.json</button>
      </div>
      <div class="dc-legenda">${Object.entries(COR).map(([m, c]) => `<span class="dc-m" style="background:${c}">${m}</span>`).join('')}<span class="vault-hint">GET lê · POST cria · PATCH altera parte · PUT substitui · DELETE apaga</span></div>
      <div id="dc-lista"></div>`;
    const ref = document.getElementById('tela-api') || document.querySelector('.tela-interna');
    if (ref && ref.parentNode) ref.parentNode.appendChild(tela); else document.body.appendChild(tela);
    tela.querySelector('#dc-busca').addEventListener('input', desenhar);
    tela.querySelector('#dc-metodo').addEventListener('change', desenhar);
    tela.querySelector('#dc-baixar').addEventListener('click', () => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([JSON.stringify(OPENAPI, null, 2)], { type: 'application/json' }));
      a.download = 'openapi.json'; a.click(); URL.revokeObjectURL(a.href);
    });
    tela.addEventListener('click', ev => {
      const ab = ev.target.closest('[data-abrir]');
      if (ab) { const i = Number(ab.dataset.abrir); aberto = aberto === i ? null : i; desenhar(); return; }
      const t = ev.target.closest('[data-testar]');
      if (t) {
        const r = ROTAS[Number(t.dataset.testar)];
        const caminho = r.p.replace('{id}', '1');
        if (typeof window.fluxoApiNovo === 'function') window.fluxoApiNovo(r.m, caminho, 'Teste: ' + r.m + ' ' + r.p);
        else alert('Instale o editor Fluxos da API para testar.');
        return;
      }
      const c = ev.target.closest('[data-copiar]');
      if (c) {
        const r = ROTAS[Number(c.dataset.copiar)];
        navigator.clipboard.writeText(r.p).then(() => { c.innerHTML = '<i class="ph ph-check"></i> Copiado'; }).catch(() => {});
      }
    });
    const st = document.createElement('style');
    st.textContent = `
#tela-docs-api .dc-barra{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:12px 0}
#tela-docs-api .dc-barra input{flex:1 1 280px}#tela-docs-api .dc-barra select{flex:0 1 200px}
#tela-docs-api .dc-total{font-size:.85rem;opacity:.75;margin-left:auto}
#tela-docs-api .dc-legenda{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-bottom:12px}
#tela-docs-api .dc-grupo{margin:18px 0}#tela-docs-api .dc-grupo h3{font-size:1rem;margin:0 0 8px}#tela-docs-api .dc-grupo h3 small{opacity:.6;font-weight:400}
#tela-docs-api .dc-rota{border:1px solid rgba(255,255,255,.1);border-radius:10px;margin-bottom:6px;background:rgba(255,255,255,.03)}
#tela-docs-api .dc-rota.aberta{border-color:rgba(52,211,153,.6)}
#tela-docs-api .dc-linha{all:unset;box-sizing:border-box;display:grid;grid-template-columns:72px minmax(0,1.2fr) minmax(0,1.4fr) auto;gap:10px;align-items:center;width:100%;padding:10px 12px;cursor:pointer}
#tela-docs-api .dc-linha:focus-visible{outline:2px solid #34d399}
#tela-docs-api .dc-linha code{font-size:.85rem;overflow-wrap:anywhere}
#tela-docs-api .dc-r{font-size:.85rem;opacity:.85}
#tela-docs-api .dc-m{display:inline-block;text-align:center;min-width:60px;padding:2px 8px;border-radius:6px;color:#fff;font:600 .72rem ui-monospace,monospace}
#tela-docs-api .dc-auth{font-size:.72rem;padding:2px 8px;border-radius:999px;border:1px solid rgba(255,255,255,.2);white-space:nowrap}
#tela-docs-api .dc-auth.pub{border-color:#34d399;color:#34d399}
#tela-docs-api .dc-det{padding:4px 14px 14px;font-size:.9rem}
#tela-docs-api .dc-det h4{margin:10px 0 4px;font-size:.85rem}
#tela-docs-api .dc-pre{font:.78rem ui-monospace,monospace;background:rgba(0,0,0,.3);border-radius:8px;padding:8px;white-space:pre-wrap}
#tela-docs-api .dc-codes span{display:inline-block;margin:2px 6px 2px 0;padding:2px 8px;border-radius:6px;background:rgba(255,255,255,.07);font-size:.78rem}
@media(max-width:800px){#tela-docs-api .dc-linha{grid-template-columns:64px minmax(0,1fr)}#tela-docs-api .dc-r,#tela-docs-api .dc-auth{grid-column:2}}`;
    document.head.appendChild(st);
    const original = window.abrirTela;
    window.abrirTela = function (id) {
      original(id);
      if (id !== 'tela-docs-api') return;
      const nav = document.getElementById('nav-docs-api');
      if (nav) { nav.classList.add('active-menu'); const g = nav.closest('details.nav-group'); if (g) g.open = true; }
      const t = document.getElementById('titulo-pagina'); if (t) t.innerText = 'Documentação da API';
      const h = document.getElementById('header-actions'); if (h) h.innerHTML = '';
      desenhar();
    };
  }
  function iniciar() { if (typeof window.abrirTela === 'function' && !document.getElementById('tela-docs-api')) montar(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
