/**
 * Utility functions for handling decimal conversions between display and internal representations
 */

/**
 * Convert from internal string representation to decimal display string
 * @param {string} amount - Amount in smallest unit (e.g., wei, satoshi)
 * @param {number} decimals - Number of decimal places
 * @returns {string} - Human readable decimal string
 */
export const fromInternalToDisplay = (amount, decimals) => {
  if (!amount || amount === '0') return '0';
  
  const amountStr = amount.toString();
  const decimalPlaces = Number(decimals);
  
  if (decimalPlaces === 0) return amountStr;
  
  // Pad with zeros if needed
  const paddedAmount = amountStr.padStart(decimalPlaces + 1, '0');
  
  // Insert decimal point
  const integerPart = paddedAmount.slice(0, -decimalPlaces) || '0';
  const fractionalPart = paddedAmount.slice(-decimalPlaces);
  
  // Remove trailing zeros from fractional part
  const trimmedFractional = fractionalPart.replace(/0+$/, '');
  
  if (trimmedFractional === '') {
    return integerPart;
  }
  
  return `${integerPart}.${trimmedFractional}`;
};

/**
 * Convert from decimal display string to internal string representation
 * @param {string} displayAmount - Human readable decimal string
 * @param {number} decimals - Number of decimal places
 * @returns {string} - Amount in smallest unit as string
 */
export const fromDisplayToInternal = (displayAmount, decimals) => {
  if (!displayAmount || displayAmount === '' || displayAmount === '0') return '0';
  
  const decimalPlaces = Number(decimals);
  
  if (decimalPlaces === 0) return displayAmount;
  
  // Split by decimal point
  const [integerPart = '0', fractionalPart = ''] = displayAmount.split('.');
  
  // Pad or truncate fractional part to match decimal places
  const paddedFractional = fractionalPart.padEnd(decimalPlaces, '0').slice(0, decimalPlaces);
  
  // Combine and remove leading zeros
  const result = (integerPart + paddedFractional).replace(/^0+/, '') || '0';
  
  return result;
};

/**
 * Format a display amount for better readability
 * @param {string} displayAmount - Human readable decimal string
 * @param {number} maxDecimals - Maximum decimal places to show
 * @returns {string} - Formatted display string
 */
export const formatDisplayAmount = (displayAmount, maxDecimals = 6) => {
  if (!displayAmount || displayAmount === '0') return '0';
  
  const num = parseFloat(displayAmount);
  if (isNaN(num)) return displayAmount;
  
  // For very small numbers, use scientific notation
  if (num < 0.000001 && num > 0) {
    return num.toExponential(3);
  }
  
  // For regular numbers, limit decimal places
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals
  });
};
