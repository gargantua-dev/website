# Deploy em `www.gargantua.dev` com GitHub Pages

Este projeto publica em GitHub Pages via GitHub Actions a partir da branch `main`.

## DNS na Hostinger

Configure os registros abaixo no hPanel em `Domains -> DNS Zone Editor`:

| Tipo    | Host  | Valor                     |
| ------- | ----- | ------------------------- |
| `CNAME` | `www` | `gargantua-dev.github.io` |
| `A`     | `@`   | `185.199.108.153`         |
| `A`     | `@`   | `185.199.109.153`         |
| `A`     | `@`   | `185.199.110.153`         |
| `A`     | `@`   | `185.199.111.153`         |
| `AAAA`  | `@`   | `2606:50c0:8000::153`     |
| `AAAA`  | `@`   | `2606:50c0:8001::153`     |
| `AAAA`  | `@`   | `2606:50c0:8002::153`     |
| `AAAA`  | `@`   | `2606:50c0:8003::153`     |

Antes de salvar:

- Remova apenas registros web conflitantes em `@` ou `www` (`A`, `AAAA`, `CNAME`, `ALIAS`, `ANAME`).
- Não remova `MX`, `TXT`, `SPF`, `DKIM` ou qualquer outro registro não relacionado ao site.
- Não use wildcard `*`.
- Se a Hostinger impedir editar `@` ou `www`, desative antes qualquer CDN ou registro padrão do site.

## GitHub Pages

No GitHub:

1. Abra `Settings -> Pages`.
2. Em `Build and deployment`, mantenha `GitHub Actions`.
3. Em `Custom domain`, defina `www.gargantua.dev`.
4. Aguarde o certificado e ative `Enforce HTTPS`.

Observação:

- Este repositório usa custom workflow de Pages. Por isso, o arquivo `CNAME` não é necessário no repositório.

## Verificação de domínio

Para evitar takeover do domínio:

1. Abra a configuração de Pages do owner que publica o repositório.
2. Adicione o domínio para verificação.
3. Copie o TXT challenge fornecido pelo GitHub.
4. Crie o TXT correspondente na Hostinger.
5. Verifique o domínio no GitHub e mantenha o TXT na zona DNS.

## Comandos úteis

Depois de autenticar o GitHub CLI com `gh auth login`, use:

```bash
gh auth status
gh workflow list -R gargantua-dev/website
gh run list -R gargantua-dev/website --workflow deploy.yml
gh api repos/gargantua-dev/website/pages
```

Para validar DNS:

```bash
dig gargantua.dev A +short
dig gargantua.dev AAAA +short
dig www.gargantua.dev CNAME +short
```

## Critérios de aceite

- `pnpm build` passa localmente.
- O workflow de deploy roda com sucesso em `main`.
- `https://gargantua.dev` e `https://www.gargantua.dev` servem o mesmo site.
- A URL canônica final é `https://www.gargantua.dev`.
