use anchor_lang::prelude::*;
use pyth_client::load_price;
use sha2::{Sha256, Digest};

declare_id!("RRRRRREjgzmDWKC4M9x5YVVRAXvf9RdGPbwgkfsgpsx");

#[program]
pub mod solrand {
    use super::*;
    pub fn create_pool(
        ctx: Context<CreatePool>,
        pool_id: u64,
        duration: i64,
    ) -> ProgramResult {
        let pool = &mut ctx.accounts.pool;
        pool.pool_id = pool_id;
        pool.authority = ctx.accounts.authority.key();
        pool.min_duration = duration;
        pool.length = 0;
        pool.feed_account1 = ctx.accounts.feed_account1.key();
        pool.feed_account2 = ctx.accounts.feed_account2.key();
        pool.feed_account3 = ctx.accounts.feed_account3.key();
        pool.feed_account4 = ctx.accounts.feed_account4.key();
        pool.feed_account5 = ctx.accounts.feed_account5.key();
        pool.feed_account6 = ctx.accounts.feed_account6.key();
        pool.feed_account7 = ctx.accounts.feed_account7.key();
        pool.feed_account8 = ctx.accounts.feed_account8.key();
        Ok(())
    }

    pub fn commit_rand(ctx: Context<CommitRand>, commit: [u8; 32]) -> ProgramResult {
        let now_ts = ctx.accounts.clock.unix_timestamp;
        let new_rand = &mut ctx.accounts.new_rand;
        let pool = &mut ctx.accounts.pool;
        new_rand.commit_time = now_ts;
        new_rand.commit = commit;
        new_rand.status = 0;
        pool.length += 1;
        emit!(DidCommit {
            commit_time: now_ts,
            rand_id: pool.length - 1,
            pool_id: pool.pool_id,
            commit: commit,
        });
        Ok(())
    }

    pub fn load_rand(ctx: Context<LoadRand>, rand_id: u64) -> ProgramResult {
        let now_ts = ctx.accounts.clock.unix_timestamp;
        let slot_hashes = ctx.accounts.slot_hashes.as_slice();
        let pre_slot = slot_hashes[slot_hashes.len() - 4];
        let cur_rand = &mut ctx.accounts.cur_rand;
        cur_rand.load_time = now_ts;
        let price1 = load_price(&ctx.accounts.feed_account1.try_borrow_data()?)
            .unwrap()
            .get_current_price()
            .unwrap()
            .price;
        let price2 = load_price(&ctx.accounts.feed_account2.try_borrow_data()?)
            .unwrap()
            .get_current_price()
            .unwrap()
            .price;
        let price3 = load_price(&ctx.accounts.feed_account3.try_borrow_data()?)
            .unwrap()
            .get_current_price()
            .unwrap()
            .price;
        let price4 = load_price(&ctx.accounts.feed_account4.try_borrow_data()?)
            .unwrap()
            .get_current_price()
            .unwrap()
            .price;
        let price5 = load_price(&ctx.accounts.feed_account5.try_borrow_data()?)
            .unwrap()
            .get_current_price()
            .unwrap()
            .price;
        let price6 = load_price(&ctx.accounts.feed_account6.try_borrow_data()?)
            .unwrap()
            .get_current_price()
            .unwrap()
            .price;
        let price7 = load_price(&ctx.accounts.feed_account7.try_borrow_data()?)
            .unwrap()
            .get_current_price()
            .unwrap()
            .price;
        let price8 = load_price(&ctx.accounts.feed_account8.try_borrow_data()?)
            .unwrap()
            .get_current_price()
            .unwrap()
            .price;
        let mut hasher = Sha256::new();
        hasher.update(price1.to_be_bytes());
        hasher.update(price2.to_be_bytes());
        hasher.update(price3.to_be_bytes());
        hasher.update(price4.to_be_bytes());
        hasher.update(price5.to_be_bytes());
        hasher.update(price6.to_be_bytes());
        hasher.update(price7.to_be_bytes());
        hasher.update(price8.to_be_bytes());
        hasher.update(cur_rand.commit_time.to_be_bytes());
        hasher.update(pre_slot.1);
        hasher.update(pre_slot.0.to_be_bytes());
        cur_rand.seed.copy_from_slice(&hasher.finalize()[..]);
        cur_rand.status = 1;
        emit!(DidLoad {
            rand_id: rand_id,
            load_time: now_ts,
            seed1: price1,
            seed2: price2,
            seed3: price3,
            seed4: price4,
            seed: cur_rand.seed,
        });
        Ok(())
    }

