import { useCallback, useEffect, useState } from 'react';
import { Host } from 'opendome';

function formatSyncTime(updatedAt) {
  if (!updatedAt) return null;
  return new Date(updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Host-shared Circle balances for the signed-in user (60s TTL on server).
 */
export function useSharedBalances(isAuthorized) {
  const [balances, setBalances] = useState({});
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState(null);
  const [error, setError] = useState(null);

  const applySnapshot = useCallback((payload) => {
    if (payload?.balancesByChain) {
      setBalances(payload.balancesByChain);
      setLastSync(formatSyncTime(payload.updatedAt));
      setLoading(false);
      setError(null);
      return;
    }
    if (payload?.success && payload.balancesByChain) {
      setBalances(payload.balancesByChain);
      setLastSync(formatSyncTime(payload.updatedAt));
      setLoading(false);
      setError(null);
    }
  }, []);

  const refresh = useCallback(async () => {
    if (!isAuthorized) return;
    setLoading(true);
    setError(null);
    try {
      const data = await Host.walletBalances();
      applySnapshot(data);
    } catch (err) {
      setError(err.message || 'Failed to load balances');
      setLoading(false);
    }
  }, [isAuthorized, applySnapshot]);

  useEffect(() => {
    if (!isAuthorized) {
      setBalances({});
      setLoading(false);
      setLastSync(null);
      setError(null);
      return undefined;
    }

    refresh();
    const unsub = Host.subscribeWalletUpdates((payload) => {
      applySnapshot(payload);
    });
    return unsub;
  }, [isAuthorized, refresh, applySnapshot]);

  return { balances, loading, lastSync, error, refresh };
}
