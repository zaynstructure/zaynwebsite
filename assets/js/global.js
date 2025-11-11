// ----- Mobile jump to header -----
document.addEventListener("DOMContentLoaded", () => {
const navLinks = document.querySelectorAll('.nav-tree a');

// store scroll intent on mobile
navLinks.forEach(link => link.addEventListener('click', () => {
if (window.matchMedia('(max-width: 760px)').matches) {
sessionStorage.setItem('scrollToHeader', 'true');
}
}));

// on load, jump to header if needed
if (sessionStorage.getItem('scrollToHeader') === 'true') {
sessionStorage.removeItem('scrollToHeader');
const header = document.querySelector('main h1');
if (header) {
header.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
}
});
