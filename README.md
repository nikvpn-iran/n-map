<div align="center">

<img src="logo.jpg" alt="Logo" width="120" />

# N-MAP

**Lightweight edge management panel for Cloudflare Workers**

[![MIT License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare&logoColor=white)](https://workers.cloudflare.com)

</div>

---

## Overview

N-MAP is a single-file management panel that runs entirely on the free
**Cloudflare Workers** platform with a **D1** database. No server, no VPS and no
software installation are required — the whole panel deploys to your own
Cloudflare account with a single click.

## Features

- **One-click deploy** to your own Cloudflare account
- **Multi-account** API management (Cloudflare and Vercel)
- One-click token retrieval with pre-scoped permissions
- Automatic token validation before saving
- Primary / secondary account architecture
- User management with quota, expiry and live stats
- Self-update from inside the panel
- Backup and restore
- Responsive dark UI

## Deploy

Deployment is handled by the deployer (`n-map-deployer.js`), which creates the
Worker and the D1 database for you and returns the final panel URL.

### Step 1 — Create the deployer Worker

1. Open the Cloudflare dashboard → **Workers & Pages** → **Create Worker**
2. Give it any name, create it, then click **Edit code**
3. Copy the contents of [`n-map-deployer.js`](n-map-deployer.js) and paste it in place of the default code
4. Click **Deploy** and open the `*.workers.dev` link

### Step 2 — Deploy the panel

1. Click **Get token** and follow the pre-filled token page
2. Create the token, copy it, and paste it into the deployer
3. Click **Deploy** — the deployer will automatically:
   - create a D1 database
   - fetch the latest panel source
   - deploy the Worker and bind it to the database
4. You receive the final panel URL

> The deployer is **idempotent**: running it again on the same account reuses the
> existing Worker and database instead of creating duplicates.

> At deploy time the panel source is compiled into a single self-contained,
> encoded Worker module before it is uploaded. The deployed script therefore
> carries no readable application signatures. The in-panel self-update produces
> the same encoded output, so updating never reverts the Worker to a raw source.

### Step 3 — First login

Open the panel URL — on first login you set a management password.

## Local development

```bash
git clone https://github.com/nikvpn-iran/n-map.git
cd n-map
npx wrangler dev n-map.js --local --port 8787
```

The panel runs at `http://127.0.0.1:8787/panel`.

## Project structure

| File | Role |
|------|------|
| `n-map.js` | Main Worker — panel, API and database (single file) |
| `n-map-deployer.js` | One-click deployer |
| `wrangler.toml` | Worker config for local development |

## License

[MIT](LICENSE)
