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
  // (iphones don't, so the fixed overlay is what does the work there).
  // nothing sits on top of the piece: the browser's back (or esc out of
  // browser fullscreen) leaves, and a button on the inline frame goes back
  function fullView(embed, iframe) {
    const toggle = document.createElement('button');
    toggle.className = 'embed-full-toggle';
    embed.appendChild(toggle);

    // pin the page behind while full so touches can't scroll it (iphone
    // ignores overflow: hidden on its own), then put it back where it was
    let scrollY = 0;
    const lockPage = (on) => {
      const b = document.body.style;
      if (on) {
        scrollY = window.scrollY;
        b.position = 'fixed'; b.top = `-${scrollY}px`; b.left = '0'; b.right = '0';
      } else if (b.position === 'fixed') {
        b.position = b.top = b.left = b.right = '';
        restoreScroll();
      }
    };
    // a frame later, once the page can scroll again. leaving browser
    // fullscreen resets the scroll too, so this runs again after that
    const restoreScroll = () => {
      const y = scrollY;
      requestAnimationFrame(() => window.scrollTo(0, y));
    };

    // and stop the piece's own page from bouncing under a drag
    const calmFrame = () => {
      try {
        const d = iframe.contentDocument;
        d.documentElement.style.overscrollBehavior = 'none';
        d.body.style.overscrollBehavior = 'none';
      } catch (e) {}
    };

    const set = (on) => {
      if (on === embed.classList.contains('is-full')) return;
      // lock before the frame leaves the page's flow, or the page gets
      // shorter and the remembered scroll position is already lost
      if (on) lockPage(true);
      embed.classList.toggle('is-full', on);
      document.documentElement.classList.toggle('embed-open', on);
      if (!on) lockPage(false);
      toggle.textContent = 'full screen ↗';
      if (on) {
        history.pushState({ embedFull: true }, '');
        if (embed.requestFullscreen) embed.requestFullscreen().catch(() => {});
        iframe.focus();
      } else {
        if (history.state && history.state.embedFull) history.back();
        if (document.fullscreenElement === embed) document.exitFullscreen().then(restoreScroll, () => {});
      }
    };

    toggle.addEventListener('click', () => set(!embed.classList.contains('is-full')));
    document.addEventListener('fullscreenchange', () => {
      if (document.fullscreenElement) return;
      if (embed.classList.contains('is-full')) set(false);
      else restoreScroll();
    });
    window.addEventListener('popstate', () => {
      if (embed.classList.contains('is-full')) set(false);
    });
    iframe.addEventListener('load', () => { calmFrame(); if (embed.classList.contains('is-full')) iframe.focus(); });
    set(true);
  }

  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
});
