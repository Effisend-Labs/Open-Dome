function stopStream(stream) {
  stream?.getTracks?.().forEach((t) => t.stop());
}

async function getVideo(constraints) {
  return navigator.mediaDevices.getUserMedia({ video: constraints, audio: false });
}

function facingAttempts(prefer) {
  const other = prefer === 'environment' ? 'user' : 'environment';
  return [
    { facingMode: { exact: prefer } },
    { facingMode: { ideal: prefer } },
    { facingMode: prefer },
    { facingMode: { exact: other } },
    { facingMode: { ideal: other } },
    { facingMode: other },
  ];
}

function rankCameras(cams, prefer) {
  const back = /back|rear|environment|world|wide/i;
  const front = /front|user|face|selfie/i;
  const score = (label) => {
    const isBack = back.test(label);
    const isFront = front.test(label);
    if (prefer === 'environment') {
      if (isBack) return 0;
      if (isFront) return 2;
      return 1;
    }
    if (isFront) return 0;
    if (isBack) return 2;
    return 1;
  };
  return [...cams].sort((a, b) => score(a.label || '') - score(b.label || ''));
}

function facingFromLabel(label, fallback) {
  if (/back|rear|environment|world/i.test(label || '')) return 'environment';
  if (/front|user|face|selfie/i.test(label || '')) return 'user';
  return fallback;
}

export async function openCameraStream(prefer = 'environment') {
  if (!navigator?.mediaDevices?.getUserMedia) {
    throw new Error('Camera is not available');
  }

  let lastErr;
  for (const video of facingAttempts(prefer)) {
    try {
      const stream = await getVideo(video);
      const mode = video.facingMode?.exact || video.facingMode?.ideal || video.facingMode || prefer;
      return { stream, facing: mode };
    } catch (err) {
      lastErr = err;
    }
  }

  let probe;
  try {
    probe = await getVideo(true);
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cams = devices.filter((d) => d.kind === 'videoinput' && d.deviceId);
    stopStream(probe);
    probe = null;

    for (const cam of rankCameras(cams, prefer)) {
      try {
        const stream = await getVideo({ deviceId: { exact: cam.deviceId } });
        return {
          stream,
          facing: facingFromLabel(cam.label, prefer),
          deviceId: cam.deviceId,
        };
      } catch (err) {
        lastErr = err;
      }
    }

    const stream = await getVideo(true);
    return { stream, facing: prefer };
  } catch (err) {
    stopStream(probe);
    lastErr = err;
  }

  throw lastErr || new Error('No camera available');
}

export function onCameraCrash(stream, fallback) {
  const track = stream?.getVideoTracks?.()[0];
  if (!track) return () => {};
  const handler = () => fallback();
  track.addEventListener('ended', handler);
  track.addEventListener('error', handler);
  return () => {
    track.removeEventListener('ended', handler);
    track.removeEventListener('error', handler);
  };
}

export { stopStream };
