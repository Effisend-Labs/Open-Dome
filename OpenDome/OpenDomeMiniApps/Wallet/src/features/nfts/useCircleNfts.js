import { useCallback, useEffect, useState } from 'react';
import { Host } from 'opendome';

export function useCircleNfts(isAuthorized) {
  const [nfts, setNfts] = useState([]);
  const [chains, setChains] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState(null);
  const [lastScan, setLastScan] = useState(null);

  const scan = useCallback(async () => {
    if (!isAuthorized) return;
    setIsScanning(true);
    setError(null);
    try {
      const data = await Host.listNfts();
      setNfts(Array.isArray(data?.nfts) ? data.nfts : []);
      setChains(Array.isArray(data?.chains) ? data.chains : []);
      setLastScan(
        new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      );
    } catch (err) {
      setError(err.message || 'Failed to load NFTs');
    } finally {
      setIsScanning(false);
    }
  }, [isAuthorized]);

  useEffect(() => {
    if (!isAuthorized) {
      setNfts([]);
      setChains([]);
      setError(null);
      setLastScan(null);
      return undefined;
    }
    scan();
    const interval = setInterval(scan, 60000);
    return () => clearInterval(interval);
  }, [isAuthorized, scan]);

  return { nfts, chains, isScanning, error, lastScan, scan };
}
