// Awwwards-style motion: Lenis smooth scroll + GSAP ScrollTrigger pinned
// money-flow scene + split-text headline. Everything is feature-detected —
// if the CDN libs or a plugin are missing, the page stays fully usable.

const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function initLenis() {
  if (reduce || typeof window.Lenis !== 'function') return null;
  const lenis = new window.Lenis({ duration: 1.1, smoothWheel: true });
  function raf(t) { lenis.raf(t); requestAnimationFrame(raf); }
  requestAnimationFrame(raf);
  if (window.ScrollTrigger) {
    lenis.on('scroll', window.ScrollTrigger.update);
    if (window.gsap) window.gsap.ticker.add((t) => lenis.raf(t * 1000));
    window.gsap && window.gsap.ticker.lagSmoothing(0);
  }
  return lenis;
}

// Split an element's text into word > span wrappers for reveal animation.
export function splitWords(el) {
  if (!el) return [];
  const walk = (node) => {
    const out = [];
    node.childNodes.forEach((n) => {
      if (n.nodeType === 3) {
        n.textContent.split(/(\s+)/).forEach((tok) => {
          if (tok.trim() === '') { out.push(document.createTextNode(tok)); return; }
          const w = document.createElement('span'); w.className = 'word';
          const inner = document.createElement('span'); inner.textContent = tok;
          w.appendChild(inner); out.push(w);
        });
      } else if (n.nodeType === 1) {
        const clone = n.cloneNode(false);
        walk(n).forEach((c) => clone.appendChild(c));
        out.push(clone);
      }
    });
    return out;
  };
  const kids = walk(el);
  el.innerHTML = '';
  kids.forEach((k) => el.appendChild(k));
  return el.querySelectorAll('.word > span');
}

export function initHeadline() {
  const gsap = window.gsap;
  const head = document.querySelector('.hero-head h1');
  if (!gsap || !head) return;
  document.documentElement.classList.add('gsap-ready');
  const spans = splitWords(head);
  // fromTo so GSAP owns the transform (a CSS transform alone isn't overridden by yPercent:0)
  gsap.fromTo(spans, { yPercent: 115 }, { yPercent: 0, duration: 1.1, ease: 'expo.out', stagger: 0.06, delay: 0.15 });
}

// Pinned, scroll-scrubbed money-flow scene.
export function initHeroScrolly() {
  const gsap = window.gsap, ST = window.ScrollTrigger;
  if (!gsap || !ST) return;
  gsap.registerPlugin(ST);
  if (window.MotionPathPlugin) gsap.registerPlugin(window.MotionPathPlugin);

  const scrolly = document.querySelector('.hero-scrolly');
  const stage = document.querySelector('.hero-stage');
  const arc = document.getElementById('flowArc');
  const dot = document.getElementById('flowDot');
  const cuba = document.getElementById('cubaGlow');
  const glow = document.getElementById('familyGlow');
  const phones = document.querySelectorAll('.hero-scene .phone');
  const phases = document.querySelectorAll('.phase');
  if (!scrolly || !stage || !arc) return;

  const len = arc.getTotalLength();
  gsap.set(arc, { strokeDasharray: len, strokeDashoffset: len });
  gsap.set([cuba, glow], { opacity: 0, transformOrigin: 'center' });
  gsap.set(dot, { opacity: 1 });          // visible from the start, sitting at the sender's phone
  gsap.set(phases, { opacity: 0 });
  gsap.set(phases[0], { opacity: 1 });

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: scrolly, start: 'top top', end: '+=260%',
      pin: stage, scrub: 0.8, anticipatePin: 1,
    },
  });

  tl.to(arc, { strokeDashoffset: 0, ease: 'none', duration: 6 }, 0);

  if (window.MotionPathPlugin) {
    tl.to(dot, { motionPath: { path: arc, align: arc, alignOrigin: [0.5, 0.5] }, ease: 'none', duration: 6 }, 0);
  }

  tl.to(phases[0], { opacity: 0, duration: 1 }, 2.4)
    .to(phases[1], { opacity: 1, duration: 1 }, 2.6)
    .to(cuba, { opacity: 1, scale: 1, duration: 1 }, 4.8)
    .to(phases[1], { opacity: 0, duration: 1 }, 5)
    .to(phases[2], { opacity: 1, duration: 1 }, 5.4)
    .to(glow, { opacity: 1, scale: 1.15, duration: 1.2 }, 5.6);
}

// GSAP-powered reveals for the rest of the page (upgrade over IntersectionObserver).
export function initReveals() {
  const gsap = window.gsap, ST = window.ScrollTrigger;
  if (!gsap || !ST) return false;
  gsap.registerPlugin(ST);
  gsap.utils.toArray('.reveal:not(.in)').forEach((el) => {
    gsap.fromTo(el, { y: 34, opacity: 0 }, {
      y: 0, opacity: 1, duration: 0.9, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 88%' },
    });
    el.classList.add('in');
  });
  return true;
}

export function initMotionPro() {
  window.__motionInit = true;
  if (reduce) return;
  initLenis();
  initHeadline();
  initHeroScrolly();
  initReveals();
}
