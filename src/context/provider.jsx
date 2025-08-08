// Privy
import { usePrivy } from '@privy-io/react-auth';
import { useCreateWallet } from '@privy-io/react-auth/extended-chains';
import { useSignRawHash } from '@privy-io/react-auth/extended-chains';

// near api js
import { JsonRpcProvider } from '@near-js/providers';
import { Account } from '@near-js/accounts';
import { actionCreators, Signature, SignedTransaction } from '@near-js/transactions';

// utils
import { sha256 } from "@noble/hashes/sha2";
import { toHex } from "viem";
import { hexToBytes } from '@noble/hashes/utils';

// config
import { NetworkId } from '@/config';
import { useEffect } from 'react';
import { useCallback } from 'react';
import { useState } from 'react';
import { NearContext } from './useNear';

const url = NetworkId === 'testnet' ? 'https://test.rpc.fastnear.com' : 'https://main.rpc.fastnear.com';
const THIRTY_TGAS = '30000000000000';
const NO_DEPOSIT = '0';

// Provider
const provider = new JsonRpcProvider({ url });

// eslint-disable-next-line react/prop-types
export function NEARxPrivy({ children }) {
  const { authenticated, user } = usePrivy();
  const [walletId, setWalletId] = useState('');
  const [nearAccount, setNearAccount] = useState(null);

  const { signRawHash } = useSignRawHash();
  const { createWallet } = useCreateWallet();

  useEffect(() => {
    if (authenticated) {
      if (!user.wallet) {
        createWallet({ chainType: 'near' });
      } else {
        let acc = new Account(user.wallet.address, provider)
        setNearAccount(acc);
        setWalletId(user.wallet.address);
      }
    } else {
      setWalletId('');
    }
  }, [authenticated, user, createWallet]);

  const viewFunction = async ({ contractId, method, args = {} }) => {
    return provider.callFunction(contractId, method, args);
  };

  const callFunction = useCallback(async ({ contractId, method, args = {}, gas = THIRTY_TGAS, deposit = NO_DEPOSIT }) => {
    if (!nearAccount) {
      throw new Error("NEAR account is not initialized. Please login first.");
    }

    const keys = await nearAccount.getAccessKeyList()

    const transaction = await nearAccount.createTransaction(
      contractId,
      [actionCreators.functionCall(method, args, gas, deposit)],
      keys.keys[0].public_key
    );
    const encoded = transaction.encode();
    const txHash = toHex(sha256(encoded));
    const signatureRaw = await signRawHash({ address: nearAccount.accountId, chainType: 'near', hash: txHash });
    const signature = new Signature({
      keyType: transaction.publicKey.keyType,
      data: hexToBytes(signatureRaw.signature.slice(2)),
    });
    const signedTx = new SignedTransaction({ transaction, signature })
    await provider.sendTransaction(signedTx)
  }, [nearAccount]);

  const getBalance = async (accountId) => {
    let acc = new Account(accountId, provider)
    let balance = await acc.getBalance()
    return balance
  }

  return (
    <NearContext.Provider value={{ walletId, viewFunction, callFunction, getBalance }}>
      {children}
    </NearContext.Provider>
  )
}