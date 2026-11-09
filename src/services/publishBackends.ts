/**
 * Publishing Backend Templates & Provider Configurations for Qalam Note
 * Supports:
 * 1. Google Apps Script & Google Sheets (Default, Zero-cost spreadsheet backend)
 * 2. Cloudflare Worker Edge Serverless (KV/D1, <15ms latency, 100k requests/day free)
 * 3. Self-Hosted Custom Node.js / Express / Docker (100% data sovereignty on VPS/Railway/Fly.io)
 * 4. GitHub Gist / Repo (Direct personal cloud storage without servers)
 */

import type { PublishProviderType } from '../types';

export interface ProviderMeta {
  id: PublishProviderType;
  name: string;
  badge: string;
  latency: string;
  cost: string;
  description_id: string;
  description_en: string;
  default_placeholder: string;
}

export const PUBLISH_PROVIDERS: ProviderMeta[] = [
  {
    id: 'gas',
    name: 'Google Apps Script & Sheets',
    badge: 'Bawaan / Spreadsheet',
    latency: '~1.5s',
    cost: 'Gratis Selamanya',
    description_id: 'Menyimpan data di Google Spreadsheet pribadi Anda. Mendukung multi-tab wiki dan pembersihan baris otomatis.',
    description_en: 'Stores data directly into your personal Google Sheet. Supports multi-tab wikis and auto-cleanup.',
    default_placeholder: 'https://script.google.com/macros/s/.../exec',
  },
  {
    id: 'cloudflare',
    name: 'Cloudflare Worker (Edge KV)',
    badge: 'Super Cepat <15ms',
    latency: '<15ms',
    cost: 'Gratis 100k req/hari',
    description_id: 'Serverless di 300+ edge datacenter Cloudflare di seluruh dunia. Bebas CORS dan waktu muat instan.',
    description_en: 'Edge serverless across 300+ Cloudflare global datacenters. Zero CORS issues and instant load time.',
    default_placeholder: 'https://qalam-notes.username.workers.dev',
  },
  {
    id: 'custom',
    name: 'Server Mandiri (Self-Host)',
    badge: 'Kedaulatan Penuh',
    latency: '~50ms',
    cost: 'Mandiri (VPS/Docker)',
    description_id: 'Endpoint REST API mandiri yang di-host di VPS pribadi, Docker, Vercel, Railway, atau Fly.io.',
    description_en: 'Independent REST API endpoint hosted on your own VPS, Docker, Vercel, Railway, or Fly.io.',
    default_placeholder: 'https://api.domain-anda.com/qalam-publish',
  },
  {
    id: 'github_gist',
    name: 'GitHub Gist / Repository',
    badge: 'Cloud Pribadi Git',
    latency: '~300ms',
    cost: 'Gratis Akun GitHub',
    description_id: 'Menyimpan catatan langsung sebagai Secret Gist di akun GitHub Anda via Personal Access Token.',
    description_en: 'Stores notes directly as Secret Gists in your personal GitHub account via Personal Access Token.',
    default_placeholder: 'ghp_xxxxxxxxxxxxxxxxxxxx (GitHub PAT)',
  },
];

/**
 * 1. CLOUDFLARE WORKER SCRIPT TEMPLATE (worker.js)
 */
