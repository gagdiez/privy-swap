import { contracts } from 'chainsig.js';

const SIGNET_CONTRACT = new contracts.ChainSignatureContract({
  networkId: "mainnet",
  contractId: "v1.signer",
  fallbackRpcUrls: ['https://free.rpc.fastnear.com'],
});

export class Controller {
  constructor() { 
    this.signetContract = SIGNET_CONTRACT;
  }
}