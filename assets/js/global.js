<script>
// Defer collapsing <details> so the tap can navigate first
(function () {
const isMobile = () => window.matchMedia('(max-width:760px)').matches;

// Close menus *after* navigation starts
const safeCloseMenus = () => {
// small delay lets the browser follow the link
setTimeout(() => {
document.querySelectorAll('.nav-tree details[open]').forEach(d => d.open = false);
}, 250);
};

// Attach to both click & touchend (covers iOS)
document.querySelectorAll('.nav-tree a[href]').forEach(a => {
const handler = (e) => { if (isMobile()) safeCloseMenus(); };
a.addEventListener('click', handler, { passive: true });
a.addEventListener('touchend', handler, { passive: true });
});
})();
</script>
