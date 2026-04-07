



export const GESTURE_TYPES = {
  NONE: "NONE",
  SWIPE_LEFT: "SWIPE_LEFT",
  SWIPE_RIGHT: "SWIPE_RIGHT",
  PINCH: "PINCH",
  OPEN_PALM: "OPEN_PALM",
  FIST: "FIST",
};

const THUMB_TIP = 4;
const INDEX_TIP = 8;
const WRIST = 0;

const FINGER_TIPS = [4, 8, 12, 16, 20];
const FINGER_BASES = [2, 5, 9, 13, 17];

const PALM_INDICES = [0, 5, 9, 13, 17];


function distance2(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}


function palmCenter(landmarks) {
  let sx = 0;
  let sy = 0;
  const n = PALM_INDICES.length;
  for (const i of PALM_INDICES) {
    const p = landmarks[i];
    sx += p.x;
    sy += p.y;
  }
  return { x: sx / n, y: sy / n };
}


export function createGestureState() {
  return {
    
    palmHistory: [],
  };
}


export const DEFAULT_CLASSIFIER_CONFIG = {
  
  PINCH_MAX_DIST: 0.048,
  
  FINGER_REL_EPS: 0.018,
  
  PALM_HISTORY_MS: 420,
  
  PALM_MIN_SAMPLES: 4,
  
  SWIPE_VX_THRESHOLD: 0.42,
  
  SWIPE_DOMINANCE: 0.65,
};


function recordPalmSample(state, p, nowMs, windowMs) {
  state.palmHistory.push({ x: p.x, y: p.y, t: nowMs });
  const cutoff = nowMs - windowMs;
  while (state.palmHistory.length && state.palmHistory[0].t < cutoff) {
    state.palmHistory.shift();
  }
}


function estimatePalmVelocityX(state) {
  const h = state.palmHistory;
  if (h.length < 2) return { vx: 0, dt: 0 };
  const first = h[0];
  const last = h[h.length - 1];
  const dt = (last.t - first.t) / 1000;
  if (dt <= 0) return { vx: 0, dt: 0 };
  const vx = (last.x - first.x) / dt;
  const vy = (last.y - first.y) / dt;
  return { vx, vy, dt };
}


export function classifyLandmarks(landmarks, state, nowMs, config = DEFAULT_CLASSIFIER_CONFIG) {
  const eps = config.FINGER_REL_EPS;
  const palm = palmCenter(landmarks);
  recordPalmSample(state, palm, nowMs, config.PALM_HISTORY_MS);

  const thumbTip = landmarks[THUMB_TIP];
  const indexTip = landmarks[INDEX_TIP];
  const pinchDist = distance2(thumbTip, indexTip);
  const pinchPoint = {
    x: (thumbTip.x + indexTip.x) / 2,
    y: (thumbTip.y + indexTip.y) / 2,
  };

  
  let extendedCount = 0;
  let curledCount = 0;
  for (let i = 0; i < 5; i++) {
    const tip = landmarks[FINGER_TIPS[i]];
    const base = landmarks[FINGER_BASES[i]];
    if (tip.y < base.y - eps) extendedCount += 1;
    if (tip.y > base.y + eps) curledCount += 1;
  }
  const openPalm = extendedCount >= 4;
  const fist = curledCount >= 4 && extendedCount === 0;

  const { vx, vy, dt } = estimatePalmVelocityX(state);
  let swipe = GESTURE_TYPES.NONE;
  if (state.palmHistory.length >= config.PALM_MIN_SAMPLES && dt > 0) {
    const absVx = Math.abs(vx);
    const absVy = Math.abs(vy ?? 0);
    if (absVx >= config.SWIPE_VX_THRESHOLD && absVy < absVx * config.SWIPE_DOMINANCE) {
      swipe = vx > 0 ? GESTURE_TYPES.SWIPE_RIGHT : GESTURE_TYPES.SWIPE_LEFT;
    }
  }

  
  let gesture = GESTURE_TYPES.NONE;
  if (fist) gesture = GESTURE_TYPES.FIST;
  else if (pinchDist < config.PINCH_MAX_DIST) gesture = GESTURE_TYPES.PINCH;
  else if (swipe !== GESTURE_TYPES.NONE) gesture = swipe;
  else if (openPalm) gesture = GESTURE_TYPES.OPEN_PALM;

  return {
    gesture,
    pinchDist,
    pinchPoint,
    palmCenter: palm,
    
    palmVelocityX: vx,
    palmVelocityY: vy,
    openPalm,
    fist,
    landmarksSummary: {
      wrist: { ...landmarks[WRIST] },
      indexTip: { ...landmarks[INDEX_TIP] },
      middleTip: { ...landmarks[12] },
      thumbTip: { ...landmarks[THUMB_TIP] },
    },
  };
}
