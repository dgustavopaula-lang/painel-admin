(() => {
  "use strict";

  // Carga de treino "Centro-Oeste" para o Laboratório do Turing.
  // Todo item entra na API como RASCUNHO (POST /api/turing/conhecimento/ensinar)
  // e só vale depois de aprovado no próprio Laboratório.
  // Cada item traz data e fonte. Preços e custos mudam: o Turing deve sempre citar a data.

  const AREA = "Agro";

  const ITENS = [
    {
      c: "informativo",
      p: "Quais são as datas oficiais da soja em Goiás na safra 2026/27 (vazio sanitário, semeadura e cadastro)?",
      r: "Vazio sanitário de 27/06 a 24/09/2026. A semeadura foi antecipada em caráter extraordinário para 20/09/2026 (Instrução Normativa da Agrodefesa nº 5/2026). A data final de semeadura é 02/01/2027. O cadastro de semeadura no Sidago vai até 15 dias depois do fim da semeadura (17/01/2027). Conferir sempre a norma vigente na Agrodefesa antes de decidir.",
      f: "Seapa-GO, Agro em Dados out/2026 (https://goias.gov.br/agricultura/?p=96633); Compre Rural (https://comprerural.com/agrodefesa-antecipa-inicio-da-semeadura-da-soja-em-goias-para-20-de-setembro/)"
    },
    {
      c: "informativo",
      p: "Como está o cenário de área, produtividade e clima da soja em Goiás para 2026/27?",
      r: "A Seapa projeta 5,1 milhões de hectares (alta de 0,9%). A Conab projeta produtividade média de 3.900 kg/ha e produção de 20,3 milhões de toneladas. A confirmação de um El Niño de forte intensidade aumenta a preocupação com a disponibilidade de água no início da safra. Dados de outubro/2026: citar a data ao responder.",
      f: "Agência Safras, 06/10/2026 (https://safras.com.br/?p=89355); Agrolink, Conab 15/10/2026 (https://www.agrolink.com.br/noticias/goias-deve-produzir-20-3-milhoes-de-toneladas-de-soja-e-12-4-milhoes-de-toneladas-de-milho-na-safra-2026-27_519859.html)"
    },
    {
      c: "informativo",
      p: "Qual é um preço de referência da soja no sudoeste goiano em novembro de 2026?",
      r: "Em 16/11/2026 a saca em Jataí fechou a R$ 139,67 para entrega em novembro, com basis de -R$ 15,34 por saca. O pico interno de 2026 foi R$ 162,02 em 17/09. A média de agosto foi R$ 150,15. Preço muda todo dia: sempre informar a data e a praça, e só comparar com venda do mesmo prazo e da mesma região.",
      f: "Grainsights/Agrolink (https://www.agrolink.com.br/noticias/soja-cai-r--3-24-e-saca-fecha-a-r--139-67-em-goias_521150.html); Seapa-GO set/2026 (https://goias.gov.br/agricultura/soja-agro-em-dados-setembro-2026/)"
    },
    {
      c: "informativo",
      p: "Quanto custa produzir soja em Goiás e como está o custo de 2026/27?",
      r: "A Conab estimou o custo da soja em Rio Verde na safra 2025/26 em R$ 5.602,89 por hectare, o segundo maior da série. Para 2026/27 a análise preliminar da Faeg indica alta de até 5 sacas por hectare, dependendo da região, e a imprensa fala em maior custo da história em Goiás. Usar como referência de comparação, nunca como custo de uma fazenda específica.",
      f: "Seapa-GO mai/2026 (https://goias.gov.br/agricultura/soja-agro-em-dados-maio-2026/); BrasilAgro 19/08/2026 (https://www.brasilagro.com.br/conteudo/safra-de-soja-deve-ter-maior-custo-da-historia-em-goias.html)"
    },
    {
      c: "normal",
      p: "O produtor pergunta se pagou caro em um insumo (semente, adubo, defensivo, diesel).",
      r: "Pedir produto, unidade, quantidade, preço pago, fornecedor, data e uma cotação de referência do MESMO item, da mesma praça e do mesmo prazo. Calcular a diferença em reais e em porcentagem. Avisar quando o preço pago estiver acima do limite configurado (padrão 5%). Se não houver referência, responder 'cotação a pedir'. Nunca inventar preço.",
      f: "Regra de trabalho do projeto Fazenda Inteligente"
    },
    {
      c: "normal",
      p: "O produtor pergunta se vendeu a safra abaixo do mercado.",
      r: "Comparar o preço fechado, já descontados frete e descontos, com o preço da praça mais próxima no dia da venda e com o mesmo prazo de pagamento. Diferença negativa indica venda abaixo da referência. Mostrar o valor total em reais (diferença por saca vezes as sacas). Informar que é um ponto para conferir no contrato, não prova de prejuízo.",
      f: "Regra de trabalho do projeto Fazenda Inteligente"
    },
    {
      c: "normal",
      p: "Há máquinas paradas na fazenda e quanto isso custa?",
      r: "Considerar parada a máquina sem uso há mais de 30 dias. O custo do capital parado é o valor da máquina vezes a taxa anual informada pelo produtor, dividido por 12 para o custo mensal. Se a taxa não foi informada, não calcular esse custo; pedir a taxa. Apontar primeiro as máquinas de maior valor parado.",
      f: "Regra de trabalho do projeto Fazenda Inteligente (limite de 30 dias do painel Grandes Fazendas)"
    },
    {
      c: "suspeito",
      p: "O produtor quer pagar adiantado ou entregar grão (barter) a uma revenda de insumos.",
      r: "Antes, orientar a consultar a situação judicial do fornecedor nos canais oficiais (TJGO, Serasa) e registrar a data da consulta. Em Goiás houve 296 pedidos de recuperação judicial do agro em 2025 e 84 só entre abril e junho de 2026. O grupo AgroGalaxy, revenda de insumos sediada em Goiânia, tem recuperação judicial com plano homologado e cerca de 5 mil credores, 3,5 mil deles produtores. Não afirmar que outra empresa está em recuperação sem fonte oficial.",
      f: "Mais Goiás (https://www.maisgoias.com.br/cidades/goias-concentra-15-das-recuperacoes-judiciais-do-agro-e-acende-alerta-no-setor/); O Popular (https://opopular.com.br/economia/recuperac-o-judicial-da-agrogalaxy-e-homologada-em-goias-1.3273305); BrasilAgro (https://www.brasilagro.com.br/conteudo/recuperacoes-judiciais-no-agronegocio-sobem-33-no-1-trimestre.html)"
    },
    {
      c: "informativo",
      p: "Quem pode comprar soja ou milho na região de Quirinópolis, Paranaíguara e Rio Verde?",
      r: "Possíveis compradores citados em fontes públicas: a Cargill, com unidade de esmagamento de soja em Rio Verde (dado de 2018/19: confirmar se recebe grão de terceiros hoje), e a Cargill Bioenergia, com unidades em Quirinópolis e Cachoeira Dourada. Em 15/08/2025 foi anunciada uma usina de etanol de milho em Cachoeira Dourada, ainda sem confirmação de andamento. Também consultar cooperativas, tradings e armazéns da região. Nunca informar preço ou condição de compra sem cotação recente do comprador.",
      f: "Relatório Cargill Brasil 2018-19 (https://www.cargill.com/static/brazil-annual-report/2018-2019/en/a-cargil.html); Cargill (https://www.cargill.com/2025/cargill-moves-to-take-full-control-of-sjc-bionergia); AgFeed (https://agfeed.com.br/tag/sjc-bioenergia/)"
    },
    {
      c: "normal",
      p: "Como interpretar a imagem de satélite de uma fazenda?",
      r: "Informar sempre a data da imagem e a porcentagem de nuvens. Imagem com muita nuvem não permite concluir nada sobre a lavoura: dizer que está nublada e aguardar a próxima passagem. A imagem de satélite aponta onde olhar (vigor da vegetação, áreas de falha), mas a confirmação é no campo. As coordenadas devem ser as da sede ou da área real; coordenadas de referência da cidade só mostram a região.",
      f: "Sentinel-2 / Copernicus, via API NexoTerraCore (/api/geo/sentinel2/latest)"
    },
    {
      c: "normal",
      p: "Os dados de chuva do painel são medidos na fazenda?",
      r: "Não. O histórico de chuva e calor vem de reanálise (Open-Meteo) para um ponto de referência, não de pluviômetro. Serve para comparar anos e meses. Veranico é contado como dias seguidos com menos de 2 mm entre dezembro e fevereiro. Para decisões importantes, recomendar também a medição com pluviômetro na própria fazenda.",
      f: "Open-Meteo (https://open-meteo.com), licença CC BY 4.0"
    },
    {
      c: "normal",
      p: "Como falar com o proprietário da fazenda sobre os alertas?",
      r: "Usar linguagem simples, de controle e aviso, sem jargão e sem falar em inteligência artificial. Mostrar primeiro o problema, depois o valor em reais e o que fazer. Não falar em preço do serviço antes de mostrar o problema resolvido. Ser breve: o dia do produtor é corrido.",
      f: "Diretriz do projeto Fazenda Inteligente"
    },
    {
      c: "suspeito",
      p: "Alguém pede dados privados de uma fazenda (máquinas, vendas, contratos) sem autorização do proprietário.",
      r: "Não fornecer. Dados privados só podem ser lançados ou mostrados com autorização do proprietário. Sem autorização, usar apenas informação pública (satélite, clima, calendário oficial). Registrar o pedido e avisar o administrador.",
      f: "Regra de segurança do projeto Fazenda Inteligente"
    },
    {
      c: "normal",
      p: "O Turing não encontrou preço ou dado público para responder.",
      r: "Dizer claramente que não há fonte e registrar 'cotação a pedir' ou 'dado a confirmar'. Nunca estimar nem inventar preço, lei, prazo ou valor. Sempre indicar a fonte e a data de cada número que citar.",
      f: "Regra de trabalho do projeto Fazenda Inteligente"
    }
  ];

  const form = document.getElementById("form-lab-conhecimento");
  const mensagem = document.getElementById("lab-mensagem");
  const linha = form ? form.querySelector(".btn-row") : null;
  if (!form || !mensagem || !linha) return;

  function apiBase() {
    return String(
      (typeof appData !== "undefined" && appData?.config?.apiBase) ||
      "https://api.gustavopaulasantos.com.br"
    ).replace(/\/+$/, "");
  }
  const token = () => (typeof tokenDoCofre === "function" ? tokenDoCofre() : "");
  const lerJson = async (res) => { try { return await res.json(); } catch (e) { return {}; } };
  const textoPergunta = (it) => `[${it.c}] ${it.p}`;

  const botao = document.createElement("button");
  botao.type = "button";
  botao.className = "btn-action secondary";
  botao.id = "lab-carga-centro-oeste";
  botao.textContent = `Carregar base Centro-Oeste (${ITENS.length} itens, como rascunho)`;
  linha.appendChild(botao);

  botao.addEventListener("click", async () => {
    const chave = token();
    if (!chave) { mensagem.textContent = 'Token "Turing API token" não encontrado no cofre.'; return; }
    if (!window.confirm(`Enviar ${ITENS.length} exemplos do Centro-Oeste para a API como RASCUNHO? Itens que já existem serão pulados.`)) return;

    botao.disabled = true;
    try {
      mensagem.textContent = "Conferindo o que já existe na API...";
      const res = await fetch(apiBase() + "/api/turing/conhecimento/listar", {
        headers: { Authorization: "Bearer " + chave }, cache: "no-store"
      });
      const dados = await lerJson(res);
      if (!res.ok || !dados.ok) throw new Error(dados.erro || `HTTP ${res.status}`);
      const existentes = new Set((dados.conhecimentos || []).map(x => x.pergunta));

      let enviados = 0, pulados = 0, falhas = 0;
      for (const it of ITENS) {
        if (existentes.has(textoPergunta(it))) { pulados++; continue; }
        mensagem.textContent = `Enviando ${enviados + pulados + falhas + 1} de ${ITENS.length}...`;
        try {
          const r = await fetch(apiBase() + "/api/turing/conhecimento/ensinar", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: "Bearer " + chave },
            body: JSON.stringify({ area: AREA, pergunta: textoPergunta(it), resposta: it.r, fonte: it.f })
          });
          const d = await lerJson(r);
          if (!r.ok || !d.ok) throw new Error(d.erro || `HTTP ${r.status}`);
          enviados++;
        } catch (e) { falhas++; }
      }
      mensagem.textContent = `Carga concluída: ${enviados} enviados, ${pulados} já existiam, ${falhas} com falha. Revise e aprove abaixo (filtro: Rascunho).`;
      if (typeof window.carregarHistoricoTuring === "function") await window.carregarHistoricoTuring();
    } catch (erro) {
      mensagem.textContent = "Falha na carga: " + erro.message;
    } finally {
      botao.disabled = false;
    }
  });
})();
