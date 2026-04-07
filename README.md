# create-personal-site

A CLI to scaffold a personal website powered by [@leadertechie/personal-site-kit](https://github.com/leadertechie/personal-site-kit).

## Features

- Interactive CLI prompts for project setup
- Auto-fetches GitHub profile to personalize content
- Generates project structure with Cloudflare Workers configuration
- Creates starter content (home page, about page, metadata)

## Usage

```bash
npx @leadertechie/create-personal-site [project-name]
```

Examples:

```bash
# Interactive prompts
npx @leadertechie/create-personal-site

# Specify project name upfront
npx @leadertechie/create-personal-site my-portfolio

# Use local package sources for debugging or development
npx @leadertechie/create-personal-site my-portfolio --local
```

The `--local` flag tells the generator to reference the local `@leadertechie/personal-site-kit` package instead of using the published `latest` package version.

## Requirements

- Node.js 20+
- npm

## What it creates

- `content/` - Your website content (pages, markdown files)
- `api/` - Cloudflare Worker API entry point
- `ui/` - Frontend entry point
- `prerender/` - Static prerendering setup
- `wrangler.toml` - Cloudflare Workers configuration
