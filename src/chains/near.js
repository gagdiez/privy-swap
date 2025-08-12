import { Account } from '@near-js/accounts';
import { Controller } from './controller';
import { FungibleToken, NEAR } from '@near-js/tokens';


export class NEARController extends Controller {
    constructor(publicClient) {
        super();
        this.publicClient = publicClient;
    }

    async getBalance(address, tokenAddress) {
        let balance = 0;
        let token = NEAR;
        const acc = new Account(address, this.publicClient);

        if (tokenAddress){
            token = new FungibleToken(tokenAddress, {})
        }
        
        balance = await acc.getBalance(token);
        console.log("NEARController.getBalance called with address:", address, "and tokenAddress:", token, "resulting in balance:", balance);

        return { balance: balance.toString() };
    }

    async deriveAddressAndPublicKey(predecessor, path = null) {
        return {address: predecessor, publicKey: null};
    }

    /**
     * 
     * @param {string} from 
     * @param {string} to 
     * @param {string} amount 
     * @param {Account} signerAccount 
     * @param {string} tokenAddress 
     * @returns 
     */
    async transfer(from, to, amount, signerAccount, tokenAddress) {
        if ( from !== signerAccount.accountId ) {
            throw new Error("Signer account does not match the from address");
        }

        let token = NEAR;
        if (tokenAddress) token = new FungibleToken(tokenAddress, {});
        
        const tx = await signerAccount.transfer({
            receiverId: to,
            amount: amount,
            token: token
        });
        console.log(tx.transaction);
        return tx.transaction.hash.toString();
    }
}