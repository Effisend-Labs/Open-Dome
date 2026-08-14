import React, { useEffect } from 'react';
import {
  clearUserWalletCache,
  refreshUserWallet,
  startUserWalletPoll,
  stopUserWalletPoll,
} from './userWalletCache';

/**
 * Host provider: keeps one Circle balance + NFT snapshot for all docked mini-apps.
 */
export function UserWalletProvider({ token, children }) {
  useEffect(() => {
    if (!token) {
      stopUserWalletPoll();
      clearUserWalletCache();
      return undefined;
    }

    startUserWalletPoll(token);
    return () => {
      stopUserWalletPoll();
    };
  }, [token]);

  return children;
}

export { refreshUserWallet };
