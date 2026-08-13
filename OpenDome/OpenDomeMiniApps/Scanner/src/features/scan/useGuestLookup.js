import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, Alert } from 'react-native';
import { parseScanQuery, scannerFetch } from '../../core/scannerApi';
import {
  loadRecentScans,
  pushRecentScan,
} from '../history/recentScans';

const DEFAULT_CONTRACT =
  process.env.EXPO_PUBLIC_CONTRACT_ADDRESS ||
  '0xf5053b8bAfc35c52DbED12c38Ef4c8AEb75999FF';

function confirmUse(passName) {
  return new Promise((resolve) => {
    const title = 'Use pass?';
    const message = `Burn one unit of "${passName}" on-chain? This cannot be undone.`;
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.confirm) {
      resolve(window.confirm(`${title}\n\n${message}`));
      return;
    }
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Use', style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}

export default function useGuestLookup(hostToken) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [usingId, setUsingId] = useState(null);
  const [error, setError] = useState('');
  const [flash, setFlash] = useState('');
  const [profile, setProfile] = useState(null);
  const [passes, setPasses] = useState([]);
  const [recent, setRecent] = useState([]);
  const [stats, setStats] = useState({ lookups: 0, used: 0 });

  useEffect(() => {
    loadRecentScans().then(setRecent);
  }, []);

  const parsed = useMemo(() => parseScanQuery(query), [query]);
  const canLookup =
    parsed.type !== 'empty' && parsed.type !== 'unknown' && !loading;

  const resetGuest = useCallback(() => {
    setProfile(null);
    setPasses([]);
    setError('');
    setFlash('');
  }, []);

  const lookup = useCallback(
    async (rawOverride) => {
      const raw = String(rawOverride ?? query).trim();
      const p = parseScanQuery(raw);
      setError('');
      setFlash('');
      setProfile(null);
      setPasses([]);

      if (p.type === 'empty' || p.type === 'unknown') {
        setError('Enter an OpenDome QR, @username, or wallet address');
        return false;
      }

      setQuery(raw);
      setLoading(true);
      try {
        const data = await scannerFetch('/api/lookup', {
          token: hostToken,
          method: 'POST',
          body: { query: raw },
        });
        const nextProfile = data.profile || null;
        const nextPasses = Array.isArray(data.passes) ? data.passes : [];
        setProfile(nextProfile);
        setPasses(nextPasses);
        setStats((s) => ({ ...s, lookups: s.lookups + 1 }));
        setFlash(
          nextPasses.length
            ? `${nextPasses.length} pass${nextPasses.length === 1 ? '' : 'es'} found`
            : 'Guest found — no passes on record'
        );
        const label = nextProfile?.username
          ? `@${nextProfile.username}`
          : raw.length > 28
            ? `${raw.slice(0, 18)}…`
            : raw;
        const nextRecent = await pushRecentScan({
          query: raw,
          label,
          passCount: nextPasses.length,
        });
        setRecent(nextRecent);
        return true;
      } catch (e) {
        setError(e.message || 'Lookup failed');
        return false;
      } finally {
        setLoading(false);
      }
    },
    [hostToken, query]
  );

  const usePass = useCallback(
    async (pass) => {
      if (!profile?.evmAddress) {
        setError('Pass holder needs an EVM address to verify on-chain');
        return;
      }
      const ok = await confirmUse(pass.name || `Pass #${pass.tokenId}`);
      if (!ok) return;

      setUsingId(String(pass.tokenId));
      setError('');
      setFlash('');
      try {
        const data = await scannerFetch('/api/use', {
          token: hostToken,
          method: 'POST',
          body: {
            action: 'scanPass',
            network: 'base',
            contractAddress: DEFAULT_CONTRACT,
            tokenId: pass.tokenId,
            amount: 1,
            account: profile.evmAddress,
          },
        });
        setStats((s) => ({ ...s, used: s.used + 1 }));
        setFlash(`Verified · ${data.txHash?.slice(0, 12) || 'ok'}…`);
        const refreshed = await scannerFetch('/api/lookup', {
          token: hostToken,
          method: 'POST',
          body: { query: query.trim() },
        });
        setPasses(Array.isArray(refreshed.passes) ? refreshed.passes : []);
        setProfile(refreshed.profile || profile);
      } catch (e) {
        setError(e.message || 'Use failed');
      } finally {
        setUsingId(null);
      }
    },
    [hostToken, profile, query]
  );

  const pasteClipboard = useCallback(async () => {
    try {
      if (Platform.OS === 'web' && navigator?.clipboard?.readText) {
        const text = await navigator.clipboard.readText();
        if (text?.trim()) setQuery(text.trim());
      }
    } catch {
      setError('Clipboard permission denied');
    }
  }, []);

  return {
    query,
    setQuery,
    parsed,
    canLookup,
    loading,
    usingId,
    error,
    flash,
    profile,
    passes,
    recent,
    setRecent,
    stats,
    lookup,
    usePass,
    resetGuest,
    pasteClipboard,
  };
}
