// =========================================================
// global.js (v0.7 mobile-only)
// Behaviors run ONLY on viewports <= 760px
// =========================================================

const mq = window.matchMedia('(max-width:760px)');

// helper: run a function only when we're in mobile
function onMobile(fn) {
if (mq.matches) fn();
}

// re-bind on breakpoint changes (iOS Safari can change when rotating)
mq.addEventListener?.('change', () => {
// no persistent listeners to rewire; behaviors are click/one-shot
});

// --- 1) Close open <details> AFTER nav tap (prevents double-tap) ---
onMobile(() => {
document.querySelectorAll('.nav-tree a[href^="/"]').forEach(a => {
a.addEventListener('click', () => {
// defer so the navigation proceeds first
setTimeout(() => {
document.querySelectorAll('.nav-tree details[open]').forEach(d => d.open = false);
}, 250);
}, { passive: true });
});
});

// --- 2) Smooth jump to page header (h2 preferred, h1 fallback) on arrival ---
onMobile(() => {
const KEY = 'scrollToHeader';

// mark intent before leaving current page
document.querySelectorAll('.nav-tree a[href^="/"]').forEach(a => {
a.addEventListener('click', () => sessionStorage.setItem(KEY, '1'), { passive: true });
});

// run on load/show (covers normal load + bfcache)
const jump = () => {
if (sessionStorage.getItem(KEY) !== '1') return;
sessionStorage.removeItem(KEY);

const main = document.querySelector('main');
if (!main) return;

const target = main.querySelector('h1');
if (!target) return;

// double rAF + timeout: ensures layout is settled on iOS
const doScroll = () => target.scrollIntoView({ behavior: 'smooth', block: 'start' });
requestAnimationFrame(() => requestAnimationFrame(doScroll));
setTimeout(doScroll, 180);
};

window.addEventListener('DOMContentLoaded', jump, { once: true });
window.addEventListener('load', jump, { once: true });
window.addEventListener('pageshow', jump); // bfcache
});

// --- 3) Autoplay helper for landing background video (mobile only) ---
onMobile(() => {
const v = document.querySelector('.bg-video');
if (!v) return;
v.muted = true;
const tryPlay = () => v.play().catch(() => {});
tryPlay();
// on iOS a first touch may still be required in some cases
window.addEventListener('touchstart', tryPlay, { once: true, passive: true });
});


// --- 3. Autoplay helper for landing background video ---
(function () {
const v = document.querySelector('.bg-video');
if (!v) return;
v.muted = true;
const tryPlay = () => v.play().catch(() => {});
tryPlay();
window.addEventListener('touchstart', tryPlay, { once: true, passive: true });
})();
