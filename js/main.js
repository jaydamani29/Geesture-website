document.addEventListener('DOMContentLoaded', () => {
  const menuToggle = document.getElementById('menuToggle');
  const mainNav = document.getElementById('mainNav');
  if (menuToggle && mainNav) {
    menuToggle.addEventListener('click', () => {
      const opened = mainNav.classList.toggle('open');
      menuToggle.setAttribute('aria-expanded', opened ? 'true' : 'false');
    });
  }

  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const href = a.getAttribute('href');
      if (!href || !href.startsWith('#')) return;
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        if (mainNav && mainNav.classList.contains('open')) {
          mainNav.classList.remove('open');
          menuToggle.setAttribute('aria-expanded', 'false');
        }
      }
    });
  });

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -8% 0px' }
  );

  document
    .querySelectorAll('.reveal, .card, .section-title, .hero-content, .section-head, .explore-card, .story-chapter, .tech-block, .tech-feature, .collection-feature, .image-strip, .about-primary, .about-aside, .contact-intro, .contact-form')
    .forEach((el) => io.observe(el));

  const sections = Array.from(document.querySelectorAll('main section[id]'));
  const navMap = sections.reduce((map, sec) => {
    map[sec.id] = document.querySelector(`.main-nav a[href="#${sec.id}"]`);
    return map;
  }, {});
  const sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          Object.values(navMap).forEach((n) => n && n.classList.remove('active'));
          const link = navMap[e.target.id];
          if (link) link.classList.add('active');
        }
      });
    },
    { threshold: 0.45 }
  );
  sections.forEach((s) => sectionObserver.observe(s));

  const ornament = document.querySelector('.ornament');
  window.addEventListener(
    'scroll',
    () => {
      if (!ornament) return;
      const sc = window.scrollY;
      ornament.style.transform = `translateY(${sc * -0.02}px)`;
    },
    { passive: true }
  );

  const tutorial = document.getElementById('gestureTutorial');
  const tutorialDismiss = document.getElementById('tutorialDismiss');
  const openTutorialAgain = document.getElementById('openTutorialAgain');

  function closeTutorial() {
    if (tutorial) {
      tutorial.classList.add('tutorial-overlay--hide');
      tutorial.setAttribute('aria-hidden', 'true');
    }
  }

  function openTutorial() {
    if (tutorial) {
      tutorial.classList.remove('tutorial-overlay--hide');
      tutorial.setAttribute('aria-hidden', 'false');
    }
  }

  if (tutorial) {
    tutorial.addEventListener('click', (ev) => {
      if (ev.target === tutorial) {
        closeTutorial();
      }
    });
  }

  if (tutorialDismiss) {
    tutorialDismiss.addEventListener('click', closeTutorial);
  }
  if (openTutorialAgain) {
    openTutorialAgain.addEventListener('click', openTutorial);
  }

  document.querySelectorAll('.explore-card[data-scroll-target]').forEach((card) => {
    card.addEventListener('click', () => {
      const sel = card.getAttribute('data-scroll-target');
      if (!sel) return;
      const dest = document.querySelector(sel);
      if (dest) {
        dest.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
    card.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' || ev.key === ' ') {
        ev.preventDefault();
        card.click();
      }
    });
  });

  const contactForm = document.getElementById('contactForm');
  const formNote = document.getElementById('formNote');
  if (contactForm) {
    contactForm.addEventListener('submit', (ev) => {
      ev.preventDefault();
      if (formNote) {
        formNote.hidden = false;
        formNote.textContent = 'Thank you — your message has been captured for this demo.';
      }
    });
  }

  const subscribeBtn = document.getElementById('subscribeBtn');
  if (subscribeBtn) {
    subscribeBtn.addEventListener('click', () => {
      if (formNote) {
        formNote.hidden = false;
        formNote.textContent = 'Subscribed — you will receive infrequent notes from the atelier.';
      }
    });
  }

  const navCtrl = new NavigationController();
  const engine = new GestureEngine();

  document.addEventListener('gesture-toggle-pause', () => {
    engine.togglePause();
  });

  const btn = document.getElementById('startGestureBtn');
  if (btn) {
    btn.addEventListener('click', () => {
      if (!engine.isActive) {
        navCtrl.setHudCamera('Starting…', 'starting');
        navCtrl.setHudState('Starting camera');
        engine.start();
        btn.textContent = 'Pause gestures';
      } else {
        engine.togglePause();
        btn.textContent = engine.isPaused ? 'Resume gestures' : 'Pause gestures';
      }
    });
  }
});
