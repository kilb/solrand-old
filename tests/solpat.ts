import * as anchor from '@project-serum/anchor';
import { Program } from '@project-serum/anchor';
import { Solpat } from '../target/types/solpat';
import { TOKEN_PROGRAM_ID, Token } from '@solana/spl-token';
import { NodeWallet } from '@project-serum/anchor/dist/cjs/provider';
import { PublicKey, SystemProgram, Transaction, Connection, Commitment } from '@solana/web3.js';

function toBeBytesU64( x ){
  var bytes = [];
  var i = 8;
  do {
    bytes[--i] = x & (255);
    x = x>>8;
  } while ( i )
  return bytes;
}

describe('solpat', () => {
  const commitment: Commitment = 'processed';
  const connection = new Connection('https://rpc-mainnet-fork.dappio.xyz', { commitment, wsEndpoint: 'wss://rpc-mainnet-fork.dappio.xyz/ws' });
  const options = anchor.Provider.defaultOptions();
  const wallet = NodeWallet.local();
  const provider = new anchor.Provider(connection, wallet, options);

  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.Provider.env());

  const program = anchor.workspace.Solpat as Program<Solpat>;

  let token_mint = null as Token;
  const admin = anchor.web3.Keypair.generate();
  const user = anchor.web3.Keypair.generate();
  
  await provider.connection.confirmTransaction(
    await provider.connection.requestAirdrop(admin.publicKey, 10000000000),
    "processed"
  );

  await provider.connection.confirmTransaction(
    await provider.connection.requestAirdrop(user.publicKey, 10000000000),
    "processed"
  );

  token_mint = await Token.createMint(
    provider.connection,
    admin,
    admin.publicKey,
    null,
    0,
    TOKEN_PROGRAM_ID
  );
  it('Create Pool', async () => {
    // const seed = Buffer.from(toBeBytesU64(1));
    let pool_id = new anchor.BN(1);
    const [pool_account_pda, _vault_account_bump] = await PublicKey.findProgramAddress(
      [pool_id.toBuffer("be", 8)],
      program.programId
    );
    // Add your test here.
    const tx = await program.rpc.createPool({});
    console.log("Your transaction signature", tx);
  });
});
