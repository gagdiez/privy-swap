import { useEffect, useState } from 'react';

import styles from '@/styles/app.module.css';

import { useNEAR } from '../context/useNear';
import { usePrivy } from '@privy-io/react-auth';
import { tokens } from '../chains/tokens';
import { fromInternalToDisplay, fromDisplayToInternal, formatDisplayAmount } from '../utils/decimals';

import { OpenAPI, QuoteRequest, OneClickService } from '@defuse-protocol/one-click-sdk-typescript';

import { getAdapter } from '../chains/adapters';
import { useCallback } from 'react';

OpenAPI.BASE = 'https://1click.chaindefuser.com';
const PATH = "predefined-path";

const getQuote = async (originAsset, originAmount, destinationAsset, refundTo, dstAccount, dry = true) => {
  console.log("Getting quote for origin asset:", originAsset, "amount:", originAmount.toString(), "destination asset:", destinationAsset, "refund to:", refundTo, "destination account:", dstAccount);

  if (originAsset === destinationAsset) return;

  const quoteRequest = {
    dry: dry, // set to true for testing / false to get `depositAddress` and execute swap
    swapType: QuoteRequest.swapType.EXACT_INPUT,
    slippageTolerance: 100, // 1%
    originAsset,
    depositType: QuoteRequest.depositType.ORIGIN_CHAIN,
    destinationAsset,
    amount: originAmount.toString(),
    refundTo: refundTo,
    refundType: QuoteRequest.refundType.ORIGIN_CHAIN,
    recipient: dstAccount, // Valid Solana Address
    recipientType: QuoteRequest.recipientType.DESTINATION_CHAIN,
    deadline: new Date(Date.now() + 3600 * 1000).toISOString(), // 1 hour from now 
  };

  // Get quote
  const quote = await OneClickService.getQuote(quoteRequest);
  return quote;
}

