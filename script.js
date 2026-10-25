/* ============ HARDENED BOOT: JS flag, DPR cap, gated logging ============ */
document.documentElement.classList.add('js-ready');
const DPR = Math.min(window.devicePixelRatio || 1, 2);
const IS_DEBUG = new URLSearchParams(location.search).has('debug');
function debugLog(...args){ if(IS_DEBUG) console.error(...args); }

/* ============ ACCESSIBILITY: MOTION PREFERENCE (checked once, reused everywhere) ============ */
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ============ PII DE-OBFUSCATION (email/phone stored base64, never plaintext in HTML) ============ */
(function deobfuscateContact(){
  function decodeAttr(el, attr){
    try{
      const v = el?.dataset?.[attr];
      if(!v) return null;
      return atob(v);
    }catch{ return null; }
  }
  const emailLink = document.getElementById('emailLink');
  if(emailLink){
    const href = decodeAttr(emailLink, 'enc'); // "mailto:..."
    if(href && href.startsWith('mailto:')){
      emailLink.setAttribute('href', href);
      emailLink.setAttribute('aria-label', 'Email Vishal Sen');
    } else {
      emailLink.setAttribute('href', '#contact');
    }
  }
  const phoneText = document.getElementById('phoneText');
  if(phoneText){
    const phone = decodeAttr(phoneText, 'enc');
    if(phone) phoneText.textContent = phone;
  }
})();

/* ============ CUSTOM CURSOR ============ */
const cursorDot = document.getElementById('cursorDot');
let mx = window.innerWidth/2, my = window.innerHeight/2;
window.addEventListener('mousemove', (e)=>{
  mx = e.clientX; my = e.clientY;
  cursorDot.style.left = mx+'px';
  cursorDot.style.top = my+'px';
  cursorDot.classList.add('visible');
});
document.querySelectorAll('a, button, .skill-card, .project-card, .terminal-line').forEach(el=>{
  el.addEventListener('mouseenter', ()=>{ cursorDot.classList.add('hovering'); playTick(920); });
  el.addEventListener('mouseleave', ()=>cursorDot.classList.remove('hovering'));
});

/* ============ SOUND TOGGLE (off by default, Tone.js loaded on demand) ============ */
const soundToggle = document.getElementById('soundToggle');
let soundEnabled = false;
let toneLoading = false;
let toneReady = false;
let uiSynth = null;

function updateSoundUI(){
  if(!soundToggle) return;
  soundToggle.setAttribute('aria-pressed', soundEnabled ? 'true' : 'false');
  soundToggle.setAttribute('aria-label', soundEnabled ? 'Turn off interface sound' : 'Turn on interface sound');
  const icon = soundToggle.querySelector('.sound-icon');
  if(icon) icon.textContent = soundEnabled ? '🔊' : '🔈';
}

function loadTone(onReady){
  if(toneReady){ onReady(); return; }
  if(toneLoading) return;
  toneLoading = true;
  const script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/tone/14.8.49/Tone.js';
  script.integrity = 'sha512-jduERlz7En1IUZR54bqzpNI64AbffZWR//KJgF71SJ8D8/liKFZ+s1RxmUmB+bhCnIfzebdZsULwOrbVB5f3nQ==';
  script.crossOrigin = 'anonymous';
  script.referrerPolicy = 'no-referrer';
  script.onload = ()=>{
    toneLoading = false;
    if(typeof Tone === 'undefined'){ debugLog('Tone.js loaded but global Tone is missing.'); return; }
    toneReady = true;
    onReady();
  };
  script.onerror = ()=>{
    toneLoading = false;
    debugLog('Tone.js failed to load — sound stays off.');
    soundEnabled = false;
    updateSoundUI();
  };
  document.head.appendChild(script);
}

soundToggle?.addEventListener('click', ()=>{
  if(soundEnabled){
    soundEnabled = false;
    updateSoundUI();
    return;
  }
  loadTone(()=>{
    try{
      if(!uiSynth){
        uiSynth = new Tone.Synth({
          oscillator:{ type:'sine' },
          envelope:{ attack:0.001, decay:0.09, sustain:0, release:0.12 }
        }).toDestination();
        uiSynth.volume.value = -20;
      }
      Tone.start();
      soundEnabled = true;
      updateSoundUI();
      playTick(660);
    }catch(err){
      debugLog('Could not start audio context:', err);
      soundEnabled = false;
      updateSoundUI();
    }
  });
});

// Safe no-op until sound is actually enabled — callable from anywhere in this file.
// Rate-limited to avoid AudioContext spam on rapid mouseenter.
let lastTickAt = 0;
function playTick(freq){
  if(!soundEnabled || !uiSynth) return;
  const now = performance.now();
  if(now - lastTickAt < 60) return;
  lastTickAt = now;
  try{
    uiSynth.triggerAttackRelease(freq, '32n');
  }catch(err){
    debugLog('Tick playback failed:', err);
  }
}

