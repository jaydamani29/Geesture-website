class NavigationController {
  constructor() {
    this.cursor = document.getElementById('virtualCursor');
    this.feedbackText = document.getElementById('gestureFeedbackText');
    this.cursorLabel = document.getElementById('cursorGestureLabel');
    this.hudCamera = document.getElementById('hudCameraStatus');
    this.hudGesture = document.getElementById('hudGestureName');
    this.hudState = document.getElementById('hudSystemState');
    this.hudCameraDot = document.getElementById('hudCameraDot');
    this.cooldown = 1500;
    this.scrollImpulseCooldown = 180;
    this.lastActionTime = 0;
    this.lastScrollImpulse = 0;
    this.lastCursor = { x: 0, y: 0 };
    this.hudGestureTimer = null;
    this.cursorLabelTimer = null;
    this.bindEvents();
  }

  isCoolingDown() {
    const now = Date.now();
    if (now - this.lastActionTime < this.cooldown) {
      return true;
    }
    this.lastActionTime = now;
    return false;
  }

  canScrollImpulse() {
    const now = Date.now();
    if (now - this.lastScrollImpulse < this.scrollImpulseCooldown) {
      return false;
    }
    this.lastScrollImpulse = now;
    return true;
  }

  setHudCamera(text, state) {
    if (this.hudCamera) this.hudCamera.textContent = text;
    if (this.hudCameraDot && state) {
      this.hudCameraDot.dataset.state = state;
    }
  }

  setHudState(text) {
    if (this.hudState) this.hudState.textContent = text;
  }

  setHudGesture(text, revertMs = 1400) {
    if (!this.hudGesture) return;
    this.hudGesture.textContent = text;
    if (this.hudGestureTimer) clearTimeout(this.hudGestureTimer);
    this.hudGestureTimer = setTimeout(() => {
      this.hudGesture.textContent = 'Tracking';
    }, revertMs);
  }

  showCursorLabel(text, duration = 900) {
    if (!this.cursorLabel) return;
    this.cursorLabel.textContent = text;
    this.cursorLabel.classList.add('show');
    if (this.cursorLabelTimer) clearTimeout(this.cursorLabelTimer);
    this.cursorLabelTimer = setTimeout(() => {
      this.cursorLabel.classList.remove('show');
    }, duration);
  }

  positionCursorLabel(x, y) {
    if (!this.cursorLabel) return;
    const ox = 20;
    const oy = 18;
    this.cursorLabel.style.left = `${Math.min(x + ox, window.innerWidth - 120)}px`;
    this.cursorLabel.style.top = `${Math.max(y - oy, 8)}px`;
  }

  bindEvents() {
    document.addEventListener('gesture-cursor-move', (e) => {
      const { x, y } = e.detail;
      this.lastCursor = { x, y };
      if (!this.cursor) return;
      this.cursor.style.left = `${x}px`;
      this.cursor.style.top = `${y}px`;
      this.positionCursorLabel(x, y);
      const el = document.elementFromPoint(x, y);
      const interactive = el && (
        el.closest('[data-gesture-selectable]') ||
        el.closest('a[href]') ||
        el.closest('button') ||
        el.closest('.explore-card')
      );
      if (interactive) {
        this.cursor.classList.add('active');
      } else {
        this.cursor.classList.remove('active');
      }
    });

    document.addEventListener('gesture-swipe-left', () => {
      if (this.isCoolingDown()) return;
      this.setHudGesture('Swipe left');
      this.showFeedback('Next section');
      this.showCursorLabel('Swipe · Next');
      this.scrollToNextSection();
    });

    document.addEventListener('gesture-swipe-right', () => {
      if (this.isCoolingDown()) return;
      this.setHudGesture('Swipe right');
      this.showFeedback('Previous section');
      this.showCursorLabel('Swipe · Back');
      this.scrollToPreviousSection();
    });

    document.addEventListener('gesture-pinch', (e) => {
      if (this.isCoolingDown()) return;
      this.setHudGesture('Pinch');
      this.showFeedback('Pinch · Activate');
      this.showCursorLabel('Pinch');
      const { x, y } = e.detail;
      const el = document.elementFromPoint(x, y);
      const target = el && (
        el.closest('[data-gesture-selectable]') ||
        el.closest('a[href]') ||
        el.closest('button') ||
        el.closest('.explore-card')
      );
      if (target) {
        target.click();
        if (this.cursor) {
          this.cursor.style.transform = 'translate(-50%, -50%) scale(0.72)';
          setTimeout(() => {
            this.cursor.style.transform = 'translate(-50%, -50%) scale(1)';
          }, 200);
        }
      }
    });

    document.addEventListener('gesture-palm', () => {
      if (this.isCoolingDown()) return;
      this.setHudGesture('Open palm');
      this.showFeedback('Menu');
      this.showCursorLabel('Menu');
      const menuBtn = document.getElementById('menuToggle');
      if (menuBtn) {
        menuBtn.click();
      }
    });

    document.addEventListener('gesture-fist', () => {
      if (this.isCoolingDown()) return;
      this.setHudGesture('Fist');
      this.showCursorLabel('Pause');
      document.dispatchEvent(new CustomEvent('gesture-toggle-pause'));
    });

    document.addEventListener('gesture-scroll-down', () => {
      if (!this.canScrollImpulse()) return;
      this.setHudGesture('Scroll down', 800);
      this.showCursorLabel('Scroll');
      window.scrollBy({ top: Math.min(120, window.innerHeight * 0.22), behavior: 'smooth' });
    });

    document.addEventListener('gesture-scroll-up', () => {
      if (!this.canScrollImpulse()) return;
      this.setHudGesture('Scroll up', 800);
      this.showCursorLabel('Scroll');
      window.scrollBy({ top: -Math.min(120, window.innerHeight * 0.22), behavior: 'smooth' });
    });

    document.addEventListener('gesture-feedback', (e) => {
      const msg = typeof e.detail === 'string' ? e.detail : '';
      this.showFeedback(msg);
      this.setHudState(msg || 'Idle');
      if (msg.includes('Initializing')) {
        this.setHudCamera('Starting…', 'starting');
      }
      if (msg.includes('Ready')) {
        this.setHudCamera('Active', 'on');
        this.setHudGesture('Tracking', 800);
      }
      if (msg.includes('Paused')) {
        this.setHudState('Paused');
      }
      if (msg.includes('Resumed')) {
        this.setHudState('Active');
      }
    });

    document.addEventListener('gesture-error', (e) => {
      const detail = e.detail != null ? String(e.detail) : 'Error';
      this.showFeedback(detail);
      this.setHudCamera('Error', 'error');
      this.setHudState(detail);
      if (this.feedbackText) {
        this.feedbackText.classList.add('feedback-error');
        setTimeout(() => {
          this.feedbackText.classList.remove('feedback-error');
        }, 2800);
      }
    });
  }

  getVisibleSectionIndex(sections) {
    const vh = window.innerHeight;
    let best = -1;
    let bestRatio = 0;
    sections.forEach((s, i) => {
      const rect = s.getBoundingClientRect();
      const visible = Math.max(0, Math.min(rect.bottom, vh) - Math.max(rect.top, 0));
      const denom = Math.min(vh, rect.height) || 1;
      const ratio = visible / denom;
      if (ratio > bestRatio) {
        bestRatio = ratio;
        best = i;
      }
    });
    return bestRatio > 0.2 ? best : -1;
  }

  scrollToNextSection() {
    const sections = Array.from(document.querySelectorAll('main section[id]'));
    let index = this.getVisibleSectionIndex(sections);
    if (index === -1) index = 0;
    const next = sections[Math.min(index + 1, sections.length - 1)];
    if (next) {
      next.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  scrollToPreviousSection() {
    const sections = Array.from(document.querySelectorAll('main section[id]'));
    let index = this.getVisibleSectionIndex(sections);
    if (index === -1) index = 0;
    const prev = sections[Math.max(0, index - 1)];
    if (prev) {
      prev.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  showFeedback(message) {
    if (!this.feedbackText) return;
    this.feedbackText.textContent = message;
    this.feedbackText.classList.add('show');
    if (this._feedbackTimeout) clearTimeout(this._feedbackTimeout);
    this._feedbackTimeout = setTimeout(() => {
      this.feedbackText.classList.remove('show');
    }, 2000);
  }
}
