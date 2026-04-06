#!/usr/bin/env node
import { execSync } from 'child_process';
import { cpSync, existsSync, mkdirSync, rmSync } from 'fs';
import { join, resolve } from 'path';

const md2htmlPath = resolve(process.cwd(), '../../leadertechie-git/md2html');
const r2TohtmlPath = resolve(process.cwd(), '../../leadertechie-git/r2Tohtml');
const personalSiteKitPath = resolve(process.cwd(), '../../leadertechie-git/personal-site-kit');
const myPersonalSitePath = resolve(process.cwd(), '../../test/my-personal-site');

console.log('Building md2html...');
execSync('npm run build', { cwd: md2htmlPath, stdio: 'inherit' });

console.log('\nCopying md2html dist to r2Tohtml node_modules...');
const r2TohtmlNodeModules = join(r2TohtmlPath, 'node_modules/@leadertechie/md2html');
if (existsSync(r2TohtmlNodeModules)) {
  cpSync(join(md2htmlPath, 'dist'), join(r2TohtmlNodeModules, 'dist'), { force: true, recursive: true });
} else {
  console.warn('Warning: md2html not found in r2Tohtml node_modules');
}

console.log('\nBuilding r2Tohtml...');
execSync('npm run build', { cwd: r2TohtmlPath, stdio: 'inherit' });

console.log('\nCopying md2html and r2Tohtml dist to personal-site-kit node_modules...');
cpSync(join(md2htmlPath, 'dist'), join(personalSiteKitPath, 'node_modules/@leadertechie/md2html/dist'), { force: true, recursive: true });
cpSync(join(r2TohtmlPath, 'dist'), join(personalSiteKitPath, 'node_modules/@leadertechie/r2tohtml/dist'), { force: true, recursive: true });

console.log('\nBuilding personal-site-kit...');
execSync('npm run build', { cwd: personalSiteKitPath, stdio: 'inherit' });

console.log('\nSyncing to my-personal-site...');

console.log('\nReinstalling dependencies in my-personal-site...');
execSync('npm install', { cwd: myPersonalSitePath, stdio: 'inherit' });

console.log('\nInstalling additional dependencies...');
execSync('npm install marked', { cwd: myPersonalSitePath, stdio: 'inherit' });

const myPersonalSiteNodeModules = join(myPersonalSitePath, 'node_modules/@leadertechie');

rmSync(join(myPersonalSiteNodeModules, 'md2html'), { recursive: true, force: true });
rmSync(join(myPersonalSiteNodeModules, 'r2tohtml'), { recursive: true, force: true });
rmSync(join(myPersonalSiteNodeModules, 'personal-site-kit'), { recursive: true, force: true });

mkdirSync(join(myPersonalSiteNodeModules, 'md2html'), { recursive: true });
mkdirSync(join(myPersonalSiteNodeModules, 'r2tohtml'), { recursive: true });
mkdirSync(join(myPersonalSiteNodeModules, 'personal-site-kit'), { recursive: true });

cpSync(join(md2htmlPath, 'dist'), join(myPersonalSiteNodeModules, 'md2html/dist'), { recursive: true });
cpSync(join(md2htmlPath, 'package.json'), join(myPersonalSiteNodeModules, 'md2html/package.json'));
cpSync(join(r2TohtmlPath, 'dist'), join(myPersonalSiteNodeModules, 'r2tohtml/dist'), { recursive: true });
cpSync(join(r2TohtmlPath, 'package.json'), join(myPersonalSiteNodeModules, 'r2tohtml/package.json'));
cpSync(join(personalSiteKitPath, 'dist'), join(myPersonalSiteNodeModules, 'personal-site-kit/dist'), { recursive: true });
cpSync(join(personalSiteKitPath, 'package.json'), join(myPersonalSiteNodeModules, 'personal-site-kit/package.json'));

console.log('\nSync complete!');
