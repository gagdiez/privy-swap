import { OpenAPI, QuoteRequest, OneClickService } from '@defuse-protocol/one-click-sdk-typescript'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { getAdapter, chains } from 'multichain.js'
import { usePrivy } from '@privy-io/react-auth'

import styles from '@/styles/app.module.css'
import { useNEAR } from '../context/useNear'
import { tokens } from '../tokens'
import { SwapCard } from '../components/card'
import {
  unitsToDecimal,
  decimalToUnits,
  formatNumber,
} from '../utils/decimals'

// Configuration constants
const API_CONFIG = {
  BASE_URL: 'https://1click.chaindefuser.com',
  SLIPPAGE_TOLERANCE: 100, // 1%
  QUOTE_DEADLINE_HOURS: 1,
  DEBOUNCE_DELAY: 600,
}

const LOADING_STATE = 'loading...'

// Initialize API configuration
OpenAPI.BASE = API_CONFIG.BASE_URL

/**
 * Custom hook for debouncing values to reduce API calls during user input
 * @param {string} value - The value to debounce
 * @param {number} delay - The debounce delay in milliseconds
 * @returns {string} The debounced value
 */
function useDebouncedValue(value, delay = API_CONFIG.DEBOUNCE_DELAY) {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])

  return debounced
}

/**
 * Fetches swap quote from the API
 * @param {string} originAsset - Origin asset ID
 * @param {string} originAmount - Amount to swap in units
 * @param {string} destinationAsset - Destination asset ID
 * @param {string} refundTo - Refund address
 * @param {string} dstAccount - Destination account
 * @param {boolean} dry - Whether this is a dry run (default: true)
 * @returns {Promise<Object>} Quote response
 */
const getQuote = async (
  originAsset,
  originAmount,
  destinationAsset,
  refundTo,
  dstAccount,
  dry = true
) => {
  if (originAsset === destinationAsset) {
    return { quote: { amountOut: 0 } }
  }

  const quoteRequest = {
    dry,
    swapType: QuoteRequest.swapType.EXACT_INPUT,
    slippageTolerance: API_CONFIG.SLIPPAGE_TOLERANCE,
    originAsset,
    depositType: QuoteRequest.depositType.ORIGIN_CHAIN,
    destinationAsset,
    amount: originAmount.toString(),
    refundTo,
    refundType: QuoteRequest.refundType.ORIGIN_CHAIN,
    recipient: dstAccount,
    recipientType: QuoteRequest.recipientType.DESTINATION_CHAIN,
    deadline: new Date(Date.now() + API_CONFIG.QUOTE_DEADLINE_HOURS * 3600 * 1000).toISOString(),
  }

  return OneClickService.getQuote(quoteRequest)
}

/**
 * Home page component for token swapping
 * Handles cross-chain token swaps with real-time quotes
 */
