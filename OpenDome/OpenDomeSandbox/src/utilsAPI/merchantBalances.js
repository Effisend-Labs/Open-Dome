/**
 * Merchant wallet balances across USDC-compatible chains (EVM L1/L2 + Solana).
 * Runs on OpenDomeApp only — uses MERCHANT_ADDRESS / MERCHANT_SOLANA_ADDRESS.
 */

import {
  listSendUsdcChains,
  resolveUsdcRpcUrls,
  SOLANA_USDC_MINT,
} from 'opendome/dist/usdcChains.js';
import {
  setupUsdcFallbackProvider,
  solanaRpcWithFallback,
} from 'opendome/dist/rpcProviders.js';
import { nodeRequire } from './nodeRequire';

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
];

const LOW_NATIVE = {
  ETH: 0.002,
  POL: 0.5,
  AVAX: 0.02,
  SOL: 0.02,
};

const LOW_USDC = 1;

function strip(value) {
  if (value == null) return '';
  return String(value).trim().replace(/^['"]|['"]$/g, '');
}

function loadEthers() {
  return nodeRequire('ethers');
}

export function summarizeRpcError(err) {
  const raw = String(err?.shortMessage || err?.message || err || 'RPC failed');
  if (/no backend is currently healthy/i.test(raw)) {
    return 'RPC temporarily unhealthy — retry or set RPC_URL_*';
  }
  if (/API key disabled|tenant disabled|-32051/i.test(raw)) {
    return 'Public RPC rejected request — set RPC_URL_* for this chain';
  }
  if (/Just a moment|cloudflare|403 Forbidden/i.test(raw)) {
    return 'RPC blocked (Cloudflare) — set RPC_URL_* to a provider URL';
  }
  if (/401 Unauthorized/i.test(raw)) {
    return 'RPC unauthorized — set a working RPC_URL_* for this chain';
  }
  if (/ECONNREFUSED|ETIMEDOUT|ENOTFOUND|fetch failed|All .* RPCs failed/i.test(raw)) {
    return 'All curated RPCs failed — set RPC_URL_* or retry';
  }
  const oneLine = raw.replace(/\s+/g, ' ').trim();
  return oneLine.length > 140 ? `${oneLine.slice(0, 137)}…` : oneLine;
}

export function resolveMerchantEvmAddress(ethers) {
  const fromEnv = strip(process.env.MERCHANT_ADDRESS);
  if (fromEnv && /^0x[a-fA-F0-9]{40}$/.test(fromEnv)) {
    return ethers.getAddress(fromEnv);
  }
  return null;
}

export function resolveMerchantSolanaAddress() {
  const addr = strip(process.env.MERCHANT_SOLANA_ADDRESS);
  if (addr && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(addr)) return addr;
  return null;
}

function formatUnits(raw, decimals) {
  const n = Number(raw) / 10 ** decimals;
  if (!Number.isFinite(n)) return { raw: String(raw), formatted: '0', value: 0 };
  const formatted =
    n >= 1000
      ? n.toLocaleString('en-US', { maximumFractionDigits: 2 })
      : n.toLocaleString('en-US', {
          maximumFractionDigits: decimals > 6 ? 6 : 4,
          minimumFractionDigits: 0,
        });
  return { raw: String(raw), formatted, value: n };
}

async function fetchEvmBalances(ethers, chain, address) {
  const provider = setupUsdcFallbackProvider(ethers, chain);
  const usdc = new ethers.Contract(chain.usdc, ERC20_ABI, provider);

  const [nativeWei, usdcRaw, decimals] = await Promise.all([
    provider.getBalance(address),
    usdc.balanceOf(address),
    usdc.decimals().catch(() => 6),
  ]);

  const native = formatUnits(nativeWei, 18);
  const usdcBal = formatUnits(usdcRaw, Number(decimals));
  const lowNative = native.value < (LOW_NATIVE[chain.gasToken] ?? 0.002);
  const lowUsdc = usdcBal.value < LOW_USDC && chain.sponsored;

  return {
    key: chain.key,
    label: chain.label,
    kind: 'evm',
    chainId: chain.chainId,
    sponsored: Boolean(chain.sponsored),
    address,
    native: {
      symbol: chain.gasToken,
      ...native,
      low: lowNative,
    },
    usdc: {
      symbol: 'USDC',
      ...usdcBal,
      low: lowUsdc,
    },
    error: null,
  };
}

async function fetchSolanaBalances(chain, address) {
  const urls = resolveUsdcRpcUrls(chain);
  const [balanceRes, tokenRes] = await Promise.all([
    solanaRpcWithFallback(urls, 'getBalance', [address]),
    solanaRpcWithFallback(urls, 'getTokenAccountsByOwner', [
      address,
      { mint: SOLANA_USDC_MINT },
      { encoding: 'jsonParsed' },
    ]),
  ]);

  const lamports = balanceRes?.value ?? 0;
  const native = formatUnits(lamports, 9);

  let usdcRaw = 0n;
  const accounts = tokenRes?.value || [];
  for (const acct of accounts) {
    const info = acct?.account?.data?.parsed?.info?.tokenAmount;
    if (!info) continue;
    usdcRaw += BigInt(info.amount || '0');
  }
  const usdcBal = formatUnits(usdcRaw, 6);

  return {
    key: chain.key,
    label: chain.label,
    kind: 'solana',
    chainId: null,
    sponsored: false,
    address,
    native: {
      symbol: 'SOL',
      ...native,
      low: native.value < LOW_NATIVE.SOL,
    },
    usdc: {
      symbol: 'USDC',
      ...usdcBal,
      low: usdcBal.value < LOW_USDC,
    },
    error: null,
  };
}

export async function getMerchantBalances() {
  const ethers = loadEthers();
  const evmAddress = resolveMerchantEvmAddress(ethers);
  const solanaAddress = resolveMerchantSolanaAddress();
  const chains = listSendUsdcChains();

  const results = await Promise.all(
    chains.map(async (chain) => {
      try {
        if (chain.key === 'SOL') {
          if (!solanaAddress) {
            return {
              key: chain.key,
              label: chain.label,
              kind: 'solana',
              sponsored: false,
              address: null,
              native: null,
              usdc: null,
              error:
                'Set MERCHANT_SOLANA_ADDRESS (public pubkey) to show Solana balances',
            };
          }
          return await fetchSolanaBalances(chain, solanaAddress);
        }
        if (!evmAddress) {
          return {
            key: chain.key,
            label: chain.label,
            kind: 'evm',
            sponsored: Boolean(chain.sponsored),
            address: null,
            native: null,
            usdc: null,
            error: 'Set MERCHANT_ADDRESS (0x…) to show EVM balances',
          };
        }
        return await fetchEvmBalances(ethers, chain, evmAddress);
      } catch (err) {
        return {
          key: chain.key,
          label: chain.label,
          kind: chain.key === 'SOL' ? 'solana' : 'evm',
          sponsored: Boolean(chain.sponsored),
          address: chain.key === 'SOL' ? solanaAddress : evmAddress,
          native: null,
          usdc: null,
          error: summarizeRpcError(err),
        };
      }
    }),
  );

  const order = { BASE: 0, ARB: 1, OP: 2, MATIC: 3, AVAX: 4, ETH: 5, SOL: 6 };
  results.sort((a, b) => (order[a.key] ?? 99) - (order[b.key] ?? 99));

  return {
    evmAddress,
    solanaAddress,
    chains: results,
    fetchedAt: new Date().toISOString(),
  };
}
