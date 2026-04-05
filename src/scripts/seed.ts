import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const CONTENT_DIR = path.join(ROOT, 'content');

// Configuration - can be overridden by env vars
const API_URL = process.env.API_URL || 'http://localhost:8787';
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'adminpassword123';

async function seed() {
  console.log(`🚀 Starting seed process for ${API_URL}...`);

  try {
    // 1. Check Auth Status
    const statusRes = await fetch(`${API_URL}/api/auth/status`);
    const status = await statusRes.json();

    let sessionToken = '';

    if (!status.configured) {
      console.log('📝 Admin not configured. Performing first-time setup...');
      const setupRes = await fetch(`${API_URL}/api/auth/setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: ADMIN_USER, password: ADMIN_PASS })
      });

      if (!setupRes.ok) {
        const error = await setupRes.json();
        throw new Error(`Setup failed: ${error.error || setupRes.statusText}`);
      }

      sessionToken = setupRes.headers.get('X-Session-Token');
      console.log('✅ Admin configured successfully.');
    } else {
      console.log(`🔑 Admin already configured as "${status.username}". Logging in...`);
      const loginRes = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: ADMIN_USER, password: ADMIN_PASS })
      });

      if (!loginRes.ok) {
        throw new Error('Login failed. Please check ADMIN_USER and ADMIN_PASS env vars.');
      }

      sessionToken = loginRes.headers.get('X-Session-Token');
      console.log('✅ Login successful.');
    }

    // 2. Upload Content
    console.log('📂 Syncing content directory...');
    await uploadDirectory(CONTENT_DIR, '', sessionToken);

    console.log('\n✨ Seeding complete!');
  } catch (err) {
    console.error(`\n❌ Seeding failed: ${err.message}`);
    process.exit(1);
  }
}

async function uploadDirectory(dir, subpath, token) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const remotePath = subpath ? `${subpath}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      await uploadDirectory(fullPath, remotePath, token);
    } else {
      process.stdout.write(`  ⬆️  Uploading ${remotePath}... `);
      const content = fs.readFileSync(fullPath);
      
      const res = await fetch(`${API_URL}/api/content/${remotePath}`, {
        method: 'PUT',
        headers: {
          'X-Session-Token': token,
          'Content-Type': getContentType(entry.name)
        },
        body: content
      });

      if (res.ok) {
        console.log('Done.');
      } else {
        console.log('Failed.');
        const err = await res.json().catch(() => ({ error: res.statusText }));
        console.error(`     Error: ${err.error}`);
      }
    }
  }
}

function getContentType(filename) {
  if (filename.endsWith('.md')) return 'text/markdown';
  if (filename.endsWith('.json')) return 'application/json';
  if (filename.endsWith('.svg')) return 'image/svg+xml';
  return 'application/octet-stream';
}

seed();
