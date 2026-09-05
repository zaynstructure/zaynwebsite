// site.js — mobile nav toggle, work slider, footer year

document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.site-nav');

  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });

    nav.querySelectorAll('a').forEach((a) => {
      a.addEventListener('click', () => {
        nav.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  document.querySelectorAll('.slider').forEach((slider) => {
    const track = slider.querySelector('.slider-track');
    if (!track) return;

    slider.querySelectorAll('.slider-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const dir = parseInt(btn.dataset.dir, 10) || 1;
        const slide = track.querySelector('.slide');
        const gap = parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap) || 0;
        const amount = slide ? slide.getBoundingClientRect().width + gap : track.clientWidth;
        track.scrollBy({ left: dir * amount, behavior: 'smooth' });
      });
    });
  });

  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
});
