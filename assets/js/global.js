// =============================
// global.js (v0.6)
// =============================

// Utility
const isMobile = () => window.matchMedia('(max-width:760px)').matches;

// --- 1. Fix mobile nav double-tap ---
(function () {
document.addEventListener('click', (e) => {
const a = e.target.closest('.nav-tree .children a');
if (!a) return;
e.stopPropagation(); // prevent <details> toggle
const d = a.closest('details');
if (d) d.dataset.lock = '1';
if (isMobile()) {
setTimeout(() => {
if (d) { d.open = false; d.dataset.lock = '0'; }
}, 300);
}
}, true);

document.querySelectorAll('.nav-tree details').forEach((d) => {
d.addEventListener('toggle', () => {
if (d.dataset.lock === '1' && !d.open) d.open = true;
});
});
})();

// --- 2. Scroll to header on mobile after nav ---
(function () {
const key = 'scrollToHeader';

// mark intent before leaving
document.querySelectorAll('.nav-tree a[href^="/"]').forEach(a => {
a.addEventListener('click', () => {
if (isMobile()) sessionStorage.setItem(key, '1');
});
});

// scroll once page is ready
function jumpToHeaderIfNeeded() {
if (sessionStorage.getItem(key) !== '1') return;
const header = document.querySelector('main h1');
if (!header) return;

const doScroll = () => header.scrollIntoView({ behavior: 'smooth', block: 'start' });
requestAnimationFrame(() => requestAnimationFrame(doScroll));
setTimeout(doScroll, 180);
sessionStorage.removeItem(key);
}

window.addEventListener('DOMContentLoaded', jumpToHeaderIfNeeded);
window.addEventListener('load', jumpToHeaderIfNeeded);
window.addEventListener('pageshow', jumpToHeaderIfNeeded);
})();

// --- 3. Autoplay helper for landing background video ---
(function () {
const v = document.querySelector('.bg-video');
if (!v) return;
v.muted = true;
const tryPlay = () => v.play().catch(() => {});
tryPlay();
window.addEventListener('touchstart', tryPlay, { once: true, passive: true });
})();
