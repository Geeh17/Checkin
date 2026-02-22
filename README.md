# Check-in do Acampamento (Next.js + Netlify Blobs)

Sistema leve para **check-in por nome** (busca rápida, sem acento) com **distribuição automática de equipes** e **persistência em produção via Netlify Blobs**.

> Criado para auxiliar o check-in do pessoal do acampamento/igreja, usando a lista de inscritos já existente (importação via JSON).

---

## Funcionalidades

- 🔎 **Busca por nome** (normaliza: sem acento, lowercase)
- ✅ **Check-in** com registro de data/hora
- 🟠🟢🔴 **Equipes**: LARANJA, VERDE, VERMELHO
- ⚖️ **Balanceamento automático** de equipes (distribui para a equipe com menor contagem)
- 🚫 **Limite por equipe**: 47 (total 141)
- 📊 **Resumo de equipes** (contagem)
- 📄 **Relatório final** com filtro por equipe + **geração de PDF** (via `window.print()`)

---

## Tecnologias

- Next.js **14** (App Router)
- React 18
- TypeScript
- **@netlify/blobs** (persistência no Netlify)
- Netlify (deploy)

---

## Como funciona (arquitetura)

### Persistência

- **Produção (Netlify):** dados persistidos em **Netlify Blobs** (`getStore("checkin")`)
- **Local (dev):** fallback para `data/participantes.json`

A leitura/gravação está centralizada em:

- `src/lib/storage.ts`
  - `readParticipantes()`
  - `writeParticipantes()`
  - `normalizarNome()`

O projeto mantém compatibilidade com uma chave “legada” (`participantes`) e também usa um formato “v2” (índice + itens):

- `participantes:index` → lista de ids
- `participantes:item:<id>` → item individual

### Fluxo principal

1. Digita o nome (mín. 2 letras)
2. O app chama `GET /api/participantes/search?q=...`
3. Ao confirmar, chama `POST /api/participantes/:id/checkin`
4. O backend:
   - se for **APOIO** → não recebe equipe
   - se for **PARTICIPANTE** e não tiver equipe → escolhe equipe balanceada
   - marca `checkinRealizado` e `checkinEm`

---

## Requisitos

- Node.js 18+ (recomendado)
- npm

---

## Rodar local (modo dev)

```bash
npm install
npm run dev
```

Acesse: `http://localhost:3000`

> No modo local, o sistema pode ler/gravar usando `data/participantes.json` como fallback, útil para validar UI/fluxo sem Netlify.

---

## Rodar com Netlify Dev (simula ambiente do Netlify)

```bash
npm run netlify:dev
```

> Útil para testar comportamento mais próximo do deploy.

---

## Variáveis de ambiente

Crie um arquivo `.env.local` baseado em `.env.example`.

### `ADMIN_SECRET`

Usado para proteger endpoints administrativos (import/reset).

- Em **produção**, se `ADMIN_SECRET` não estiver configurado, o sistema **bloqueia** o acesso admin.
- Em **dev**, se não estiver configurado, ele **não bloqueia** (para facilitar testes).

Exemplo:

```bash
ADMIN_SECRET="uma_senha_forte_aqui"
```

---

## Deploy no Netlify

1. Suba o repositório para o GitHub/GitLab
2. Crie um novo site no Netlify apontando para o repo
3. Configure as variáveis em **Site settings → Environment variables**
   - `ADMIN_SECRET`
4. Build command: `npm run build`
5. Publish directory: `.next` (o `netlify.toml` já orienta o build/adapter)

---

## Importação de inscritos (Admin)

### Importar PARTICIPANTES

**POST** `/api/admin/import`

Header:

- `x-admin-secret: <ADMIN_SECRET>`

Body (JSON array):

```json
[{ "nomeCompleto": "Manoel Silva" }, { "nomeCompleto": "Ana Paula Souza" }]
```

O endpoint cria automaticamente:

- `id` (sequencial)
- `nomeNormalizado`
- `tipo` = `PARTICIPANTE`
- `equipe` = `null`
- `checkinRealizado` = `false`
- `checkinEm` = `null`

Exemplo com `curl`:

```bash
curl -X POST "https://SEU-SITE.netlify.app/api/admin/import" \
  -H "content-type: application/json" \
  -H "x-admin-secret: SEU_ADMIN_SECRET" \
  -d '[{"nomeCompleto":"João da Silva"},{"nomeCompleto":"Maria Oliveira"}]'
```

### Importar APOIO

**POST** `/api/admin/import-apoio`

Header:

- `x-admin-secret: <ADMIN_SECRET>`

Body: pode ser um array puro **ou** `{ "items": [...] }`

Exemplo:

```json
[{ "nomeCompleto": "Fulano do Apoio" }]
```

---

## Endpoints (públicos)

### Buscar participantes

**GET** `/api/participantes/search?q=ana`

- Retorna até **30** resultados
- Ordena participantes antes de apoio

Exemplo:

```bash
curl "http://localhost:3000/api/participantes/search?q=ana"
```

### Listar todos (para relatório)

**GET** `/api/participantes/list`

Exemplo:

```bash
curl "http://localhost:3000/api/participantes/list"
```

### Resumo de equipes

**GET** `/api/participantes/summary`

Retorna contagem de **participantes** por equipe + sem equipe.

Exemplo:

```bash
curl "http://localhost:3000/api/participantes/summary"
```

### Fazer check-in

**POST** `/api/participantes/:id/checkin`

Regras:

- Se já fez check-in → retorna mensagem `"Check-in já realizado."`
- Se `tipo === "APOIO"` → equipe fica `null`
- Se for participante sem equipe → escolhe equipe balanceada
- Se atingir capacidade total → retorna erro

Exemplo:

```bash
curl -X POST "http://localhost:3000/api/participantes/12/checkin"
```

---

## ♻️ Reset (Admin)

**POST** `/api/admin/reset`

Header:

- `x-admin-secret: <ADMIN_SECRET>`

Body opcional:

```json
{ "tipo": "TODOS" }
```

Valores aceitos em `tipo`:

- `TODOS` (default)
- `PARTICIPANTE`
- `APOIO`

---

## 🗂 Estrutura de dados (Participante)

```ts
type Participante = {
  id: string;
  nomeCompleto: string;
  nomeNormalizado: string;
  tipo: "PARTICIPANTE" | "APOIO";
  equipe: "LARANJA" | "VERDE" | "VERMELHO" | null;
  checkinRealizado: boolean;
  checkinEm: string | null; // ISO string
};
```

---

## Dicas de operação (dia do evento)

- Use **dois celulares** sem problema: a persistência no Netlify Blobs segura o estado em produção.
- Prefira Wi‑Fi estável e mantenha o site aberto para reduzir latência.
- Use o atalho: **Enter** faz check-in do **primeiro resultado**.

---

## 🛠 Troubleshooting

- Admin retornando 401 em produção:
  - confirme se `ADMIN_SECRET` está configurado no Netlify e enviado no header `x-admin-secret`
- Busca não retorna nomes com acento:
  - ok (é esperado). O sistema normaliza removendo acentos.
- Capacidade atingida:
  - limite padrão é **47 por equipe** (`src/lib/config.ts`)

---

## Licença

Uso interno / evento. Ajuste conforme sua necessidade.
