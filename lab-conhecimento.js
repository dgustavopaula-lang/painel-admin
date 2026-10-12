
(() => {
  "use strict";
  const chave = "gps_turing_conhecimento_rascunhos_v1";
  const form = document.getElementById("form-lab-conhecimento");
  const historico = document.getElementById("lab-historico");
  const mensagem = document.getElementById("lab-mensagem");
  if (!form || !historico || !mensagem) return;

  function ler() {
    try {
      const dados = JSON.parse(localStorage.getItem(chave) || "[]");
      return Array.isArray(dados) ? dados.slice(0, 50) : [];
    } catch {
      return [];
    }
  }

  function mostrar() {
    historico.replaceChildren();
    const registros = ler();
    if (!registros.length) {
      historico.textContent = "Nenhum rascunho registrado.";
      return;
    }
    for (const item of registros) {
      const card = document.createElement("article");
      card.className = "lab-registro";
      for (const valor of [
        item.area + " · " + item.data,
        "Pergunta: " + item.pergunta,
        "Orientação: " + item.orientacao,
        "Status: rascunho local, não treinado"
      ]) {
        const linha = document.createElement("p");
        linha.textContent = valor;
        card.appendChild(linha);
      }
      historico.appendChild(card);
    }
  }

  form.addEventListener("submit", (evento) => {
    evento.preventDefault();
    const registro = {
      area: document.getElementById("lab-area").value,
      pergunta: document.getElementById("lab-pergunta").value.trim(),
      orientacao: document.getElementById("lab-orientacao").value.trim(),
      data: new Date().toLocaleString("pt-BR")
    };
    if (!registro.pergunta || !registro.orientacao) return;
    try {
      localStorage.setItem(chave, JSON.stringify([registro, ...ler()].slice(0, 50)));
      form.reset();
      mensagem.textContent = "Rascunho salvo neste navegador. Ainda não enviado à API.";
      mostrar();
    } catch {
      mensagem.textContent = "Não foi possível salvar. Verifique o armazenamento do navegador.";
    }
  });

  mostrar();
})();
