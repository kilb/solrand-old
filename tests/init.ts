import * as anchor from '@project-serum/anchor';
import { Program } from '@project-serum/anchor';
import { Solpat } from '../target/types/solpat';
import { TOKEN_PROGRAM_ID, Token } from '@solana/spl-token';
// import { NodeWallet } from '@project-serum/anchor/dist/cjs/provider';
import { PublicKey, SystemProgram, Transaction, Connection, Commitment, clusterApiUrl} from '@solana/web3.js';

const assert = require("assert");


  // const commitment: Commitment = 'processed';
  // const connection = new Connection('https://rpc-mainnet-fork.dappio.xyz', { commitment, wsEndpoint: 'wss://rpc-mainnet-fork.dappio.xyz/ws' });
const connection = new Connection(clusterApiUrl("devnet"));
const program = anchor.workspace.Solpat as Program<Solpat>;
const wallet = program.provider.wallet;
const options = anchor.Provider.defaultOptions();
const provider = new anchor.Provider(connection, wallet, options);

const priceFeedAccount = "FmAmfoyPXiA8Vhhe6MZTr3U6rZfEZ1ctEHay1ysqCqcf";
const AggregatorPublicKey = new PublicKey(priceFeedAccount);

// Configure the client to use the local cluster.
// const provider = anchor.Provider.env();
anchor.setProvider(provider);
// anchor.setProvider(anchor.Provider.env());

// let myMint = null as Token;
// let pool_account_pda = null as PublicKey;
// let token_user = null as PublicKey;
const admin = anchor.web3.Keypair.generate();
// const user = anchor.web3.Keypair.generate();
let myMint = Token.createMint(
  provider.connection,
  admin,
  wallet.publicKey,
  null,
  0,
  TOKEN_PROGRAM_ID
);

// let token_user = myMint.createAccount(wallet.publicKey);
// myMint.mintTo(
//   token_user,
//   admin.publicKey,
//   [admin],
//   1000000000
// );
