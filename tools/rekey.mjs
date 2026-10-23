// 늘벗 11기 — 공유 암호 교체(rekey) 스크립트
//
// 평문을 디스크에 남기지 않고, 기존 .enc 파일을 옛 키로 복호화해 새 키로 재암호화한다.
// SALT/ITER/형식은 encrypt.mjs·crypto.js 와 동일. 암호만 바뀌므로 crypto.js는 수정 불필요.
//
// 사용법: NB11_OLD_PASSPHRASE='옛암호' NB11_NEW_PASSPHRASE='새암호' node tools/rekey.mjs
import { createCipheriv, createDecipheriv, pbkdf2Sync, randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SALT = Buffer.from('218b8d30e97bc31b8687f5884d76faa3', 'hex');
const ITER = 300000;

const oldPass = process.env.NB11_OLD_PASSPHRASE;
const newPass = process.env.NB11_NEW_PASSPHRASE;
if (!oldPass || !newPass) { console.error('NB11_OLD_PASSPHRASE / NB11_NEW_PASSPHRASE 환경변수가 필요합니다.'); process.exit(1); }

const oldKey = pbkdf2Sync(Buffer.from(oldPass.normalize('NFC'), 'utf8'), SALT, ITER, 32, 'sha256');
const newKey = pbkdf2Sync(Buffer.from(newPass.normalize('NFC'), 'utf8'), SALT, ITER, 32, 'sha256');

function decrypt(buf, key) {                 // IV(12) ‖ ciphertext ‖ tag(16)
  const iv = buf.subarray(0, 12), tag = buf.subarray(buf.length - 16), ct = buf.subarray(12, buf.length - 16);
  const d = createDecipheriv('aes-256-gcm', key, iv); d.setAuthTag(tag);
  return Buffer.concat([d.update(ct), d.final()]);
}
function encrypt(buf, key) {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([c.update(buf), c.final()]);
  return Buffer.concat([iv, enc, c.getAuthTag()]);
}

const FOLDERS = ['NB11_2020/Photo', 'NB11_2022/Photo', 'NB11_2023_부산소모임/Photo', 'NB11_2024/Photo', 'NB11_2026/Photos'];
const files = [];
for (const f of FOLDERS) {
  const dir = join(ROOT, f);
  if (!existsSync(dir)) continue;
  for (const name of readdirSync(dir)) if (name.endsWith('.enc')) files.push(join(f, name));
}
if (existsSync(join(ROOT, 'hero.jpg.enc'))) files.push('hero.jpg.enc');
if (existsSync(join(ROOT, 'assets/unlock.enc'))) files.push('assets/unlock.enc');

let n = 0;
for (const rel of files) {
  const p = join(ROOT, rel);
  writeFileSync(p, encrypt(decrypt(readFileSync(p), oldKey), newKey));
  n++;
}
console.log(`✓ ${n}개 파일 재암호화(rekey) 완료`);