export const CLOUDFLARE_WORKER_SCRIPT_TEMPLATE = `/**
 * ====================================================================
 * QALAM NOTE - CLOUDFLARE WORKER PUBLISHING & SYNC BACKEND
 * Ultra-fast Edge Serverless (<15ms latency), 100k requests/day FREE.
 * Supports Web Publishing, Multi-Tab Wikis, and Full Vault Sync!
 * ====================================================================
 * Panduan Setup (Hanya 2 Menit):
 * 1. Buka dash.cloudflare.com > Workers & Pages > Create application > Create Worker.
 * 2. Di menu Workers & Pages > KV, buat KV Namespace dengan nama "QALAM_KV".
 * 3. Di halaman Worker Anda > Settings > Variables > KV Namespace Bindings:
 *    - Variable name: QALAM_KV
 *    - KV Namespace: Pilih "QALAM_KV" yang tadi dibuat.
 * 4. (Opsional Keamanan): Tambahkan Secret Variable "SYNC_TOKEN" jika ingin membatasi akses sync.
 * 5. Buka tab "Code" pada Worker, hapus kode bawaan, lalu tempel SELURUH skrip ini.
 * 6. Klik tombol "Deploy".
 * 7. Salin URL Worker Anda (contoh: https://qalam-publish.username.workers.dev).
 * 8. Tempelkan URL tersebut ke Pengaturan Publikasi atau Sinkronisasi Qalam Note!
 * ====================================================================
 */

export default {
  async fetch(request, env) {
    // 1. Handle CORS Preflight (OPTIONS)
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization, x-sync-token",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    const url = new URL(request.url);
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json;charset=utf-8",
    };

    const jsonRes = (data, status = 200) =>
      new Response(JSON.stringify(data), { status, headers: corsHeaders });

    try {
      // ----------------------------------------------------
      // GET REQUESTS: Baca Catatan, Wiki, atau Cek Status
      // ----------------------------------------------------
      if (request.method === "GET") {
        const noteId = url.searchParams.get("id");
        const wikiId = url.searchParams.get("w");

        // Ambil Catatan Tunggal / Papan Kanban
        if (noteId) {
          const rawNote = await env.QALAM_KV.get("note:" + noteId);
          if (!rawNote) {
            return jsonRes({ success: false, message: "Catatan tidak ditemukan" }, 404);
          }
          return jsonRes({ success: true, note: JSON.parse(rawNote) });
        }

        // Ambil Bundle Wiki Interaktif
        if (wikiId) {
          const rawWiki = await env.QALAM_KV.get("wiki:" + wikiId);
          if (!rawWiki) {
            return jsonRes({ success: false, message: "Wiki tidak ditemukan" }, 404);
          }
          return jsonRes({ success: true, wiki: JSON.parse(rawWiki) });
        }

        return jsonRes({
          status: "active",
          service: "Qalam Note Cloudflare Publishing & Sync Service",
          version: "1.4.0",
          timestamp: Date.now(),
        });
      }

      // ----------------------------------------------------
      // POST REQUESTS: Publikasi, Cabut, & Sinkronisasi Vault
      // ----------------------------------------------------
      if (request.method === "POST") {
        let payload;
        const textData = await request.text();
        try {
          payload = JSON.parse(textData);
        } catch (e) {
          return jsonRes({ success: false, message: "Invalid JSON payload" }, 400);
        }

        const action = payload.action || "publish";

        // Verifikasi Token Akses (jika SYNC_TOKEN dikonfigurasi di Worker Settings)
        const expectedToken = (env.SYNC_TOKEN || "").trim();
        const verifyAuth = () => {
          if (!expectedToken) return true;
          const authH = (request.headers.get("Authorization") || "").replace(/^Bearer\\s+/i, "").trim();
          const xToken = (request.headers.get("x-sync-token") || "").trim();
          const bodyToken = (payload.token || "").trim();
          return authH === expectedToken || xToken === expectedToken || bodyToken === expectedToken;
        };

        // ==================================================
        // 1. AKSI SINKRONISASI VAULT ANTAR-PERANGKAT (SYNC)
        // ==================================================
        if (action === "sync_test") {
          if (!verifyAuth()) {
            return jsonRes({ success: false, message: "Token sinkronisasi tidak cocok / tidak valid" }, 401);
          }
          const list = await env.QALAM_KV.list({ prefix: "sync:" });
          return jsonRes({
            success: true,
            message: "Koneksi Cloudflare Worker KV Sync berhasil!",
            files_count: list.keys.length,
          });
        }

        if (action === "sync_list") {
          if (!verifyAuth()) return jsonRes({ success: false, message: "Unauthorized" }, 401);
          let allKeys = [];
          let cursor = undefined;
          let hasMore = true;
          while (hasMore) {
            const listRes = await env.QALAM_KV.list({ prefix: "sync:", cursor });
            if (listRes.keys) allKeys = allKeys.concat(listRes.keys);
            if (listRes.list_complete) {
              hasMore = false;
            } else {
              cursor = listRes.cursor;
            }
          }
          const files = allKeys.map((k) => ({
            name: k.name.replace(/^sync:/, ""),
          }));
          return jsonRes({ success: true, files });
        }

        if (action === "sync_get") {
          if (!verifyAuth()) return jsonRes({ success: false, message: "Unauthorized" }, 401);
          const raw = await env.QALAM_KV.get("sync:" + payload.filename);
          if (raw === null) {
            return jsonRes({ success: false, message: "Berkas tidak ditemukan" }, 404);
          }
          return jsonRes({ success: true, content: raw });
        }

        if (action === "sync_put") {
          if (!verifyAuth()) return jsonRes({ success: false, message: "Unauthorized" }, 401);
          await env.QALAM_KV.put("sync:" + payload.filename, payload.content || "");
          return jsonRes({ success: true, message: "Berkas berhasil disimpan ke edge KV" });
        }

        if (action === "sync_del" || action === "sync_delete") {
          if (!verifyAuth()) return jsonRes({ success: false, message: "Unauthorized" }, 401);
          await env.QALAM_KV.delete("sync:" + payload.filename);
          return jsonRes({ success: true, message: "Berkas berhasil dihapus dari edge KV" });
        }

        // ==================================================
        // 2. AKSI PUBLIKASI CATATAN, KANBAN & WIKI
        // ==================================================

        // A. PUBLIKASI CATATAN TUNGGAL / KANBAN
        if (action === "publish") {
          const noteData = {
            id: payload.id,
            slug: payload.slug,
            title: payload.title,
            content: payload.content,
            html: payload.html,
            author: payload.author || "Anonymous",
            tags: payload.tags || [],
            is_todo: Boolean(payload.is_todo),
            todo_completed: Number(payload.todo_completed || 0),
            is_kanban: Boolean(payload.is_kanban),
            kanban_data: payload.kanban_data,
            created_time: payload.created_time || Date.now(),
            updated_time: payload.updated_time || Date.now(),
            published_at: Date.now(),
          };
          await env.QALAM_KV.put("note:" + payload.id, JSON.stringify(noteData));
          return jsonRes({
            success: true,
            id: payload.id,
            message: "Catatan berhasil dipublikasikan ke Cloudflare KV edge!",
          });
        }

        // B. CABUT PUBLIKASI CATATAN TUNGGAL
        if (action === "unpublish") {
          await env.QALAM_KV.delete("note:" + payload.id);
          return jsonRes({
            success: true,
            message: "Catatan berhasil dicabut dari Cloudflare KV.",
          });
        }

        // C. PUBLIKASI BUNDLE WIKI FOLDER
        if (action === "publish_wiki") {
          const bundleObj = typeof payload.bundle === "string"
            ? JSON.parse(payload.bundle)
            : payload.bundle;

          const targetId = payload.folder_id || payload.id;
          await env.QALAM_KV.put("wiki:" + targetId, JSON.stringify(bundleObj));
          return jsonRes({
            success: true,
            folder_id: targetId,
            message: "Bundle Wiki berhasil dipublikasikan ke Cloudflare KV edge!",
          });
        }

        // D. CABUT PUBLIKASI WIKI FOLDER
        if (action === "unpublish_wiki" || action === "delete_wiki") {
          const targetId = payload.folder_id || payload.id;
          await env.QALAM_KV.delete("wiki:" + targetId);
          return jsonRes({
            success: true,
            message: "Wiki berhasil dicabut dari Cloudflare KV.",
          });
        }

        return jsonRes({ success: false, message: "Aksi tidak dikenali" }, 400);
      }

      return jsonRes({ message: "Metode HTTP tidak diizinkan" }, 405);
    } catch (err) {
      return jsonRes({ success: false, error: err.message || "Internal server error" }, 500);
    }
  },
};`;

