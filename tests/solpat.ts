import * as anchor from '@project-serum/anchor';
import { Program } from '@project-serum/anchor';
import { Solpat } from '../target/types/solpat';
import { TOKEN_PROGRAM_ID, Token } from '@solana/spl-token';
// import { NodeWallet } from '@project-serum/anchor/dist/cjs/provider';
import { PublicKey, SystemProgram, Transaction, Connection, Commitment } from '@solana/web3.js';

const assert = require("assert");

describe('solpat', () => {
  // const commitment: Commitment = 'processed';
  // const connection = new Connection('https://rpc-mainnet-fork.dappio.xyz', { commitment, wsEndpoint: 'wss://rpc-mainnet-fork.dappio.xyz/ws' });
  // const options = anchor.Provider.defaultOptions();
  // const provider = new anchor.Provider(connection, wallet, options);

  const priceFeedAccount = "FmAmfoyPXiA8Vhhe6MZTr3U6rZfEZ1ctEHay1ysqCqcf";
  const AggregatorPublicKey = new PublicKey(priceFeedAccount);

  // Configure the client to use the local cluster.
  const provider = anchor.Provider.env();
  anchor.setProvider(provider);
  // anchor.setProvider(anchor.Provider.env());

  const program = anchor.workspace.Solpat as Program<Solpat>;
  const wallet = program.provider.wallet;

  let myMint = null as Token;
  const admin = anchor.web3.Keypair.generate();
  const user = anchor.web3.Keypair.generate();
  
  it('Create Pool', async () => {
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(admin.publicKey, 10000000000),
      "processed"
    );
  
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(user.publicKey, 10000000000),
      "processed"
    );
  
    myMint = await Token.createMint(
      provider.connection,
      admin,
      admin.publicKey,
      null,
      0,
      TOKEN_PROGRAM_ID
    );

    let pool_id = new anchor.BN(1);
    const [pool_account_pda, _vault_account_bump] = await PublicKey.findProgramAddress(
      [pool_id.toBuffer("be", 8)],
      program.programId
    );
    // Add your test here.
    const tx = await program.rpc.createPool(
      pool_id,
      new anchor.BN(300), // duration: 300s
      new anchor.BN(10), // fee_rate: 10/10000
      {
        accounts: {
          authority: wallet.publicKey,
          pool: pool_account_pda,
          feedAccount: AggregatorPublicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          tokenMint: myMint.publicKey,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
        }
      });
    console.log("Your transaction signature", tx);
    let poolAccount = await program.account.pool.fetch(pool_account_pda);
    assert.ok(
      poolAccount.authority.equals(wallet.publicKey)
    );
  });
});
