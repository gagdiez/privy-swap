import { OpenAPI, QuoteRequest, OneClickService } from '@defuse-protocol/one-click-sdk-typescript'

import { useEffect, useState, useCallback } from 'react'
import { getAdapter, chains } from 'multichain.js'
import { usePrivy } from '@privy-io/react-auth'

import styles from '@/styles/app.module.css'

import { useNEAR } from '../context/useNear'
import { tokens } from '../tokens'
import {
  unitsToDecimal,
  decimalToUnits,
  formatNumber,
} from '../utils/decimals'


OpenAPI.BASE = 'https://1click.chaindefuser.com'

// Debounce hook for reducing request on user input
function useDebouncedValue(value, delay = 400) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return debounced
}

const getQuote = async (
  originAsset,
  originAmount,
  destinationAsset,
  refundTo,
  dstAccount,
  dry = true
) => {
  if (originAsset === destinationAsset) return { quote: { amountOut: 0 } }

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
  }

  return OneClickService.getQuote(quoteRequest)
}

export default function Home() {
  // Swap State
  const [originChain, setOriginChain] = useState(chains.NEAR)
  const [originAsset, setOriginAsset] = useState(tokens[chains.NEAR]['near'])
  const [originAddress, setOriginAddress] = useState('loading...')
  const [originBalance, setOriginBalance] = useState('0')
  const [originSwapUnits, setOriginSwapUnits] = useState('0')
  const [originSwapDecimal, setOriginSwapDecimal] = useState('0')

  const [dstChain, setDstChain] = useState(chains.ARBITRUM)
  const [dstAsset, setDstAsset] = useState(tokens[chains.ARBITRUM]['arb'])
  const [dstAddress, setDstAddress] = useState('loading...')
  const [dstQuota, setDstQuota] = useState('0')

  const [btnLabel, setBtnLabel] = useState('Swap Tokens')

  // Account control
  const { authenticated } = usePrivy()
  const { walletId, nearAccount } = useNEAR()

  // Debounced amount to throttle quote requests while typing
  const debouncedSwapUnits = useDebouncedValue(originSwapUnits, 600)

  useEffect(() => {
    async function fetchOrigin() {
      const adapter = getAdapter({ chain: originChain })

      const address = await adapter.getAddressControlledBy({
        nearAddress: walletId,
      })

      setOriginAddress(address)

      const balance = await adapter.getBalance({
        address,
        tokenAddress: originAsset.address,
      })

      const formatted = formatNumber(
        unitsToDecimal(balance, originAsset.decimals)
      )
      setOriginBalance(formatted.toString())
    }

    if (authenticated && walletId) fetchOrigin()
    setOriginAddress('loading...')
    setOriginBalance('loading...')
  }, [authenticated, originChain, walletId, originAsset])

  useEffect(() => {
    async function fetchDstAddress() {
      const adapter = getAdapter({ chain: dstChain })
      const address = await adapter.getAddressControlledBy({
        nearAddress: walletId,
      })
      setDstAddress(address)
    }

    if (authenticated && walletId) fetchDstAddress()
    setDstAddress('loading...')
  }, [authenticated, dstChain, walletId])

  useEffect(() => {
    async function fetchQuote() {
      const amount = debouncedSwapUnits
      if (!walletId) return
      if (originAddress === 'loading...' || dstAddress === 'loading...') return
      if (amount === '0') return setDstQuota('0')

      getQuote(
        originAsset.id,
        amount,
        dstAsset.id,
        originAddress,
        dstAddress
      ).then((quote) => setDstQuota(
        unitsToDecimal(quote.quote.amountOut, dstAsset.decimals)
      )).catch(() => { setDstQuota('0') })

      setDstQuota('loading...')
    }

    fetchQuote()
  }, [walletId, originChain, dstChain, originAsset.id, dstAsset.id, originAddress, dstAddress, debouncedSwapUnits])

  const swap = useCallback(async () => {
    if (!originAddress || !dstAddress) return
    setBtnLabel('Swapping...')
    try {
      const quote = await getQuote(
        originAsset.id,
        originSwapUnits,
        dstAsset.id,
        originAddress,
        dstAddress,
        false
      )
      const depositAddress = quote.quote.depositAddress

      const adapter = getAdapter({ chain: originChain })
      const tx = await adapter.transfer({
        from: originAddress,
        to: depositAddress,
        amount: originSwapUnits,
        nearAccount,
        tokenAddress: originAsset.address,
      })
      alert(`Transaction Hash on ${originChain}: ${tx}`)
    } finally {
      setBtnLabel('Swap Tokens')
    }
  }, [
    originAddress,
    dstAddress,
    originAsset,
    originSwapUnits,
    dstAsset,
    originChain,
    nearAccount,
  ])

  const handleAmountChange = useCallback((displayValue) => {
    setOriginSwapDecimal(displayValue);
    setOriginSwapUnits(decimalToUnits(displayValue, originAsset.decimals));
  }, [originAsset]);

  const handleOriginChainChange = (newChain) => {
    // Find current asset symbol on old chain
    const currentSymbol =
      Object.keys(tokens[originChain]).find(
        (sym) => tokens[originChain][sym].id === originAsset.id
      ) || null

    // Determine new asset (keep same symbol if exists, else first available)
    let nextAsset
    if (currentSymbol && tokens[newChain][currentSymbol]) {
      nextAsset = tokens[newChain][currentSymbol]
    } else {
      const firstSymbol = Object.keys(tokens[newChain])[0]
      nextAsset = tokens[newChain][firstSymbol]
    }

    setOriginChain(newChain)
    setOriginAsset(nextAsset)
    setOriginSwapDecimal('0')
    setOriginSwapUnits('0')
    setDstQuota('0') // clear stale quote
  }

  const handleDstChainChange = (newChain) => {
    const currentSymbol =
      Object.keys(tokens[dstChain]).find(
        (sym) => tokens[dstChain][sym].id === dstAsset.id
      ) || null
    let nextAsset
    if (currentSymbol && tokens[newChain][currentSymbol]) {
      nextAsset = tokens[newChain][currentSymbol]
    } else {
      const firstSymbol = Object.keys(tokens[newChain])[0]
      nextAsset = tokens[newChain][firstSymbol]
    }
    setDstChain(newChain)
    setDstAsset(nextAsset)
    setDstQuota('0') // clear stale quote
  }

  const readySwap =
    authenticated &&
    walletId &&
    originAddress !== 'loading...' &&
    dstAddress !== 'loading...' &&
    parseFloat(originSwapDecimal || '0') > 0

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
                  value={originSwapDecimal || ''}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  placeholder="0"
                />
                <select
                  className={styles.inlineSelector}
                  value={originAsset.id}
                  onChange={(e) => setOriginAsset(tokens[originChain][Object.keys(tokens[originChain]).find(key => tokens[originChain][key].id === e.target.value)])}
                >
                  {Object.keys(tokens[originChain]).map((symbol) => (
                    <option
                      key={tokens[originChain][symbol].id}
                      value={tokens[originChain][symbol].id}
                    >
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
                  {Object.keys(tokens).map((chain) => (
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
              {originAddress || 'Connect wallet to see address'}
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
                  value={formatNumber(dstQuota) || '0'}
                  disabled
                  placeholder="0"
                />
                <select
                  className={styles.inlineSelector}
                  value={dstAsset.id}
                  onChange={(e) => setDstAsset(tokens[dstChain][Object.keys(tokens[dstChain]).find(key => tokens[dstChain][key].id === e.target.value)])}
                >
                  {Object.keys(tokens[dstChain]).map((symbol) => (
                    <option
                      key={tokens[dstChain][symbol].id}
                      value={tokens[dstChain][symbol].id}
                    >
                      {symbol.toUpperCase()}
                    </option>
                  ))}
                </select>
                <span className={styles.inlineText}>on</span>
                <select
                  className={styles.inlineSelector}
                  value={dstChain}
                  onChange={(e) => handleDstChainChange(e.target.value)}
                >
                  {Object.keys(tokens).map((chain) => (
                    <option key={chain} value={chain}>
                      {chain.charAt(0).toUpperCase() + chain.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className={styles.accountInfo}>
              {dstAddress || 'Destination address will appear here'}
            </div>
          </div>
        </div>

        <button type="button" onClick={swap} disabled={!readySwap || btnLabel !== 'Swap Tokens'}>
          {btnLabel}
        </button>
      </form>
    </main>
  )
}
