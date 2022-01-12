import * as anchor from '@project-serum/anchor';
import { Program } from '@project-serum/anchor';
import { Solpat } from '../target/types/solpat';

describe('solpat', () => {

  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.Provider.env());

  const program = anchor.workspace.Solpat as Program<Solpat>;

  it('Is initialized!', async () => {
    // Add your test here.
    const tx = await program.rpc.initialize({});
    console.log("Your transaction signature", tx);
  });
});
