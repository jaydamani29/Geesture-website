

import {
  classifyLandmarks,
  createGestureState,
  DEFAULT_CLASSIFIER_CONFIG,
} from "./gestureClassifier.js";


let _handsModulePromise = null;

async function loadMediapipeHands() {
  if (_handsModulePromise) return _handsModulePromise;
  _handsModulePromise = (async () => {
    const handsUrl = "https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js";
    const mod = await import(handsUrl);
    const Hands = mod.Hands ?? mod.default?.Hands ?? mod.default;
    const HAND_CONNECTIONS = mod.HAND_CONNECTIONS ?? mod.default?.HAND_CONNECTIONS;
    if (!Hands) throw new Error("MediaPipe Hands failed to load.");
    return { Hands, HAND_CONNECTIONS };
  })();
  return _handsModulePromise;
}


function computeContainRect(srcW, srcH, dstW, dstH) {
  const srcAspect = srcW / srcH;
  const dstAspect = dstW / dstH;
  if (dstAspect > srcAspect) {
    const height = dstH;
    const width = height * srcAspect;
    return { left: (dstW - width) / 2, top: 0, width, height };
  }
  const width = dstW;
  const height = width / srcAspect;
  return { left: 0, top: (dstH - height) / 2, width, height };
}

function ensureCanvas(existing, frameWidth, frameHeight) {
  const canvas = existing ?? document.createElement("canvas");
  canvas.id = "gesture-landmark-canvas";
  canvas.width = frameWidth;
  canvas.height = frameHeight;
  canvas.setAttribute("aria-hidden", "true");
  Object.assign(canvas.style, {
    position: "fixed",
    left: "0",
    top: "0",
    zIndex: "60",
    pointerEvents: "none",
    transform: "translateZ(0)",
  });
  if (!existing && !canvas.parentNode) document.body.appendChild(canvas);
  return canvas;
}


function drawLandmarks(ctx, landmarks, frameWidth, frameHeight, HAND_CONNECTIONS, label) {
  ctx.clearRect(0, 0, frameWidth, frameHeight);
  if (!landmarks?.length) return;

  if (HAND_CONNECTIONS?.length) {
    ctx.strokeStyle = "rgba(0, 255, 140, 0.45)";
    ctx.lineWidth = 2;
    for (const [a, b] of HAND_CONNECTIONS) {
      const pa = landmarks[a];
      const pb = landmarks[b];
      if (!pa || !pb) continue;
      ctx.beginPath();
      ctx.moveTo(pa.x * frameWidth, pa.y * frameHeight);
      ctx.lineTo(pb.x * frameWidth, pb.y * frameHeight);
      ctx.stroke();
    }
  }

  ctx.fillStyle = "rgba(0, 220, 255, 0.85)";
  for (const lm of landmarks) {
    const x = lm.x * frameWidth;
    const y = lm.y * frameHeight;
    ctx.beginPath();
    ctx.arc(x, y, 3.2, 0, Math.PI * 2);
    ctx.fill();
  }

  if (label) {
    const wrist = landmarks[0];
    ctx.font = "14px system-ui, Segoe UI, Roboto, sans-serif";
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(0,0,0,0.5)";
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    const tx = wrist.x * frameWidth + 10;
    const ty = wrist.y * frameHeight - 8;
    ctx.strokeText(label, tx, ty);
    ctx.fillText(label, tx, ty);
  }
}


export async function startGestureEngine({
  videoElement,
  frameWidth,
  frameHeight,
  onFrame,
  showLandmarkOverlay = true,
  detectEveryNFrames = 1,
}) {
  if (!videoElement) throw new Error("gestureEngine: videoElement required");
  if (!onFrame) throw new Error("gestureEngine: onFrame required");

  const { Hands, HAND_CONNECTIONS } = await loadMediapipeHands();
  const hands = new Hands({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    maxNumHands: 1,
    modelComplexity: 0,
    minDetectionConfidence: 0.65,
    minTrackingConfidence: 0.6,
  });

  const classifierState = createGestureState();
  const canvas = showLandmarkOverlay ? ensureCanvas(null, frameWidth, frameHeight) : null;
  const ctx = canvas?.getContext("2d", { alpha: true }) ?? null;

  const syncCanvasLayout = () => {
    if (!canvas) return;
    const rect = computeContainRect(frameWidth, frameHeight, window.innerWidth, window.innerHeight);
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    canvas.style.left = `${rect.left}px`;
    canvas.style.top = `${rect.top}px`;
  };
  syncCanvasLayout();
  window.addEventListener("resize", syncCanvasLayout);

  let rafId = 0;
  let frameCounter = 0;
  let processing = false;
  let lastLandmarks = null;
  let lastClassification = null;
  let lastLabel = "";

  let fps = 0;
  let fpsFrames = 0;
  let fpsStart = performance.now();

  hands.onResults((results) => {
    const lm = results.multiHandLandmarks?.[0];
    const now = performance.now();
    if (lm && lm.length >= 21) {
      lastLandmarks = lm;
      lastClassification = classifyLandmarks(lm, classifierState, now, DEFAULT_CLASSIFIER_CONFIG);
      lastLabel = lastClassification.gesture;
      onFrame({
        hasHand: true,
        landmarks: lm,
        classification: lastClassification,
        fps,
        now,
      });
    } else {
      lastLandmarks = null;
      lastClassification = null;
      lastLabel = "";
      onFrame({ hasHand: false, landmarks: null, classification: null, fps, now });
    }
  });

  const loop = () => {
    rafId = requestAnimationFrame(loop);
    frameCounter++;
    const now = performance.now();
    fpsFrames++;
    if (now - fpsStart >= 500) {
      fps = Math.round((fpsFrames / (now - fpsStart)) * 1000);
      fpsStart = now;
      fpsFrames = 0;
    }

    if (frameCounter % detectEveryNFrames === 0 && !processing) {
      processing = true;
      Promise.resolve(hands.send({ image: videoElement }))
        .catch(() => {})
        .finally(() => {
          processing = false;
        });
    }

    if (ctx && canvas) {
      drawLandmarks(
        ctx,
        lastLandmarks,
        frameWidth,
        frameHeight,
        HAND_CONNECTIONS,
        lastLabel || undefined
      );
      ctx.font = "12px ui-monospace, monospace";
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.strokeStyle = "rgba(0,0,0,0.45)";
      ctx.lineWidth = 2;
      const t = `FPS ${fps}`;
      ctx.strokeText(t, 10, 20);
      ctx.fillText(t, 10, 20);
    }
  };

  loop();

  return {
    canvas,
    getFps: () => fps,
    stop() {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", syncCanvasLayout);
      try {
        hands.close?.();
      } catch {
        
      }
      canvas?.remove?.();
    },
  };
}