/* ============ EXPANDABLE SKILL CARDS ============ */
document.querySelectorAll('.skill-card').forEach(card=>{
  // Refine generic aria-label with the actual skill name for screen readers.
  const skillName = card.querySelector('h3')?.textContent?.trim();
  if(skillName) card.setAttribute('aria-label', `${skillName} — press Enter to expand details`);
  function toggle(){
    const expanded = card.classList.toggle('expanded');
    card.setAttribute('aria-expanded', expanded ? 'true' : 'false');
  }
  card.addEventListener('click', toggle);
  card.addEventListener('keydown', (e)=>{
    if(e.key === 'Enter' || e.key === ' '){
      e.preventDefault();
      toggle();
    }
  });
});

/* ============ NAV TOGGLE (mobile) ============ */
const navToggle = document.getElementById('navToggle');
const navLinks = document.querySelector('.nav-links');

function setNavOpen(open){
  if(!navLinks || !navToggle) return;
  navLinks.classList.toggle('open', open);
  navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  document.body.style.overflow = open ? 'hidden' : '';
}

navToggle?.addEventListener('click', ()=> setNavOpen(!navLinks.classList.contains('open')));

document.querySelectorAll('.nav-links a').forEach(a=>{
  a.addEventListener('click', ()=> setNavOpen(false));
});

document.addEventListener('keydown', (e)=>{
  if(e.key === 'Escape') setNavOpen(false);
});

document.addEventListener('click', (e)=>{
  if(navLinks?.classList.contains('open') &&
     !navLinks.contains(e.target) &&
     !navToggle.contains(e.target)){
    setNavOpen(false);
  }
});

/* ============ SCROLL PROGRESS BAR + NAV SCROLLSPY ============ */
const navProgressFill = document.getElementById('navProgressFill');
const navLinkEls = document.querySelectorAll('.nav-links a[data-nav]');

function updateScrollProgress(){
  if(!navProgressFill) return;
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  const pct = scrollable > 0 ? Math.min(100, Math.max(0, (window.scrollY/scrollable)*100)) : 0;
  navProgressFill.style.width = pct + '%';
}

let scrollTicking = false;
window.addEventListener('scroll', ()=>{
  if(!scrollTicking){
    requestAnimationFrame(()=>{ updateScrollProgress(); scrollTicking = false; });
    scrollTicking = true;
  }
});
updateScrollProgress();

if('IntersectionObserver' in window && navLinkEls.length){
  const spySections = Array.from(navLinkEls)
    .map(a=>document.getElementById(a.dataset.nav))
    .filter(Boolean);

  const spyObserver = new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{
      if(!entry.isIntersecting) return;
      navLinkEls.forEach(a=> a.classList.toggle('active', a.dataset.nav === entry.target.id));
    });
  }, { rootMargin:'-40% 0px -55% 0px', threshold:0 });

  spySections.forEach(sec=> spyObserver.observe(sec));
}

