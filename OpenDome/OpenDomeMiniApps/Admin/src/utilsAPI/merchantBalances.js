/**
 * Merchant wallet balances across USDC-compatible chains (EVM L1/L2 + Solana).
 * Used by Admin home so ops can spot low gas / USDC before facilitator fails.
 */

import {
  listSendUsdcChains,
  resolveUsdcRpcUrl,
  SOLANA_USDC_MINT,
} from 'opendome';
import { loadEthers } from './loadEthers';
import { normalizePrivateKey } from './adminDb';

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
];

/** Native gas below this → warn (ops attention). Units are whole tokens. */
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

export function resolveMerchantEvmAddress(ethers) {
  const fromEnv = strip(process.env.MERCHANT_ADDRESS);
  if (fromEnv && /^0x[a-fA-F0-9]{40}$/.test(fromEnv)) {
    return ethers.getAddress(fromEnv);
  }
  const key = normalizePrivateKey(process.env.MERCHANT_PRIVATE_KEY);
  if (!key) return null;
  try {
    return new ethers.Wallet(key).address;
  } catch {
    return null;
  }
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
  const rpcUrl = resolveUsdcRpcUrl(chain);
  const provider = new ethers.JsonRpcProvider(rpcUrl);
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

async function solanaRpc(rpcUrl, method, params) {
  const res = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method,
      params,
    }),
  });
  if (!res.ok) {
    throw new Error(`Solana RPC HTTP ${res.status}`);
  }
  const body = await res.json();
  if (body.error) {
    throw new Error(body.error.message || 'Solana RPC error');
  }
  return body.result;
}

async function fetchSolanaBalances(chain, address) {
  const rpcUrl = resolveUsdcRpcUrl(chain);
  const [balanceRes, tokenRes] = await Promise.all([
    solanaRpc(rpcUrl, 'getBalance', [address]),
    solanaRpc(rpcUrl, 'getTokenAccountsByOwner', [
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

/**
 * @returns {Promise<{
 *   evmAddress: string | null,
 *   solanaAddress: string | null,
 *   chains: object[],
 *   fetchedAt: string,
 * }>}
 */
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
              error: 'Set MERCHANT_SOLANA_ADDRESS to show Solana balances',
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
            error: 'Set MERCHANT_ADDRESS or MERCHANT_PRIVATE_KEY',
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
          error: err?.message || 'Failed to fetch balances',
        };
      }
    }),
  );

  // Sponsored L2s first (facilitator gas), then ETH, then SOL
  const order = { BASE: 0, ARB: 1, OP: 2, MATIC: 3, AVAX: 4, ETH: 5, SOL: 6 };
  results.sort((a, b) => (order[a.key] ?? 99) - (order[b.key] ?? 99));

  return {
    evmAddress,
    solanaAddress,
    chains: results,
    fetchedAt: new Date().toISOString(),
  };
}
