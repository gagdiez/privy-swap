import { useContext } from "react";
import { createContext } from "react";

/**
 * @typedef NearContext
 * @property {import('./wallets/near').Wallet} wallet Current wallet
 * @property {string} signedId The email of the signed user
 * @property {string} walletId The user's NEAR wallet address
 */

/** @type {import ('react').Context<NearContext>} */
export const NearContext = createContext({
  walletId: '',
  nearAccount: undefined,
  viewMethod: async () => { },
  callMethod: async () => { },
  getBalance: async () => { },
  transfer: async () => { },
});

export function useNEAR() {
  const context = useContext(NearContext);
  if (!context) {
    throw new Error(
      "useNEAR must be used within a <NEARxPrivy> provider"
    );
  }
  return context;
}