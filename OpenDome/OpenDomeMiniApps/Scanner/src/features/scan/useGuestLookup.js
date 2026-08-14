import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import { Host } from 'opendome';
import { parseScanQuery } from '../../core/scannerApi';
import { formatPublicError } from '../../core/formatPublicError';
import {
  loadRecentScans,
  pushRecentScan,
} from '../history/recentScans';

function clampBurnAmount(pass, amount) {
  const max = Math.max(1, Math.floor(Number(pass?.amount) || 1));
  const n = Math.floor(Number(amount));
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(n, max);
}

export default function useGuestLookup() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [usingId, setUsingId] = useState(null);
  const [error, setError] = useState('');
  const [flash, setFlash] = useState('');
  const [profile, setProfile] = useState(null);
  const [passes, setPasses] = useState([]);
  const [recent, setRecent] = useState([]);
  const [stats, setStats] = useState({ lookups: 0, used: 0 });
  const [passContractAddress, setPassContractAddress] = useState(null);

  useEffect(() => {
    loadRecentScans().then(setRecent);
  }, []);

  useEffect(() => {
    let cancelled = false;
    Host.platformConfig()
      .then((cfg) => {
        if (cancelled) return;
        const addr = cfg?.passContractAddress || cfg?.contractAddress || null;
        if (addr) setPassContractAddress(addr);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
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
        const data = await Host.scanLookup(raw);
        const nextProfile = data.profile || null;
        const nextPasses = Array.isArray(data.passes) ? data.passes : [];
        setProfile(nextProfile);
        setPasses(nextPasses);
        setStats((s) => ({ ...s, lookups: s.lookups + 1 }));
        setFlash(
          nextPasses.length
            ? `${nextPasses.length} pass${nextPasses.length === 1 ? '' : 'es'} found`
            : 'Guest found — no passes on record',
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
        setError(formatPublicError(e.message, 'Lookup failed'));
        return false;
      } finally {
        setLoading(false);
      }
    },
    [query],
  );

  const usePass = useCallback(
    async (pass, amount = 1) => {
      if (!profile?.evmAddress) {
        setError('Pass holder needs an EVM address to verify on-chain');
        return false;
      }
      const burnAmount = clampBurnAmount(pass, amount);

      setUsingId(String(pass.tokenId));
      setError('');
      setFlash('');
      try {
        const contractAddress =
          pass.contractAddress || passContractAddress || null;
        if (!contractAddress) {
          setError('Pass contract not loaded from host yet — retry');
          return false;
        }
        const data = await Host.scanPass({
          network: 'base',
          contractAddress,
          tokenId: pass.tokenId,
          amount: burnAmount,
          account: profile.evmAddress,
        });
        setStats((s) => ({ ...s, used: s.used + burnAmount }));
        const shortTx = data.txHash ? `${data.txHash.slice(0, 10)}…` : 'ok';
        setFlash(`Used ${burnAmount} · ${shortTx}`);
        setPasses((prev) =>
          prev
            .map((row) => {
              if (String(row.tokenId) !== String(pass.tokenId)) return row;
              const next = Math.max(0, (Number(row.amount) || 1) - burnAmount);
              return next <= 0 ? null : { ...row, amount: next };
            })
            .filter(Boolean),
        );
        try {
          const refreshed = await Host.scanLookup(query.trim());
          setPasses(Array.isArray(refreshed.passes) ? refreshed.passes : []);
          setProfile(refreshed.profile || profile);
        } catch {
          // Keep optimistic remaining count if refresh fails.
        }
        return true;
      } catch (e) {
        setError(formatPublicError(e.message, 'Use failed'));
        return false;
      } finally {
        setUsingId(null);
      }
    },
    [profile, query, passContractAddress],
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
