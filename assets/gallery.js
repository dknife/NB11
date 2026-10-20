/* 늘벗 11기 — 공용 사진 갤러리 + 라이트박스
   사용법: window.TRIP = { folder:'Photo', count:15, videos:{55:'mp4'} } 설정 후,
   <div id="gallery" class="nb-gallery"></div> 컨테이너와 함께 이 스크립트를 로드. */
(function () {
  var cfg = window.TRIP || {};
  var folder = (cfg.folder || 'Photo').replace(/\/$/, '');
  var count = cfg.count || 0;
  var videos = cfg.videos || {};        // { indexNumber: 'mp4' }
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };

  /* --- 스타일 주입 (어떤 페이지에서도 동일하게 동작) --- */
  var css = ''
    + '.nb-gallery{display:grid;grid-template-columns:repeat(auto-fill,minmax(168px,1fr));gap:12px}'
    + '.nb-cell{position:relative;aspect-ratio:1/1;padding:0;border:1px solid rgba(28,27,23,.14);border-radius:4px;overflow:hidden;cursor:pointer;background:#EAE6DA;display:block}'
    + '.nb-cell img,.nb-cell video{width:100%;height:100%;object-fit:cover;display:block;transition:transform .45s cubic-bezier(.22,1,.36,1),filter .3s ease}'
    + '.nb-cell:hover img,.nb-cell:hover video{transform:scale(1.05);filter:brightness(1.04)}'
    + '.nb-cell:focus-visible{outline:2px solid var(--accent,#E0502A);outline-offset:2px}'
    + '.nb-play{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.22);color:#fff;font-size:26px;pointer-events:none}'
    + '.nb-play span{width:52px;height:52px;border-radius:50%;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;padding-left:4px}'
    + '.nb-cell.in{animation:nbUp .6s cubic-bezier(.22,1,.36,1) both}'
    + '@keyframes nbUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}'
    + '.nb-lb{position:fixed;inset:0;z-index:2000;background:rgba(18,17,14,.93);-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px);display:none;align-items:center;justify-content:center}'
    + '.nb-lb.open{display:flex}'
    + '.nb-lb-stage{max-width:92vw;max-height:86vh;display:flex;align-items:center;justify-content:center}'
    + '.nb-lb-stage img,.nb-lb-stage video{max-width:92vw;max-height:86vh;border-radius:4px;box-shadow:0 24px 70px rgba(0,0,0,.55)}'
    + '.nb-lb button{position:absolute;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.22);color:#fff;cursor:pointer;width:52px;height:52px;border-radius:50%;font-size:24px;line-height:1;display:flex;align-items:center;justify-content:center;transition:background .2s ease}'
    + '.nb-lb button:hover{background:rgba(255,255,255,.2)}'
    + '.nb-lb .nb-close{top:20px;right:20px;font-size:22px}'
    + '.nb-lb .nb-prev{left:16px;top:50%;transform:translateY(-50%)}'
    + '.nb-lb .nb-next{right:16px;top:50%;transform:translateY(-50%)}'
    + '.nb-lb .nb-counter{position:absolute;bottom:22px;left:50%;transform:translateX(-50%);font-family:var(--disp,sans-serif);font-size:13px;letter-spacing:.1em;color:rgba(255,255,255,.8);background:none;border:none;width:auto;height:auto;cursor:default}'
    + '@media(max-width:600px){.nb-gallery{grid-template-columns:repeat(auto-fill,minmax(104px,1fr));gap:7px}.nb-lb .nb-prev{left:8px}.nb-lb .nb-next{right:8px}.nb-lb button{width:44px;height:44px}}'
    + '@media(prefers-reduced-motion:reduce){.nb-cell.in{animation:none}.nb-cell:hover img,.nb-cell:hover video{transform:none}}';
  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  /* --- 아이템 목록 --- */
  var items = [];
  for (var i = 1; i <= count; i++) {
    var ext = videos[i] || 'jpg';
    items.push({ src: folder + '/photo' + pad(i) + '.' + ext, video: !!videos[i], n: i });
  }

  var grid = document.getElementById('gallery');
  if (!grid) return;

  var io = ('IntersectionObserver' in window)
    ? new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
      }, { threshold: 0.05 })
    : null;

  items.forEach(function (it, idx) {
    var cell = document.createElement('button');
    cell.className = 'nb-cell';
    cell.type = 'button';
    cell.setAttribute('aria-label', '사진 ' + it.n + ' 크게 보기');
    if (it.video) {
      cell.innerHTML = '<video src="' + it.src + '" muted playsinline preload="metadata"></video><span class="nb-play"><span>&#9654;</span></span>';
    } else {
      cell.innerHTML = '<img src="' + it.src + '" loading="lazy" alt="늘벗 11기 사진 ' + it.n + '">';
    }
    cell.addEventListener('click', function () { open(idx); });
    grid.appendChild(cell);
    if (io) io.observe(cell); else cell.classList.add('in');
  });

  /* --- 라이트박스 --- */
  var lb = document.createElement('div');
  lb.className = 'nb-lb';
  lb.innerHTML = '<button class="nb-close" aria-label="닫기">&#10005;</button>'
    + '<button class="nb-prev" aria-label="이전">&#8249;</button>'
    + '<button class="nb-next" aria-label="다음">&#8250;</button>'
    + '<div class="nb-lb-stage"></div>'
    + '<div class="nb-counter"></div>';
  document.body.appendChild(lb);
  var stage = lb.querySelector('.nb-lb-stage');
  var counter = lb.querySelector('.nb-counter');
  var cur = 0;

  function render() {
    var it = items[cur];
    stage.innerHTML = it.video
      ? '<video src="' + it.src + '" controls autoplay playsinline></video>'
      : '<img src="' + it.src + '" alt="늘벗 11기 사진 ' + it.n + '">';
    counter.textContent = (cur + 1) + ' / ' + items.length;
  }
  function open(i) { cur = i; render(); lb.classList.add('open'); document.body.style.overflow = 'hidden'; }
  function close() { lb.classList.remove('open'); stage.innerHTML = ''; document.body.style.overflow = ''; }
  function go(d) { cur = (cur + d + items.length) % items.length; render(); }

  lb.querySelector('.nb-close').addEventListener('click', close);
  lb.querySelector('.nb-prev').addEventListener('click', function () { go(-1); });
  lb.querySelector('.nb-next').addEventListener('click', function () { go(1); });
  lb.addEventListener('click', function (e) { if (e.target === lb) close(); });
  document.addEventListener('keydown', function (e) {
    if (!lb.classList.contains('open')) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft') go(-1);
    else if (e.key === 'ArrowRight') go(1);
  });
})();
