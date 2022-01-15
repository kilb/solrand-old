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
  let pool_account_pda = null as PublicKey;
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
    const [_pool_account_pda, _pool_account_bump] = await PublicKey.findProgramAddress(
      [pool_id.toBuffer("be", 8)],
      program.programId
    );

    pool_account_pda = _pool_account_pda;
    // Add your test here.
    const tx = await program.rpc.createPool(
      pool_id,
      new anchor.BN(0), // duration: 0s 
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
    assert.ok(
      poolAccount.nextRound.toNumber() == 2
    );
  });

  it('start round', async () => {
    let poolAccount2 = await program.account.pool.fetch(pool_account_pda);
    assert.ok(
      poolAccount2.nextRound.toNumber() == 2
    );

    const [next_round_pda, _next_round_bump] = await PublicKey.findProgramAddress(
      [Buffer.from(anchor.utils.bytes.utf8.encode("round")), pool_account_pda.toBuffer(), poolAccount2.nextRound.toBuffer("be", 8)],
      program.programId
    );

    const [token_vault_pda, _token_vault_bump] = await PublicKey.findProgramAddress(
      [Buffer.from(anchor.utils.bytes.utf8.encode("token")), next_round_pda.toBuffer()],
      program.programId
    );
    // Add your test here.
    const tx = await program.rpc.startRound(
      {
        accounts: {
          authority: wallet.publicKey,
          pool: pool_account_pda,
          tokenVault: token_vault_pda,
          nextRound: next_round_pda,
          systemProgram: anchor.web3.SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          tokenMint: myMint.publicKey,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
        }
      });
    console.log("Your transaction signature", tx);
    let roundAccount = await program.account.round.fetch(next_round_pda);
    assert.ok(
      roundAccount.bonus.toNumber() == 0
    );
  });

  it('lock round', async () => {
    let poolAccount2 = await program.account.pool.fetch(pool_account_pda);
    assert.ok(
      poolAccount2.nextRound.toNumber() == 3
    );

    const [cur_round_pda, _cur_round_bump] = await PublicKey.findProgramAddress(
      [Buffer.from(anchor.utils.bytes.utf8.encode("round")), pool_account_pda.toBuffer(), poolAccount2.nextRound.subn(1).toBuffer("be", 8)],
      program.programId
    );

    const [next_round_pda, _next_round_bump] = await PublicKey.findProgramAddress(
      [Buffer.from(anchor.utils.bytes.utf8.encode("round")), pool_account_pda.toBuffer(), poolAccount2.nextRound.toBuffer("be", 8)],
      program.programId
    );

    const [token_vault_pda, _token_vault_bump] = await PublicKey.findProgramAddress(
      [Buffer.from(anchor.utils.bytes.utf8.encode("token")), next_round_pda.toBuffer()],
      program.programId
    );
    // Add your test here.
    const tx = await program.rpc.lockRound(
      {
        accounts: {
          authority: wallet.publicKey,
          pool: pool_account_pda,
          tokenVault: token_vault_pda,
          nextRound: next_round_pda,
          curRound: cur_round_pda,
          feedAccount: AggregatorPublicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          tokenMint: myMint.publicKey,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
        }
      });
    console.log("Your transaction signature", tx);
    let roundAccount = await program.account.round.fetch(cur_round_pda);
    assert.ok(
      roundAccount.status == 1
    );
  });

  it('process round', async () => {
    let poolAccount2 = await program.account.pool.fetch(pool_account_pda);
    assert.ok(
      poolAccount2.nextRound.toNumber() == 4
    );

    const [pre_round_pda, _pre_round_bump] = await PublicKey.findProgramAddress(
      [Buffer.from(anchor.utils.bytes.utf8.encode("round")), pool_account_pda.toBuffer(), poolAccount2.nextRound.subn(2).toBuffer("be", 8)],
      program.programId
    );

    const [cur_round_pda, _cur_round_bump] = await PublicKey.findProgramAddress(
      [Buffer.from(anchor.utils.bytes.utf8.encode("round")), pool_account_pda.toBuffer(), poolAccount2.nextRound.subn(1).toBuffer("be", 8)],
      program.programId
    );

    const [next_round_pda, _next_round_bump] = await PublicKey.findProgramAddress(
      [Buffer.from(anchor.utils.bytes.utf8.encode("round")), pool_account_pda.toBuffer(), poolAccount2.nextRound.toBuffer("be", 8)],
      program.programId
    );

    const [token_vault_pda, _token_vault_bump] = await PublicKey.findProgramAddress(
      [Buffer.from(anchor.utils.bytes.utf8.encode("token")), next_round_pda.toBuffer()],
      program.programId
    );
    // Add your test here.
    const tx = await program.rpc.processRound(
      {
        accounts: {
          authority: wallet.publicKey,
          pool: pool_account_pda,
          tokenVault: token_vault_pda,
          nextRound: next_round_pda,
          curRound: cur_round_pda,
          preRound: pre_round_pda,
          feedAccount: AggregatorPublicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          tokenMint: myMint.publicKey,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
        }
      });
    console.log("Your transaction signature", tx);
    let roundAccount = await program.account.round.fetch(next_round_pda);
    assert.ok(
      roundAccount.bonus.toNumber() == 0
    );
  });


});