export default function Home() {
  // Origin chain state
  const [originChain, setOriginChain] = useState(chains.NEAR)
  const [originAsset, setOriginAsset] = useState(tokens[chains.NEAR]['near'])
  const [originAddress, setOriginAddress] = useState(LOADING_STATE)
  const [originBalance, setOriginBalance] = useState('0')
  const [originSwapUnits, setOriginSwapUnits] = useState('0')
  const [originSwapDecimal, setOriginSwapDecimal] = useState('0')

  // Destination chain state
  const [dstChain, setDstChain] = useState(chains.ARBITRUM)
  const [dstAsset, setDstAsset] = useState(tokens[chains.ARBITRUM]['arb'])
  const [dstAddress, setDstAddress] = useState(LOADING_STATE)
  const [dstQuota, setDstQuota] = useState('0')

  // UI state
  const [btnLabel, setBtnLabel] = useState('Swap Tokens')

  // Authentication context
  const { authenticated } = usePrivy()
  const { walletId, nearAccount } = useNEAR()

  // Debounced amount to throttle quote requests while typing
  const debouncedSwapUnits = useDebouncedValue(originSwapUnits)

  // Fetch origin chain address and balance
  useEffect(() => {
    if (!authenticated || !walletId) {
      setOriginAddress(LOADING_STATE)
      setOriginBalance(LOADING_STATE)
      return
    }

    async function fetchOriginData() {
      try {
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
      } catch (error) {
        console.error('Failed to fetch origin data:', error)
      }
    }

    setOriginAddress(LOADING_STATE)
    setOriginBalance(LOADING_STATE)
    fetchOriginData()
  }, [authenticated, originChain, walletId, originAsset])

  // Fetch destination chain address
  useEffect(() => {
    if (!authenticated || !walletId) {
      setDstAddress(LOADING_STATE)
      return
    }

    async function fetchDstAddress() {
      try {
        const adapter = getAdapter({ chain: dstChain })
        const address = await adapter.getAddressControlledBy({
          nearAddress: walletId,
        })

        setDstAddress(address)
      } catch (error) {
        console.error('Failed to fetch destination address:', error)
      }
    }

    setDstAddress(LOADING_STATE)
    fetchDstAddress()
  }, [authenticated, dstChain, walletId])

  // Fetch quote when swap parameters change
  useEffect(() => {
    if (!walletId ||
      originAddress === LOADING_STATE ||
      dstAddress === LOADING_STATE ||
      debouncedSwapUnits === '0') {
      if (debouncedSwapUnits === '0') {
        setDstQuota('0')
      }
      return
    }

    async function fetchQuote() {
      try {
        setDstQuota(LOADING_STATE)

        const quote = await getQuote(
          originAsset.id,
          debouncedSwapUnits,
          dstAsset.id,
          originAddress,
          dstAddress
        )

        setDstQuota(
          unitsToDecimal(quote.quote.amountOut, dstAsset.decimals)
        )
      } catch (error) {
        console.error('Failed to fetch quote:', error)
        setDstQuota('0')
      }
    }

    fetchQuote()
  }, [walletId, originAsset.id, dstAsset.id, originAddress, dstAddress, debouncedSwapUnits])

  // Handle swap execution
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
    } catch (error) {
      console.error('Swap failed:', error)
      alert('Swap failed. Please try again.')
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

  // Handle amount input changes
  const handleAmountChange = useCallback((displayValue) => {
    setOriginSwapDecimal(displayValue)
    setOriginSwapUnits(decimalToUnits(displayValue, originAsset.decimals))
  }, [originAsset.decimals])

  // Handle origin chain selection
  const handleOriginChainChange = useCallback((newChain) => {
    // Find current asset symbol on old chain
    const currentSymbol = Object.keys(tokens[originChain]).find(
      (sym) => tokens[originChain][sym].id === originAsset.id
    )

    // Determine new asset (keep same symbol if exists, else first available)
    const nextAsset = currentSymbol && tokens[newChain]?.[currentSymbol]
      ? tokens[newChain][currentSymbol]
      : tokens[newChain][Object.keys(tokens[newChain])[0]]

    setOriginChain(newChain)
    setOriginAsset(nextAsset)
    setOriginSwapDecimal('0')
    setOriginSwapUnits('0')
    setDstQuota('0') // Clear stale quote
  }, [originChain, originAsset.id])

  // Handle destination chain selection  
  const handleDstChainChange = useCallback((newChain) => {
    const currentSymbol = Object.keys(tokens[dstChain]).find(
      (sym) => tokens[dstChain][sym].id === dstAsset.id
    )

    const nextAsset = currentSymbol && tokens[newChain]?.[currentSymbol]
      ? tokens[newChain][currentSymbol]
      : tokens[newChain][Object.keys(tokens[newChain])[0]]

    setDstChain(newChain)
    setDstAsset(nextAsset)
    setDstQuota('0') // Clear stale quote
  }, [dstChain, dstAsset.id])

  // Memoize swap readiness check
  const isSwapReady = useMemo(() => (
    authenticated &&
    walletId &&
    originAddress !== LOADING_STATE &&
    dstAddress !== LOADING_STATE &&
    parseFloat(originSwapDecimal || '0') > 0
  ), [authenticated, walletId, originAddress, dstAddress, originSwapDecimal])

  return (
    <main className={styles.main}>
      {!walletId && <p>Please log in and connect your NEAR wallet to start swapping tokens.</p>}

      {walletId && <>

        <form className={styles.form}>

          <div className={styles.swapContainer}>

            <SwapCard
              type="from"
              label="From"
              chain={originChain}
              asset={originAsset}
              amount={originSwapDecimal || ''}
              address={originAddress}
              balance={originBalance}
              onAmountChange={handleAmountChange}
              onAssetChange={setOriginAsset}
              onChainChange={handleOriginChainChange}
            />

            <SwapCard
              type="to"
              label="To"
              chain={dstChain}
              asset={dstAsset}
              amount={dstQuota}
              address={dstAddress}
              isAmountDisabled={true}
              onAssetChange={setDstAsset}
              onChainChange={handleDstChainChange}
            />
          </div>

          <button
            type="button"
            onClick={swap}
            disabled={!isSwapReady || btnLabel !== 'Swap Tokens'}
          >
            {btnLabel}
          </button>
        </form>
      </>}
    </main>
  )
}
