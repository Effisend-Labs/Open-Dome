import { useCallback, useState } from 'react';

export function useSponsoredTransfer({ token, apiUrl }) {
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const reset = useCallback(() => {
    setError(null);
    setResult(null);
  }, []);

  const send = useCallback(
    async ({ amount, destination }) => {
      setError(null);
      setResult(null);
      if (!token) {
        const msg = 'Sign in to send USDC';
        setError(msg);
        throw new Error(msg);
      }
      if (!apiUrl) {
        const msg = 'Transfer API is not configured';
        setError(msg);
        throw new Error(msg);
      }

      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amount, destination }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error) {
        const msg = data.error || data.message || `Transfer failed (${res.status})`;
        setError(msg);
        throw new Error(msg);
      }
      setResult(data);
      return data;
    },
    [apiUrl, token],
  );

  return { send, error, result, reset };
}
