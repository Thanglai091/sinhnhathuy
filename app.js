import * as THREE from './vendor/three/three.module.js';

(() => {
  'use strict';

  const STORAGE_STARS = 'giahuy19_stars_v3';
  const BIRTH_ISO = '2008-11-25T00:00:00+07:00';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function showToast(message) {
    const container = $('#toast-container');
    if (!container) return;
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = message;
    container.appendChild(el);
    setTimeout(() => {
      el.classList.add('is-leaving');
      setTimeout(() => el.remove(), 260);
    }, 3200);
  }

  /* =========================================================
     MAGNETIC GOLD CURSOR
  ========================================================= */
  function initLuxuryCursor() {
    const cursor = $('#luxury-cursor');
    if (!cursor || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    const dot = $('.cursor-dot', cursor);
    const ring = $('.cursor-ring', cursor);
    const label = $('.cursor-label', cursor);

    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    let rx = mx;
    let ry = my;

    window.addEventListener('pointermove', (e) => {
      mx = e.clientX;
      my = e.clientY;
      dot.style.left = `${mx}px`;
      dot.style.top = `${my}px`;

      const target = e.target.closest('[data-cursor]');
      if (target) {
        cursor.classList.add('has-label');
        label.textContent = target.dataset.cursor || '';
      } else {
        cursor.classList.remove('has-label');
        label.textContent = '';
      }
    });

    function loop() {
      rx += (mx - rx) * 0.16;
      ry += (my - ry) * 0.16;
      ring.style.left = `${rx}px`;
      ring.style.top = `${ry}px`;
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  }

  /* =========================================================
     3-TRACK WEB AUDIO ENGINE + SPECTRUM VISUALIZER
  ========================================================= */
  class AudioEngine {
    constructor() {
      this.ctx = null;
      this.master = null;
      this.analyser = null;
      this.isPlaying = false;
      this.loopTimer = null;
      this.stepIndex = 0;
      this.trackIndex = 0;
      this.volume = 0.65;

      this.tracks = [
        {
          title: '01. Nocturne 25·11 (Rhodes Jazz)',
          desc: 'Giai điệu Happy Birthday biến tấu jazz êm dịu trên phím đàn điện ấm áp.',
          tempoMs: 740,
          wave: 'triangle',
          notes: [
            { f: 261.63, d: 0.45 }, { f: 261.63, d: 0.35 }, { f: 293.66, d: 0.8 },
            { f: 261.63, d: 0.8 },  { f: 349.23, d: 0.8 },  { f: 329.63, d: 1.4 },
            { f: 261.63, d: 0.45 }, { f: 261.63, d: 0.35 }, { f: 293.66, d: 0.8 },
            { f: 261.63, d: 0.8 },  { f: 392.0, d: 0.8 },   { f: 349.23, d: 1.4 },
            { f: 261.63, d: 0.45 }, { f: 261.63, d: 0.35 }, { f: 523.25, d: 0.8 },
            { f: 440.0, d: 0.8 },   { f: 349.23, d: 0.8 },  { f: 329.63, d: 0.7 }, { f: 293.66, d: 1.3 },
            { f: 466.16, d: 0.45 }, { f: 466.16, d: 0.35 }, { f: 440.0, d: 0.8 },
            { f: 349.23, d: 0.8 },  { f: 392.0, d: 0.8 },   { f: 349.23, d: 1.8 }
          ]
        },
        {
          title: '02. Chiều Cao Nguyên (Warm Pad)',
          desc: 'Hợp âm rải chậm rãi mang không gian tĩnh tại của gió cao nguyên Buôn Ma Thuột.',
          tempoMs: 900,
          wave: 'sine',
          notes: [
            { f: 220.0, d: 0.9 }, { f: 277.18, d: 0.9 }, { f: 329.63, d: 0.9 }, { f: 415.3, d: 1.3 },
            { f: 196.0, d: 0.9 }, { f: 246.94, d: 0.9 }, { f: 293.66, d: 0.9 }, { f: 369.99, d: 1.3 },
            { f: 174.61, d: 0.9 }, { f: 220.0, d: 0.9 }, { f: 261.63, d: 0.9 }, { f: 329.63, d: 1.4 }
          ]
        },
        {
          title: '03. Ánh Sao Ban Mê (Celesta)',
          desc: 'Âm sắc hộp nhạc pha lê lấp lánh dưới bầu trời đêm phố núi.',
          tempoMs: 620,
          wave: 'sine',
          notes: [
            { f: 523.25, d: 0.6 }, { f: 659.25, d: 0.6 }, { f: 783.99, d: 0.6 }, { f: 987.77, d: 1.1 },
            { f: 440.0, d: 0.6 },  { f: 523.25, d: 0.6 }, { f: 659.25, d: 0.6 }, { f: 880.0, d: 1.1 },
            { f: 349.23, d: 0.6 }, { f: 440.0, d: 0.6 },  { f: 523.25, d: 0.6 }, { f: 659.25, d: 1.2 }
          ]
        }
      ];
    }

    ensureContext() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return false;
        this.ctx = new AudioCtx();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.volume * 0.36;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 2100;

        this.analyser = this.ctx.createAnalyser();
        this.analyser.fftSize = 128;

        this.master.connect(filter);
        filter.connect(this.analyser);
        this.analyser.connect(this.ctx.destination);
      }
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return true;
    }

    setVolume(pct) {
      this.volume = Math.max(0, Math.min(1, pct / 100));
      if (this.master && this.ctx) {
        this.master.gain.setTargetAtTime(this.volume * 0.36, this.ctx.currentTime, 0.05);
      }
    }

    playTone(freq, dur, gainLevel = 0.26, type = 'triangle') {
      if (!this.ensureContext()) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const sub = this.ctx.createOscillator();
      const env = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      sub.type = 'sine';
      sub.frequency.setValueAtTime(freq * 0.5, now);

      env.gain.setValueAtTime(0.0001, now);
      env.gain.exponentialRampToValueAtTime(gainLevel, now + 0.04);
      env.gain.exponentialRampToValueAtTime(0.0001, now + dur);

      osc.connect(env);
      sub.connect(env);
      env.connect(this.master);

      osc.start(now);
      sub.start(now);
      osc.stop(now + dur + 0.05);
      sub.stop(now + dur + 0.05);
    }

    playUnlockChime() {
      if (!this.ensureContext()) return;
      [261.63, 329.63, 392.0, 493.88, 587.33].forEach((freq, idx) => {
        setTimeout(() => this.playTone(freq, 1.1, 0.22, 'sine'), idx * 80);
      });
    }

    playWhoosh() {
      if (!this.ensureContext()) return;
      const len = Math.floor(this.ctx.sampleRate * 0.24);
      const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);

      const src = this.ctx.createBufferSource();
      src.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 520;
      const g = this.ctx.createGain();
      g.gain.value = 0.25;
      src.connect(filter);
      filter.connect(g);
      g.connect(this.master);
      src.start();
    }

    playCelebrationChord() {
      if (!this.ensureContext()) return;
      [349.23, 440.0, 523.25, 659.25, 783.99].forEach((freq, idx) => {
        setTimeout(() => this.playTone(freq, 1.7, 0.22, 'sine'), idx * 55);
      });
    }

    scheduleNext() {
      if (!this.isPlaying) return;
      const track = this.tracks[this.trackIndex];
      const note = track.notes[this.stepIndex % track.notes.length];
      this.playTone(note.f, note.d * 1.25, 0.2, track.wave);
      this.stepIndex += 1;
      this.loopTimer = setTimeout(() => this.scheduleNext(), note.d * track.tempoMs);
    }

    selectTrack(idx) {
      this.trackIndex = idx;
      this.stepIndex = 0;
      const t = this.tracks[idx];
      const titleEl = $('#track-title');
      const descEl = $('#track-desc');
      if (titleEl) titleEl.textContent = t.title;
      if (descEl) descEl.textContent = t.desc;
      $$('.track-pill').forEach((btn, i) => btn.classList.toggle('active', i === idx));

      if (this.isPlaying) {
        clearTimeout(this.loopTimer);
        this.scheduleNext();
      } else {
        this.startMusic();
      }
    }

    startMusic() {
      if (!this.ensureContext()) return false;
      if (this.isPlaying) return true;
      this.isPlaying = true;
      this.scheduleNext();
      this.syncUI();
      return true;
    }

    stopMusic() {
      this.isPlaying = false;
      clearTimeout(this.loopTimer);
      this.syncUI();
    }

    toggleMusic() {
      if (this.isPlaying) {
        this.stopMusic();
        showToast('Đã tạm dừng đĩa than');
      } else {
        this.startMusic();
        showToast(`Đang phát: ${this.tracks[this.trackIndex].title}`);
      }
    }

    syncUI() {
      $('#audio-toggle')?.setAttribute('aria-pressed', String(this.isPlaying));
      $('#vinyl-platter')?.classList.toggle('is-spinning', this.isPlaying);
      const ttBtn = $('#turntable-play-btn span');
      if (ttBtn) ttBtn.textContent = this.isPlaying ? 'Tạm Dừng Đĩa Than' : 'Phát Nhạc Trên Đĩa Than';
    }
  }

  const audio = new AudioEngine();

  function initTurntableAndVisualizer() {
    const canvas = $('#audio-visualizer');
    const playBtn = $('#turntable-play-btn');
    const volSlider = $('#volume-slider');

    $$('.track-pill').forEach((btn) => {
      btn.addEventListener('click', () => audio.selectTrack(Number(btn.dataset.track || 0)));
    });
    playBtn?.addEventListener('click', () => audio.toggleMusic());
    volSlider?.addEventListener('input', (e) => audio.setVolume(Number(e.target.value)));

    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const bars = 32;
    const smoothed = new Float32Array(bars);
    let freqData = null;

    function render(t) {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      if (audio.analyser && audio.isPlaying) {
        if (!freqData) freqData = new Uint8Array(audio.analyser.frequencyBinCount);
        audio.analyser.getByteFrequencyData(freqData);
      }

      const barW = (w - 28) / bars;
      for (let i = 0; i < bars; i++) {
        let target = 0.08 + 0.05 * Math.sin(t * 0.002 + i * 0.4);
        if (audio.isPlaying && freqData) {
          const val = freqData[i % freqData.length] / 255;
          target = Math.max(target, val * 0.92 + 0.14 * Math.abs(Math.sin(t * 0.004 + i)));
        }
        smoothed[i] += (target - smoothed[i]) * 0.18;

        const bh = Math.max(6, smoothed[i] * (h - 18));
        const x = 14 + i * barW + 2;
        const y = h - 8 - bh;

        const grad = ctx.createLinearGradient(0, y, 0, h - 8);
        grad.addColorStop(0, '#FBF2DD');
        grad.addColorStop(0.5, '#D6B372');
        grad.addColorStop(1, '#6B532C');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(x, y, Math.max(3, barW - 5), bh, 3);
        ctx.fill();
      }
      requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
  }

  /* =========================================================
     AMBIENT GOLD DUST & FIREWORKS
  ========================================================= */
  function initAmbientField() {
    const canvas = $('#ambient-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let w = 0;
    let h = 0;
    let pxOff = 0;
    let pyOff = 0;

    const motes = Array.from({ length: 50 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: 0.7 + Math.random() * 1.9,
      vy: -(0.00012 + Math.random() * 0.00028),
      vx: (Math.random() - 0.5) * 0.00014,
      a: 0.16 + Math.random() * 0.45,
      phase: Math.random() * Math.PI * 2
    }));

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', (e) => {
      pxOff = (e.clientX / Math.max(w, 1) - 0.5) * 20;
      pyOff = (e.clientY / Math.max(h, 1) - 0.5) * 20;
    });

    function tick(t) {
      ctx.clearRect(0, 0, w, h);
      for (const m of motes) {
        if (!reduced) {
          m.x = (m.x + m.vx + 1) % 1;
          m.y = (m.y + m.vy + 1) % 1;
        }
        const x = m.x * w + pxOff * m.r;
        const y = m.y * h + pyOff * m.r;
        const alpha = m.a * (0.72 + 0.28 * Math.sin(t * 0.0014 + m.phase));
        ctx.beginPath();
        ctx.arc(x, y, m.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(243, 222, 181, ${alpha.toFixed(3)})`;
        ctx.fill();
      }
      if (!reduced) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  class FireworksEngine {
    constructor() {
      this.canvas = $('#fireworks-canvas');
      this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
      this.sparks = [];
      this.running = false;
      this.palette = ['#FFF8DF', '#F3DEB5', '#D6B372', '#E59D54', '#C8CCA2'];
      if (this.canvas) {
        this.resize();
        window.addEventListener('resize', () => this.resize());
      }
    }

    resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.w = window.innerWidth;
      this.h = window.innerHeight;
      this.canvas.width = this.w * dpr;
      this.canvas.height = this.h * dpr;
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    burst(nx = 0.5, ny = 0.35, count = 52) {
      if (!this.ctx) return;
      const cx = nx * this.w;
      const cy = ny * this.h;
      for (let i = 0; i < count; i++) {
        const ang = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.16;
        const spd = 2.4 + Math.random() * 5.6;
        this.sparks.push({
          x: cx,
          y: cy,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd,
          r: 1.3 + Math.random() * 2.2,
          alpha: 1,
          decay: 0.011 + Math.random() * 0.012,
          color: this.palette[i % this.palette.length]
        });
      }
      if (!this.running) {
        this.running = true;
        requestAnimationFrame(() => this.tick());
      }
    }

    launchSalvo(waves = 5) {
      for (let i = 0; i < waves; i++) {
        setTimeout(() => this.burst(0.18 + Math.random() * 0.64, 0.18 + Math.random() * 0.38, 48), i * 250);
      }
    }

    tick() {
      this.ctx.clearRect(0, 0, this.w, this.h);
      for (let i = this.sparks.length - 1; i >= 0; i--) {
        const s = this.sparks[i];
        s.x += s.vx;
        s.y += s.vy;
        s.vy += 0.065;
        s.vx *= 0.985;
        s.vy *= 0.985;
        s.alpha -= s.decay;
        if (s.alpha <= 0) {
          this.sparks.splice(i, 1);
          continue;
        }
        this.ctx.globalAlpha = s.alpha;
        this.ctx.fillStyle = s.color;
        this.ctx.beginPath();
        this.ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        this.ctx.fill();
      }
      this.ctx.globalAlpha = 1;
      if (this.sparks.length > 0) requestAnimationFrame(() => this.tick());
      else {
        this.running = false;
        this.ctx.clearRect(0, 0, this.w, this.h);
      }
    }
  }

  const fireworks = new FireworksEngine();

  /* =========================================================
     CURTAIN, NAVIGATION & TIME CONSOLE
  ========================================================= */
  function initCurtainAndNav() {
    const curtain = $('#opening-curtain');
    const openBtn = $('#open-invitation-btn');
    const audioOpt = $('#enter-with-audio');
    const mobileBtn = $('#mobile-menu-btn');
    const mobileDrawer = $('#mobile-nav-drawer');

    openBtn?.addEventListener('click', () => {
      curtain?.classList.add('is-opened');
      document.body.classList.remove('is-locked');
      audio.playUnlockChime();
      if (audioOpt?.checked) setTimeout(() => audio.startMusic(), 500);
      fireworks.launchSalvo(4);
    });

    $('#audio-toggle')?.addEventListener('click', () => audio.toggleMusic());
    $('#fireworks-trigger')?.addEventListener('click', () => {
      fireworks.launchSalvo(5);
      audio.playCelebrationChord();
    });

    mobileBtn?.addEventListener('click', () => {
      const open = !mobileDrawer.hidden;
      mobileDrawer.hidden = open;
      mobileBtn.setAttribute('aria-expanded', String(!open));
    });

    $$('.mobile-nav-link', mobileDrawer).forEach((l) => {
      l.addEventListener('click', () => {
        mobileDrawer.hidden = true;
        mobileBtn?.setAttribute('aria-expanded', 'false');
      });
    });
  }

  function initTimeConsole() {
    const daysEl = $('#time-days');
    const hoursEl = $('#time-hours');
    const minsEl = $('#time-minutes');
    const secsEl = $('#time-seconds');
    const captionEl = $('#time-caption');
    const livedBtn = $('#mode-lived');
    const countdownBtn = $('#mode-countdown');
    if (!daysEl) return;

    let mode = 'lived';
    const birthMs = new Date(BIRTH_ISO).getTime();
    const pad = (n) => String(n).padStart(2, '0');

    function isBirthdayTodayVN(now) {
      const vn = new Date(now.getTime() + 7 * 3600 * 1000);
      return vn.getUTCMonth() === 10 && vn.getUTCDate() === 25;
    }

    function nextBirthday(now) {
      const y = now.getFullYear();
      let t = new Date(`${y}-11-25T00:00:00+07:00`);
      if (now.getTime() >= t.getTime()) t = new Date(`${y + 1}-11-25T00:00:00+07:00`);
      return t;
    }

    function update() {
      const now = new Date();
      const isToday = isBirthdayTodayVN(now);
      let diffMs = 0;
      if (mode === 'lived') {
        diffMs = Math.max(0, now.getTime() - birthMs);
        if (captionEl) {
          captionEl.textContent = isToday
            ? '🎂 Hôm nay là Sinh Nhật 25.11 — Hành trình từ 25.11.2008'
            : 'Tổng thời gian rực rỡ kể từ 25.11.2008';
        }
      } else {
        const target = nextBirthday(now);
        diffMs = Math.max(0, target.getTime() - now.getTime());
        if (captionEl) {
          captionEl.textContent = isToday
            ? `🎉 Chúc mừng sinh nhật 25.11 hôm nay! Kỳ tiếp: 25.11.${target.getFullYear()}`
            : `Hướng tới cột mốc 25.11.${target.getFullYear()}`;
        }
      }

      const sec = Math.floor(diffMs / 1000);
      daysEl.textContent = Math.floor(sec / 86400).toLocaleString('vi-VN');
      hoursEl.textContent = pad(Math.floor((sec % 86400) / 3600));
      minsEl.textContent = pad(Math.floor((sec % 3600) / 60));
      secsEl.textContent = pad(sec % 60);
    }

    livedBtn?.addEventListener('click', () => {
      mode = 'lived';
      livedBtn.classList.add('active');
      countdownBtn?.classList.remove('active');
      update();
    });
    countdownBtn?.addEventListener('click', () => {
      mode = 'countdown';
      countdownBtn.classList.add('active');
      livedBtn?.classList.remove('active');
      update();
    });

    update();
    setInterval(update, 1000);
  }

  /* =========================================================
     3D TILT, SPOTLIGHTS & SAGITTARIUS ASTROLABE
  ========================================================= */
  function attachTilt(el, maxDeg = 9, prefix = '--sheen') {
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      el.style.transform = `rotateX(${((0.5 - py) * maxDeg).toFixed(2)}deg) rotateY(${((px - 0.5) * maxDeg).toFixed(2)}deg)`;
      el.style.setProperty(`${prefix}-x`, `${(px * 100).toFixed(1)}%`);
      el.style.setProperty(`${prefix}-y`, `${(py * 100).toFixed(1)}%`);
    });
    el.addEventListener('pointerleave', () => {
      el.style.transform = 'rotateX(0deg) rotateY(0deg)';
    });
  }

  function initDossierInteractions() {
    $$('[data-spotlight]').forEach((card) => {
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        card.style.setProperty('--spot-x', `${e.clientX - r.left}px`);
        card.style.setProperty('--spot-y', `${e.clientY - r.top}px`);
      });
    });

    const readout = $('#star-readout');
    const stars = $$('.star-node');
    const pills = $$('.sgr-pill');

    function activateIndex(idx) {
      const node = stars[idx];
      if (!node) return;
      stars.forEach((s, i) => s.classList.toggle('is-active', i === idx));
      pills.forEach((p, i) => p.classList.toggle('active', i === idx));
      if (readout) {
        readout.innerHTML = '';
        const title = document.createElement('strong');
        title.className = 'mono';
        title.textContent = `${(node.dataset.star || '').toUpperCase()} • `;
        const desc = document.createElement('span');
        desc.textContent = node.dataset.desc || '';
        readout.append(title, desc);
      }
    }

    stars.forEach((node, idx) => {
      node.addEventListener('mouseenter', () => activateIndex(idx));
      node.addEventListener('click', () => activateIndex(idx));
    });
    pills.forEach((pill, idx) => {
      pill.addEventListener('click', () => activateIndex(idx));
    });
  }

  /* =========================================================
     ACT 4: PROCEDURAL 3D WEBGL CAKE ENGINE (THREE.JS)
  ========================================================= */
  function createGoldFleckTexture() {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 256;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#2d1a11';
    ctx.fillRect(0, 0, c.width, c.height);

    // Subtle dark couverture swirl
    for (let i = 0; i < 160; i++) {
      ctx.fillStyle = i % 2 === 0 ? 'rgba(62, 37, 24, 0.35)' : 'rgba(20, 11, 7, 0.3)';
      ctx.beginPath();
      ctx.ellipse(Math.random() * 512, Math.random() * 256, 18 + Math.random() * 44, 4 + Math.random() * 9, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }

    // Scattered 24K gold leaf dust flecks
    for (let i = 0; i < 150; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 256;
      const sz = 1 + Math.random() * 3.5;
      ctx.fillStyle = Math.random() > 0.35 ? '#fae09b' : '#d6a54b';
      ctx.fillRect(x, y, sz, sz * (0.6 + Math.random()));
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }

  function createGlowSpriteTexture() {
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 64;
    const ctx = c.getContext('2d');
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255, 250, 232, 1)');
    grad.addColorStop(0.28, 'rgba(255, 212, 118, 0.85)');
    grad.addColorStop(0.62, 'rgba(224, 150, 52, 0.28)');
    grad.addColorStop(1, 'rgba(224, 150, 52, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  function buildStudioEnvironment(renderer) {
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envScene = new THREE.Scene();
    envScene.background = new THREE.Color(0x16110d);

    const overhead = new THREE.Mesh(
      new THREE.PlaneGeometry(14, 14),
      new THREE.MeshBasicMaterial({ color: 0xfff0d0, side: THREE.DoubleSide })
    );
    overhead.position.set(0, 8, 2);
    overhead.rotation.x = Math.PI / 2;
    envScene.add(overhead);

    const leftStrip = new THREE.Mesh(
      new THREE.PlaneGeometry(4, 10),
      new THREE.MeshBasicMaterial({ color: 0xf7d89a, side: THREE.DoubleSide })
    );
    leftStrip.position.set(-7, 3, 4);
    leftStrip.lookAt(0, 0, 0);
    envScene.add(leftStrip);

    const rightStrip = new THREE.Mesh(
      new THREE.PlaneGeometry(4, 10),
      new THREE.MeshBasicMaterial({ color: 0xe6be72, side: THREE.DoubleSide })
    );
    rightStrip.position.set(7, 3, 3);
    rightStrip.lookAt(0, 0, 0);
    envScene.add(rightStrip);

    const rt = pmrem.fromScene(envScene, 0.04);
    pmrem.dispose();
    return rt.texture;
  }

  function createNumeral1Geometry() {
    const shape = new THREE.Shape();
    shape.moveTo(-0.08, 0);
    shape.lineTo(0.09, 0);
    shape.lineTo(0.09, 0.08);
    shape.lineTo(0.04, 0.09);
    shape.lineTo(0.04, 0.56);
    shape.lineTo(-0.03, 0.56);
    shape.lineTo(-0.14, 0.44);
    shape.lineTo(-0.09, 0.37);
    shape.lineTo(-0.03, 0.43);
    shape.lineTo(-0.03, 0.09);
    shape.lineTo(-0.08, 0.08);
    shape.closePath();

    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.06,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.012,
      bevelThickness: 0.012
    });
    geo.translate(0, 0, -0.03);
    return geo;
  }

  function createNumeral9Geometry() {
    const outer = new THREE.Shape();
    outer.absarc(0, 0.38, 0.15, Math.PI * 0.9, -Math.PI * 1.1, true);
    outer.quadraticCurveTo(0.14, 0.06, -0.05, 0.0);
    outer.lineTo(-0.11, 0.08);
    outer.quadraticCurveTo(0.06, 0.12, 0.07, 0.27);
    outer.absarc(0, 0.38, 0.15, -0.25, Math.PI * 0.9, false);

    // Simpler clean sculpted 9 with inner loop hole
    const s = new THREE.Shape();
    s.moveTo(-0.08, 0.02);
    s.lineTo(0.0, 0.0);
    s.quadraticCurveTo(0.16, 0.05, 0.16, 0.32);
    s.quadraticCurveTo(0.16, 0.56, 0.0, 0.56);
    s.quadraticCurveTo(-0.16, 0.56, -0.16, 0.38);
    s.quadraticCurveTo(-0.16, 0.22, 0.0, 0.22);
    s.quadraticCurveTo(0.06, 0.22, 0.09, 0.25);
    s.quadraticCurveTo(0.08, 0.10, -0.09, 0.09);
    s.closePath();

    const hole = new THREE.Path();
    hole.absellipse(0, 0.39, 0.075, 0.09, 0, Math.PI * 2, true, 0);
    s.holes.push(hole);

    const geo = new THREE.ExtrudeGeometry(s, {
      depth: 0.06,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.012,
      bevelThickness: 0.012
    });
    geo.translate(0, 0, -0.03);
    return geo;
  }

  function initCake3DRitual() {
    const viewport = $('#cake-3d-viewport');
    const canvas = $('#cake-3d-canvas');
    const statusEl = $('#candles-status');
    const blowAllBtn = $('#blow-all-btn');
    const sparklerBtn = $('#sparkler-toggle-btn');
    const micBtn = $('#mic-blow-btn');
    const micWrap = $('#mic-meter-wrap');
    const micFill = $('#mic-meter-fill');
    const relightBtn = $('#relight-btn');
    const revealedBox = $('#wish-revealed');
    const champagneBtn = $('#champagne-pop-btn');
    const camOverviewBtn = $('#cam-overview');
    const camCloseupBtn = $('#cam-closeup');
    const camSpinBtn = $('#cam-spin');

    if (!viewport || !canvas) return;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch {
      showToast('Trình duyệt không hỗ trợ WebGL 3D');
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.24;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const scene = new THREE.Scene();
    scene.environment = buildStudioEnvironment(renderer);
    const camera = new THREE.PerspectiveCamera(40, viewport.clientWidth / Math.max(viewport.clientHeight, 1), 0.1, 60);

    // Studio Lighting
    const hemi = new THREE.HemisphereLight(0xfff1d4, 0x261810, 1.35);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xfff1d2, 2.6);
    keyLight.position.set(4.8, 7.5, 5.2);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xe5c17d, 1.85);
    rimLight.position.set(-5.2, 4.2, -4.5);
    scene.add(rimLight);

    const fillLight = new THREE.PointLight(0xffd896, 1.8, 16);
    fillLight.position.set(-3.2, 2.4, 4.8);
    scene.add(fillLight);

    const frontAccent = new THREE.PointLight(0xffe1a8, 1.9, 14);
    frontAccent.position.set(2.4, 1.4, 5.4);
    scene.add(frontAccent);

    // Materials
    const chocTex = createGoldFleckTexture();
    const chocolateMat = new THREE.MeshPhysicalMaterial({
      map: chocTex,
      color: 0x3b2216,
      roughness: 0.16,
      metalness: 0.08,
      clearcoat: 1.0,
      clearcoatRoughness: 0.07,
      envMapIntensity: 1.55
    });

    const dripMat = new THREE.MeshPhysicalMaterial({
      color: 0x28140c,
      roughness: 0.13,
      metalness: 0.06,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      envMapIntensity: 1.45
    });

    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xe3bf78,
      roughness: 0.2,
      metalness: 0.92,
      envMapIntensity: 1.4
    });

    const goldLeafMat = new THREE.MeshStandardMaterial({
      color: 0xf7e1a2,
      roughness: 0.16,
      metalness: 0.95,
      emissive: 0x332006,
      emissiveIntensity: 0.35,
      envMapIntensity: 1.5,
      side: THREE.DoubleSide
    });

    const waxMat = new THREE.MeshStandardMaterial({
      color: 0xf7ebd2,
      roughness: 0.35,
      metalness: 0.12
    });

    const cakeRoot = new THREE.Group();
    cakeRoot.position.y = -2.35;
    scene.add(cakeRoot);

    // Subtle reflective dark obsidian studio floor
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x0b0806, roughness: 0.22, metalness: 0.45 });
    const floorDisc = new THREE.Mesh(new THREE.CircleGeometry(5.6, 64), floorMat);
    floorDisc.rotation.x = -Math.PI / 2;
    floorDisc.receiveShadow = true;
    cakeRoot.add(floorDisc);

    // Turned Architectural Brass Pedestal (LatheGeometry)
    const standPts = [
      new THREE.Vector2(0.0, 0.02),
      new THREE.Vector2(1.22, 0.02),
      new THREE.Vector2(1.16, 0.14),
      new THREE.Vector2(0.84, 0.24),
      new THREE.Vector2(0.32, 0.34),
      new THREE.Vector2(0.26, 0.72),
      new THREE.Vector2(0.42, 0.92),
      new THREE.Vector2(2.44, 0.98),
      new THREE.Vector2(2.48, 1.08),
      new THREE.Vector2(2.38, 1.12),
      new THREE.Vector2(0.0, 1.12)
    ];
    const standMesh = new THREE.Mesh(new THREE.LatheGeometry(standPts, 64), brassMat);
    standMesh.castShadow = true;
    standMesh.receiveShadow = true;
    cakeRoot.add(standMesh);

    const platterTopY = 1.12;

    // Helper for tier + gold pearl collar + gold leaf flakes
    function addTier(radius, height, baseY) {
      const geo = new THREE.CylinderGeometry(radius, radius * 1.01, height, 64);
      const mesh = new THREE.Mesh(geo, chocolateMat);
      mesh.position.y = baseY + height / 2;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      cakeRoot.add(mesh);

      // Gold rim ring at base
      const ring = new THREE.Mesh(new THREE.TorusGeometry(radius + 0.015, 0.024, 16, 64), goldLeafMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = baseY + 0.025;
      cakeRoot.add(ring);

      // 24K gold leaf polygons clinging to side
      for (let i = 0; i < 10; i++) {
        const ang = (i / 10) * Math.PI * 2 + Math.random() * 0.35;
        const flake = new THREE.Mesh(new THREE.PlaneGeometry(0.11 + Math.random() * 0.1, 0.09 + Math.random() * 0.08), goldLeafMat);
        flake.position.set(
          Math.cos(ang) * (radius + 0.012),
          baseY + 0.18 + Math.random() * (height - 0.32),
          Math.sin(ang) * (radius + 0.012)
        );
        flake.lookAt(Math.cos(ang) * 5, flake.position.y, Math.sin(ang) * 5);
        flake.rotateZ(Math.random() * Math.PI);
        cakeRoot.add(flake);
      }
      return baseY + height;
    }

    const t1Top = addTier(2.04, 1.06, platterTopY);
    const t2Top = addTier(1.48, 0.96, t1Top);
    const t3Top = addTier(0.98, 0.86, t2Top);

    // Alternating 3D French Macarons & Gold-Dusted Truffles around Platter Perimeter
    const macCount = 16;
    const macShellMat = new THREE.MeshStandardMaterial({ color: 0x1f1916, roughness: 0.42, metalness: 0.25 });
    const truffleMat = new THREE.MeshStandardMaterial({ color: 0x3b2214, roughness: 0.72, metalness: 0.08 });
    for (let i = 0; i < macCount; i++) {
      const ang = (i / macCount) * Math.PI * 2;
      const dist = 2.22;
      const x = Math.cos(ang) * dist;
      const z = Math.sin(ang) * dist;
      if (i % 2 === 0) {
        const mac = new THREE.Group();
        const cap1 = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.17, 0.06, 20), macShellMat);
        const cream = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.04, 20), goldLeafMat);
        const cap2 = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.15, 0.06, 20), macShellMat);
        cap1.position.y = 0.03;
        cream.position.y = 0.08;
        cap2.position.y = 0.13;
        mac.add(cap1, cream, cap2);
        mac.position.set(x, platterTopY + 0.02, z);
        mac.rotation.y = -ang;
        mac.rotation.z = 0.14;
        cakeRoot.add(mac);
      } else {
        const truf = new THREE.Mesh(new THREE.SphereGeometry(0.125, 18, 16), i % 4 === 1 ? goldLeafMat : truffleMat);
        truf.position.set(x, platterTopY + 0.11, z);
        cakeRoot.add(truf);
      }
    }

    // Sculpted 3D Glossy Chocolate Drips around Tier 2 Rim
    const dripCount = 26;
    for (let i = 0; i < dripCount; i++) {
      const ang = (i / dripCount) * Math.PI * 2;
      const dripLen = 0.16 + ((i * 37) % 10) * 0.028;
      const drip = new THREE.Mesh(new THREE.CapsuleGeometry(0.038, dripLen, 6, 12), dripMat);
      drip.position.set(Math.cos(ang) * 1.485, t2Top - dripLen * 0.52, Math.sin(ang) * 1.485);
      cakeRoot.add(drip);
    }

    // Sculpted Tempered Chocolate Sail Shards on Tier 1 & Tier 2
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * Math.PI * 2 + 0.35;
      const shardGeo = new THREE.ConeGeometry(0.24, 0.65, 3);
      shardGeo.scale(1, 1, 0.12);
      const shard = new THREE.Mesh(shardGeo, dripMat);
      shard.position.set(Math.cos(ang) * 1.62, t1Top + 0.16, Math.sin(ang) * 1.62);
      shard.lookAt(0, t1Top + 0.16, 0);
      shard.rotateX(-0.28);
      shard.rotateZ(0.25);
      cakeRoot.add(shard);
    }

    // Top Crown Gold Beaded Rim
    for (let i = 0; i < 32; i++) {
      const ang = (i / 32) * Math.PI * 2;
      const pearl = new THREE.Mesh(new THREE.SphereGeometry(0.032, 10, 10), goldLeafMat);
      pearl.position.set(Math.cos(ang) * 0.94, t3Top + 0.015, Math.sin(ang) * 0.94);
      cakeRoot.add(pearl);
    }

    // =========================================================
    // 5 INTERACTIVE 3D CANDLES ON TOP TIER (t3Top)
    // =========================================================
    const flamePts = [
      new THREE.Vector2(0.0, 0.0),
      new THREE.Vector2(0.048, 0.04),
      new THREE.Vector2(0.058, 0.1),
      new THREE.Vector2(0.035, 0.19),
      new THREE.Vector2(0.0, 0.27)
    ];
    const outerFlameGeo = new THREE.LatheGeometry(flamePts, 16);
    const innerFlameGeo = new THREE.LatheGeometry(flamePts.map((p) => new THREE.Vector2(p.x * 0.5, p.y * 0.62)), 12);

    const candleConfigs = [
      { kind: 'taper', x: -0.66, z: 0.10, h: 0.54 },
      { kind: 'num1',  x: -0.30, z: 0.24, h: 0.56 },
      { kind: 'taper', x: 0.0,   z: -0.06, h: 0.72 },
      { kind: 'num9',  x: 0.30,  z: 0.24, h: 0.56 },
      { kind: 'taper', x: 0.66,  z: 0.10, h: 0.54 }
    ];

    const glowTex = createGlowSpriteTexture();
    const candles3D = [];
    const hitTargets = [];

    candleConfigs.forEach((cfg, idx) => {
      const g = new THREE.Group();
      g.position.set(cfg.x, t3Top, cfg.z);

      // Brass socket collar
      const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.095, 0.05, 18), brassMat);
      collar.position.y = 0.025;
      g.add(collar);

      let wickTopY = cfg.h + 0.04;
      if (cfg.kind === 'num1') {
        const num1 = new THREE.Mesh(createNumeral1Geometry(), goldLeafMat);
        num1.scale.setScalar(1.24);
        num1.position.y = 0.03;
        g.add(num1);
        wickTopY = 0.74;
      } else if (cfg.kind === 'num9') {
        const num9 = new THREE.Mesh(createNumeral9Geometry(), goldLeafMat);
        num9.scale.setScalar(1.24);
        num9.position.y = 0.03;
        g.add(num9);
        wickTopY = 0.74;
      } else {
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.055, cfg.h, 20), waxMat);
        body.position.y = cfg.h / 2 + 0.02;
        g.add(body);
        const stripe = new THREE.Mesh(new THREE.TorusGeometry(0.054, 0.008, 8, 24), brassMat);
        stripe.rotation.x = Math.PI / 2;
        stripe.position.y = cfg.h * 0.65;
        g.add(stripe);
        wickTopY = cfg.h + 0.02;
      }

      const wick = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.07, 8), new THREE.MeshBasicMaterial({ color: 0x1c140e }));
      wick.position.y = wickTopY + 0.03;
      g.add(wick);

      const flameGroup = new THREE.Group();
      flameGroup.position.y = wickTopY + 0.055;

      const outerMat = new THREE.MeshBasicMaterial({ color: 0xffa630, transparent: true, opacity: 0.92 });
      const innerMat = new THREE.MeshBasicMaterial({ color: 0xfff8dc });
      const outerFlame = new THREE.Mesh(outerFlameGeo, outerMat);
      const innerFlame = new THREE.Mesh(innerFlameGeo, innerMat);
      const haloSprite = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: glowTex,
          color: 0xffc668,
          transparent: true,
          opacity: 0.75,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        })
      );
      haloSprite.scale.set(0.55, 0.55, 1);
      haloSprite.position.y = 0.14;
      flameGroup.add(outerFlame, innerFlame, haloSprite);

      const pLight = new THREE.PointLight(0xffb84d, 1.45, 4.5, 2);
      pLight.position.y = 0.16;
      flameGroup.add(pLight);
      g.add(flameGroup);

      // Generous invisible raycast hit cylinder
      const hitMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.18, wickTopY + 0.42, 10),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      hitMesh.position.y = (wickTopY + 0.42) / 2;
      hitMesh.userData.candleIndex = idx;
      g.add(hitMesh);
      hitTargets.push(hitMesh);

      cakeRoot.add(g);
      candles3D.push({
        idx,
        group: g,
        flameGroup,
        pLight,
        wickTopY,
        lit: true,
        phase: Math.random() * Math.PI * 2
      });
    });

    // =========================================================
    // 3D SPARKLERS, SMOKE PUFFS & CHAMPAGNE BURST PARTICLES
    // =========================================================
    let sparklersOn = true;
    const sparkOrigins = [
      new THREE.Vector3(-1.12, t2Top + 0.14, 0.15),
      new THREE.Vector3(1.12, t2Top + 0.14, 0.15)
    ];

    // Tiny metallic sparkler rods
    sparkOrigins.forEach((pos, idx) => {
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.36, 8), brassMat);
      rod.position.copy(pos);
      rod.position.y -= 0.16;
      rod.rotation.z = idx === 0 ? 0.24 : -0.24;
      cakeRoot.add(rod);
    });

    const MAX_SPARKS = 260;
    const sparkPos = new Float32Array(MAX_SPARKS * 3);
    const sparkVel = [];
    const sparkLife = new Float32Array(MAX_SPARKS);
    for (let i = 0; i < MAX_SPARKS; i++) {
      sparkVel.push(new THREE.Vector3());
      sparkLife[i] = 0;
    }
    const sparkGeo = new THREE.BufferGeometry();
    sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
    const sparkMat = new THREE.PointsMaterial({
      map: glowTex,
      color: 0xffe6a6,
      size: 0.22,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const sparkPoints = new THREE.Points(sparkGeo, sparkMat);
    cakeRoot.add(sparkPoints);

    const smokePuffs = [];
    const smokeGeo = new THREE.SphereGeometry(0.055, 8, 8);

    function spawn3DSmoke(localX, localY, localZ) {
      for (let i = 0; i < 12; i++) {
        const mat = new THREE.MeshBasicMaterial({ color: 0xe6dccb, transparent: true, opacity: 0.45, depthWrite: false });
        const m = new THREE.Mesh(smokeGeo, mat);
        m.position.set(localX + (Math.random() - 0.5) * 0.06, localY + 0.05, localZ + (Math.random() - 0.5) * 0.06);
        cakeRoot.add(m);
        smokePuffs.push({
          mesh: m,
          vy: 0.014 + Math.random() * 0.012,
          vx: (Math.random() - 0.5) * 0.008,
          vz: (Math.random() - 0.5) * 0.008,
          life: 1.0
        });
      }
    }

    function spawnChampagneBurst3D() {
      for (let i = 0; i < MAX_SPARKS; i++) {
        const ang = Math.random() * Math.PI * 2;
        const spd = 0.04 + Math.random() * 0.085;
        sparkPos[i * 3] = 0;
        sparkPos[i * 3 + 1] = t3Top + 0.3;
        sparkPos[i * 3 + 2] = 0;
        sparkVel[i].set(Math.cos(ang) * spd, 0.06 + Math.random() * 0.09, Math.sin(ang) * spd);
        sparkLife[i] = 1.0 + Math.random() * 0.6;
      }
    }

    // =========================================================
    // ORBIT CAMERA & RAYCAST INTERACTION
    // =========================================================
    let targetAzimuth = 0.28;
    let currentAzimuth = 0.28;
    let targetPolar = 1.18;
    let currentPolar = 1.18;
    let targetDist = 9.4;
    let currentDist = 9.4;
    let targetLookY = 0.18;
    let currentLookY = 0.18;
    let autoSpin = true;

    let dragging = false;
    let downX = 0;
    let downY = 0;
    let lastX = 0;
    let lastY = 0;
    let windTarget = 0;
    let windCurrent = 0;

    const raycaster = new THREE.Raycaster();
    const pointerNdc = new THREE.Vector2();

    function litCandles() {
      return candles3D.filter((c) => c.lit);
    }

    let micStream = null;
    let micAnalyser = null;
    let micRaf = null;
    let micActive = false;
    let lastMicBlow = 0;

    function stopMic() {
      micActive = false;
      cancelAnimationFrame(micRaf);
      if (micStream) {
        micStream.getTracks().forEach((t) => t.stop());
        micStream = null;
      }
      if (micWrap) micWrap.hidden = true;
      if (micFill) micFill.style.width = '0%';
      if (micBtn) {
        micBtn.setAttribute('aria-pressed', 'false');
        micBtn.querySelector('span').textContent = 'Thổi Bằng Micro';
      }
    }

    function updateStatus(justFinished = false) {
      const rem = litCandles().length;
      if (statusEl) {
        statusEl.textContent =
          rem > 0 ? `${rem} / ${candles3D.length} ngọn nến 3D đang cháy` : 'Tất cả 5 ngọn nến 3D đã tắt ✨';
      }
      if (relightBtn) relightBtn.hidden = rem > 0;
      if (rem === 0 && justFinished) {
        stopMic();
        if (revealedBox) revealedBox.hidden = false;
        spawnChampagneBurst3D();
        fireworks.launchSalvo(7);
        audio.playCelebrationChord();
        showToast('Chúc mừng sinh nhật tuổi 19+ Gia Huy!');
      }
    }

    function extinguishCandle3D(c) {
      if (!c || !c.lit) return;
      c.lit = false;
      c.flameGroup.visible = false;
      c.pLight.intensity = 0;
      audio.playWhoosh();
      spawn3DSmoke(c.group.position.x, c.wickTopY + 0.08, c.group.position.z);
      updateStatus(litCandles().length === 0);
    }

    canvas.addEventListener('pointerdown', (e) => {
      dragging = true;
      downX = e.clientX;
      downY = e.clientY;
      lastX = e.clientX;
      lastY = e.clientY;
    });

    window.addEventListener('pointermove', (e) => {
      const dxMove = e.clientX - lastX;
      windTarget = Math.max(-0.45, Math.min(0.45, dxMove * 0.025));
      if (!dragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      targetAzimuth -= dx * 0.008;
      targetPolar = Math.max(0.32, Math.min(1.38, targetPolar - dy * 0.006));
    });

    canvas.addEventListener('pointerup', (e) => {
      if (!dragging) return;
      dragging = false;
      const moved = Math.hypot(e.clientX - downX, e.clientY - downY);
      if (moved < 7) {
        const rect = canvas.getBoundingClientRect();
        pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(pointerNdc, camera);
        const hits = raycaster.intersectObjects(hitTargets, false);
        if (hits.length > 0) {
          const idx = hits[0].object.userData.candleIndex;
          extinguishCandle3D(candles3D[idx]);
        }
      }
    });

    window.addEventListener('pointerup', () => { dragging = false; });

    camOverviewBtn?.addEventListener('click', () => {
      targetDist = 9.4;
      targetPolar = 1.18;
      targetLookY = 0.18;
      camOverviewBtn.classList.add('active');
      camCloseupBtn?.classList.remove('active');
    });

    camCloseupBtn?.addEventListener('click', () => {
      targetDist = 4.5;
      targetPolar = 1.10;
      targetLookY = 1.92;
      targetAzimuth = 0.08;
      camCloseupBtn.classList.add('active');
      camOverviewBtn?.classList.remove('active');
    });

    camSpinBtn?.addEventListener('click', () => {
      autoSpin = !autoSpin;
      camSpinBtn.classList.toggle('active', autoSpin);
      camSpinBtn.setAttribute('aria-pressed', String(autoSpin));
    });

    blowAllBtn?.addEventListener('click', () => {
      const active = litCandles();
      if (!active.length) {
        showToast('Nến đã tắt hết — bấm "Thắp Lại Nến" để thử lại nhé');
        return;
      }
      windTarget = 0.45;
      active.forEach((c, i) => setTimeout(() => extinguishCandle3D(c), i * 140));
    });

    sparklerBtn?.addEventListener('click', () => {
      sparklersOn = !sparklersOn;
      sparklerBtn.setAttribute('aria-pressed', String(sparklersOn));
      sparklerBtn.querySelector('span').textContent = sparklersOn ? 'Pháo Bông 3D: Đang Cháy' : 'Pháo Bông 3D: Đã Tắt';
    });

    relightBtn?.addEventListener('click', () => {
      candles3D.forEach((c) => {
        c.lit = true;
        c.flameGroup.visible = true;
        c.pLight.intensity = 1.35;
      });
      if (revealedBox) revealedBox.hidden = true;
      updateStatus(false);
      audio.playUnlockChime();
    });

    champagneBtn?.addEventListener('click', () => {
      spawnChampagneBurst3D();
      fireworks.launchSalvo(8);
      audio.playCelebrationChord();
      showToast('🥂 Chúc mừng tuổi 19 rực rỡ của Gia Huy!');
    });

    micBtn?.addEventListener('click', async () => {
      if (micActive) {
        stopMic();
        showToast('Đã tắt micro');
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        showToast('Trình duyệt không hỗ trợ micro — hãy chạm trực tiếp vào nến 3D nhé');
        return;
      }
      try {
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        const mCtx = new AudioCtx();
        const src = mCtx.createMediaStreamSource(micStream);
        micAnalyser = mCtx.createAnalyser();
        micAnalyser.fftSize = 256;
        src.connect(micAnalyser);

        const data = new Uint8Array(micAnalyser.frequencyBinCount);
        micActive = true;
        if (micWrap) micWrap.hidden = false;
        micBtn.setAttribute('aria-pressed', 'true');
        micBtn.querySelector('span').textContent = 'Đang Lắng Nghe Hơi Thổi...';
        showToast('Hãy thổi nhẹ vào micro để tắt từng ngọn nến 3D');

        const monitor = () => {
          if (!micActive) return;
          micAnalyser.getByteFrequencyData(data);
          let sum = 0;
          for (let i = 0; i < data.length; i++) sum += data[i];
          const avg = sum / data.length;
          if (micFill) micFill.style.width = `${Math.min(100, (avg / 75) * 100).toFixed(0)}%`;
          windTarget = Math.min(0.45, avg * 0.008);

          const now = performance.now();
          if (avg > 44 && now - lastMicBlow > 340) {
            lastMicBlow = now;
            const rem = litCandles();
            if (rem.length > 0) extinguishCandle3D(rem[0]);
          }
          micRaf = requestAnimationFrame(monitor);
        };
        monitor();
      } catch {
        stopMic();
        showToast('Không truy cập được micro — hãy chạm nến 3D hoặc bấm "Thổi Tất Cả Nến"');
      }
    });

    // ResizeObserver for clean WebGL sizing
    function handleResize() {
      const w = viewport.clientWidth;
      const h = Math.max(viewport.clientHeight, 1);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    }
    handleResize();
    new ResizeObserver(handleResize).observe(viewport);

    // 60fps Render Loop
    let sparkCursor = 0;
    function animate(timeMs) {
      const t = timeMs * 0.001;
      if (autoSpin && !dragging) targetAzimuth += 0.0032;

      currentAzimuth += (targetAzimuth - currentAzimuth) * 0.08;
      currentPolar += (targetPolar - currentPolar) * 0.08;
      currentDist += (targetDist - currentDist) * 0.08;
      currentLookY += (targetLookY - currentLookY) * 0.08;

      camera.position.set(
        Math.sin(currentPolar) * Math.sin(currentAzimuth) * currentDist,
        Math.cos(currentPolar) * currentDist + currentLookY,
        Math.sin(currentPolar) * Math.cos(currentAzimuth) * currentDist
      );
      camera.lookAt(0, currentLookY, 0);

      windCurrent += (windTarget - windCurrent) * 0.14;
      windTarget *= 0.9;

      // Animate 3D candle flames & point lights
      candles3D.forEach((c) => {
        if (!c.lit) return;
        const flick = 0.9 + 0.16 * Math.sin(t * 14 + c.phase) + 0.08 * Math.cos(t * 23 + c.phase);
        c.flameGroup.scale.set(0.95 + 0.08 * Math.sin(t * 11 + c.phase), flick, 0.95);
        c.flameGroup.rotation.z = -windCurrent + Math.sin(t * 8 + c.phase) * 0.06;
        c.pLight.intensity = 1.15 + 0.35 * Math.sin(t * 15 + c.phase);
      });

      // Emit 3D sparkler fountain particles
      if (sparklersOn && litCandles().length > 0) {
        for (let s = 0; s < 4; s++) {
          const origin = sparkOrigins[s % 2];
          const idx = sparkCursor % MAX_SPARKS;
          sparkCursor += 1;
          sparkPos[idx * 3] = origin.x;
          sparkPos[idx * 3 + 1] = origin.y;
          sparkPos[idx * 3 + 2] = origin.z;
          sparkVel[idx].set(
            (Math.random() - 0.5) * 0.04 + (s % 2 === 0 ? -0.01 : 0.01),
            0.045 + Math.random() * 0.045,
            (Math.random() - 0.5) * 0.04
          );
          sparkLife[idx] = 0.65 + Math.random() * 0.4;
        }
      }

      // Update sparkler & champagne particles
      for (let i = 0; i < MAX_SPARKS; i++) {
        if (sparkLife[i] <= 0) {
          sparkPos[i * 3 + 1] = -999;
          continue;
        }
        sparkPos[i * 3] += sparkVel[i].x;
        sparkPos[i * 3 + 1] += sparkVel[i].y;
        sparkPos[i * 3 + 2] += sparkVel[i].z;
        sparkVel[i].y -= 0.0022;
        sparkLife[i] -= 0.022;
      }
      sparkGeo.attributes.position.needsUpdate = true;

      // Update 3D curling smoke puffs
      for (let i = smokePuffs.length - 1; i >= 0; i--) {
        const p = smokePuffs[i];
        p.mesh.position.y += p.vy;
        p.mesh.position.x += p.vx + Math.sin(t * 4 + i) * 0.003;
        p.mesh.position.z += p.vz;
        p.mesh.scale.addScalar(0.025);
        p.life -= 0.016;
        p.mesh.material.opacity = Math.max(0, p.life * 0.42);
        if (p.life <= 0) {
          cakeRoot.remove(p.mesh);
          p.mesh.material.dispose();
          smokePuffs.splice(i, 1);
        }
      }

      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    }

    requestAnimationFrame(animate);
    updateStatus(false);
  }

  /* =========================================================
     ACT 5: LUXURY GIFT VAULT
  ========================================================= */
  function initGiftVault() {
    const boxes = $$('.gift-box');
    const banner = $('#vault-complete-banner');
    if (!boxes.length) return;

    function openBox(box) {
      if (box.classList.contains('is-open')) return;
      box.classList.add('is-open');
      box.setAttribute('aria-expanded', 'true');
      const front = $('.gift-front-label', box);
      const reveal = $('.gift-reveal-content', box);
      if (front) front.hidden = true;
      if (reveal) reveal.hidden = false;

      audio.playUnlockChime();
      const rect = box.getBoundingClientRect();
      fireworks.burst((rect.left + rect.width / 2) / window.innerWidth, Math.max(0.2, rect.top / window.innerHeight), 28);

      const openedCount = boxes.filter((b) => b.classList.contains('is-open')).length;
      if (openedCount === boxes.length) {
        if (banner) banner.hidden = false;
        fireworks.launchSalvo(5);
        audio.playCelebrationChord();
        showToast('Đã mở khóa trọn vẹn cả 3 hộp quà Chapitre XIX!');
      }
    }

    boxes.forEach((box) => {
      box.addEventListener('click', () => openBox(box));
      box.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openBox(box);
        }
      });
    });
  }

  /* =========================================================
     ACT 6: 3D ENVELOPE LETTER FROM MINH THẮNG
  ========================================================= */
  function initLetter() {
    const folio = $('#letter-folio');
    const unsealBtn = $('#unseal-letter-btn');
    const letterBody = $('#letter-body');
    const sendStarBtn = $('#send-star-btn');
    const starCountEl = $('#star-count');

    let stars = Number(localStorage.getItem(STORAGE_STARS) || 19);
    if (starCountEl) starCountEl.textContent = String(stars);

    unsealBtn?.addEventListener('click', () => {
      if (folio) folio.dataset.open = 'true';
      if (letterBody) letterBody.hidden = false;
      audio.playUnlockChime();
    });

    sendStarBtn?.addEventListener('click', () => {
      stars += 1;
      localStorage.setItem(STORAGE_STARS, String(stars));
      if (starCountEl) starCountEl.textContent = String(stars);
      fireworks.burst(0.5, 0.4, 36);
      audio.playUnlockChime();
      showToast(`Đã gửi ngôi sao thứ ${stars} chúc mừng Gia Huy`);
    });
  }

  /* =========================================================
     ACT 7: VIP KEEPSAKE PNG EXPORTER (1200x700)
  ========================================================= */
  function initKeepsakeExporter() {
    const btn = $('#download-pass-btn');
    if (!btn) return;

    function roundRect(ctx, x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    }

    btn.addEventListener('click', () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1200;
      canvas.height = 700;
      const ctx = canvas.getContext('2d');

      const bg = ctx.createLinearGradient(0, 0, 1200, 700);
      bg.addColorStop(0, '#16110D');
      bg.addColorStop(0.55, '#090806');
      bg.addColorStop(1, '#14130D');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, 1200, 700);

      const glow = ctx.createRadialGradient(220, 160, 20, 220, 160, 520);
      glow.addColorStop(0, 'rgba(214, 179, 114, 0.22)');
      glow.addColorStop(1, 'rgba(214, 179, 114, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, 1200, 700);

      ctx.strokeStyle = 'rgba(214, 179, 114, 0.55)';
      ctx.lineWidth = 2;
      roundRect(ctx, 34, 34, 1132, 632, 28);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(214, 179, 114, 0.18)';
      ctx.lineWidth = 1;
      roundRect(ctx, 50, 50, 1100, 600, 20);
      ctx.stroke();

      ctx.fillStyle = '#D6B372';
      ctx.font = '500 18px "JetBrains Mono", monospace';
      ctx.fillText('MAISON 25·11  •  PASSEPORT CHAPITRE XIX', 92, 110);

      ctx.fillStyle = '#F3DEB5';
      ctx.font = '600 20px "JetBrains Mono", monospace';
      ctx.textAlign = 'right';
      ctx.fillText('AGE 19+  |  NHÂN MÃ', 1108, 110);
      ctx.textAlign = 'left';

      const imgEl = $('#vip-portrait-img');
      const px = 92;
      const py = 165;
      const pw = 290;
      const ph = 356;

      ctx.save();
      roundRect(ctx, px, py, pw, ph, 22);
      ctx.clip();
      if (imgEl && imgEl.complete && imgEl.naturalWidth > 0) {
        const scale = Math.max(pw / imgEl.naturalWidth, ph / imgEl.naturalHeight);
        const dw = imgEl.naturalWidth * scale;
        const dh = imgEl.naturalHeight * scale;
        ctx.drawImage(imgEl, px + (pw - dw) / 2, py + (ph - dh) * 0.2, dw, dh);
      } else {
        ctx.fillStyle = '#1D1712';
        ctx.fillRect(px, py, pw, ph);
      }
      ctx.restore();

      ctx.strokeStyle = 'rgba(243, 222, 181, 0.5)';
      ctx.lineWidth = 2;
      roundRect(ctx, px, py, pw, ph, 22);
      ctx.stroke();

      ctx.fillStyle = '#8F8577';
      ctx.font = '500 16px "JetBrains Mono", monospace';
      ctx.fillText('CELEBRATING', 436, 205);

      ctx.fillStyle = '#FBF2DD';
      ctx.font = '600 84px "Cormorant Garamond", Georgia, serif';
      ctx.fillText('GIA HUY', 436, 290);

      ctx.fillStyle = '#D6B372';
      ctx.font = 'italic 28px "Cormorant Garamond", Georgia, serif';
      ctx.fillText('Happy 19th Birthday — Haute Édition XIX', 436, 340);

      ctx.fillStyle = '#8F8577';
      ctx.font = '500 14px "JetBrains Mono", monospace';
      ctx.fillText('BIRTHDAY', 436, 420);
      ctx.fillText('CITY', 710, 420);

      ctx.fillStyle = '#F6F1E7';
      ctx.font = '500 24px "JetBrains Mono", monospace';
      ctx.fillText('25 . 11 . 2008', 436, 456);
      ctx.fillText('BUÔN MA THUỘT', 710, 456);

      ctx.strokeStyle = 'rgba(214, 179, 114, 0.25)';
      ctx.beginPath();
      ctx.moveTo(92, 578);
      ctx.lineTo(1108, 578);
      ctx.stroke();

      ctx.fillStyle = '#D6B372';
      ctx.font = '400 17px "JetBrains Mono", monospace';
      ctx.fillText('ID #GH-2511-19', 92, 616);

      ctx.textAlign = 'right';
      ctx.fillText('IG @ghuy_0301   •   TT @phanhgiahuy8', 1108, 616);

      try {
        const url = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = 'GiaHuy-Chapter19.png';
        link.href = url;
        link.click();
        showToast('Đã tải xuống thẻ kỷ niệm GiaHuy-Chapter19.png');
      } catch {
        showToast('Hãy mở qua http://localhost:8091 để tải ảnh PNG');
      }
    });
  }

  /* =========================================================
     SCROLL PROGRESS, REVEAL & COUNT-UP
  ========================================================= */
  function initScrollAndReveal() {
    const progressEl = $('#scroll-progress');
    const navLinks = $$('.nav-link');
    const sections = $$('main section[id]');

    function onScroll() {
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const pct = docHeight > 0 ? (window.scrollY / docHeight) * 100 : 0;
      if (progressEl) progressEl.style.width = `${Math.min(100, Math.max(0, pct)).toFixed(2)}%`;

      const y = window.scrollY + 180;
      let activeId = 'hero';
      sections.forEach((sec) => {
        if (y >= sec.offsetTop) activeId = sec.id;
      });
      navLinks.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === `#${activeId}`));
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    const reveals = $$('.reveal');
    if ('IntersectionObserver' in window) {
      const obs = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const delay = Number(entry.target.dataset.delay || 0);
            setTimeout(() => entry.target.classList.add('is-visible'), delay);
            obs.unobserve(entry.target);
          });
        },
        { threshold: 0.1 }
      );
      reveals.forEach((el) => obs.observe(el));

      const milestoneEl = $('#milestone-num');
      if (milestoneEl) {
        const mObs = new IntersectionObserver(
          (entries) => {
            if (!entries[0].isIntersecting) return;
            let cur = 1;
            const target = Number(milestoneEl.dataset.target || 19);
            const timer = setInterval(() => {
              cur += 1;
              milestoneEl.textContent = String(cur);
              if (cur >= target) clearInterval(timer);
            }, 40);
            mObs.disconnect();
          },
          { threshold: 0.4 }
        );
        mObs.observe(milestoneEl);
      }
    } else {
      reveals.forEach((el) => el.classList.add('is-visible'));
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    initLuxuryCursor();
    initAmbientField();
    initCurtainAndNav();
    initTimeConsole();
    initTurntableAndVisualizer();
    attachTilt($('#hero-tilt-card'), 9, '--sheen');
    attachTilt($('#vip-pass-card'), 10, '--holo');
    initDossierInteractions();
    initCake3DRitual();
    initGiftVault();
    initLetter();
    initKeepsakeExporter();
    initScrollAndReveal();
  });
})();
