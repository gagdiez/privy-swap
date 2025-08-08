import { utils, transactions, providers } from "near-api-js";
import { sha256 } from "noble/hashes/sha2";
import { base58 } from "@scure/base";
import { toHex } from "viem";

const nodeUrl = "https://rpc.mainnet.near.org";
const provider = new providers.JsonRpcProvider({ url: nodeUrl });
const receiverId = "receiver.near";
const amount = "1.5";
const nonce = 0; // If this is not the wallet's first transaction, set as current nonce
//cme1neps40007jy0b5hyesl0s
//2F7EQKfSREnAdbENgjyW1C8NC9Sr5eXXaLhrfJEt36wFR7fiHPHoFxEixHgSVY1jMqyvUmG2wT7JAuGSgzxdbFq8
const {
  header: { hash },
} = await provider.block({ finality: "final" });
const blockHash = utils.serialize.base_decode(hash);

const accountId = "<wallet's near-implicit address / account ID>";

const base58PublicKey = base58.encode(Buffer.from(accountId, "hex"));
const publicKey = utils.PublicKey.fromString(`ed25519:${base58PublicKey}`);

const amountYocto = utils.format.parseNearAmount(amount);
const actions = [transactions.transfer(BigInt(amountYocto ?? 0))];
const tx = transactions.createTransaction(
  accountId,
  publicKey,
  receiverId,
  nonce,
  actions,
  blockHash
);

const serializedTx = utils.serialize.serialize(
  transactions.SCHEMA.Transaction,
  tx
);

const txHash = toHex(sha256(serializedTx));

const signature = // call Privy's raw sign function with txHash, returns '0x...'

const signedTx = new transactions.SignedTransaction({
  transaction: tx,
  signature: new transactions.Signature({
    keyType: tx.publicKey.keyType,
    data: Buffer.from(signature.slice(2), "hex"),
  }),
});

const signedSerializedTx = signedTx.encode();
const result = await provider.sendJsonRpc("broadcast_tx_commit", [
  Buffer.from(signedSerializedTx).toString("base64"),
]);