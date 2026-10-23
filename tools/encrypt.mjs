// 늘벗 11기 — 사진 암호화 빌드 스크립트
//
// 공유 암호에서 PBKDF2-SHA256(300k)로 AES-256-GCM 키를 유도해,
// 대상 사진/영상을 `<파일>.enc`(IV‖암호문‖GCM태그)로 암호화하고 평문 원본을 삭제한다.
// 클라이언트(assets/crypto.js)의 SALT/ITER/형식과 반드시 일치해야 한다.
//
// 사용법:  NB11_PASSPHRASE='공유암호' node tools/encrypt.mjs
//          NB11_PASSPHRASE='공유암호' node tools/encrypt.mjs --verify-only   (unlock.enc만 재생성)
import { createCipheriv, pbkdf2Sync, randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync, rmSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// crypto.js 와 동일해야 하는 상수
const SALT = Buffer.from('218b8d30e97bc31b8687f5884d76faa3', 'hex');
const ITER = 300000;
const SENTINEL = 'nb11-ok';           // 암호 검증용 평문
const UNLOCK_FILE = 'assets/unlock.enc';

const pass = process.env.NB11_PASSPHRASE;
if (!pass) { console.error('환경변수 NB11_PASSPHRASE 가 필요합니다.'); process.exit(1); }
const verifyOnly = process.argv.includes('--verify-only');

const key = pbkdf2Sync(Buffer.from(pass.normalize('NFC'), 'utf8'), SALT, ITER, 32, 'sha256');

function encrypt(buf) {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([c.update(buf), c.final()]);
  const tag = c.getAuthTag();            // 16 bytes
  return Buffer.concat([iv, enc, tag]);  // IV(12) ‖ ciphertext ‖ tag(16)
}

// 암호 검증용 sentinel
writeFileSync(join(ROOT, UNLOCK_FILE), encrypt(Buffer.from(SENTINEL, 'utf8')));
console.log('✓', UNLOCK_FILE);
if (verifyOnly) process.exit(0);

// 암호화 대상 수집: 갤러리 폴더의 모든 파일 + hero.jpg
const FOLDERS = [
  'NB11_2020/Photo', 'NB11_2022/Photo', 'NB11_2023_부산소모임/Photo',
  'NB11_2024/Photo', 'NB11_2026/Photos',
];
const targets = [];
for (const f of FOLDERS) {
  const dir = join(ROOT, f);
  if (!existsSync(dir)) continue;
  for (const name of readdirSync(dir)) {
    if (name.endsWith('.enc')) continue;
    targets.push(join(f, name));
  }
}
if (existsSync(join(ROOT, 'hero.jpg'))) targets.push('hero.jpg');

let n = 0;
for (const rel of targets) {
  const src = join(ROOT, rel);
  writeFileSync(src + '.enc', encrypt(readFileSync(src)));
  rmSync(src);                            // 평문 원본 제거
  n++;
}
console.log(`✓ ${n}개 파일 암호화 완료 (평문 원본 삭제)`);