// swap interface for cross-chain transactions
export default function Home() {

  const [originChain, setOriginChain] = useState('near');
  const [originAsset, setOriginAsset] = useState(tokens['near']['near']);
  const [originAccount, setOriginAccount] = useState('loading...');

  const [dstChain, setDstChain] = useState('arbitrum');
  const [dstAsset, setDstAsset] = useState(tokens['arbitrum']['arb']);
  const [dstAccount, setDstAccount] = useState('loading...');

  const [btn, setBtn] = useState('Swap Tokens');

  // Balance (what user owns)
  const [originBalance, setOriginBalance] = useState('0');

  // Input amounts (what user wants to swap)
  const [originAmountInternal, setOriginAmountInternal] = useState('0');

  // Display amounts as strings (human readable)
  const [originAmountDisplay, setOriginAmountDisplay] = useState('0');
  const [dstAmountDisplay, setDstAmountDisplay] = useState('0');

  const { authenticated } = usePrivy();
  const { walletId, nearAccount, viewFunction } = useNEAR();

  useEffect(() => {
    async function fetchOrigin() {
      const adapter = getAdapter(originChain);
      const { address } = await adapter.deriveAddressAndPublicKey(walletId, PATH);
      setOriginAccount(address);

      console.log("Getting balance for chain:", originChain, "and address:", address);
      const { balance } = await adapter.getBalance(address, originAsset.address);

      // Store balance separately from user input
      const formatted = formatDisplayAmount(fromInternalToDisplay(balance, originAsset.decimals))
      setOriginBalance(formatted.toString());
    }

    setOriginAccount('loading...'); // Reset before fetching
    setOriginBalance('loading...'); // Reset balance
    if (authenticated && walletId) fetchOrigin();

  }, [authenticated, viewFunction, originChain, walletId, originAsset]);

  useEffect(() => {
    async function fetchDstAddress() {
      const adapter = getAdapter(dstChain);
      const { address } = await adapter.deriveAddressAndPublicKey(walletId, PATH);
      setDstAccount(address);
    }
    setDstAccount('loading...'); // Reset before fetching
    if (authenticated && walletId) fetchDstAddress();
  }, [authenticated, dstChain, walletId]);

  useEffect(() => {
    async function fetchQuote() {
      if (originAmountInternal === '0') return setDstAmountDisplay('0');

      getQuote(originAsset.id, originAmountInternal, dstAsset.id, originAccount, dstAccount)
        .then(quote => {
          setDstAmountDisplay(fromInternalToDisplay(quote.quote.amountOut, dstAsset.decimals));
        }).catch((e) => { console.log(e); setDstAmountDisplay('0') });
    }

    setDstAmountDisplay('loading...'); // Reset destination amount
    if (walletId) fetchQuote();
  }, [dstChain, originAmountInternal, walletId, originAsset, dstAsset, originAccount, dstAccount]);

  const swap = useCallback(async () => {
    if (!originAccount || !dstAccount) return;
    setBtn('Swapping...');
    try {
      const quote = await getQuote(originAsset.id, originAmountInternal, dstAsset.id, originAccount, dstAccount, false);
      const depositAddress = quote.quote.depositAddress;
      console.log("Deposit Address:", depositAddress);

      // Send the money!
      const adapter = getAdapter(originChain);
      const tx = await adapter.transfer(originAccount, depositAddress, originAmountInternal, nearAccount, originAsset.address);
      alert(`Transaction Hash on ${originChain}: ${tx}`);
    } finally {
      setBtn('Swap Tokens'); // Reset button text after swap
    }
  }, [originAccount, dstAccount, originAsset, originAmountInternal, dstAsset, originChain, nearAccount]);

  const handleAmountChange = useCallback((displayValue) => {
    setOriginAmountDisplay(displayValue);
    setOriginAmountInternal(fromDisplayToInternal(displayValue, originAsset.decimals));
  }, [originAsset]);

  const handleOriginChainChange = (newChain) => {
    // Find current asset symbol on old chain
    const currentSymbol = Object.keys(tokens[originChain]).find(sym => tokens[originChain][sym].id === originAsset.id) || null;

    // Determine new asset (keep same symbol if exists, else first available)
    let nextAsset;
    if (currentSymbol && tokens[newChain][currentSymbol]) {
      nextAsset = tokens[newChain][currentSymbol];
    } else {
      const firstSymbol = Object.keys(tokens[newChain])[0];
      nextAsset = tokens[newChain][firstSymbol];
    }

    setOriginChain(newChain);
    setOriginAsset(nextAsset);
    // Reset user-entered amount when switching chains (avoids mismatched decimals)
    setOriginAmountDisplay('0');
    setOriginAmountInternal('0');
  };

  return (
    <main className={styles.main}>
      <form className={styles.form}>
        <div className={styles.swapContainer}>

          {/* From Card */}
          <div className={`${styles.swapCard} ${styles.from}`}>
            <div className={styles.cardHeader}>
              <span className={styles.cardLabel}>From</span>
            </div>
            <div className={styles.cardMain}>
              <div className={styles.inputRow}>
                <input
                  className={styles.amountInput}
                  type="text"
                  value={originAmountDisplay || ""}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  placeholder="0"
                />
                <select
                  className={styles.inlineSelector}
                  value={originAsset.id}
                  onChange={(e) => setOriginAsset(tokens[originChain][Object.keys(tokens[originChain]).find(key => tokens[originChain][key].id === e.target.value)])}
                >
                  {Object.keys(tokens[originChain]).map(symbol => (
                    <option key={tokens[originChain][symbol].id} value={tokens[originChain][symbol].id}>
                      {symbol.toUpperCase()}
                    </option>
                  ))}
                </select>
                <span className={styles.inlineText}>on</span>
                <select
                  className={styles.inlineSelector}
                  value={originChain}
                  onChange={(e) => handleOriginChainChange(e.target.value)}
                >
                  {Object.keys(tokens).map(chain => (
                    <option key={chain} value={chain}>
                      {chain.charAt(0).toUpperCase() + chain.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <span className={styles.balanceLabel}>
              Balance: {originBalance}
            </span>
            <div className={styles.accountInfo}>
              {originAccount || 'Connect wallet to see address'}
            </div>
          </div>

          {/* To Card */}
          <div className={`${styles.swapCard} ${styles.to}`}>
            <div className={styles.cardHeader}>
              <span className={styles.cardLabel}>To</span>
            </div>
            <div className={styles.cardMain}>
              <div className={styles.inputRow}>
                <input
                  className={styles.amountInput}
                  type="text"
                  value={formatDisplayAmount(dstAmountDisplay) || "0"}
                  disabled
                  placeholder="0"
                />
                <select
                  className={styles.inlineSelector}
                  value={dstAsset.id}
                  onChange={(e) => setDstAsset(tokens[dstChain][Object.keys(tokens[dstChain]).find(key => tokens[dstChain][key].id === e.target.value)])}
                >
                  {Object.keys(tokens[dstChain]).map(symbol => (
                    <option key={tokens[dstChain][symbol].id} value={tokens[dstChain][symbol].id}>
                      {symbol.toUpperCase()}
                    </option>
                  ))}
                </select>
                <span className={styles.inlineText}>on</span>
                <select
                  className={styles.inlineSelector}
                  value={dstChain}
                  onChange={(e) => setDstChain(e.target.value)}
                >
                  {Object.keys(tokens).map(chain => (
                    <option key={chain} value={chain}>
                      {chain.charAt(0).toUpperCase() + chain.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className={styles.accountInfo}>
              {dstAccount || 'Destination address will appear here'}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={swap}
        >
          {btn}
        </button>
      </form>
    </main>
  );
}
