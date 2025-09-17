import { chains } from 'multichain.js'

export const tokens = {
  [chains.ARBITRUM]: {
    arb: {
      id: 'nep141:arb-0x912ce59144191c1204e64559fe8253a0e49e6548.omft.near',
      decimals: 18,
      address: '0x912CE59144191C1204E64559Fe8253A0e49E6548',
    },
    eth: {
      id: 'nep141:arb.omft.near',
      decimals: 18,
      address: null,
    },
    usdc: {
      id: 'nep141:arb-0xaf88d065e77c8cc2239327c5edb3a432268e5831.omft.near',
      decimals: 6,
      address: '0xAf88d065e77c8cC2239327C5EDb3A432268e5831',
    },
  },
  // "bitcoin":
  // {
  //     "btc": {
  //         "id": "nep141:btc.omft.near",
  //         "decimals": 8,
  //         "address": null
  //     }
  // },
  [chains.NEAR]: {
    near: {
      id: 'nep141:wrap.near',
      decimals: 24,
      address: null,
    },
    btc: {
      id: 'nep141:nbtc.bridge.near',
      decimals: 8,
      address: 'nbtc.bridge.near',
    },
    eth: {
      id: 'nep141:eth.bridge.near',
      decimals: 18,
      address: 'eth.bridge.near',
    },
    usdc: {
      id: 'nep141:17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1',
      decimals: 6,
      address:
        '17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1',
    },
  },
  // "solana":
  // {
  //     "sol": {
  //         "id": "nep141:sol.omft.near",
  //         "decimals": 9,
  //         "address": null
  //     },
  //     "usdc": {
  //         "id": "nep141:sol-5ce3bf3a31af18be40ba30f721101b4341690186.omft.near",
  //         "decimals": 6,
  //         "address": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
  //     },
  // }
}
