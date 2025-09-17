import { useMemo } from 'react'
import PropTypes from 'prop-types'
import styles from '@/styles/app.module.css'
import { tokens } from '../tokens'
import { formatNumber } from '../utils/decimals'

/**
 * Reusable SwapCard component for both "From" and "To" cards
 * 
 * @param {Object} props
 * @param {string} props.type - Either "from" or "to" 
 * @param {string} props.label - Display label for the card header
 * @param {string} props.chain - Selected chain
 * @param {Object} props.asset - Selected asset object
 * @param {string} props.amount - Amount value to display
 * @param {string} props.address - Wallet address to display
 * @param {string} props.balance - Balance to display (only for "from" type)
 * @param {boolean} props.isAmountDisabled - Whether amount input is disabled
 * @param {Function} props.onAmountChange - Handler for amount changes
 * @param {Function} props.onAssetChange - Handler for asset changes
 * @param {Function} props.onChainChange - Handler for chain changes
 */
export const SwapCard = ({
  type,
  label,
  chain,
  asset,
  amount,
  address,
  balance,
  isAmountDisabled = false,
  onAmountChange,
  onAssetChange,
  onChainChange
}) => {
  const chainTokens = useMemo(() => tokens[chain], [chain])
  const isFromCard = type === 'from'
  
  const handleAssetChange = (e) => {
    const selectedAssetId = e.target.value
    const selectedAsset = chainTokens[
      Object.keys(chainTokens).find(key => chainTokens[key].id === selectedAssetId)
    ]
    onAssetChange(selectedAsset)
  }

  const displayAmount = isFromCard ? amount : formatNumber(amount) || '0'

  return (
    <div className={`${styles.swapCard} ${styles[type]}`}>
      <div className={styles.cardHeader}>
        <span className={styles.cardLabel}>{label}</span>
      </div>
      <div className={styles.cardMain}>
        <div className={styles.inputRow}>
          <input
            className={styles.amountInput}
            type="text"
            value={displayAmount}
            onChange={(e) => onAmountChange?.(e.target.value)}
            disabled={isAmountDisabled}
            placeholder="0"
          />
          <select
            className={styles.inlineSelector}
            value={asset.id}
            onChange={handleAssetChange}
          >
            {Object.keys(chainTokens).map((symbol) => (
              <option
                key={chainTokens[symbol].id}
                value={chainTokens[symbol].id}
              >
                {symbol.toUpperCase()}
              </option>
            ))}
          </select>
          <span className={styles.inlineText}>on</span>
          <select
            className={styles.inlineSelector}
            value={chain}
            onChange={(e) => onChainChange(e.target.value)}
          >
            {Object.keys(tokens).map((chainKey) => (
              <option key={chainKey} value={chainKey}>
                {chainKey.charAt(0).toUpperCase() + chainKey.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>
      {isFromCard && (
        <span className={styles.balanceLabel}>
          Balance: {balance}
        </span>
      )}
      <div className={styles.accountInfo}>
        {address || (isFromCard ? 'Connect wallet to see address' : 'Destination address will appear here')}
      </div>
    </div>
  )
}

SwapCard.propTypes = {
  type: PropTypes.oneOf(['from', 'to']).isRequired,
  label: PropTypes.string.isRequired,
  chain: PropTypes.string.isRequired,
  asset: PropTypes.shape({
    id: PropTypes.string.isRequired,
    decimals: PropTypes.number.isRequired,
    address: PropTypes.string
  }).isRequired,
  amount: PropTypes.string.isRequired,
  address: PropTypes.string,
  balance: PropTypes.string,
  isAmountDisabled: PropTypes.bool,
  onAmountChange: PropTypes.func,
  onAssetChange: PropTypes.func.isRequired,
  onChainChange: PropTypes.func.isRequired
}