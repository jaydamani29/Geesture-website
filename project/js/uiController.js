



export class UiController {
  constructor() {
    this._sections = [];
    this._overlayCanvas = null;
    this._parallaxRaf = 0;
  }

  
  init() {
    this._cacheSections();
    this._bindMenuToggle();
    this._bindNavCloseHandlers();
    this._initRevealObserver();
    this._startParallaxLoop();
    this._bindDebugToggle();
    const params = new URLSearchParams(window.location.search);
    if (params.get("debug") === "1") {
      this.setDebugPanelVisible(true);
    }
  }

  
  setOverlayCanvas(canvas) {
    this._overlayCanvas = canvas;
  }

  _cacheSections() {
    const main = document.querySelector("main");
    this._sections = main ? Array.from(main.querySelectorAll("section")) : [];
    this._sections.forEach((s) => s.classList.add("section-transition"));
  }

  _bindMenuToggle() {
    const btn = document.getElementById("menuToggle");
    const nav = document.getElementById("mainNav");
    if (!btn || !nav) return;
    btn.addEventListener("click", () => this.toggleNavigationMenu());
  }

  
  _bindNavCloseHandlers() {
    const nav = document.getElementById("mainNav");
    if (!nav) return;
    nav.addEventListener("click", (e) => {
      const t = e.target;
      if (t instanceof HTMLAnchorElement && t.getAttribute("href")?.startsWith("#")) {
        this.closeNavigationMenu();
      }
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") this.closeNavigationMenu();
    });
  }

  _bindDebugToggle() {
    const fab = document.getElementById("debugToggle");
    if (!fab) return;
    fab.addEventListener("click", () => {
      const panel = document.getElementById("debug-panel");
      const visible = panel?.classList.contains("is-visible");
      this.setDebugPanelVisible(!visible);
    });
  }

  
  _initRevealObserver() {
    const els = document.querySelectorAll(".reveal");
    if (!els.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) e.target.classList.add("in-view");
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    els.forEach((el) => io.observe(el));
  }

  
  _startParallaxLoop() {
    const heroArt = document.querySelector(".hero-art");
    if (!heroArt) return;

    const tick = () => {
      this._parallaxRaf = requestAnimationFrame(tick);
      const y = window.scrollY || 0;
      const max = document.body.scrollHeight - window.innerHeight || 1;
      const p = Math.min(1, Math.max(0, y / max));
      heroArt.style.setProperty("--parallax-y", `${(p * 14).toFixed(2)}px`);
      heroArt.style.transform = `translateY(calc(-1 * var(--parallax-y, 0px)))`;
    };
    this._parallaxRaf = requestAnimationFrame(tick);
  }

  
  getSections() {
    if (!this._sections.length) this._cacheSections();
    return this._sections;
  }

