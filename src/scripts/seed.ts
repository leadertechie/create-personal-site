import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const CONTENT_DIR = path.join(ROOT, 'content');

// Load .env.secrets manually if it exists
try {
  const secretsPath = path.join(ROOT, '.env.secrets');
  if (fs.existsSync(secretsPath)) {
    const secrets = fs.readFileSync(secretsPath, 'utf-8');
    secrets.split(/\r?\n/).forEach(line => {
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.startsWith('#')) return;
      
      const [key, ...valueParts] = trimmedLine.split('=');
      if (key && valueParts.length > 0) {
        const k = key.trim();
        const v = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
        process.env[k] = v;
      }
    });
  }
} catch (e) {}

// Configuration
const args = process.argv.slice(2);
const ADMIN_USER = args[0] || process.env.ADMIN_USER;
const ADMIN_PASS = args[1] || process.env.ADMIN_PASS;

let sessionCookie = '';

async function probeApiUrl(): Promise<string> {
  if (process.env.VITE_API_URL) return process.env.VITE_API_URL;
  if (process.env.API_URL) return process.env.API_URL;
  return 'http://localhost:8787';
}

async function seed() {
  const API_URL = await probeApiUrl();
  console.log(`\n🚀 Starting seed process for ${API_URL}...`);

  try {
    if (!ADMIN_USER || !ADMIN_PASS) {
        throw new Error('Missing credentials. Please set ADMIN_USER and ADMIN_PASS in .env.secrets');
    }

    console.log(`👤 Using admin user: "${ADMIN_USER}"`);

    // 1. Check Auth Status
    process.stdout.write('🔍 Checking authentication status... ');
    const statusRes = await fetch(`${API_URL}/api/auth/status`).catch(e => {
        throw new Error(`Could not connect to API at ${API_URL}. Is your local dev server running?`);
    });
    const status = await statusRes.json();
    console.log('Done.');

    if (!status.configured) {
      process.stdout.write('📝 Admin not configured. Performing first-time setup... ');
      const setupRes = await fetch(`${API_URL}/api/auth/setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: ADMIN_USER, password: ADMIN_PASS })
      });

      if (!setupRes.ok) {
        const error = await setupRes.json();
        throw new Error(`Setup failed: ${error.error || setupRes.statusText}`);
      }

      sessionCookie = setupRes.headers.get('Set-Cookie') || '';
      console.log('✅ Success.');
    } else {
      process.stdout.write(`🔑 Admin configured. Logging in... `);
      const loginRes = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: ADMIN_USER, password: ADMIN_PASS })
      });

      if (!loginRes.ok) {
        throw new Error('Login failed. Please check your credentials.');
      }

      sessionCookie = loginRes.headers.get('Set-Cookie') || '';
      console.log('✅ Success.');
    }

    if (!sessionCookie) {
      // It might be that we are already logged in or something else?
      // Actually the API should always return a cookie on success login/setup
    }

    // 2. Count Files for Progress
    process.stdout.write('📂 Scanning content directory... ');
    const files = getAllFiles(CONTENT_DIR);
    console.log(`Found ${files.length} files.`);

    // 3. Upload Content
    console.log('\n📤 Syncing content:');
    let completed = 0;
    for (const file of files) {
      const relativePath = path.relative(CONTENT_DIR, file);
      const percentage = Math.round((completed / files.length) * 100);
      
      process.stdout.write(`   [${percentage}%] ${relativePath}... `);
      
      const content = fs.readFileSync(file);
      const res = await fetch(`${API_URL}/api/content/${relativePath}`, {
        method: 'PUT',
        headers: {
          'Cookie': sessionCookie,
          'Content-Type': getContentType(file)
        },
        body: content
      });

      if (res.ok) {
        completed++;
        process.stdout.write('OK\n');
      } else {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        process.stdout.write(`FAILED (${err.error})\n`);
      }
    }

    console.log('\n✨ Seeding complete! 100%');
  } catch (err) {
    console.error(`\n❌ Error: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}

function getAllFiles(dirPath: string, arrayOfFiles: string[] = []): string[] {
  const files = fs.readdirSync(dirPath);

  files.forEach(function(file) {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
    } else {
      arrayOfFiles.push(path.join(dirPath, "/", file));
    }
  });

  return arrayOfFiles;
}

function getContentType(filename: string): string {
  if (filename.endsWith('.md')) return 'text/markdown';
  if (filename.endsWith('.json')) return 'application/json';
  if (filename.endsWith('.svg')) return 'image/svg+xml';
  return 'application/octet-stream';
}

seed();
