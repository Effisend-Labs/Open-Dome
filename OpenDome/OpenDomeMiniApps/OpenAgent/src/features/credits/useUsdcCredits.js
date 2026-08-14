import { useCallback, useEffect, useState } from 'react';
import { useOpenDome } from 'opendome';
import { listX402PaymentChains } from 'opendome/src/usdcChains.js';

const NETWORK_KEY_BY_CHAIN = {
  BASE: 'base',
  ARB: 'arbitrum',
  OP: 'optimism',
  MATIC: 'polygon',
  AVAX: 'avalanche',
  SOL: 'solana',
};

export function formatCredits(amount) {
  if (amount == null || Number.isNaN(Number(amount))) return '—';
  const n = Number(amount);
  if (n === 0) return '0.00';
  if (n > 0 && n < 0.001) return '<0.001';
  if (n < 1) return n.toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function useUsdcCredits(selectedNetwork = 'base') {
  const { blockchain, user, isAuthorized } = useOpenDome();
  const [balances, setBalances] = useState({});
  const [status, setStatus] = useState('idle');

  const refresh = useCallback(async () => {
    if (!isAuthorized || (!user?.evmAddress && !user?.solanaAddress)) {
      setBalances({});
      setStatus('idle');
      return;
    }
    if (!blockchain?.getBalanceToken) {
      setStatus('error');
      return;
    }
    setStatus('loading');
    try {
      const values = await Promise.all(
        listX402PaymentChains().map(async (chain) => {
          const network = NETWORK_KEY_BY_CHAIN[chain.key];
          const address = chain.key === 'SOL' ? user.solanaAddress : user.evmAddress;
          if (!network || !address || !blockchain.supportsChain?.(network)) {
            return [network, 0];
          }

          try {
            const raw = await blockchain.getBalanceToken(network, address, chain.usdc);
            const value = parseFloat(raw);
            return [network, Number.isFinite(value) ? value : 0];
          } catch {
            return [network, 0];
          }
        }),
      );
      setBalances(Object.fromEntries(values.filter(([network]) => network)));
      setStatus('success');
    } catch {
      setBalances({});
      setStatus('error');
    }
  }, [blockchain, isAuthorized, user?.evmAddress, user?.solanaAddress]);

  useEffect(() => {
    refresh();
  }, [refresh]);

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
