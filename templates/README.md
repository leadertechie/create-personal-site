# {{name}}

A high-performance personal website powered by [@leadertechie/personal-site-kit](https://github.com/leadertechie/personal-site-kit).

## Zero to Online (ZTO1) Guide

Your project has been successfully scaffolded! Follow these steps to get your professional personal website live on Cloudflare.

### 1. Initial Setup
Install the necessary dependencies:
```bash
npm install
```

### 2. Connect to Cloudflare
Authenticate your computer with your Cloudflare account so you can manage your site:
```bash
npx wrangler login
```
*Follow the browser prompts to authorize Wrangler.*

### 3. Create your R2 Storage
Your website's content (Markdown, JSON, Images) is stored in a Cloudflare R2 bucket. Create it now:
```bash
npx wrangler r2 bucket create {{name}}
```
*Your `wrangler.toml` is already configured to use a bucket named `{{name}}`. If you used a different name, update the `bucket_name` field in `wrangler.toml`.*

### 4. Create your KV Namespace
The website uses Cloudflare KV to store authentication data and session tokens. Create it now:
```bash
npx wrangler kv namespace create KV
```
*Copy the **`id`** from the command output and paste it into your `wrangler.toml` file:*
```toml
[[kv_namespaces]]
binding = "KV"
id = "PASTE_THE_ID_HERE"
```

### 5. Initial Setup & Seeding
This step initializes your admin credentials and uploads your initial content to Cloudflare. 

**This step is mandatory.**

1. Open `.env.secrets` and set your desired `ADMIN_USER` and `ADMIN_PASS`.
2. Run the seed command:
```bash
npm run seed
```

- **First Run**: This will call the `/auth/setup` endpoint to create your admin account with the credentials from `.env.secrets`.
- **Subsequent Runs**: This will log in using these credentials to sync any local changes in your `content/` folder to R2.

### 6. Local Development
Test your site locally to see how it looks:
```bash
npm run dev
```
- **UI**: http://localhost:5173
- **API**: http://localhost:8788 (or 8787)

### 7. Deploy to Production
Publish your site to the global Cloudflare edge network:
```bash
npm run deploy
```

---

## Project Structure

- `content/` - Your site data (Markdown for pages, `static-details.json` for site metadata).
- `ui/` - Frontend entry point (Lit + Vite).
- `api/` - Backend entry point (Cloudflare Workers).
- `prerender/` - Static site generation logic.
- `scripts/` - Utility scripts like the content seeder.

## Customization
To change the look and feel, update `ui/index.ts`. You can override the theme colors and add custom CSS directly in the `WebsiteUI.getInstance` configuration.

---
*Powered by [LeaderTechie Personal Site Kit](https://github.com/leadertechie/personal-site-kit)*
