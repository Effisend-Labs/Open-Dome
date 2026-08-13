import { useCallback, useEffect, useState } from 'react';
import { useOpenDome } from 'opendome';

const USDC_BASE = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

export function formatCredits(amount) {
  if (amount == null || Number.isNaN(Number(amount))) return '—';
  const n = Number(amount);
  if (n === 0) return '0.00';
  if (n > 0 && n < 0.001) return '<0.001';
  if (n < 1) return n.toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function useUsdcCredits() {
  const { blockchain, user, isAuthorized } = useOpenDome();
  const [credits, setCredits] = useState(null);
  const [status, setStatus] = useState('idle');

  const refresh = useCallback(async () => {
    if (!isAuthorized || !user?.evmAddress) {
      setCredits(null);
      setStatus('idle');
      return;
    }
    if (!blockchain?.getBalanceToken) {
      setStatus('error');
      return;
    }
    setStatus('loading');
    try {
      const raw = await blockchain.getBalanceToken('base', user.evmAddress, USDC_BASE);
      const n = parseFloat(raw);
      setCredits(Number.isFinite(n) ? n : 0);
      setStatus('success');
    } catch {
      setCredits(null);
      setStatus('error');
    }
  }, [blockchain, isAuthorized, user?.evmAddress]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    credits,
    status,
    label: formatCredits(credits),
    refresh,
  };
}