    pub fn reveal_rand(ctx: Context<RevealRand>, rand_id: u64, sec: [u8; 32]) -> ProgramResult {
        let now_ts = ctx.accounts.clock.unix_timestamp;
        let cur_rand = &mut ctx.accounts.cur_rand;
        
        let mut hasher = Sha256::new();
        hasher.update(sec);
        let hash = &hasher.finalize()[0..32];
        if hash != &cur_rand.commit {
            return Err(ProgramError::InvalidInstructionData);
        }
        let mut hasher = Sha256::new();
        hasher.update(sec);
        hasher.update(cur_rand.seed);
        let rand_bytes = &hasher.finalize()[..];
        for i in 0..8 {
            let mut u32_bytes = [0u8; 4];
            u32_bytes.copy_from_slice(&rand_bytes[i*8..]);
            cur_rand.rands[i] = u32::from_be_bytes(u32_bytes);
        }
        cur_rand.status = 2;
        emit!(DidReveal {
            rand_id: rand_id,
            reveal_time: now_ts,
            sec: sec,
            rands: cur_rand.rands,
        });
        Ok(())
    }

    pub fn close_rand(ctx: Context<CloseRand>, rand_id: u64) -> ProgramResult {
        let now_ts = ctx.accounts.clock.unix_timestamp;
        emit!(DidClose {
            rand_id: rand_id,
            close_time: now_ts,
        });
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(pool_id: u64)]
pub struct CreatePool<'info> {
    pub authority: Signer<'info>,
    #[account(
        init,
        seeds = [pool_id.to_be_bytes().as_ref()],
        bump,
        payer = authority,
    )]
    pub pool: Box<Account<'info, Pool>>,
    pub feed_account1: AccountInfo<'info>,
    pub feed_account2: AccountInfo<'info>,
    pub feed_account3: AccountInfo<'info>,
    pub feed_account4: AccountInfo<'info>,
    pub feed_account5: AccountInfo<'info>,
    pub feed_account6: AccountInfo<'info>,
    pub feed_account7: AccountInfo<'info>,
    pub feed_account8: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
    pub clock: Sysvar<'info, Clock>,
}

#[derive(Accounts)]
pub struct CommitRand<'info> {
    pub authority: Signer<'info>,
    #[account(
        mut,
        has_one = authority,
    )]
    pub pool: Account<'info, Pool>,
    #[account(
        init,
        seeds = [b"rand", pool.key().as_ref(), pool.length.to_be_bytes().as_ref()],
        bump,
        payer = authority,
    )]
    pub new_rand: Box<Account<'info, Rand>>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
    pub clock: Sysvar<'info, Clock>,
}


