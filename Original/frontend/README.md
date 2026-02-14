# UrgentParts Web App

React + TypeScript + Vite frontend for buyer, supplier, and admin flows.

## Requirements

- Node.js 20+

## Local development

```bash
npm install
npm run dev
```

Frontend runs on `http://localhost:5173` and proxies `/api` to `http://localhost:8000`.

## Environment

Create `.env.local` from `.env.example`:

- `VITE_API_URL` optional backend base URL override
- `VITE_USE_MOCK` `true|false` toggles mock engine

## Commands

- `npm run dev` start dev server
- `npm run build` production build
- `npm run preview` preview build
