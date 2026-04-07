


export async function startCamera() {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("getUserMedia is not supported in this browser.");
  }

  const videoElement = document.createElement("video");
  videoElement.setAttribute("playsinline", "true");
  videoElement.muted = true;
  videoElement.autoplay = true;
  videoElement.setAttribute("aria-hidden", "true");

  Object.assign(videoElement.style, {
    position: "fixed",
    left: "-10000px",
    top: "0",
    width: "1px",
    height: "1px",
    opacity: "0",
    pointerEvents: "none",
  });

  document.body.appendChild(videoElement);

  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: "user",
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 60, max: 60 },
      },
    });
  } catch (err) {
    videoElement.remove();
    throw err;
  }

  videoElement.srcObject = stream;

  await new Promise((resolve) => {
    if (videoElement.readyState >= 2) {
      resolve();
      return;
    }
    videoElement.addEventListener("loadedmetadata", () => resolve(), { once: true });
  });

  await videoElement.play();

  const videoWidth = videoElement.videoWidth || 0;
  const videoHeight = videoElement.videoHeight || 0;
  let frameWidth = videoWidth;
  let frameHeight = videoHeight;

  const [track] = stream.getVideoTracks();
  const settings = track?.getSettings?.() ?? {};
  if (!frameWidth && settings.width) frameWidth = settings.width;
  if (!frameHeight && settings.height) frameHeight = settings.height;

  frameWidth = frameWidth || 1280;
  frameHeight = frameHeight || 720;

  return { videoElement, stream, frameWidth, frameHeight };
}


export function stopCamera(cam) {
  if (!cam) return;
  try {
    cam.stream?.getTracks?.().forEach((t) => t.stop());
  } catch {
    
  }
  try {
    cam.videoElement?.remove?.();
  } catch {
    
  }
}
