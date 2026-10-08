# GPS.dev — Admin Console

Painel administrativo pessoal (página estática, HTML + CSS + JS puros), publicado via GitHub Pages em `painel.gustavopaulasantos.com.br`.

## O que tem

- **Home / Articles, Video, Podcast**: lista de conteúdos.
- **Financeiro**: receitas, despesas e saldo.
- **Clientes**: cadastro simples.
- **Senhas e Acessos**: cofre de credenciais criptografado (AES-GCM) com a sua senha de acesso.
- **Projetos** (Agro Digital, NexoTerraCore, Projeto Turim): notas, status, checklist e links.

## Modelo de segurança (leia antes de usar)

Esta é uma página estática. Não existe servidor fazendo autenticação. Por isso:

1. **A tela de senha é um gate local.** Ela esconde o painel, mas o código é público no repositório. Não confie nela como proteção contra terceiros.
2. **O cofre de senhas é criptografado no navegador.** A chave vem da sua senha via PBKDF2 (210.000 iterações, SHA-256) e o conteúdo é cifrado com AES-GCM. No `localStorage` fica só o texto cifrado. Quem roubar o `localStorage` sem a senha não lê as credenciais. Mesmo assim, qualquer script malicioso rodando na página enquanto você está logado consegue ler o que você vê.
3. **Não há seed de credenciais no código.** A versão anterior tinha `sk_live_console_pass` no HTML. Ela foi removida.
4. **Esquecer a senha = perder o cofre.** Não há recuperação. A tela de setup avisa sobre isso.
5. **Dados ficam só neste navegador.** Não sincronizam entre dispositivos.

### Proteção real recomendada

- Mantenha o repositório **privado** (Settings → General → Danger Zone → Change visibility → Private).
- Não guarde segredos de produção nesse painel. Use um gerenciador de senhas dedicado para credenciais sensíveis.

## Ação pendente (não resolvida pelo código)

Se a chave `sk_live_console_pass` que estava no repositório público era real, **ela já foi exposta**. Apagar ou reescrever o repositório não desfaz isso. A única solução é **revogar/rotacionar a chave no serviço de origem** (por exemplo, no painel do Stripe, da AWS ou do provedor correspondente). Faça isso independentemente de qualquer mudança no código.

## Como rodar localmente

Basta abrir `index.html` no navegador, ou servir a pasta:

```bash
python3 -m http.server 8000
```

Depois acesse `http://localhost:8000`. Na primeira vez, crie a senha de acesso.

> A Web Crypto API só funciona em HTTPS ou em `localhost`. Em outros endereços, a tela mostrará um erro.

## Publicação (GitHub Pages)

1. Substitua o conteúdo do repositório por estes arquivos (`index.html`, `style.css`, `app.js`, `README.md`, `.gitignore`).
2. Mantenha o arquivo `CNAME` com `painel.gustavopaulasantos.com.br`.
3. Mantenha o repositório privado ou público conforme a decisão acima.

## Próximos passos planejados

- Integração com o backend do NexoTerraCore (hoje os dados são locais).
- Exportação/backup criptografado do cofre.
