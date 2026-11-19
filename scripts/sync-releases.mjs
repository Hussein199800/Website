// يحدّث projects.json من آخر إصدار منشور لكل تطبيق له "repo":
// رقم الإصدار، و«شو الجديد» من ملاحظات الإصدار، وتفعيل زر التحميل إذا وُجد ملف الـ APK.
// الاستخدام: GITHUB_TOKEN=... node scripts/sync-releases.mjs
import { readFile, writeFile } from 'node:fs/promises';

const FILE = new URL('../projects.json', import.meta.url);
const MAX_ITEMS = 4;
const token = process.env.GITHUB_TOKEN;

async function latestRelease(repo) {
  const res = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'portfolio-sync',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`${repo}: HTTP ${res.status}`);
  return res.json();
}

const MAX_LEN = 140;

// نقطة طويلة تُختصر عند أول نهاية جملة حتى تبقى البطاقة مقروءة
function shorten(text) {
  if (text.length <= MAX_LEN) return text;
  const cut = text.slice(0, MAX_LEN).search(/[.،؛](?=[^.،؛]*$)/);
  return (cut > 40 ? text.slice(0, cut) : text.slice(0, MAX_LEN)).trim() + '…';
}

export function bullets(body) {
  return (body || '')
    .split('\n')
    // النقاط الرئيسية فقط: النقاط الفرعية المزاحة تفاصيل لا تلزم البطاقة
    .filter((l) => /^[•\-*]\s+/.test(l))
    // ملاحظات GitHub التلقائية («… by @user in https://…») ليست وصفاً للمستخدم
    .filter((l) => !/https?:\/\/|\sby\s@/.test(l))
    .map((l) => l.replace(/^[•\-*]\s+/, '').replace(/\*\*/g, '').trim())
    // الإصلاحات والتغييرات التقنية لا تهم الزائر
    .filter((l) => l && !/^(إصلاح|fix|chore|ci|فحص GitHub)/i.test(l))
    .map((l) => shorten(l.replace(/[:：]$/, '')))
    .slice(0, MAX_ITEMS);
}

export function apply(project, release) {
  const p = { ...project };
  if (!release) {
    p.available = false;
    return p;
  }
  p.version = String(release.tag_name || '').replace(/^v/i, '') || p.version;
  const hasApk = (release.assets || []).some((a) => a.name === p.apk);
  if (hasApk) {
    delete p.available;
    p.url = `https://github.com/${p.repo}/releases/latest/download/${p.apk}`;
  } else {
    p.available = false;
  }
  // «شو الجديد» المكتوب يدوياً لإصدار معيّن يبقى حتى ينزل إصدار أحدث منه
  const pinned = p.whatsNewFor && p.whatsNewFor === p.version;
  const items = bullets(release.body);
  if (!pinned && items.length) {
    p.whatsNew = items;
    delete p.whatsNewFor;
  }
  return p;
}

async function main() {
  const raw = await readFile(FILE, 'utf8');
  const data = JSON.parse(raw);
  let failed = 0;
  for (let i = 0; i < data.projects.length; i++) {
    const p = data.projects[i];
    if (!p.repo || p.type !== 'app') continue;
    try {
      data.projects[i] = apply(p, await latestRelease(p.repo));
      console.log(`${p.id}: v${data.projects[i].version}${data.projects[i].available === false ? ' (غير متاح)' : ''}`);
    } catch (e) {
      failed++;
      console.error(`${p.id}: ${e.message} — تُرك كما هو`);
    }
  }
  const out = JSON.stringify(data, null, 2) + '\n';
  if (out !== raw) {
    await writeFile(FILE, out);
    console.log('projects.json تحدّث');
  } else {
    console.log('لا تغييرات');
  }
  if (failed === data.projects.filter((p) => p.repo).length && failed > 0) process.exit(1);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