/**
 * 2. CUSTOM SELF-HOSTED NODE.JS / EXPRESS SCRIPT TEMPLATE (server.js)
 */
export const CUSTOM_SERVERLESS_SCRIPT_TEMPLATE = `/**
 * ====================================================================
 * QALAM NOTE - CUSTOM SELF-HOSTED SERVER (NODE.JS / EXPRESS)
 * 100% Data Sovereignty, Zero-dependency local JSON & Vault store.
 * Compatible with VPS, Docker, Railway, Fly.io, or Render.
 * Supports Web Publishing, Multi-Tab Wikis, and Vault Synchronization!
 * ====================================================================
 * Panduan Menjalankan:
 * 1. Buat folder baru, simpan file ini sebagai server.js
 * 2. Buka terminal di folder tersebut dan jalankan:
 *      npm init -y
 *      npm install express cors
 * 3. (Opsional): Tentukan token rahasia dengan export SYNC_TOKEN="rahasia-anda"
 * 4. Jalankan server:
 *      node server.js
 * 5. Pasang reverse-proxy HTTPS (Nginx, Caddy, atau Cloudflare Tunnel).
 * ====================================================================
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.text({ limit: '50mb' }));

// Folder penyimpanan publikasi dan sinkronisasi
const DATA_DIR = path.join(__dirname, 'qalam_store');
const SYNC_DIR = path.join(DATA_DIR, 'sync_vault');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(SYNC_DIR)) fs.mkdirSync(SYNC_DIR, { recursive: true });

const EXPECTED_TOKEN = (process.env.SYNC_TOKEN || '').trim();

function verifyAuth(req, body) {
  if (!EXPECTED_TOKEN) return true;
  const authH = (req.headers['authorization'] || '').replace(/^Bearer\\s+/i, '').trim();
  const xToken = (req.headers['x-sync-token'] || '').trim();
  const bodyToken = ((body && body.token) || '').trim();
  return authH === EXPECTED_TOKEN || xToken === EXPECTED_TOKEN || bodyToken === EXPECTED_TOKEN;
}

// GET: Baca catatan atau wiki untuk tampilan publik
app.get('/', (req, res) => {
  const { id, w } = req.query;

  // Baca Catatan
  if (id) {
    const file = path.join(DATA_DIR, \\\`note_\\\${id}.json\\\`);
    if (!fs.existsSync(file)) {
      return res.status(404).json({ success: false, message: 'Catatan tidak ditemukan' });
    }
    const note = JSON.parse(fs.readFileSync(file, 'utf-8'));
    return res.json({ success: true, note });
  }

  // Baca Wiki
  if (w) {
    const file = path.join(DATA_DIR, \\\`wiki_\\\${w}.json\\\`);
    if (!fs.existsSync(file)) {
      return res.status(404).json({ success: false, message: 'Wiki tidak ditemukan' });
    }
    const wiki = JSON.parse(fs.readFileSync(file, 'utf-8'));
    return res.json({ success: true, wiki });
  }

  return res.json({ status: 'ok', service: 'Qalam Custom Server', version: '1.4.0' });
});

// POST: Publikasi & Cabut Catatan / Wiki / Sinkronisasi Vault
app.post('/', (req, res) => {
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) {}
  }
  const action = body.action || 'publish';

  // ==================================================
  // 1. SINKRONISASI VAULT (SYNC)
  // ==================================================
  if (action === 'sync_test') {
    if (!verifyAuth(req, body)) {
      return res.status(401).json({ success: false, message: 'Token sinkronisasi tidak valid' });
    }
    const count = fs.readdirSync(SYNC_DIR).filter((f) => f.endsWith('.md')).length;
    return res.json({
      success: true,
      message: 'Koneksi Server Mandiri Sync berhasil!',
      files_count: count,
    });
  }

  if (action === 'sync_list') {
    if (!verifyAuth(req, body)) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const files = fs.readdirSync(SYNC_DIR)
      .filter((f) => f.endsWith('.md'))
      .map((name) => ({ name }));
    return res.json({ success: true, files });
  }

  if (action === 'sync_get') {
    if (!verifyAuth(req, body)) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const safeFilename = path.basename(body.filename || '');
    const targetFile = path.join(SYNC_DIR, safeFilename);
    if (!fs.existsSync(targetFile)) {
      return res.status(404).json({ success: false, message: 'Berkas tidak ditemukan' });
    }
    const content = fs.readFileSync(targetFile, 'utf-8');
    return res.json({ success: true, content });
  }

  if (action === 'sync_put') {
    if (!verifyAuth(req, body)) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const safeFilename = path.basename(body.filename || '');
    const targetFile = path.join(SYNC_DIR, safeFilename);
    fs.writeFileSync(targetFile, body.content || '', 'utf-8');
    return res.json({ success: true, message: 'Berkas berhasil disimpan di server mandiri' });
  }

  if (action === 'sync_del' || action === 'sync_delete') {
    if (!verifyAuth(req, body)) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const safeFilename = path.basename(body.filename || '');
    const targetFile = path.join(SYNC_DIR, safeFilename);
    if (fs.existsSync(targetFile)) fs.unlinkSync(targetFile);
    return res.json({ success: true, message: 'Berkas berhasil dihapus' });
  }

  // ==================================================
  // 2. PUBLIKASI CATATAN & WIKI
  // ==================================================

  // 1. Publikasi Catatan
  if (action === 'publish') {
    fs.writeFileSync(path.join(DATA_DIR, \\\`note_\\\${body.id}.json\\\`), JSON.stringify(body, null, 2));
    return res.json({ success: true, message: 'Catatan berhasil dipublikasikan di server mandiri!' });
  }

  // 2. Cabut Publikasi Catatan
  if (action === 'unpublish') {
    const p = path.join(DATA_DIR, \\\`note_\\\${body.id}.json\\\`);
    if (fs.existsSync(p)) fs.unlinkSync(p);
    return res.json({ success: true, message: 'Catatan berhasil dicabut.' });
  }

  // 3. Publikasi Wiki
  if (action === 'publish_wiki') {
    const targetId = body.folder_id || body.id;
    const bundle = typeof body.bundle === 'string' ? JSON.parse(body.bundle) : body.bundle;
    fs.writeFileSync(path.join(DATA_DIR, \\\`wiki_\\\${targetId}.json\\\`), JSON.stringify(bundle, null, 2));
    return res.json({ success: true, message: 'Wiki berhasil dipublikasikan di server mandiri!' });
  }

  // 4. Cabut Publikasi Wiki
  if (action === 'unpublish_wiki' || action === 'delete_wiki') {
    const targetId = body.folder_id || body.id;
    const p = path.join(DATA_DIR, \\\`wiki_\\\${targetId}.json\\\`);
    if (fs.existsSync(p)) fs.unlinkSync(p);
    return res.json({ success: true, message: 'Wiki berhasil dicabut.' });
  }

  return res.status(400).json({ success: false, message: 'Aksi tidak dikenali' });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(\\\`[Qalam Note] Server berjalan di http://localhost:\\\${PORT}\\\`);
});`;

