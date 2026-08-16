import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../theme';
import { openCameraStream, onCameraCrash, stopStream } from './openCameraStream';

/**
 * Web-only QR capture via getUserMedia + BarcodeDetector.
 * Falls back to a visual stage + instruction when unsupported.
 */
export default function QrCameraStage({ active, onDetected, onClose }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const onDetectedRef = useRef(onDetected);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const [facing, setFacing] = useState('environment');
  const lastHit = useRef('');
  const facingRef = useRef('environment');
  const unwatchRef = useRef(null);
  const recoveredRef = useRef(false);
  const bindRef = useRef(null);

  useEffect(() => {
    onDetectedRef.current = onDetected;
  }, [onDetected]);

  useEffect(() => {
    if (!active || Platform.OS !== 'web') return undefined;

    let cancelled = false;

    (async () => {
      setError('');
      setReady(false);
      try {
        if (!navigator?.mediaDevices?.getUserMedia) {
          setError('Camera not available in this browser');
          return;
        }

        const startCamera = async (prefer) => {
          unwatchRef.current?.();
          stopStream(streamRef.current);
          streamRef.current = null;
          try {
            return await openCameraStream(prefer);
          } catch (err) {
            const other = prefer === 'environment' ? 'user' : 'environment';
            return openCameraStream(other).catch(() => {
              throw err;
            });
          }
        };

        const bind = async (prefer) => {
          const { stream, facing: actual } = await startCamera(prefer);
          if (cancelled) {
            stopStream(stream);
            return null;
          }
          streamRef.current = stream;
          const next = actual === 'user' ? 'user' : 'environment';
          facingRef.current = next;
          setFacing(next);
          const video = videoRef.current;
          if (video) {
            video.srcObject = stream;
            await video.play();
            setReady(true);
          }
          unwatchRef.current = onCameraCrash(stream, () => {
            if (cancelled || recoveredRef.current) {
              if (!cancelled) setError('Camera stopped');
              return;
            }
            recoveredRef.current = true;
            const other = facingRef.current === 'environment' ? 'user' : 'environment';
            bind(other).catch((err) => {
              if (!cancelled) setError(err?.message || 'Camera stopped');
            });
          });
          return stream;
        };
        bindRef.current = bind;

        await bind('environment');
        if (cancelled) return;

        const Detector = window.BarcodeDetector;
        if (!Detector) {
          setError('QR auto-detect unsupported — paste the code instead');
          return;
        }
        const detector = new Detector({ formats: ['qr_code'] });

        const tick = async () => {
          if (cancelled || !videoRef.current) return;
          try {
            if (videoRef.current.readyState >= 2) {
              const codes = await detector.detect(videoRef.current);
              const raw = codes?.[0]?.rawValue;
              if (raw && raw !== lastHit.current) {
                lastHit.current = raw;
                onDetectedRef.current?.(raw);
              }
            }
          } catch {
            // keep looping
          }
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      } catch (e) {
        setError(e.message || 'Camera permission denied');
      }
    })();

    return () => {
      cancelled = true;
      bindRef.current = null;
      unwatchRef.current?.();
      unwatchRef.current = null;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      stopStream(streamRef.current);
      streamRef.current = null;
    };
  }, [active]);

  if (Platform.OS !== 'web') {
    return (
      <View style={s.stage}>
        <View style={s.frame}>
          <View style={[s.corner, s.tl]} />
          <View style={[s.corner, s.tr]} />
          <View style={[s.corner, s.bl]} />
          <View style={[s.corner, s.br]} />
          <Text style={s.fallback}>
            Camera scan is available on web. Paste a guest QR payload below.
          </Text>
        </View>
        {onClose ? (
          <TouchableOpacity style={s.close} onPress={onClose}>
            <Text style={s.closeText}>Close camera</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  }

  return (
    <View style={s.stage}>
      <View style={s.videoShell}>
        {/* media caption not applicable for live QR camera preview */}
        <video
          ref={videoRef}
          playsInline
          muted
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            borderRadius: 16,
            backgroundColor: '#000',
          }}
        />
        <View style={s.overlay} pointerEvents="none">
          <View style={[s.corner, s.tl]} />
          <View style={[s.corner, s.tr]} />
          <View style={[s.corner, s.bl]} />
          <View style={[s.corner, s.br]} />
          <View style={s.beam} />
        </View>
        {!ready && !error ? (
          <View style={s.loading}>
            <ActivityIndicator color={COLORS.cyan} />
            <Text style={s.loadingText}>Starting camera…</Text>
          </View>
        ) : null}
      </View>
      {error ? <Text style={s.error}>{error}</Text> : (
        <Text style={s.hint}>Align guest OpenDome / wallet QR inside the frame</Text>
      )}
      <View style={s.actions}>
        <TouchableOpacity
          style={s.close}
          onPress={() => {
            recoveredRef.current = false;
            setError('');
            const next = facing === 'environment' ? 'user' : 'environment';
            bindRef.current?.(next).catch((err) => {
              setError(err?.message || 'Could not switch camera');
            });
          }}
        >
          <Ionicons name="camera-reverse-outline" size={16} color={COLORS.fg} />
          <Text style={s.closeText}>Flip camera</Text>
        </TouchableOpacity>
        {onClose ? (
          <TouchableOpacity style={s.close} onPress={onClose}>
            <Ionicons name="close" size={16} color={COLORS.fg} />
            <Text style={s.closeText}>Close camera</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  stage: { width: '100%', marginBottom: 14 },
  videoShell: {
    height: 260,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#000',
    position: 'relative',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frame: {
    height: 220,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.elevated,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: COLORS.cyan,
  },
  tl: { top: 18, left: 18, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 6 },
  tr: { top: 18, right: 18, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 6, borderColor: COLORS.magenta },
  bl: { bottom: 18, left: 18, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 6 },
  br: { bottom: 18, right: 18, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 6, borderColor: COLORS.magenta },
  beam: {
    position: 'absolute',
    left: '18%',
    right: '18%',
    height: 2,
    backgroundColor: COLORS.cyan,
    opacity: 0.85,
    shadowColor: COLORS.cyan,
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
  loading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    gap: 8,
  },
  loadingText: { color: COLORS.secondary, fontSize: 13 },
  hint: { color: COLORS.muted, fontSize: 12, marginTop: 10, textAlign: 'center' },
  error: { color: COLORS.warn, fontSize: 12, marginTop: 10, textAlign: 'center' },
  fallback: { color: COLORS.secondary, textAlign: 'center', lineHeight: 20, fontSize: 14 },
  actions: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  close: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  closeText: { color: COLORS.fg, fontSize: 13, fontWeight: '600' },
});