  _activeSectionIndex() {
    const sections = this.getSections();
    if (!sections.length) return 0;
    const anchor = window.innerHeight * 0.28;
    let best = 0;
    let bestDist = Infinity;
    sections.forEach((el, i) => {
      const rect = el.getBoundingClientRect();
      const d = Math.abs(rect.top - anchor);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    return best;
  }

  _pulseSection(el) {
    if (!el) return;
    el.classList.remove("is-entering");
    void el.offsetWidth;
    el.classList.add("is-entering", "is-active-highlight");
    window.setTimeout(() => {
      el.classList.remove("is-entering");
    }, 40);
    window.setTimeout(() => {
      el.classList.remove("is-active-highlight");
    }, 700);
  }

  goToNextSection() {
    const sections = this.getSections();
    if (!sections.length) {
      window.scrollBy({ top: window.innerHeight * 0.9, behavior: "smooth" });
      return;
    }
    const i = this._activeSectionIndex();
    const next = sections[Math.min(i + 1, sections.length - 1)];
    next.scrollIntoView({ behavior: "smooth", block: "start" });
    this._pulseSection(next);
  }

  goToPreviousSection() {
    const sections = this.getSections();
    if (!sections.length) {
      window.scrollBy({ top: -window.innerHeight * 0.9, behavior: "smooth" });
      return;
    }
    const i = this._activeSectionIndex();
    const prev = sections[Math.max(i - 1, 0)];
    prev.scrollIntoView({ behavior: "smooth", block: "start" });
    this._pulseSection(prev);
  }

  openNavigationMenu() {
    const nav = document.getElementById("mainNav");
    const btn = document.getElementById("menuToggle");
    if (!nav) return;
    nav.classList.add("open");
    if (window.matchMedia("(max-width: 720px)").matches) {
      nav.classList.add("nav-overlay");
    }
    if (btn) btn.setAttribute("aria-expanded", "true");
  }

  closeNavigationMenu() {
    const nav = document.getElementById("mainNav");
    const btn = document.getElementById("menuToggle");
    if (!nav) return;
    nav.classList.remove("open", "nav-overlay");
    if (btn) btn.setAttribute("aria-expanded", "false");
  }

  toggleNavigationMenu() {
    const nav = document.getElementById("mainNav");
    if (nav?.classList.contains("open")) this.closeNavigationMenu();
    else this.openNavigationMenu();
  }

  
  _normalizedToClient(p) {
    if (!this._overlayCanvas) {
      return { x: p.x * window.innerWidth, y: p.y * window.innerHeight };
    }
    const rect = this._overlayCanvas.getBoundingClientRect();
    return {
      x: rect.left + p.x * rect.width,
      y: rect.top + p.y * rect.height,
    };
  }

  
  performPinchClick(pinchPoint) {
    if (!pinchPoint || !this._overlayCanvas) return;
    const { x, y } = this._normalizedToClient(pinchPoint);
    const hit = document.elementFromPoint(x, y);
    if (!hit) return;

    const interactive = hit.closest(
      "a, button, input, textarea, select, [role='button'], [data-gesture-selectable='true']"
    );
    const target = interactive || hit;
    if (!(target instanceof HTMLElement)) return;

    document.querySelectorAll(".gesture-target").forEach((n) => n.classList.remove("gesture-target"));
    target.classList.add("gesture-target");
    window.setTimeout(() => target.classList.remove("gesture-target"), 450);

    if (typeof target.click === "function") target.click();
    else if (typeof target.focus === "function") target.focus();
  }

  
  setPaused(on) {
    const el = document.getElementById("pause-overlay");
    if (!el) return;
    el.classList.toggle("is-paused", on);
  }

  
  setCameraActive(on) {
    const el = document.getElementById("camera-pill");
    if (!el) return;
    el.classList.toggle("is-on", on);
  }

  
  setDebugPanelVisible(visible) {
    const panel = document.getElementById("debug-panel");
    if (panel) panel.classList.toggle("is-visible", visible);
  }

  
  updateDebugPanel(dbg) {
    const g = document.getElementById("debug-gesture");
    const f = document.getElementById("debug-fps");
    const lm = document.getElementById("debug-landmarks");
    if (g) g.textContent = dbg.gesture ?? "—";
    if (f) f.textContent = String(dbg.fps ?? "—");
    if (lm) lm.textContent = dbg.landmarkText ?? "";
  }

  
  showStatus(html) {
    const el = document.getElementById("gesture-status");
    if (!el) return;
    el.innerHTML = html;
    el.classList.add("is-visible");
  }

  hideStatus() {
    const el = document.getElementById("gesture-status");
    if (!el) return;
    el.classList.remove("is-visible");
    el.textContent = "";
  }

  
  setConsentPanelVisible(show) {
    const el = document.getElementById("gesture-consent");
    if (!el) return;
    el.style.display = show ? "block" : "none";
  }

  destroy() {
    cancelAnimationFrame(this._parallaxRaf);
  }
}
