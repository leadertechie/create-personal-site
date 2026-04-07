#!/usr/bin/env node
import prompts from 'prompts';
import { red, green, blue } from 'kolorist';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface GithubProfile {
  name?: string;
  bio?: string;
  html_url?: string;
  email?: string;
}

interface Answers {
  projectName: string;
  githubUsername: string;
  siteTitle: string;
}

async function fetchGithubProfile(username: string): Promise<GithubProfile | null> {
  if (!username) return null;
  try {
    const res = await fetch("https://api.github.com/users/" + username);
    if (res.ok) return await res.json() as GithubProfile;
  } catch (_e) {}
  return null;
}

async function init(): Promise<void> {
  const args = process.argv.slice(2);
  const projectNameArg = args.find(arg => !arg.startsWith('--'));
  const isLocal = args.includes('--local');

  const response = await prompts([
    {
      type: projectNameArg ? null : 'text',
      name: 'projectName',
      message: 'Project name:',
      initial: 'my-personal-site'
    },
    {
      type: 'text',
      name: 'githubUsername',
      message: 'GitHub username: (optional, press enter to skip)',
      initial: ''
    },
    {
      type: 'text',
      name: 'siteTitle',
      message: 'Site title:',
      initial: 'My Personal Website'
    }
  ]) as Answers;
  
  const projectName = projectNameArg || response.projectName;
  const { githubUsername, siteTitle } = response;
  if (!projectName) {
    console.log(red('Cancelled.'));
    return;
  }

  const root = path.join(process.cwd(), projectName);
  
  console.log("\nCreating project in " + blue(root) + "...");

  await fs.ensureDir(root);

  let profile = await fetchGithubProfile(githubUsername);
  if (profile) {
    console.log(green("Fetched GitHub profile for " + profile.name));
  }

  const contentDir = path.join(root, 'content');
  const pagesDir = path.join(contentDir, 'pages');
  await fs.ensureDir(contentDir);
  await fs.ensureDir(pagesDir);
  
  const aboutMe = "# About Me\n\n" + (profile?.bio || "Welcome to my site!") + "\n\nFind more on my [GitHub](" + (profile?.html_url || "") + ").";
  await fs.writeFile(path.join(contentDir, 'about-me.md'), aboutMe);
  
  const homePageTitle = profile?.name || "My Personal Website";
  const homePage = `---
title: ${homePageTitle}
date: ${new Date().toISOString().split('T')[0]}
description: Welcome to my personal website.
---

# ${homePageTitle}

Welcome to my site!`;
  await fs.writeFile(path.join(pagesDir, 'home.md'), homePage);
  
  const profileData = {
    name: profile?.name || "Your Name",
    title: "Software Architect",
    experience: "10+ years",
    profileImageUrl: ""
  };
  await fs.writeFile(path.join(contentDir, 'profile.json'), JSON.stringify(profileData, null, 2));

  const staticDetails = {
    siteTitle: siteTitle || profile?.name || "My Personal Website",
    siteDescription: profile?.bio || "Welcome to my professional portfolio.",
    copyright: new Date().getFullYear() + " " + (profile?.name || "All Rights Reserved"),
    linkedin: "",
    github: profile?.html_url || "",
    email: profile?.email || ""
  };
  await fs.writeFile(path.join(contentDir, 'static-details.json'), JSON.stringify(staticDetails, null, 2));

  await fs.copy(path.join(__dirname, '..', 'templates'), root);

  await fs.ensureDir(path.join(root, 'api'));
  await fs.ensureDir(path.join(root, 'ui'));
  await fs.ensureDir(path.join(root, 'prerender'));
  await fs.ensureDir(path.join(root, 'scripts'));

  // Copy seed script from dist to target
  const seedSrc = path.join(__dirname, 'scripts/seed.js');
  if (await fs.pathExists(seedSrc)) {
    await fs.copy(seedSrc, path.join(root, 'scripts/seed.js'));
  }

  await fs.writeFile(path.join(root, 'api/index.ts'), "import { WebsiteAPI } from '@leadertechie/personal-site-kit/api';\n\nconst api = new WebsiteAPI();\nexport default api;\n");
  
  // UI Entry with Hook pattern - NO local styles.css
  await fs.writeFile(path.join(root, 'ui/index.ts'), "import '@leadertechie/personal-site-kit/styles/theme.css';\nimport { WebsiteUI } from '@leadertechie/personal-site-kit/shared';\nimport '@leadertechie/personal-site-kit/ui';\n\nWebsiteUI.getInstance({\n  // Using hooks for style overriding or custom logic\n  theme: {\n    // primaryColor: '#646cff',\n    // customCss: ':root { --nav-link-color: blue; }'\n  },\n  onBootstrap: (ui) => {\n    console.log('Site is booting up with kit!');\n  }\n}).bootstrap();\n");
  
  await fs.writeFile(path.join(root, 'prerender/index.ts'), "import { WebsitePrerender } from '@leadertechie/personal-site-kit/prerender';\n\nexport default new WebsitePrerender();\n");

  const wranglerToml = await fs.readFile(path.join(root, 'wrangler.toml'), 'utf-8');
  const processedToml = wranglerToml
    .replace(/\{\{name\}\}/g, projectName)
    .replace(/\{\{siteTitle\}\}/g, siteTitle || 'My Personal Website');
  await fs.writeFile(path.join(root, 'wrangler.toml'), processedToml);

  const indexHtmlPath = path.join(root, 'ui/index.html');
  if (await fs.pathExists(indexHtmlPath)) {
    const indexHtml = await fs.readFile(indexHtmlPath, 'utf-8');
    await fs.writeFile(indexHtmlPath, indexHtml.replace(/\{\{siteTitle\}\}/g, siteTitle || 'My Personal Website'));
  }

  const readme = await fs.readFile(path.join(root, 'README.md'), 'utf-8');
  await fs.writeFile(path.join(root, 'README.md'), readme.replace(/\{\{name\}\}/g, projectName));

  const pkg = {
    name: projectName,
    version: '0.1.0',
    private: true,
    type: 'module',
    scripts: {
      "dev": "concurrently \"npm run dev:api\" \"npm run dev:ui\"",
      "dev:api": "wrangler dev",
      "dev:ui": "vite",
      "build": "npm run build:ui && npm run build:api",
      "build:ui": "vite build",
      "build:api": "wrangler deploy --dry-run --outdir dist/api",
      "deploy": "npm run build && wrangler deploy",
      "seed": "node scripts/seed.js"
    },
    dependencies: {
      "@leadertechie/personal-site-kit": isLocal ? "file:../personal-site-kit" : "latest",
      "lit": "^3.2.1"
    },
    devDependencies: {
      "wrangler": "^4.79.0",
      "vite": "^7.3.1",
      "typescript": "^5.7.3",
      "concurrently": "^9.1.2"
    }
  };
  await fs.writeFile(path.join(root, 'package.json'), JSON.stringify(pkg, null, 2));

  // Create .env file for local development
  const envContent = `# Local Development Configuration\nVITE_API_URL=http://localhost:8788\n`;
  await fs.writeFile(path.join(root, '.env'), envContent);

  console.log("\n" + green('Done!') + " Now run:\n");
  console.log("  cd " + projectName);
  console.log("  npm install");
  console.log("  npx wrangler login");
  console.log("  npx wrangler r2 bucket create " + projectName);
  console.log("  npx wrangler kv namespace create KV");
  console.log("  # Update wrangler.toml with the KV ID from the command above");
  console.log("  npm run dev");
  console.log("  npm run seed -- <username> '<password>'");
}

init().catch(e => console.error(red(e)));
