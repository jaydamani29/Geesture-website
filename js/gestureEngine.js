

class GestureEngine {
  constructor() {
    this.videoElement = document.querySelector('.gesture-video');
    this.cursor = document.getElementById('virtualCursor');
    
    this.hands = null;
    this.camera = null;
    
    
    this.wristHistory = [];
    this.historyLength = 10;
    
    
    this.confidenceThreshold = 0.8;
    this.isActive = false; 
    this.isPaused = false; 

    
    this.smoothedCursor = { x: null, y: null };
    this.cursorSmoothing = 0.2;

    
    this.lastIndexTipY = null;
    this.scrollThreshold = 12;
  }

  async start() {
    if (!this.videoElement) {
      this.dispatchError("Video element not found.");
      return;
    }

    try {
      this.isActive = true;
      this.dispatchFeedback("Initializing Camera...");
      
      
      this.hands = new Hands({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        }
      });

      this.hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1, 
        minDetectionConfidence: this.confidenceThreshold,
        minTrackingConfidence: this.confidenceThreshold
      });

      this.hands.onResults(this.onResults.bind(this));

      
      this.camera = new Camera(this.videoElement, {
        onFrame: async () => {
          if (this.isActive) {
            await this.hands.send({ image: this.videoElement });
          }
        },
        width: 640,
        height: 480
      });

      await this.camera.start();
      
      this.dispatchFeedback("Gesture Engine Ready");
      this.cursor.style.display = 'block';

    } catch (err) {
      console.error(err);
      this.dispatchError("Failed to access camera or load ML models.");
    }
  }

  stop() {
    this.isActive = false;
    if (this.camera) this.camera.stop();
    if (this.cursor) this.cursor.style.display = 'none';
  }

  togglePause() {
    this.isPaused = !this.isPaused;
    this.dispatchFeedback(this.isPaused ? "Gestures Paused" : "Gestures Resumed");
  }

  onResults(results) {
    if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
      
      this.wristHistory = [];
      return;
    }

    const landmarks = results.multiHandLandmarks[0];
    const handConfidence = results.multiHandedness?.[0]?.score ?? 1;
    if (handConfidence < this.confidenceThreshold) {
      return; 
    }

    
    const indexTip = landmarks[8];
    const rawCursorX = indexTip.x * window.innerWidth;
    const rawCursorY = indexTip.y * window.innerHeight;

    if (this.smoothedCursor.x === null || this.smoothedCursor.y === null) {
      this.smoothedCursor.x = rawCursorX;
      this.smoothedCursor.y = rawCursorY;
    }

    this.smoothedCursor.x += (rawCursorX - this.smoothedCursor.x) * this.cursorSmoothing;
    this.smoothedCursor.y += (rawCursorY - this.smoothedCursor.y) * this.cursorSmoothing;

    const cursorX = this.smoothedCursor.x;
    const cursorY = this.smoothedCursor.y;

    document.dispatchEvent(new CustomEvent('gesture-cursor-move', {
      detail: { x: cursorX, y: cursorY }
    }));

    if (this.isPaused) {
      
      if (this.isOneFingerMode(landmarks)) {
        this.togglePause();
      }
      return;
    }

    
    const wrist = landmarks[0];
    this.wristHistory.push(wrist);
    if (this.wristHistory.length > this.historyLength) {
      this.wristHistory.shift();
    }

    
    if (this.isFist(landmarks)) {
      document.dispatchEvent(new CustomEvent('gesture-fist'));
      this.lastIndexTipY = null;
      return;
    }

    if (this.isOneFingerMode(landmarks)) {
      document.dispatchEvent(new CustomEvent('gesture-one-finger'));
      this.lastIndexTipY = null;
      return;
    }

    if (this.isTwoFingerScrollMode(landmarks)) {
      const currentIndexY = indexTip.y * window.innerHeight;
      if (this.lastIndexTipY !== null) {
        const deltaY = currentIndexY - this.lastIndexTipY;
        if (Math.abs(deltaY) > 2) {
          if (deltaY > 0) {
            document.dispatchEvent(new CustomEvent('gesture-scroll-down'));
          } else {
            document.dispatchEvent(new CustomEvent('gesture-scroll-up'));
          }
        }
      }
      this.lastIndexTipY = currentIndexY;
      return;
    }

    this.lastIndexTipY = null;

    if (this.isPinch(landmarks)) {
      document.dispatchEvent(new CustomEvent('gesture-pinch', {
         detail: { x: cursorX, y: cursorY }
      }));
      return; 
    }

    const swipeDir = this.detectSwipe();
    if (swipeDir === 'left') {
      document.dispatchEvent(new CustomEvent('gesture-swipe-left'));
      this.wristHistory = []; 
    } else if (swipeDir === 'right') {
      document.dispatchEvent(new CustomEvent('gesture-swipe-right'));
      this.wristHistory = [];
    }
  }

  

  getDistance(p1, p2) {
    return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
  }

  isPinch(landmarks) {
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    
    return this.getDistance(thumbTip, indexTip) < 0.05;
  }

  isFist(landmarks) {
    
    const wrist = landmarks[0];
    
    const isCurled = (tipIdx, pipIdx) => {
      return this.getDistance(wrist, landmarks[tipIdx]) < this.getDistance(wrist, landmarks[pipIdx]);
    };

    return isCurled(8, 6) && isCurled(12, 10) && isCurled(16, 14) && isCurled(20, 18);
  }

  isFingerUp(landmarks, tipIdx, pipIdx) {
    return landmarks[tipIdx].y < landmarks[pipIdx].y;
  }

  isFingerDown(landmarks, tipIdx, pipIdx) {
    return landmarks[tipIdx].y > landmarks[pipIdx].y;
  }

  isOneFingerMode(landmarks) {
    return this.isFingerUp(landmarks, 8, 6) &&
           this.isFingerDown(landmarks, 12, 10) &&
           this.isFingerDown(landmarks, 16, 14) &&
           this.isFingerDown(landmarks, 20, 18);
  }

  isTwoFingerScrollMode(landmarks) {
    return this.isFingerUp(landmarks, 8, 6) &&
           this.isFingerUp(landmarks, 12, 10) &&
           this.isFingerDown(landmarks, 16, 14) &&
           this.isFingerDown(landmarks, 20, 18);
  }

  detectSwipe() {
    if (this.wristHistory.length < this.historyLength) return null;

    const startX = this.wristHistory[0].x;
    const endX = this.wristHistory[this.historyLength - 1].x;
    
    const dx = endX - startX;
    
    
    
    if (dx < -0.15) {
      return 'right'; 
    } 
    if (dx > 0.15) {
      return 'left';
    }
    return null;
  }

  dispatchFeedback(msg) {
    document.dispatchEvent(new CustomEvent('gesture-feedback', { detail: msg }));
  }

  dispatchError(msg) {
    document.dispatchEvent(new CustomEvent('gesture-error', { detail: msg }));
  }
}
