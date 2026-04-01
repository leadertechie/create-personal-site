#!/usr/bin/env node
import prompts from 'prompts';
import { red, green, blue, bold } from 'kolorist';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function fetchGithubProfile(username) {
  if (!username) return null;
  try {
    const res = await fetch("https://api.github.com/users/" + username);
    if (res.ok) return await res.json();
  } catch (e) {}
  return null;
}

async function init() {
  const response = await prompts([
    {
      type: 'text',
      name: 'projectName',
      message: 'Project name:',
      initial: 'my-personal-site'
    },
    {
      type: 'text',
      name: 'githubUsername',
      message: 'GitHub username:'
    },
    {
        type: 'text',
        name: 'siteTitle',
        message: 'Site title:',
        initial: 'My Personal Website'
    }
  ]);

  const { projectName, githubUsername, siteTitle } = response;
  if (!projectName) {
    console.log(red('Cancelled.'));
    return;
  }

  const root = path.join(process.cwd(), projectName);
  
  console.log("
Creating project in " + blue(root) + "...");

  // 1. Create directory
  await fs.ensureDir(root);

  // 2. Fetch Github profile to personalize
  let profile = await fetchGithubProfile(githubUsername);
  if (profile) {
    console.log(green("Fetched GitHub profile for " + profile.name));
  }

  // 3. Create personalized content
  const contentDir = path.join(root, 'content');
  const pagesDir = path.join(contentDir, 'pages');
  await fs.ensureDir(contentDir);
  await fs.ensureDir(pagesDir);
  
  const aboutMe = "# About Me

" + (profile?.bio || "Welcome to my site!") + "

Find more on my [GitHub](" + (profile?.html_url || "") + ").";
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

  // 4. Copy templates
  await fs.copy(path.join(__dirname, '..', 'templates'), root);

  // 5. Create project-specific files
  await fs.ensureDir(path.join(root, 'api'));
  await fs.ensureDir(path.join(root, 'ui'));
  await fs.ensureDir(path.join(root, 'prerender'));

  await fs.writeFile(path.join(root, 'api/index.ts'), "import { WebsiteAPI } from '@leadertechie/personal-site-kit/api';

export default new WebsiteAPI();
");
  await fs.writeFile(path.join(root, 'ui/index.ts'), "import { WebsiteUI } from '@leadertechie/personal-site-kit/shared';
import '@leadertechie/personal-site-kit/ui/banner';
import '@leadertechie/personal-site-kit/ui/footer';
import '@leadertechie/personal-site-kit/ui/about-me';

WebsiteUI.bootstrap();
");
  await fs.writeFile(path.join(root, 'prerender/index.ts'), "import { WebsitePrerender } from '@leadertechie/personal-site-kit/prerender';

export default new WebsitePrerender();
");

  // Replace template variables in wrangler.toml
  const wranglerToml = await fs.readFile(path.join(root, 'wrangler.toml'), 'utf-8');
  const processedToml = wranglerToml
    .replace(/\{\{name\}\}/g, projectName)
    .replace(/\{\{siteTitle\}\}/g, siteTitle || 'My Personal Website');
  await fs.writeFile(path.join(root, 'wrangler.toml'), processedToml);

  // Replace template variables in README
  const readme = await fs.readFile(path.join(root, 'README.md'), 'utf-8');
  await fs.writeFile(path.join(root, 'README.md'), readme.replace(/\{\{name\}\}/g, projectName));

  // 6. Create package.json
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
      "lit": "^3.2.1"
    }
  };
  await fs.writeFile(path.join(root, 'package.json'), JSON.stringify(pkg, null, 2));

  console.log("
" + green('Done!') + " Now run:
");
  console.log("  cd " + projectName);
  console.log("  npm install");
  console.log("  # Update wrangler.toml with your R2 bucket name");
  console.log("  npm run dev");
}

init().catch(e => console.error(red(e)));
