import { useCallback, useState } from 'react';
import { Host } from 'opendome';

export function useSponsoredTransfer() {
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const reset = useCallback(() => {
    setError(null);
    setResult(null);
  }, []);

  const send = useCallback(async ({ amount, destination, blockchain = 'BASE', asset = 'USDC' }) => {
    setError(null);
    setResult(null);
    try {
      const data = await Host.transfer({
        amount,
        destination,
        blockchain,
        asset,
      });
      setResult(data);
      return data;
    } catch (e) {
      const msg = e.message || 'Transfer failed';
      setError(msg);
      throw e;
    }
  }, []);

  return { send, error, result, reset };
}
