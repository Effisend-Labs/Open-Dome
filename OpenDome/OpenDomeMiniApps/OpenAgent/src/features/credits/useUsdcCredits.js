import { useCallback, useEffect, useState } from 'react';
import { useOpenDome, Host } from 'opendome';

export function formatCredits(amount) {
  if (amount == null || Number.isNaN(Number(amount))) return '—';
  const n = Number(amount);
  if (n === 0) return '0.00';
  if (n > 0 && n < 0.001) return '<0.001';
  if (n < 1) return n.toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function useUsdcCredits(selectedNetwork = 'base') {
  const { isAuthorized } = useOpenDome();
  const [balances, setBalances] = useState({});
  const [status, setStatus] = useState('idle');

  const applySnapshot = useCallback((payload) => {
    const byChain = payload?.balancesByChain || payload?.balances || {};
    const next = {};
    for (const [network, row] of Object.entries(byChain)) {
      const value = parseFloat(row?.usdc);
      next[network] = Number.isFinite(value) ? value : 0;
    }
    setBalances(next);
    setStatus('success');
  }, []);

  const refresh = useCallback(async () => {
    if (!isAuthorized) {
      setBalances({});
      setStatus('idle');
      return;
    }
    setStatus('loading');
    try {
      const data = await Host.walletBalances();
      applySnapshot(data);
    } catch {
      setBalances({});
      setStatus('error');
    }
  }, [isAuthorized, applySnapshot]);

  useEffect(() => {
    if (!isAuthorized) {
      setBalances({});
      setStatus('idle');
      return undefined;
    }

    refresh();
    const unsub = Host.subscribeWalletUpdates((payload) => {
      applySnapshot(payload);
    });
    return unsub;
  }, [isAuthorized, refresh, applySnapshot]);

  const selectedBalance = balances[selectedNetwork] ?? null;
  const unifiedBalance = Object.values(balances).reduce((total, balance) => total + balance, 0);

  return {
    balances,
    status,
    label: formatCredits(selectedBalance),
    unifiedLabel: formatCredits(unifiedBalance),
    refresh,
  };
}
