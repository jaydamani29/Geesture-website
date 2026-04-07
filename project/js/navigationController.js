

import { GESTURE_TYPES } from "./gestureClassifier.js";

const DEFAULT_STABLE_FRAMES = 5;

export class NavigationController {
  
  constructor({ ui, stableFrames = DEFAULT_STABLE_FRAMES, cooldownMs = 900 }) {
    this.ui = ui;
    this.stableFrames = stableFrames;
    this.cooldownMs = cooldownMs;

    this._lastRaw = GESTURE_TYPES.NONE;
    this._streak = 0;
    this._lastFireAt = 0;
    this.paused = false;
    this._pinchLatched = false;
  }

  
  onClassification(classification, hasHand) {
    if (!classification || !hasHand) {
      this._lastRaw = GESTURE_TYPES.NONE;
      this._streak = 0;
      return;
    }

    const g = classification.gesture;
    if (g === this._lastRaw) this._streak += 1;
    else {
      this._lastRaw = g;
      this._streak = 1;
    }

    const stable = this._streak >= this.stableFrames;
    const now = performance.now();

    
    if (g === GESTURE_TYPES.FIST && stable) {
      if (!this.paused) {
        this.paused = true;
        this.ui.setPaused(true);
      }
      return;
    }

    
    if (this.paused) {
      if (g === GESTURE_TYPES.OPEN_PALM && stable) {
        this.paused = false;
        this.ui.setPaused(false);
        this.ui.openNavigationMenu();
        this._lastFireAt = now;
      }
      return;
    }

    if (!stable) return;
    if (now - this._lastFireAt < this.cooldownMs) return;

    switch (g) {
      case GESTURE_TYPES.SWIPE_LEFT:
        this.ui.goToPreviousSection();
        this._lastFireAt = now;
        break;
      case GESTURE_TYPES.SWIPE_RIGHT:
        this.ui.goToNextSection();
        this._lastFireAt = now;
        break;
      case GESTURE_TYPES.OPEN_PALM:
        this.ui.openNavigationMenu();
        this._lastFireAt = now;
        break;
      case GESTURE_TYPES.PINCH:
        if (!this._pinchLatched) {
          this.ui.performPinchClick(classification.pinchPoint);
          this._pinchLatched = true;
          this._lastFireAt = now;
        }
        break;
      default:
        break;
    }
  }

  
  onPostClassification(gesture) {
    if (gesture !== GESTURE_TYPES.PINCH) this._pinchLatched = false;
  }
}

export { GESTURE_TYPES };
