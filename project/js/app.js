

import { startCamera, stopCamera } from "./camera.js";
import { startGestureEngine } from "./gestureEngine.js";
import { NavigationController } from "./navigationController.js";
import { UiController } from "./uiController.js";

const ui = new UiController();
let nav = null;
let engineStop = null;

let activeCam = null;

let _noHandStatusShown = false;

function formatLandmarksDebug(summary) {
  if (!summary) return "";
  const fmt = (p) => `x:${p.x.toFixed(3)} y:${p.y.toFixed(3)}`;
  return [
    `wrist ${fmt(summary.wrist)}`,
    `thumbTip ${fmt(summary.thumbTip)}`,
    `indexTip ${fmt(summary.indexTip)}`,
    `middleTip ${fmt(summary.middleTip)}`,
  ].join("\n");
}

async function onEnableCamera() {
  ui.setConsentPanelVisible(false);
  ui.showStatus("<strong>Starting camera…</strong> Please allow access if prompted.");

  try {
    activeCam = await startCamera();
    ui.setCameraActive(true);
    ui.hideStatus();

    nav = new NavigationController({ ui, stableFrames: 5, cooldownMs: 850 });

    const { stop, canvas } = await startGestureEngine({
      videoElement: activeCam.videoElement,
      frameWidth: activeCam.frameWidth,
      frameHeight: activeCam.frameHeight,
      showLandmarkOverlay: true,
      detectEveryNFrames: 1,
      onFrame: (payload) => {
        const { hasHand, classification, fps } = payload;
        const gesture = classification?.gesture ?? "NONE";

        nav?.onClassification(classification, Boolean(hasHand));
        nav?.onPostClassification(gesture);

        const panel = document.getElementById("debug-panel");
        if (panel?.classList.contains("is-visible")) {
          ui.updateDebugPanel({
            gesture,
            fps,
            landmarkText: formatLandmarksDebug(classification?.landmarksSummary),
          });
        }

        if (hasHand) {
          if (_noHandStatusShown) {
            ui.hideStatus();
            _noHandStatusShown = false;
          }
        } else if (!_noHandStatusShown) {
          ui.showStatus("Show your hand — palm toward the camera.");
          _noHandStatusShown = true;
        }
      },
    });

    ui.setOverlayCanvas(canvas);
    engineStop = stop;
    window.addEventListener(
      "beforeunload",
      () => {
        try {
          engineStop?.();
        } catch {
          
        }
        stopCamera(activeCam);
      },
      { once: true }
    );
  } catch (err) {
    const denied =
      err?.name === "NotAllowedError" ||
      err?.name === "PermissionDeniedError" ||
      /denied/i.test(String(err?.message || ""));

    if (denied) {
      ui.showStatus("<strong>Camera blocked.</strong> Allow camera access to use gestures.");
    } else {
      ui.showStatus("<strong>Error.</strong> Could not start the camera. Try again.");
    }
    console.error("Gesture init failed:", err);
    ui.setConsentPanelVisible(true);
    stopCamera(activeCam);
    activeCam = null;
    ui.setCameraActive(false);
  }
}

function bindConsent() {
  const startBtn = document.getElementById("btn-start-camera");
  const skipBtn = document.getElementById("btn-skip-camera");
  startBtn?.addEventListener("click", () => {
    void onEnableCamera();
  });
  skipBtn?.addEventListener("click", () => {
    ui.setConsentPanelVisible(false);
    ui.showStatus("Gesture mode off — use mouse or touch to navigate.");
  });
}

function init() {
  ui.init();
  bindConsent();
}

init();
