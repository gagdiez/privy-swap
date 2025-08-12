import { chainAdapters } from 'chainsig.js';
import { getAddress, encodeFunctionData } from 'viem';
import { Controller } from './controller';


// Minimal ERC-20 ABI fragments for balanceOf & transfer
const ERC20_ABI = [
    {
        name: 'balanceOf',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'account', type: 'address' }],
        outputs: [{ name: '', type: 'uint256' }]
    },
    {
        name: 'transfer',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'recipient', type: 'address' },
            { name: 'amount', type: 'uint256' }
        ],
        outputs: [{ name: '', type: 'bool' }]
    }
];

export class EVMController extends Controller {
    constructor(publicClient) {
        super();

        const adapter = new chainAdapters.evm.EVM({
            publicClient,
            contract: this.signetContract,
        });

        this.publicClient = publicClient;
        this.chainAdapter = adapter;
    }

    async getBalance(address, tokenAddress) {
        let balance = 0;
        if (!tokenAddress) {
            balance = await this.publicClient.getBalance({
                address: getAddress(address),
            });
        } else {
            balance = await this.publicClient.readContract({
                address: getAddress(tokenAddress),
                abi: ERC20_ABI,
                functionName: 'balanceOf',
                args: [address],
            });

        }

        // Ensure shape matches existing expectations: { balance: <string> }
        return { balance: balance.toString() };
    }

    async deriveAddressAndPublicKey(predecessor, path) {
        return this.chainAdapter.deriveAddressAndPublicKey(predecessor, path);
    }

    async transfer(from, to, amount, signerAccount, tokenAddress) {
        let txParams;
        to = getAddress(to);
        from = getAddress(from);
        console.log(`Transferring ${amount} from ${from} to ${to} using token ${tokenAddress}`);

        if (tokenAddress) {
            // ERC-20 transfer: call transfer(recipient, amount) on token contract
            const data = encodeFunctionData({
                abi: ERC20_ABI,
                functionName: 'transfer',
                args: [to, BigInt(amount)]
            });
            txParams = {
                account: from,
                from,
                to: getAddress(tokenAddress),
                data,
                value: 0n
            };
            const estimate = await this.publicClient.estimateGas({ account: from, to: getAddress(tokenAddress), data, value: 0n, });
            console.log(`Estimated gas for transfer: ${estimate}`);
        } else {
            // Native transfer
            txParams = {
                account: from,
                from,
                to,
                value: BigInt(amount),
            };
        }

        const { transaction, hashesToSign } = await this.chainAdapter.prepareTransactionForSigning(txParams);

        const rsvSignatures = await this.signetContract.sign({
            payloads: hashesToSign,
            path: "predefined-path",
            keyType: "Ecdsa",
            signerAccount,
        });

        const finalizedTransaction = this.chainAdapter.finalizeTransactionSigning({
            transaction,
            rsvSignatures,
        });

        const transactionHash = await this.chainAdapter.broadcastTx(finalizedTransaction);

        return transactionHash.hash;
    }
}