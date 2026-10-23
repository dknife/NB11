/* 늘벗 11기 — 공용 복호화 게이트
   - 공유 암호 입력 → PBKDF2-SHA256(300k)로 AES-256-GCM 키 유도
   - 세션 동안 암호를 sessionStorage에 보관(페이지 이동 시 재사용)
   - .enc 파일(IV‖암호문‖GCM태그)을 복호화해 blob URL 반환
   tools/encrypt.mjs 의 SALT/ITER/형식과 일치해야 함. */
(function () {
  var SALT_HEX = '218b8d30e97bc31b8687f5884d76faa3', ITER = 300000;
  var STORE = 'nb11_pass';

  // 자기 자신(crypto.js)의 경로로 assets 디렉터리를 찾아 unlock.enc를 해석
  var self = document.currentScript ? document.currentScript.src : '';
  var ASSETS = self.replace(/crypto\.js(?:\?.*)?$/, '');
  var UNLOCK_URL = ASSETS + 'unlock.enc';

  function hexBytes(h) { var a = new Uint8Array(h.length / 2); for (var i = 0; i < a.length; i++) a[i] = parseInt(h.substr(i * 2, 2), 16); return a; }
  function mimeFor(url) {
    var m = url.replace(/\.enc$/, '').match(/\.([a-z0-9]+)$/i);
    var e = m ? m[1].toLowerCase() : '';
    return { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', mp4: 'video/mp4', webm: 'video/webm' }[e] || 'application/octet-stream';
  }

  function deriveKey(pass) {
    return crypto.subtle.importKey('raw', new TextEncoder().encode(pass), { name: 'PBKDF2' }, false, ['deriveKey'])
      .then(function (base) {
        return crypto.subtle.deriveKey(
          { name: 'PBKDF2', salt: hexBytes(SALT_HEX), iterations: ITER, hash: 'SHA-256' },
          base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
      });
  }
  function decryptBytes(key, buf) {
    return crypto.subtle.decrypt({ name: 'AES-GCM', iv: buf.slice(0, 12) }, key, buf.slice(12));
  }
  function verify(key) {
    return fetch(UNLOCK_URL, { cache: 'no-store' })
      .then(function (r) { return r.arrayBuffer(); })
      .then(function (ab) { return decryptBytes(key, new Uint8Array(ab)); })
      .then(function (pt) { return new TextDecoder().decode(pt) === 'nb11-ok'; })
      .catch(function () { return false; });
  }

  var _key = null, _resolveReady;
  var ready = new Promise(function (res) { _resolveReady = res; });

  var API = {
    ready: ready,                    // 잠금 해제(키 확보) 시 resolve
    get unlocked() { return !!_key; },
    decryptURL: function (encUrl) {
      return ready.then(function () {
        return fetch(encUrl).then(function (r) {
          if (!r.ok) throw new Error('fetch ' + encUrl + ' ' + r.status);
          return r.arrayBuffer();
        }).then(function (ab) {
          return decryptBytes(_key, new Uint8Array(ab));
        }).then(function (pt) {
          return URL.createObjectURL(new Blob([pt], { type: mimeFor(encUrl) }));
        });
      });
    }
  };
  window.NBCrypto = API;

  if (!(window.crypto && crypto.subtle)) {
    // 보안 컨텍스트(https/localhost) 아님 → 안내만
    showGate(true);
    return;
  }

  // 세션에 저장된 암호가 있으면 자동 해제 시도
  var saved = null; try { saved = sessionStorage.getItem(STORE); } catch (e) {}
  if (saved) {
    deriveKey(saved).then(function (k) {
      return verify(k).then(function (ok) {
        if (ok) { _key = k; _resolveReady(); }
        else { try { sessionStorage.removeItem(STORE); } catch (e) {} showGate(false); }
      });
    }).catch(function () { showGate(false); });
  } else {
    showGate(false);
  }

  /* ---------------- 게이트 UI (모든 페이지 공통, 스타일 주입) ---------------- */
  function showGate(insecure) {
    var css = ''
      + '#nbgate{position:fixed;inset:0;z-index:5000;background:#F3F0E7;display:flex;align-items:center;justify-content:center;padding:24px;text-align:center;font-family:"Noto Sans KR",sans-serif;transition:opacity .6s cubic-bezier(.22,1,.36,1),visibility .6s}'
      + '#nbgate.pass{opacity:0;visibility:hidden}'
      + '#nbgate .card{max-width:460px;width:100%}'
      + '#nbgate .eyebrow{font-family:"Space Grotesk",sans-serif;font-size:12.5px;font-weight:600;text-transform:uppercase;letter-spacing:.22em;color:#8B8676;margin-bottom:22px}'
      + '#nbgate .eyebrow::before,#nbgate .eyebrow::after{content:"—";margin:0 10px;color:rgba(28,27,23,.3)}'
      + '#nbgate .q{font-family:"Space Grotesk","Noto Sans KR",sans-serif;font-size:clamp(26px,5.4vw,40px);font-weight:800;letter-spacing:-.02em;line-height:1.15;color:#1C1B17}'
      + '#nbgate .q .accent{color:#E0502A}'
      + '#nbgate .sub{margin-top:14px;color:#45413A;font-size:14.5px}'
      + '#nbgate form{display:flex;gap:10px;margin-top:30px}'
      + '#nbgate input{flex:1;min-width:0;height:54px;padding:0 18px;border:1px solid rgba(28,27,23,.3);border-radius:4px;font-size:16px;background:#FBF9F3;color:#1C1B17}'
      + '#nbgate input:focus{outline:none;border-color:#E0502A}'
      + '#nbgate button{height:54px;padding:0 26px;background:#1C1B17;color:#F3F0E7;border:1px solid #1C1B17;border-radius:4px;font-family:"Space Grotesk",sans-serif;font-weight:600;font-size:15px;cursor:pointer;transition:all .25s}'
      + '#nbgate button:hover{background:transparent;color:#1C1B17}'
      + '#nbgate .msg{min-height:22px;margin-top:16px;font-size:14px;color:#E0502A;font-weight:500}'
      + '#nbgate .shake{animation:nbshake .4s}'
      + '@keyframes nbshake{10%,90%{transform:translateX(-2px)}20%,80%{transform:translateX(4px)}30%,50%,70%{transform:translateX(-8px)}40%,60%{transform:translateX(8px)}}'
      + '@media(max-width:480px){#nbgate form{flex-direction:column}#nbgate button{width:100%}}';
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

    var gate = document.createElement('div');
    gate.id = 'nbgate';
    gate.innerHTML = '<div class="card">'
      + '<div class="eyebrow">늘벗 11기 · 입장</div>'
      + '<div class="q">공유 <span class="accent">암호</span>를 입력하세요</div>'
      + (insecure ? '<div class="msg">이 페이지는 보안 연결(https)에서만 사진을 볼 수 있어요.</div>'
                  : '<form autocomplete="off"><input type="password" placeholder="공유 암호" aria-label="공유 암호" /><button type="submit">입장</button></form><div class="msg" aria-live="polite"></div>')
      + '</div>';

    function mount() {
      document.body.appendChild(gate);
      document.documentElement.style.overflow = 'hidden'; document.body.style.overflow = 'hidden';
      if (insecure) return;
      var form = gate.querySelector('form'), inp = gate.querySelector('input'),
          msg = gate.querySelector('.msg'), btn = gate.querySelector('button'), card = gate.querySelector('.card');
      setTimeout(function () { inp.focus(); }, 350);
      function fail() {
        msg.textContent = '암호가 맞지 않아요. 다시 시도해 주세요.';
        card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake'); inp.select();
      }
      form.addEventListener('submit', function (e) {
        e.preventDefault(); btn.disabled = true; msg.textContent = '확인 중…';
        var pass = inp.value;
        deriveKey(pass).then(function (k) {
          return verify(k).then(function (ok) {
            btn.disabled = false;
            if (!ok) { fail(); return; }
            try { sessionStorage.setItem(STORE, pass); } catch (e) {}
            _key = k; _resolveReady();
            msg.textContent = '';
            gate.classList.add('pass');
            document.documentElement.style.overflow = ''; document.body.style.overflow = '';
            setTimeout(function () { if (gate.parentNode) gate.parentNode.removeChild(gate); }, 700);
          });
        }).catch(function () { btn.disabled = false; fail(); });
      });
    }
    if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);
  }
})();