#[derive(Accounts)]
#[instruction(rand_id: u64)]
pub struct LoadRand<'info> {
    pub authority: Signer<'info>,
    #[account(
        has_one = authority,
    )]
    pub pool: Account<'info, Pool>,
    #[account(
        mut,
        seeds = [b"rand", pool.key().as_ref(), rand_id.to_be_bytes().as_ref()],
        bump,
        constraint = cur_rand.commit_time + pool.min_duration <= clock.unix_timestamp,
        constraint = cur_rand.status == 0,
    )]
    pub cur_rand: Box<Account<'info, Rand>>,
    #[account(
        constraint = pool.feed_account1 == feed_account1.key(),
    )]
    pub feed_account1: AccountInfo<'info>,
    #[account(
        constraint = pool.feed_account2 == feed_account2.key(),
    )]
    pub feed_account2: AccountInfo<'info>,
    #[account(
        constraint = pool.feed_account3 == feed_account3.key(),
    )]
    pub feed_account3: AccountInfo<'info>,
    #[account(
        constraint = pool.feed_account4 == feed_account4.key(),
    )]
    pub feed_account4: AccountInfo<'info>,
    #[account(
        constraint = pool.feed_account5 == feed_account5.key(),
    )]
    pub feed_account5: AccountInfo<'info>,
    #[account(
        constraint = pool.feed_account6 == feed_account6.key(),
    )]
    pub feed_account6: AccountInfo<'info>,
    #[account(
        constraint = pool.feed_account7 == feed_account7.key(),
    )]
    pub feed_account7: AccountInfo<'info>,
    #[account(
        constraint = pool.feed_account8 == feed_account8.key(),
    )]
    pub feed_account8: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
    pub slot_hashes: Sysvar<'info, SlotHashes>,
    pub clock: Sysvar<'info, Clock>,
}

#[derive(Accounts)]
#[instruction(rand_id: u64)]
pub struct RevealRand<'info> {
    pub authority: Signer<'info>,
    #[account(
        has_one = authority,
    )]
    pub pool: Account<'info, Pool>,
    #[account(
        mut,
        seeds = [b"round", pool.key().as_ref(), rand_id.to_be_bytes().as_ref()],
        bump,
        constraint = cur_rand.status == 1,
    )]
    pub cur_rand: Account<'info, Rand>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
    pub clock: Sysvar<'info, Clock>,
}

#[derive(Accounts)]
#[instruction(rand_id: u64)]
pub struct CloseRand<'info> {
    pub authority: Signer<'info>,
    #[account(
        has_one = authority,
    )]
    pub pool: Account<'info, Pool>,
    #[account(
        mut,
        seeds = [b"round", pool.key().as_ref(), rand_id.to_be_bytes().as_ref()],
        bump,
        close = authority,
    )]
    pub cur_rand: Account<'info, Rand>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
    pub clock: Sysvar<'info, Clock>,
}

#[account]
#[derive(Default)]
pub struct Pool {
    pub pool_id: u64,
    // Priviledged account.
    pub authority: Pubkey,
    pub min_duration: i64,
    pub length: u64,
    // price feed as random seed
    pub feed_account1: Pubkey,
    // price feed as random seed
    pub feed_account2: Pubkey,
    // price feed as random seed
    pub feed_account3: Pubkey,
    // price feed as random seed
    pub feed_account4: Pubkey,
    // price feed as random seed
    pub feed_account5: Pubkey,
    // price feed as random seed
    pub feed_account6: Pubkey,
    // price feed as random seed
    pub feed_account7: Pubkey,
    // price feed as random seed
    pub feed_account8: Pubkey,
}

#[account]
#[derive(Default)]
pub struct Rand {
    pub commit_time: i64,
    pub load_time: i64,
    pub commit: [u8; 32],
    pub seed: [u8; 32],
    pub rands: [u32; 8],
    // 0: commited, 1: loaded, 2: commited
    pub status: u8,
}

#[event]
pub struct DidCommit {
    commit_time: i64,
    rand_id: u64,
    pool_id: u64,
    commit: [u8; 32]
}

#[event]
pub struct DidLoad {
    rand_id: u64,
    load_time: i64,
    seed1: i64,
    seed2: i64,
    seed3: i64,
    seed4: i64,
    seed: [u8; 32]
}

#[event]
pub struct DidReveal {
    rand_id: u64,
    reveal_time: i64,
    sec: [u8; 32],
    rands: [u32; 8],
}

#[event]
pub struct DidClose {
    rand_id: u64,
    close_time: i64,
}

