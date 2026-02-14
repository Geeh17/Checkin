# Check-in do Evento (Next.js + Netlify Blobs)

✅ Pesquisa por nome (com normalização: sem acento / lowercase)  
✅ Mostra Equipe (LARANJA / VERDE / VERMELHO)  
✅ Faz check-in e **grava** (Netlify Blobs)  
✅ Limite: **47 por equipe**  

## Rodar local (para validar UI)
```bash
npm install
npm run dev
```
Acesse: http://localhost:3000

> Localmente, o projeto usa o arquivo `data/participantes.json` como fallback para leitura/gravação (para você testar sem Netlify).

## Deploy no Netlify (produção com persistência)
1. Faça deploy do projeto no Netlify (via GitHub ou upload).
2. Configure a env:
   - `ADMIN_SECRET` (obrigatório)

## Importar a lista (uma vez)
POST:
`/api/admin/import`

Header:
`x-admin-secret: <ADMIN_SECRET>`

Body JSON (você pode mandar **só nomes**):
```json
[
  { "nomeCompleto": "Manoel Silva" },
  { "nomeCompleto": "Ana Paula Souza" }
]
```

O endpoint cria automaticamente os campos:
- id
- nomeNormalizado
- equipe (null)
- checkinRealizado (false)
- checkinEm (null)

## Endpoints
- `GET /api/participantes/search?q=ana`
- `POST /api/participantes/:id/checkin`
