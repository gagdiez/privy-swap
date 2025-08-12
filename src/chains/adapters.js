import { createPublicClient, http } from "viem";
import { EVMController } from "./evm";
import { NEARController } from "./near";

import { JsonRpcProvider } from "@near-js/providers";

const EVMClient = (url) => { return createPublicClient({
    transport: http(url)
})};

const Arbitrum = new EVMController(EVMClient('https://arb1.arbitrum.io/rpc'));
const Near = new NEARController(new JsonRpcProvider({url: 'https://free.rpc.fastnear.com'}));

export const getAdapter = (chain) => {
    switch (chain) {
        case 'arbitrum':
            return Arbitrum;
        case 'near':
            return Near;
        default:
            throw new Error(`Unsupported chain: ${chain}`);
    }
}