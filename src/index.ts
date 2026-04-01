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
  const projectNameArg = args[0];

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

  await fs.writeFile(path.join(root, 'api/index.ts'), "import { WebsiteAPI } from '@leadertechie/personal-site-kit/api';\n\nexport default new WebsiteAPI();\n");
  await fs.writeFile(path.join(root, 'ui/index.ts'), "import { WebsiteUI } from '@leadertechie/personal-site-kit/shared';\nimport '@leadertechie/personal-site-kit/ui/banner';\nimport '@leadertechie/personal-site-kit/ui/footer';\nimport '@leadertechie/personal-site-kit/ui/about-me';\n\nWebsiteUI.bootstrap();\n");
  await fs.writeFile(path.join(root, 'prerender/index.ts'), "import { WebsitePrerender } from '@leadertechie/personal-site-kit/prerender';\n\nexport default new WebsitePrerender();\n");

  const wranglerToml = await fs.readFile(path.join(root, 'wrangler.toml'), 'utf-8');
  const processedToml = wranglerToml
    .replace(/\{\{name\}\}/g, projectName)
    .replace(/\{\{siteTitle\}\}/g, siteTitle || 'My Personal Website');
  await fs.writeFile(path.join(root, 'wrangler.toml'), processedToml);

  const readme = await fs.readFile(path.join(root, 'README.md'), 'utf-8');
  await fs.writeFile(path.join(root, 'README.md'), readme.replace(/\{\{name\}\}/g, projectName));

  const pkg = {
    name: projectName,
    version: '0.1.0',
    private: true,
    scripts: {
      "dev": "wrangler dev",
      "deploy": "wrangler deploy",
      "seed": "# Script to upload content to R2"
    },
    dependencies: {
      "@leadertechie/personal-site-kit": "latest",
      "wrangler": "^4.60.0",
      "lit": "^3.2.1"
    }
  };
  await fs.writeFile(path.join(root, 'package.json'), JSON.stringify(pkg, null, 2));

  console.log("\n" + green('Done!') + " Now run:\n");
  console.log("  cd " + projectName);
  console.log("  npm install");
  console.log("  # Update wrangler.toml with your R2 bucket name");
  console.log("  npm run dev");
}

init().catch(e => console.error(red(e)));
