import { useCallback, useEffect, useState } from 'react';
import { Host } from 'opendome';

function formatScanTime(updatedAt) {
  if (!updatedAt) return null;
  return new Date(updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Host-shared Circle NFTs / passes for the signed-in user.
 */
export function useSharedNfts(isAuthorized) {
  const [nfts, setNfts] = useState([]);
  const [chains, setChains] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState(null);
  const [lastScan, setLastScan] = useState(null);

  const applySnapshot = useCallback((payload) => {
    if (Array.isArray(payload?.nfts)) {
      setNfts(payload.nfts);
      setChains(Array.isArray(payload.chains) ? payload.chains : []);
      setLastScan(formatScanTime(payload.updatedAt));
      setIsScanning(false);
      setError(null);
    }
  }, []);

  const scan = useCallback(async () => {
    if (!isAuthorized) return;
    setIsScanning(true);
    setError(null);
    try {
      const data = await Host.listNfts();
      applySnapshot(data);
    } catch (err) {
      setError(err.message || 'Failed to load NFTs');
      setIsScanning(false);
    }
  }, [isAuthorized, applySnapshot]);

  useEffect(() => {
    if (!isAuthorized) {
      setNfts([]);
      setChains([]);
      setError(null);
      setLastScan(null);
      return undefined;
    }

    scan();
    const unsub = Host.subscribeWalletUpdates((payload) => {
      applySnapshot(payload);
    });
    return unsub;
  }, [isAuthorized, scan, applySnapshot]);

  return { nfts, chains, isScanning, error, lastScan, scan };
}
