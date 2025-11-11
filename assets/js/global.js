// /assets/js/global.js
document.addEventListener('DOMContentLoaded', () => {
const isMobile = () => window.matchMedia('(max-width: 760px)').matches;

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