/* ============ NETWORK CANVAS (signature hero element) ============ */
function initNetwork(canvasId, opts={}){
  const canvas = document.getElementById(canvasId);
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  let w,h,nodes=[];
  const isSmallScreen = window.matchMedia('(max-width: 800px)').matches;
  const baseDensity = opts.density || 0.00009;
  const density = isSmallScreen ? baseDensity * 0.6 : baseDensity;
  const maxDist = opts.maxDist || 140;
  const colorA = '76,110,245';   // blue
  const colorB = '62,213,152';   // green
  let rafId = null;
  let isVisible = true;
  let resizeTimer = null;

  let anchors = [];
  function resize(){
    const cssW = canvas.offsetWidth || canvas.clientWidth || 300;
    const cssH = canvas.offsetHeight || canvas.clientHeight || 150;
    w = canvas.width = Math.floor(cssW * DPR);
    h = canvas.height = Math.floor(cssH * DPR);
    const count = Math.min(isSmallScreen ? 60 : 110, Math.floor((cssW*cssH)*density));
    nodes = Array.from({length:count}, ()=>({
      x: Math.random()*w,
      y: Math.random()*h,
      vx: (Math.random()-0.5)*0.4*DPR,
      vy: (Math.random()-0.5)*0.4*DPR,
      r: Math.random()*1.8+1
    }));

    // Labeled skill anchors — only shown when there's room, so labels never
    // collide with the centered hero copy on narrower viewports.
    anchors = [];
    if(opts.labels && cssW >= 900){
      anchors = opts.labels.map(l=>({
        isAnchor:true,
        homeX: l.x*w, homeY: l.y*h,
        x: l.x*w, y: l.y*h,
        label: l.label, links: l.links || [],
        side: l.x < 0.5 ? 'right':'left',
        seed: Math.random()*1000, r:3.5
      }));
    }
  }

  let pointer = {x:-9999, y:-9999, active:false};
  canvas.addEventListener('mousemove', (e)=>{
    const rect = canvas.getBoundingClientRect();
    pointer.x = (e.clientX-rect.left)*DPR;
    pointer.y = (e.clientY-rect.top)*DPR;
    pointer.active = true;
  });
  canvas.addEventListener('mouseleave', ()=> pointer.active=false);

  function step(){
    rafId = null;
    if(!isVisible || document.hidden){
      // Paused off-screen / hidden — re-arm via observer/visibility handler.
      return;
    }
    ctx.clearRect(0,0,w,h);
    // move ambient nodes
    if(!prefersReducedMotion){
      for(const n of nodes){
        n.x += n.vx; n.y += n.vy;
        if(n.x<0||n.x>w) n.vx*=-1;
        if(n.y<0||n.y>h) n.vy*=-1;
      }
      // anchors drift gently around their home position instead of bouncing freely,
      // so their labels stay legible
      for(const a of anchors){
        a.x += (a.homeX - a.x)*0.03 + Math.sin(Date.now()/2200 + a.seed)*0.08*DPR;
        a.y += (a.homeY - a.y)*0.03 + Math.cos(Date.now()/2200 + a.seed)*0.08*DPR;
      }
    }
    // pointer gently attracts nearby ambient nodes (data flowing toward cursor)
    if(pointer.active && !prefersReducedMotion){
      for(const n of nodes){
        const dx = pointer.x-n.x, dy = pointer.y-n.y;
        const d = Math.hypot(dx,dy);
        if(d < 220*DPR){
          n.x += dx*0.0018; n.y += dy*0.0018;
        }
      }
    }
    const allNodes = anchors.length ? nodes.concat(anchors) : nodes;
    // draw connections (ambient-to-ambient and ambient-to-anchor)
    for(let i=0;i<allNodes.length;i++){
      for(let j=i+1;j<allNodes.length;j++){
        const dx = allNodes[i].x-allNodes[j].x, dy=allNodes[i].y-allNodes[j].y;
        const d = Math.hypot(dx,dy);
        const md = maxDist*DPR;
        if(d < md){
          const alpha = (1-d/md)*0.35;
          ctx.strokeStyle = `rgba(${colorA},${alpha})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(allNodes[i].x,allNodes[i].y);
          ctx.lineTo(allNodes[j].x,allNodes[j].y);
          ctx.stroke();
        }
      }
      // connect to pointer
      if(pointer.active){
        const dx = pointer.x-allNodes[i].x, dy = pointer.y-allNodes[i].y;
        const d = Math.hypot(dx,dy);
        const md = 220*DPR;
        if(d < md){
          const alpha = (1-d/md)*0.6;
          ctx.strokeStyle = `rgba(${colorB},${alpha})`;
          ctx.beginPath();
          ctx.moveTo(pointer.x,pointer.y);
          ctx.lineTo(allNodes[i].x,allNodes[i].y);
          ctx.stroke();
        }
      }
    }
    // curated relationship lines between skill anchors (drawn regardless of distance —
    // these encode a real relationship, not proximity)
    for(const a of anchors){
      for(const targetLabel of a.links){
        const target = anchors.find(x=>x.label===targetLabel);
        if(!target) continue;
        ctx.strokeStyle = `rgba(${colorB},0.5)`;
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(a.x,a.y);
        ctx.lineTo(target.x,target.y);
        ctx.stroke();
      }
    }
    // draw ambient nodes
    for(const n of nodes){
      ctx.beginPath();
      ctx.arc(n.x,n.y,n.r,0,Math.PI*2);
      ctx.fillStyle = `rgba(${colorA},0.9)`;
      ctx.fill();
    }
    // draw skill anchors + labels
    for(const a of anchors){
      ctx.beginPath();
      ctx.arc(a.x,a.y,3.5*DPR,0,Math.PI*2);
      ctx.fillStyle = `rgba(${colorB},1)`;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(a.x,a.y,7*DPR,0,Math.PI*2);
      ctx.strokeStyle = `rgba(${colorB},0.4)`;
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.font = `${11*DPR}px 'JetBrains Mono', monospace`;
      ctx.fillStyle = 'rgba(245,247,245,0.85)';
      ctx.textBaseline = 'middle';
      const pad = 10*DPR;
      if(a.side === 'right'){
        ctx.textAlign = 'left';
        ctx.fillText(a.label, a.x+pad, a.y);
      } else {
        ctx.textAlign = 'right';
        ctx.fillText(a.label, a.x-pad, a.y);
      }
    }
    if(pointer.active){
      ctx.beginPath();
      ctx.arc(pointer.x,pointer.y,4*DPR,0,Math.PI*2);
      ctx.fillStyle = `rgba(${colorB},1)`;
      ctx.fill();
    }
    schedule();
  }

  function schedule(){
    if(rafId) return;
    if(prefersReducedMotion && !pointer.active){
      // Static frame for reduced-motion users; re-render on pointer activity.
      return;
    }
    rafId = requestAnimationFrame(step);
  }

  function kick(){ schedule(); }
  canvas.addEventListener('mousemove', kick);
  document.addEventListener('visibilitychange', ()=>{
    if(!document.hidden) schedule();
  });

  resize();
  window.addEventListener('resize', ()=>{
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(()=>{ resize(); schedule(); }, 150);
  });
  if('IntersectionObserver' in window){
    new IntersectionObserver((entries)=>{
      entries.forEach(en=>{
        isVisible = en.isIntersecting;
        if(isVisible) schedule();
      });
    }, { threshold: 0.05 }).observe(canvas);
  }
  step();
}
initNetwork('network', {
  density:0.00011, maxDist:150,
  labels: [
    { label:'Python', x:0.10, y:0.18, links:['Problem Solving'] },
    { label:'C & C++', x:0.90, y:0.20, links:['Problem Solving'] },
    { label:'Data Analysis', x:0.08, y:0.55, links:['Communication'] },
    { label:'Problem Solving', x:0.92, y:0.58, links:[] },
    { label:'Communication', x:0.14, y:0.85, links:['Adaptability & Teamwork'] },
    { label:'Adaptability & Teamwork', x:0.86, y:0.85, links:[] }
  ]
});
initNetwork('networkSmall', {density:0.00006, maxDist:130});

/* ============ TAPE CONTENT (safe DOM, no innerHTML) ============ */
const tapeItems = ['Python','C','C++','Excel','Gen AI','Data Analysis','Problem Solving','Communication','Adaptability','Time Management','Critical Thinking','Teamwork'];
const tape = document.getElementById('tape');
if(tape){
  tape.textContent = '';
  const frag = document.createDocumentFragment();
  for(let rep=0; rep<2; rep++){ // duplicate for seamless loop
    for(const t of tapeItems){
      const s = document.createElement('span');
      s.textContent = t;
      frag.appendChild(s);
    }
  }
  tape.appendChild(frag);
}

/* ============ MINI PROJECT CHARTS (real pointer/click interaction, not just re-randomize) ============ */
function drawMiniChart(canvas, type, vis){
  const ctx = canvas.getContext('2d');
  let miniResizeTimer = null;
  function resize(){
    const cssW = canvas.offsetWidth || 260;
    const cssH = canvas.offsetHeight || 140;
    canvas.width = Math.floor(cssW*DPR);
    canvas.height = Math.floor(cssH*DPR);
  }
  resize();
  window.addEventListener('resize', ()=>{ clearTimeout(miniResizeTimer); miniResizeTimer = setTimeout(()=>{ resize(); render(); }, 150); });

  const blue = 'rgba(76,110,245,0.85)';
  const green = 'rgba(62,213,152,0.85)';

  // ---- persistent state per chart, generated once so hover reveals it rather than reinventing it ----
  let gridRisk = null;      // grid: fixed risk matrix
  let hoverCell = {r:-1,c:-1};
  let hoverT = null;        // terminal: pointer-driven position, 0..1
  let waypointsData = null; // safety: fixed mock inputs behind the score
  let activeWaypoint = -1;
  const safetyCaption = vis.querySelector('.chart-caption');

  function scoreWaypoint(p){
    // illustrative weighted-scoring logic mirroring the real project's inputs
    const raw = p.streetlights*0.12 + p.shops*0.15 + p.service247*0.3;
    return Math.min(1, raw);
  }

  function ensureData(){
    if(type==='grid' && !gridRisk){
      const cols = 10, rows = 6;
      gridRisk = Array.from({length:rows}, ()=> Array.from({length:cols}, ()=> Math.random()));
    }
    if(type==='safety' && !waypointsData){
      waypointsData = [
        {xr:0.08,yr:0.75, streetlights:2, shops:1, service247:0},
        {xr:0.28,yr:0.35, streetlights:5, shops:3, service247:1},
        {xr:0.52,yr:0.55, streetlights:3, shops:2, service247:0},
        {xr:0.75,yr:0.25, streetlights:6, shops:4, service247:1},
        {xr:0.92,yr:0.45, streetlights:1, shops:0, service247:0}
      ];
    }
  }
  ensureData();

  function render(){
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0,0,w,h);

    if(type==='grid'){
      // risk-grid heatmap: nested loops over a fixed 2D matrix, cell color = risk level.
      // The hovered cell (real cursor tracking) gets a bright outline.
      const cols = 10, rows = 6;
      const pad = w*0.04;
      const cw = (w-pad*2)/cols, ch = (h-pad*2)/rows;
      for(let r=0;r<rows;r++){
        for(let c=0;c<cols;c++){
          const risk = gridRisk[r][c];
          ctx.fillStyle = risk > 0.6 ? `rgba(76,110,245,${0.35+risk*0.5})` : `rgba(62,213,152,${0.25+risk*0.5})`;
          const x = pad+c*cw+cw*0.08, y = pad+r*ch+ch*0.08, cwid = cw*0.84, chgt = ch*0.84;
          ctx.fillRect(x, y, cwid, chgt);
          if(r===hoverCell.r && c===hoverCell.c){
            ctx.strokeStyle = 'rgba(245,247,245,0.9)';
            ctx.lineWidth = 1.5*DPR;
            ctx.strokeRect(x, y, cwid, chgt);
          }
        }
      }
    } else if(type==='terminal'){
      // CLI guessing-game feel: pointer position (or a gentle default) drives the
      // "guess" marker along the range, so hovering actually plays the mechanic.
      const t = hoverT !== null ? hoverT : 0.5;
      ctx.strokeStyle = 'rgba(245,247,245,0.25)';
      ctx.lineWidth = 2*DPR;
      const midY = h*0.35;
      ctx.beginPath();
      ctx.moveTo(w*0.08, midY); ctx.lineTo(w*0.92, midY);
      ctx.stroke();
      const guessX = w*(0.08 + t*0.84);
      ctx.fillStyle = blue;
      ctx.beginPath();
      ctx.arc(guessX, midY, 6*DPR, 0, Math.PI*2);
      ctx.fill();
      const guessVal = Math.round(t*100);
      ctx.fillStyle = green;
      ctx.font = `${Math.floor(h*0.14)}px monospace`;
      ctx.fillText('guess >', w*0.08, h*0.62);
      ctx.fillText(String(guessVal), w*0.08, h*0.85);
      ctx.fillStyle = 'rgba(62,213,152,0.9)';
      ctx.fillRect(w*0.08 + ctx.measureText('guess > '+guessVal).width*0.4, h*0.72, w*0.03, h*0.14);
    } else if(type==='safety'){
      // walking-route feel: waypoints colored by a real weighted score (streetlights,
      // shops, 24/7 services), matching the site's green=safer / blue=less-safe convention.
      const points = waypointsData.map(p=>({ ...p, x:w*p.xr, y:h*p.yr, score: scoreWaypoint(p) }));
      ctx.strokeStyle = 'rgba(245,247,245,0.3)';
      ctx.lineWidth = 2*DPR;
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for(let i=1;i<points.length;i++){
        const midX = (points[i-1].x+points[i].x)/2, midY = (points[i-1].y+points[i].y)/2;
        ctx.quadraticCurveTo(points[i-1].x, points[i-1].y, midX, midY);
      }
      ctx.lineTo(points[points.length-1].x, points[points.length-1].y);
      ctx.stroke();

      let total = 0;
      points.forEach((p,idx)=>{
        total += p.score;
        const isActive = idx === activeWaypoint;
        ctx.fillStyle = p.score > 0.55 ? green : blue;
        ctx.beginPath();
        ctx.arc(p.x, p.y, (isActive ? 7 : 4+p.score*3)*DPR, 0, Math.PI*2);
        ctx.fill();
        if(isActive){
          ctx.strokeStyle = 'rgba(245,247,245,0.9)';
          ctx.lineWidth = 1.5*DPR;
          ctx.stroke();
        }
      });

      ctx.fillStyle = green;
      ctx.font = `${Math.floor(h*0.15)}px monospace`;
      ctx.textAlign = 'right';
      ctx.fillText(Math.round((total/points.length)*100)+'% safe', w*0.94, h*0.92);
      ctx.textAlign = 'left';
    }
  }

  // ---- pointer interaction, mapped from real mouse position on the canvas ----
  canvas.addEventListener('mousemove', (e)=>{
    const rect = canvas.getBoundingClientRect();
    const px = (e.clientX-rect.left)*DPR;
    const py = (e.clientY-rect.top)*DPR;
    const w = canvas.width, h = canvas.height;

    if(type==='grid'){
      const cols=10, rows=6, pad=w*0.04;
      const cw=(w-pad*2)/cols, ch=(h-pad*2)/rows;
      const c = Math.floor((px-pad)/cw), r = Math.floor((py-pad)/ch);
      hoverCell = (r>=0&&r<rows&&c>=0&&c<cols) ? {r,c} : {r:-1,c:-1};
      render();
    } else if(type==='terminal'){
      hoverT = Math.min(1, Math.max(0, (px - w*0.08)/(w*0.84)));
      render();
    } else if(type==='safety'){
      const points = waypointsData.map(p=>({x:w*p.xr,y:h*p.yr}));
      let nearest=-1, nearestD=Infinity;
      points.forEach((p,idx)=>{
        const d = Math.hypot(px-p.x, py-p.y);
        if(d<nearestD){ nearestD=d; nearest=idx; }
      });
      if(nearestD < 22*DPR){
        canvas.style.cursor='pointer';
      } else {
        canvas.style.cursor='default';
      }
    }
  });

  canvas.addEventListener('mouseleave', ()=>{
    if(type==='grid'){ hoverCell={r:-1,c:-1}; render(); }
    if(type==='terminal'){ hoverT=null; render(); }
  });

  if(type==='safety'){
    canvas.addEventListener('click', (e)=>{
      const rect = canvas.getBoundingClientRect();
      const px = (e.clientX-rect.left)*DPR;
      const py = (e.clientY-rect.top)*DPR;
      const w = canvas.width, h = canvas.height;
      const points = waypointsData.map(p=>({...p,x:w*p.xr,y:h*p.yr}));
      let nearest=-1, nearestD=Infinity;
      points.forEach((p,idx)=>{
        const d = Math.hypot(px-p.x, py-p.y);
        if(d<nearestD){ nearestD=d; nearest=idx; }
      });
      if(nearestD < 26*DPR && nearest>-1){
        activeWaypoint = nearest;
        render();
        playTick(760);
        const p = waypointsData[nearest];
        const score = Math.round(scoreWaypoint(p)*100);
        if(safetyCaption){
          // Safe DOM: numbers only, no innerHTML — future API data can't become XSS.
          safetyCaption.textContent = '';
          safetyCaption.append(
            `waypoint ${nearest+1} — streetlights: ${Number(p.streetlights)}, shops: ${Number(p.shops)}, 24/7 services: ${Number(p.service247)} → `
          );
          const strong = document.createElement('span');
          strong.className = 'cap-strong';
          strong.textContent = `${score}% score contribution`;
          safetyCaption.appendChild(strong);
        }
      }
    });
  }

  render();
  return render;
}
document.querySelectorAll('.project-visual').forEach(vis=>{
  const type = vis.dataset.chart;
  const canvas = vis.querySelector('canvas');
  drawMiniChart(canvas, type, vis);
});

/* ============ PROJECT CARD TILT (cursor-reactive parallax) ============ */
(function initProjectTilt(){
  const cards = document.querySelectorAll('.project-card');
  const tiltReady = !prefersReducedMotion && typeof gsap !== 'undefined';

  cards.forEach(card=>{
    if(!tiltReady){
      card.classList.add('no-tilt'); // CSS fallback: plain translateY lift on hover
      return;
    }
    let rotateX, rotateY, liftY;
    try {
      rotateX = gsap.quickTo(card, 'rotateX', { duration:0.6, ease:'power3.out' });
      rotateY = gsap.quickTo(card, 'rotateY', { duration:0.6, ease:'power3.out' });
      liftY   = gsap.quickTo(card, 'y', { duration:0.6, ease:'power3.out' });
    } catch(err){
      debugLog('Tilt setup failed, falling back to CSS lift:', err);
      card.classList.add('no-tilt');
      return;
    }
    card.addEventListener('mousemove', (e)=>{
      const rect = card.getBoundingClientRect();
      const px = (e.clientX-rect.left)/rect.width - 0.5;
      const py = (e.clientY-rect.top)/rect.height - 0.5;
      rotateY(px*7);
      rotateX(-py*7);
      liftY(-4);
    });
    card.addEventListener('mouseleave', ()=>{
      rotateX(0); rotateY(0); liftY(0);
    });
  });
})();

/* ============ HERO REVEAL (title lines + eyebrow/sub/cta) ============ */
function revealHero(){
  if (typeof gsap === 'undefined') return; // nothing was hidden — nothing to reveal
  try {
    gsap.to('.hero-title .line', { y:0, duration:1, ease:'power4.out', stagger:0.12 });
    gsap.to('.eyebrow, .hero-sub, .hero-cta', { opacity:1, y:0, duration:0.8, ease:'power3.out', stagger:0.1, delay:0.45 });
  } catch(err){
    debugLog('Hero reveal failed, forcing content visible:', err);
    document.querySelectorAll('.hero-title .line').forEach(el=>{ el.style.transform='none'; });
    document.querySelectorAll('.eyebrow, .hero-sub, .hero-cta').forEach(el=>{ el.style.opacity=1; el.style.transform='none'; });
  }
}

/* ============ HERO TERMINAL: intro type-out, then hands off to a live prompt ============ */
const terminalLine = document.getElementById('terminalLine');
const terminalText = document.getElementById('terminalText');
const terminalCursor = document.getElementById('terminalCursor');
const terminalHint = document.getElementById('terminalHint');
const terminalOutput = document.getElementById('terminalOutput');
const terminalInput = document.getElementById('terminalInput');
const TERMINAL_MAX_LEN = 200;

function printLine(text, cls, opts={}){
  if(!terminalOutput) return;
  const div = document.createElement('div');
  div.className = 'out-line' + (cls ? ' '+cls : '');
  if(opts.isCmd){
    const cmdSpan = document.createElement('span');
    cmdSpan.className = 'out-cmd';
    cmdSpan.textContent = `$ ${text}`;
    div.appendChild(cmdSpan);
  } else {
    div.textContent = text;
  }
  terminalOutput.appendChild(div);
  // Keep a short scrollback so the terminal never grows unbounded and shifts the hero.
  while(terminalOutput.children.length > 40){
    terminalOutput.removeChild(terminalOutput.firstChild);
  }
  terminalOutput.scrollTop = terminalOutput.scrollHeight;
}

const TERMINAL_SECTIONS = ['about','skills','education','projects','contact'];

function scrollToSection(id){
  const el = document.getElementById(id);
  if(el) el.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block:'start' });
}

function runCommand(raw){
  const cmd = String(raw || '').slice(0, TERMINAL_MAX_LEN).trim();
  if(!cmd) return;
  printLine(cmd, '', { isCmd: true });
  const lower = cmd.toLowerCase();
  playTick(700);

  if(lower === 'help'){
    printLine('commands: whoami · ls · cd <section> · clear · help');
    printLine('sections: ' + TERMINAL_SECTIONS.join(', '));
  } else if(lower === 'whoami'){
    printLine('Vishal Sen — B.Tech CSE student, Indore. Learning Python, C/C++, and AI-driven data analysis.');
  } else if(lower === 'ls'){
    printLine(TERMINAL_SECTIONS.join('  '));
  } else if(lower.startsWith('cd ')){
    const target = lower.slice(3).trim().replace(/^#/, '').slice(0, 50);
    if(TERMINAL_SECTIONS.includes(target)){
      printLine(`→ ${target}`);
      scrollToSection(target);
    } else {
      printLine(`cd: no such section: ${target}. try 'ls'`, 'out-err');
    }
  } else if(lower === 'clear'){
    terminalOutput.textContent = '';
    return;
  } else if(lower === 'sudo' || lower.startsWith('sudo ')){
    printLine('nice try — no root here, just Python and curiosity.');
  } else {
    printLine(`command not found: ${cmd}. try 'help'`, 'out-err');
  }
}

function enableLiveTerminal(){
  if(!terminalInput || !terminalLine || !terminalText) return;

  terminalLine.addEventListener('click', ()=> terminalInput.focus());
  terminalLine.addEventListener('keydown', (e)=>{
    if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); terminalInput.focus(); }
  });

  terminalInput.addEventListener('focus', ()=>{
    terminalHint?.classList.remove('show');
    terminalCursor?.classList.add('live');
  });

  terminalInput.setAttribute('maxlength', String(TERMINAL_MAX_LEN));
  terminalInput.addEventListener('input', ()=>{
    if(terminalInput.value.length > TERMINAL_MAX_LEN){
      terminalInput.value = terminalInput.value.slice(0, TERMINAL_MAX_LEN);
    }
    terminalText.textContent = terminalInput.value;
  });

  const history = [];
  const HISTORY_MAX = 100;
  let historyIdx = -1;

  terminalInput.addEventListener('keydown', (e)=>{
    if(e.key === 'Enter'){
      const val = terminalInput.value;
      if(val.trim()){
        runCommand(val);
        history.push(val.slice(0, TERMINAL_MAX_LEN));
        if(history.length > HISTORY_MAX) history.shift();
        historyIdx = history.length;
      }
      terminalInput.value = '';
      terminalText.textContent = '';
    } else if(e.key === 'ArrowUp'){
      e.preventDefault();
      if(historyIdx > 0){ historyIdx--; terminalInput.value = history[historyIdx]; terminalText.textContent = terminalInput.value; }
    } else if(e.key === 'ArrowDown'){
      e.preventDefault();
      if(historyIdx < history.length-1){ historyIdx++; terminalInput.value = history[historyIdx]; }
      else { historyIdx = history.length; terminalInput.value = ''; }
      terminalText.textContent = terminalInput.value;
    }
  });

  // Show the "try: help" hint once, shortly after the intro settles.
  setTimeout(()=> terminalHint?.classList.add('show'), 900);
}

function runTerminalIntro(){
  const phrase = 'whoami';
  const gsapReady = typeof gsap !== 'undefined';

  if(!terminalText){ if(gsapReady) revealHero(); enableLiveTerminal(); return; }

  if(!gsapReady || prefersReducedMotion){
    // No safe way to animate (or the visitor doesn't want motion) — content was
    // never hidden by CSS, so just fill in the final text and stop here.
    terminalText.textContent = phrase;
    terminalCursor?.classList.add('idle');
    printLine("Vishal Sen — B.Tech CSE student, Indore. Learning Python, C/C++, and AI-driven data analysis.");
    if(gsapReady) revealHero();
    enableLiveTerminal();
    return;
  }

  // gsap confirmed working — safe to hide the hero now, since we know we can bring it back.
  try {
    gsap.set('.hero-title .line', { y:'110%' });
    gsap.set('.eyebrow, .hero-sub, .hero-cta', { opacity:0, y:20 });
  } catch(err){
    debugLog('Could not prep hero animation, showing static hero instead:', err);
    terminalText.textContent = phrase;
    terminalCursor?.classList.add('idle');
    enableLiveTerminal();
    return;
  }

  let i = 0;
  const typeSpeed = 75; // ms per character
  (function type(){
    if(i <= phrase.length){
      terminalText.textContent = phrase.slice(0, i);
      i++;
      setTimeout(type, typeSpeed);
    } else {
      terminalCursor?.classList.add('idle');
      printLine("Vishal Sen — B.Tech CSE student, Indore. Learning Python, C/C++, and AI-driven data analysis.");
      setTimeout(revealHero, 280);
      enableLiveTerminal();
    }
  })();
}
runTerminalIntro();

/* ============ GSAP SCROLL REVEALS (below-the-fold) ============ */
function finalizeStaticState(){
  // Guarantees stat numbers and skill-bar fills reach their end state even
  // with no animation library available.
  document.querySelectorAll('.stat-num[data-count]').forEach(el=>{
    el.textContent = el.dataset.count;
  });
  document.querySelectorAll('.skill-card').forEach(card=> card.classList.add('in-view'));
}

const gsapReady = (typeof gsap !== 'undefined') && (typeof ScrollTrigger !== 'undefined');

if (!gsapReady) {
  // Nothing was hidden by CSS, so there's nothing to "reveal" — just finalize
  // the pieces (counters, skill bars) that need a JS-driven end state.
  finalizeStaticState();
} else {
  try {
    gsap.registerPlugin(ScrollTrigger);

    if (prefersReducedMotion) {
      finalizeStaticState();
    } else {
      // Only NOW — with gsap + ScrollTrigger confirmed present — is it safe to hide.
      gsap.set('.reveal', { opacity:0, y:40 });

      gsap.utils.toArray('.reveal').forEach((el)=>{
        gsap.to(el, {
          opacity:1, y:0, duration:0.9, ease:'power3.out',
          scrollTrigger:{ trigger:el, start:'top 85%' }
        });
      });

      // skill bars fill + counters trigger when in view
      document.querySelectorAll('.skill-card').forEach(card=>{
        ScrollTrigger.create({
          trigger: card, start:'top 85%',
          onEnter: ()=> card.classList.add('in-view')
        });
      });

      document.querySelectorAll('.stat-num[data-count]').forEach(el=>{
        const target = parseInt(el.dataset.count, 10);
        ScrollTrigger.create({
          trigger: el, start:'top 90%', once:true,
          onEnter: ()=>{
            let obj = {val:0};
            gsap.to(obj, {
              val: target, duration:1.6, ease:'power2.out',
              onUpdate: ()=> el.textContent = Math.floor(obj.val)
            });
          }
        });
      });

      // NOTE: project cards are revealed by the .reveal tween above — they no
      // longer get a second, separate gsap.from() animation. Two tweens fighting
      // over the same element's opacity/transform was redundant and risked
      // visual glitches (one tween's "from" state briefly overriding the other).

      // ScrollTrigger measures element positions on load. Web fonts swapping in
      // after that measurement can shift layout and leave trigger points stale —
      // a well-known GSAP + webfont gotcha. Recalculate once fonts are ready.
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(()=> ScrollTrigger.refresh());
      }
      window.addEventListener('load', ()=> ScrollTrigger.refresh());
    }
  } catch(err){
    debugLog('Scroll animation setup failed, forcing all content visible:', err);
    document.querySelectorAll('.reveal').forEach(el=>{ el.style.opacity=1; el.style.transform='none'; });
    finalizeStaticState();
  }
}

/* ============ ABSOLUTE SAFETY NET ============
   Whatever else goes wrong above, guarantee every .reveal element is visible
   within 3 seconds. This can only ever make content MORE visible, never less. */
setTimeout(()=>{
  document.querySelectorAll('.reveal').forEach(el=>{
    if (parseFloat(getComputedStyle(el).opacity) < 1) {
      el.style.opacity = 1;
      el.style.transform = 'none';
    }
  });
  document.querySelectorAll('.hero-title .line').forEach(el=>{ el.style.transform = 'none'; });
  document.querySelectorAll('.eyebrow, .hero-sub, .hero-cta').forEach(el=>{
    if (parseFloat(getComputedStyle(el).opacity) < 1) {
      el.style.opacity = 1;
      el.style.transform = 'none';
    }
  });
}, 3000);
