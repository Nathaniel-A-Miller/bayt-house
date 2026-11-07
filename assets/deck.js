/* Tracing bayt — slide deck behaviour.
   Keys: ←/→ (or PageUp/PageDown, space) navigate · N notes · G overview · T timer · F fullscreen · Esc close */
(function () {
  const slides = Array.from(document.querySelectorAll('.slide'));
  const fill = document.querySelector('.topbar .fill');
  const counter = document.getElementById('counter');
  const dots = document.getElementById('dots');
  const notesPanel = document.getElementById('notes');
  const lightbox = document.getElementById('lightbox');
  const lightImg = lightbox.querySelector('img');
  const gridView = document.getElementById('grid');
  const timerEl = document.getElementById('timer');
  let cur = 0;
  let mapReady = false;

  // dots + overview cards
  const cards = gridView.querySelector('.cards');
  slides.forEach((s, i) => {
    const d = document.createElement('button');
    d.setAttribute('aria-label', 'Go to slide ' + (i + 1));
    d.addEventListener('click', () => go(i));
    dots.appendChild(d);
    const c = document.createElement('button');
    c.innerHTML = '<b>' + (i + 1) + '</b>' + (s.dataset.title || 'Slide ' + (i + 1));
    c.addEventListener('click', () => { go(i); toggleGrid(false); });
    cards.appendChild(c);
  });

  function go(i, fromHash) {
    i = Math.max(0, Math.min(slides.length - 1, i));
    slides[cur].classList.remove('active');
    cur = i;
    const s = slides[cur];
    s.classList.add('active');
    s.scrollTop = 0;
    counter.textContent = (cur + 1) + ' / ' + slides.length;
    fill.style.width = ((cur) / (slides.length - 1) * 100) + '%';
    dots.querySelectorAll('button').forEach((d, k) => d.classList.toggle('on', k === cur));
    cards.querySelectorAll('button').forEach((d, k) => d.classList.toggle('cur', k === cur));
    const n = s.querySelector('.notes');
    notesPanel.querySelector('.body').innerHTML = n ? n.innerHTML : '<p>No notes for this slide.</p>';
    if (!fromHash) history.replaceState(null, '', '#' + (cur + 1));
    document.title = (s.dataset.title ? s.dataset.title + ' · ' : '') + 'Tracing bayt Across Three Millennia';
    if (s.id === 'map-slide') initMap();
  }
  const next = () => go(cur + 1);
  const prev = () => go(cur - 1);

  document.getElementById('next').addEventListener('click', next);
  document.getElementById('prev').addEventListener('click', prev);
  document.querySelectorAll('[data-go-next]').forEach(b => b.addEventListener('click', next));

  // notes
  function toggleNotes(force) { notesPanel.classList.toggle('on', force); }
  document.getElementById('notes-btn').addEventListener('click', () => toggleNotes());

  // overview grid
  function toggleGrid(force) { gridView.classList.toggle('on', force); }
  document.getElementById('grid-btn').addEventListener('click', () => toggleGrid());

  // timer
  let t0 = null, tick = null;
  function toggleTimer() {
    if (tick) { clearInterval(tick); tick = null; timerEl.classList.remove('on'); return; }
    t0 = Date.now(); timerEl.classList.add('on');
    const upd = () => { const s = Math.floor((Date.now() - t0) / 1000); timerEl.textContent = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
    upd(); tick = setInterval(upd, 1000);
  }

  // lightbox: any image inside .figure or .inset
  document.querySelectorAll('.figure, .inset img').forEach(el => {
    el.addEventListener('click', () => {
      const img = el.tagName === 'IMG' ? el : el.querySelector('img');
      if (!img) return;
      lightImg.src = img.dataset.full || img.src;
      lightImg.alt = img.alt;
      lightbox.classList.add('on');
    });
  });
  lightbox.addEventListener('click', () => lightbox.classList.remove('on'));

  // keyboard
  document.addEventListener('keydown', e => {
    if (e.target.closest('input, textarea')) return;
    const k = e.key;
    if (k === 'Escape') { lightbox.classList.remove('on'); toggleGrid(false); toggleNotes(false); return; }
    if (lightbox.classList.contains('on')) return;
    if (['ArrowRight', 'PageDown', ' '].includes(k)) { e.preventDefault(); next(); }
    else if (['ArrowLeft', 'PageUp'].includes(k)) { e.preventDefault(); prev(); }
    else if (k === 'Home') go(0);
    else if (k === 'End') go(slides.length - 1);
    else if (k === 'n' || k === 'N') toggleNotes();
    else if (k === 'g' || k === 'G') toggleGrid();
    else if (k === 't' || k === 'T') toggleTimer();
    else if (k === 'f' || k === 'F') { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen && document.documentElement.requestFullscreen(); }
  });

  // swipe
  let sx = null, sy = null;
  document.addEventListener('touchstart', e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  document.addEventListener('touchend', e => {
    if (sx === null || lightbox.classList.contains('on')) return;
    const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5 && !e.target.closest('#map')) { dx < 0 ? next() : prev(); }
    sx = sy = null;
  });

  window.addEventListener('hashchange', () => {
    const n = parseInt(location.hash.slice(1), 10);
    if (!isNaN(n) && n - 1 !== cur) go(n - 1, true);
  });

  // map (Leaflet + OpenStreetMap tiles; tiles need a connection)
  function initMap() {
    if (mapReady || typeof L === 'undefined') {
      if (!mapReady) document.getElementById('map').innerHTML = '<p style="padding:20px">Map library could not load.</p>';
      return;
    }
    mapReady = true;
    const map = L.map('map', { scrollWheelZoom: false }).setView([27, 38], 4);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 9, attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
    const pts = JSON.parse(document.getElementById('map-data').textContent);
    pts.forEach(p => {
      const obj = p.kind === 'object';
      L.circleMarker([p.lat, p.lon], {
        radius: obj ? 8 : 7, color: obj ? '#8c0a23' : '#444', weight: 2,
        fillColor: obj ? '#ba0c2f' : '#9a9a9a', fillOpacity: obj ? .9 : .7, dashArray: obj ? null : '3'
      }).addTo(map)
        .bindTooltip(p.label, { permanent: true, direction: p.dir || 'right', className: 'pin' })
        .on('click', () => { if (p.slide) go(p.slide - 1); });
    });
    setTimeout(() => map.invalidateSize(), 50);
  }

  // start
  const start = parseInt(location.hash.slice(1), 10);
  slides.forEach(s => s.classList.remove('active'));
  slides[0].classList.add('active');
  go(!isNaN(start) ? start - 1 : 0, true);
})();
