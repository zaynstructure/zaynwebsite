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

  document.querySelectorAll('.embed-launch[data-src]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const iframe = document.createElement('iframe');
      iframe.src = btn.dataset.src;
      iframe.title = btn.dataset.title || '';
      iframe.loading = 'lazy';
      iframe.allow = 'autoplay';
      const embed = btn.parentElement;
      btn.replaceWith(iframe);
      if ('fullscreen' in btn.dataset) fullView(embed, iframe);
    });
  });

  // full-view embeds (data-fullscreen on the launch button) take over the
  // window when launched, using the browser's fullscreen where it allows it
  // (iphones don't, so the fixed overlay is what does the work there). a
  // corner button leaves, and brings it back from the inline frame.
  function fullView(embed, iframe) {
    const toggle = document.createElement('button');
    toggle.className = 'embed-full-toggle';
    embed.appendChild(toggle);

    const set = (on) => {
      embed.classList.toggle('is-full', on);
      document.documentElement.classList.toggle('embed-open', on);
      toggle.textContent = on ? 'close ×' : 'full screen ↗';
      if (on) {
        if (embed.requestFullscreen) embed.requestFullscreen().catch(() => {});
        iframe.focus();
      } else if (document.fullscreenElement === embed) {
        document.exitFullscreen().catch(() => {});
      }
    };

    toggle.addEventListener('click', () => set(!embed.classList.contains('is-full')));
    document.addEventListener('fullscreenchange', () => {
      if (!document.fullscreenElement && embed.classList.contains('is-full')) set(false);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && embed.classList.contains('is-full')) set(false);
    });
    iframe.addEventListener('load', () => { if (embed.classList.contains('is-full')) iframe.focus(); });
    set(true);
  }

  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
});
