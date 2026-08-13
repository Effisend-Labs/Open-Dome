import { Linking, Platform } from 'react-native';

export const BASESCAN = 'https://basescan.org';
export const USDC_BASE = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

export function walletExplorerUrl(address) {
  if (!address) return null;
  return `${BASESCAN}/address/${address}`;
}

export function usdcExplorerUrl(address) {
  if (!address) return `${BASESCAN}/token/${USDC_BASE}`;
  return `${BASESCAN}/token/${USDC_BASE}?a=${address}`;
}

export function txExplorerUrl(hash) {
  if (!hash) return null;
  return `${BASESCAN}/tx/${hash}`;
}

export function openBaseScan(url) {
  if (!url) return;
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }
  Linking.openURL(url);
}
