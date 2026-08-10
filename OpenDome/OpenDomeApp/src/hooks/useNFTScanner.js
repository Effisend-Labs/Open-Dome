import { useState, useEffect, useRef } from 'react';
import { scanAllNetworksForNFTs } from '../core/nftScanner';

export const useNFTScanner = (userAddress) => {
  const [nfts, setNfts] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const [lastScan, setLastScan] = useState(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!userAddress) {
      setNfts([]);
      return;
    }

    const scan = async () => {
      if (!isMounted.current) return;
      setIsScanning(true);
      
      try {
        const fetchedNfts = await scanAllNetworksForNFTs(userAddress);
        
        if (!isMounted.current) return;
        
        // Simple deduplication based on network+contract+tokenId
        const uniqueNftsMap = new Map();
        fetchedNfts.forEach(nft => {
          const key = `${nft.network}-${nft.contractAddress}-${nft.tokenId}`;
          if (!uniqueNftsMap.has(key)) {
            uniqueNftsMap.set(key, nft);
          }
        });
        
        setNfts(Array.from(uniqueNftsMap.values()));
        setLastScan(new Date());
      } catch (err) {
        console.warn('[useNFTScanner] Scan failed:', err);
      } finally {
        if (isMounted.current) {
          setIsScanning(false);
        }
      }
    };

    // Initial scan
    scan();

    // Set interval for 15 seconds
    const intervalId = setInterval(scan, 15000);

    return () => {
      clearInterval(intervalId);
    };
  }, [userAddress]);

  return { nfts, isScanning, lastScan };
};
