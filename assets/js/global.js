// /assets/js/global.js
document.addEventListener('DOMContentLoaded', () => {
const isMobile = () => window.matchMedia('(max-width: 760px)').matches;
// Always scroll to the top header on page load
document.addEventListener('DOMContentLoaded', () => {
const h1 = document.querySelector('main h1');
if (h1) {
// slight delay to ensure layout is painted before scroll
setTimeout(() => {
h1.scrollIntoView({ behavior: 'instant', block: 'start' });
window.scrollTo({ top: h1.offsetTop, behavior: 'instant' });
}, 10);
}
});
// mark that a sidebar link was tapped (mobile only)
document.querySelectorAll('.nav-tree a').forEach(a => {
a.addEventListener('click', () => {
if (isMobile()) sessionStorage.setItem('scrollToHeader', '1');
});
});

// on load, if flagged, scroll the new page's H1 into view
if (sessionStorage.getItem('scrollToHeader') === '1') {
sessionStorage.removeItem('scrollToHeader');
// re-check: only on mobile and only if we're near the top (avoid double jumps)
if (isMobile() && (window.scrollY || document.documentElement.scrollTop) < 40) {
const h1 = document.querySelector('main h1');
if (h1) h1.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
}
});
document.addEventListener('DOMContentLoaded', () => {
const btn = document.querySelector('.crumbs .menu-btn');
btn?.addEventListener('click', () => {
const side = document.querySelector('.side');
if (side) {
side.scrollIntoView({ behavior: 'smooth', block: 'start' });
side.style.boxShadow = '0 0 0 2px rgba(0,0,0,.15) inset';
setTimeout(() => side.style.boxShadow = '', 600);
}
});
});
