# erp-web

React 19 + TypeScript + Vite frontend. Split out of the former single repo `desi-order` (old `frontend/`).
Talks to `erp-api` over HTTP/WebSocket; set the API base URL via the Vite env / nginx proxy (`nginx.conf`).

```bash
npm ci && npm run dev      # dev server
npm run build && npm test  # build / vitest
```
