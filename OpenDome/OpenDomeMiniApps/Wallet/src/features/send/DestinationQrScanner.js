import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Platform } from 'react-native';
import { parseDestinationAddress } from './destinationAddress';
import { openCameraStream, onCameraCrash, stopStream } from './openCameraStream';

async function detectQr(video, canvas) {
  if (!video?.videoWidth) return null;
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(video, 0, 0);

  if (typeof BarcodeDetector === 'function') {
    try {
      const detector = detectQr._detector
        || (detectQr._detector = new BarcodeDetector({ formats: ['qr_code'] }));
      const codes = await detector.detect(canvas);
      return codes[0]?.rawValue || null;
    } catch {
      // fall through to jsqr
    }
  }

  try {
    const jsQR = (await import('jsqr')).default;
    const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return jsQR(image.data, image.width, image.height)?.data || null;
  } catch {
    return null;
  }
}

export function DestinationQrScanner({ tokens, onClose, onAddress }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const [hint, setHint] = useState('Point at a Base or Solana address QR');
  const [error, setError] = useState(null);
  const [facing, setFacing] = useState('environment');
  const facingRef = useRef('environment');
  const unwatchRef = useRef(null);
  const recoveredRef = useRef(false);
  const watchCrashRef = useRef(null);

  const attachStream = useCallback(async (prefer) => {
    unwatchRef.current?.();
    unwatchRef.current = null;
    stopStream(streamRef.current);
    streamRef.current = null;

    const start = async (mode) => {
      const { stream, facing: actual } = await openCameraStream(mode);
      streamRef.current = stream;
      const next = actual === 'user' ? 'user' : 'environment';
      facingRef.current = next;
      setFacing(next);
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play();
      }
      return { stream, facing: next };
    };

    try {
      return await start(prefer);
    } catch (err) {
      const other = prefer === 'environment' ? 'user' : 'environment';
      return start(other).catch(() => {
        throw err;
      });
    }
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof navigator === 'undefined') {
      setError('QR scan is available in the browser');
      return undefined;
    }

    let cancelled = false;
    const canvas = document.createElement('canvas');
    canvasRef.current = canvas;

    const watchCrash = (stream) => {
      unwatchRef.current?.();
      unwatchRef.current = onCameraCrash(stream, () => {
        if (cancelled || recoveredRef.current) {
          if (!cancelled) setError('Camera stopped');
          return;
        }
        recoveredRef.current = true;
        const other = facingRef.current === 'environment' ? 'user' : 'environment';
        setHint(other === 'user' ? 'Switched to front camera' : 'Switched to back camera');
        attachStream(other)
          .then(({ stream: next }) => {
            if (!cancelled) watchCrash(next);
          })
          .catch((err) => {
            if (!cancelled) setError(err?.message || 'Camera stopped');
          });
      });
    };
    watchCrashRef.current = watchCrash;

    const start = async () => {
      try {
        const { stream } = await attachStream('environment');
        if (cancelled) return;
        watchCrash(stream);

        const tick = async () => {
          if (cancelled) return;
          try {
            const raw = await detectQr(videoRef.current, canvas);
            if (raw) {
              const addr = parseDestinationAddress(raw);
              if (addr) {
                onAddress(addr);
                return;
              }
              setHint('Not a Base or Solana address');
            }
          } catch {
            // keep scanning
          }
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      } catch (err) {
        if (!cancelled) setError(err?.message || 'Camera permission denied');
      }
    };

    start();
    return () => {
      cancelled = true;
      watchCrashRef.current = null;
      unwatchRef.current?.();
      unwatchRef.current = null;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      stopStream(streamRef.current);
      streamRef.current = null;
    };
  }, [attachStream, onAddress]);

  const flipCamera = async () => {
    const next = facing === 'environment' ? 'user' : 'environment';
    setError(null);
    recoveredRef.current = false;
    try {
      const { stream, facing: actual } = await attachStream(next);
      setHint(actual === 'user' ? 'Front camera' : 'Back camera');
      watchCrashRef.current?.(stream);
    } catch (err) {
      try {
        const { stream } = await attachStream(facing);
        watchCrashRef.current?.(stream);
        setHint('Could not flip — kept this camera');
      } catch {
        setError(err?.message || 'Could not switch camera');
      }
    }
  };

  return (
    <View style={[styles.wrap, { backgroundColor: tokens.BG }]}>
      <View style={styles.top}>
        <Text style={[styles.title, { color: tokens.FG, fontFamily: tokens.font.primary }]}>
          Scan address
        </Text>
        <TouchableOpacity onPress={onClose} hitSlop={12}>
          <Text style={{ color: tokens.MUTED, fontSize: 24, lineHeight: 24 }}>×</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.stage, { backgroundColor: '#000', borderColor: tokens.BORDER }]}>
        {Platform.OS === 'web'
          ? React.createElement('video', {
              ref: videoRef,
              autoPlay: true,
              playsInline: true,
              muted: true,
              style: { width: '100%', height: '100%', objectFit: 'cover' },
            })
          : null}
        <View style={styles.frame} pointerEvents="none" />
      </View>

      <TouchableOpacity
        style={[styles.flipBtn, { borderColor: tokens.BORDER, backgroundColor: tokens.SURFACE }]}
        onPress={flipCamera}
        activeOpacity={0.75}
      >
        <Text style={[styles.flipText, { color: tokens.FG, fontFamily: tokens.font.primary }]}>
          Flip camera
        </Text>
      </TouchableOpacity>

      <Text
        style={[
          styles.hint,
          {
            color: hint.startsWith('Not') ? tokens.DANGER || '#EF4444' : tokens.MUTED,
            fontFamily: tokens.font.primary,
          },
        ]}
      >
        {error || hint}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    padding: 20,
    paddingBottom: 28,
    gap: 14,
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  stage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
  },
  frame: {
    position: 'absolute',
    top: '18%',
    left: '18%',
    right: '18%',
    bottom: '18%',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.85)',
    borderRadius: 12,
  },
  flipBtn: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  hint: {
    fontSize: 13,
    lineHeight: 18,
  },
});
