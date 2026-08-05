document.addEventListener('DOMContentLoaded', () => {
  // Navbar scroll state
  const navbar = document.querySelector('.navbar');
  const onScroll = () => {
    if (!navbar) return;
    if (window.scrollY > 40) navbar.classList.add('scrolled');
    else navbar.classList.remove('scrolled');
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // Mobile menu
  const toggle = document.querySelector('.nav-toggle');
  const mobileMenu = document.querySelector('.mobile-menu');
  if (toggle && mobileMenu) {
    toggle.addEventListener('click', () => {
      mobileMenu.classList.toggle('open');
      document.body.style.overflow = mobileMenu.classList.contains('open') ? 'hidden' : '';
    });
    mobileMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
      mobileMenu.classList.remove('open');
      document.body.style.overflow = '';
    }));
  }

  // Scroll reveal
  const revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && revealEls.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    revealEls.forEach(el => io.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add('in'));
  }

  // Gallery lightbox
  const lightbox = document.querySelector('.lightbox');
  if (lightbox) {
    const lbImg = lightbox.querySelector('img');
    const lbVideoWrap = lightbox.querySelector('.lb-video-wrap');
    const lbIframe = lbVideoWrap ? lbVideoWrap.querySelector('iframe') : null;
    const lbNativeVideo = lightbox.querySelector('.lb-video-native');
    const lbCap = lightbox.querySelector('.lb-cap');

    const hideAll = () => {
      lbImg.style.display = 'none';
      if (lbVideoWrap) lbVideoWrap.style.display = 'none';
      if (lbNativeVideo) { lbNativeVideo.style.display = 'none'; lbNativeVideo.pause(); }
    };

    document.querySelectorAll('.gallery-item').forEach(item => {
      item.addEventListener('click', () => {
        const isVideo = item.dataset.type === 'video';
        const source = item.dataset.videoSource;
        hideAll();
        if (isVideo && source === 'upload' && lbNativeVideo) {
          lbNativeVideo.src = item.dataset.videoUrl;
          lbNativeVideo.style.display = 'block';
          lbNativeVideo.play().catch(() => {});
        } else if (isVideo && source === 'youtube' && lbIframe) {
          lbIframe.src = `https://www.youtube.com/embed/${item.dataset.videoId}?autoplay=1&rel=0`;
          lbVideoWrap.style.display = 'block';
        } else {
          lbImg.src = item.dataset.full || item.querySelector('img, video').src;
          lbImg.style.display = 'block';
        }
        lbCap.textContent = item.dataset.caption || '';
        lightbox.classList.add('open');
      });
    });

    const closeLightbox = () => {
      lightbox.classList.remove('open');
      if (lbIframe) lbIframe.src = ''; // stop YouTube playback
      if (lbNativeVideo) { lbNativeVideo.pause(); lbNativeVideo.removeAttribute('src'); lbNativeVideo.load(); }
    };
    lightbox.querySelector('.lb-close').addEventListener('click', closeLightbox);
    lightbox.addEventListener('click', (e) => { if (e.target === lightbox) closeLightbox(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeLightbox(); });
  }

  // Homepage "Aktivitas Terbaru" video widget — auto-plays muted, dismissible via X,
  // stays hidden for the rest of the session once closed.
  const activityWidget = document.getElementById('activity-widget');
  if (activityWidget) {
    let dismissed = false;
    try { dismissed = sessionStorage.getItem('aw_dismissed') === '1'; } catch (e) {}

    const awVideo = document.getElementById('aw-video');
    const awMute = document.getElementById('aw-mute');
    const awClose = document.getElementById('aw-close');

    if (!dismissed) {
      setTimeout(() => {
        activityWidget.classList.add('show');
        if (awVideo) awVideo.play().catch(() => {});
      }, 900);
    }

    if (awClose) {
      awClose.addEventListener('click', (e) => {
        e.preventDefault();
        activityWidget.classList.remove('show');
        if (awVideo) awVideo.pause();
        try { sessionStorage.setItem('aw_dismissed', '1'); } catch (err) {}
      });
    }
    if (awMute && awVideo) {
      awMute.addEventListener('click', (e) => {
        e.preventDefault();
        awVideo.muted = !awVideo.muted;
        awMute.classList.toggle('is-on', !awVideo.muted);
      });
    }
  }

  // Auto-hide flash messages
  document.querySelectorAll('.flash').forEach(f => {
    setTimeout(() => { f.style.transition = 'opacity .5s'; f.style.opacity = '0'; setTimeout(() => f.remove(), 500); }, 5000);
  });
});
