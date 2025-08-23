import * as anchor from "@coral-xyz/anchor";
import { BN } from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { AmmAnchor } from "../target/types/amm_anchor";
import { PublicKey, Commitment, Keypair, SystemProgram, Connection } from "@solana/web3.js";
import { 
  ASSOCIATED_TOKEN_PROGRAM_ID as associatedTokenProgram, 
  TOKEN_PROGRAM_ID as tokenProgram, 
  createMint, 
  mintTo, 
  getAssociatedTokenAddress, 
  getOrCreateAssociatedTokenAccount 
} from "@solana/spl-token";
import { randomBytes } from "crypto";
import { assert } from "chai";

const commitment: Commitment = "confirmed";

describe("amm-anchor", () => {
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.AmmAnchor as Program<AmmAnchor>;
  const provider = anchor.getProvider();
  const connection = provider.connection;

  const [admin, user] = [new Keypair(), new Keypair()];
  const seed = new BN(randomBytes(8));
  const fee = 300;
  const DECIMALS = 6;

  const config = PublicKey.findProgramAddressSync(
    [Buffer.from("config"), seed.toArrayLike(Buffer, "le", 8)], 
    program.programId
  )[0];

  let mint_x: PublicKey;
  let mint_y: PublicKey;
  let mint_lp = PublicKey.findProgramAddressSync(
    [Buffer.from("lp"), config.toBuffer()],
    program.programId
  )[0];

  let vault_x: PublicKey;
  let vault_y: PublicKey;
  let user_x: PublicKey;
  let user_y: PublicKey;
  let user_lp: PublicKey;

  before("Setup accounts and mints", async () => {
    await Promise.all([admin, user].map(async (k) => {
      return await connection.requestAirdrop(k.publicKey, 100 * anchor.web3.LAMPORTS_PER_SOL);
    })).then(confirmTxs);

    mint_x = await createMint(
      connection,
      admin,
      admin.publicKey,
      admin.publicKey,
      DECIMALS
    );

    mint_y = await createMint(
      connection,
      admin,
      admin.publicKey,
      admin.publicKey,
      DECIMALS
    );

    vault_x = await getAssociatedTokenAddress(mint_x, config, true);
    vault_y = await getAssociatedTokenAddress(mint_y, config, true);

    user_x = (await getOrCreateAssociatedTokenAccount(
      connection,
      user,
      mint_x,
      user.publicKey,
      true
    )).address;

    user_y = (await getOrCreateAssociatedTokenAccount(
      connection,
      user,
      mint_y,
      user.publicKey,
      true
    )).address;

    await mintTo(
      connection,
      admin,
      mint_x,
      user_x,
      admin.publicKey,
      1000 * 10 ** DECIMALS
    );

    await mintTo(
      connection,
      admin,
      mint_y,
      user_y,
      admin.publicKey,
      1000 * 10 ** DECIMALS
    );
  });

  let listenerIds: number[] = [];
  before("Setup event listeners", () => {
    console.log("Event listeners setup - events will be logged if emitted by the program");
  });

  it("Initialize AMM pool", async () => {
    const tx = await program.methods
      .initialize(seed, fee, admin.publicKey)
      .accountsStrict({
        admin: admin.publicKey,
        mintX: mint_x,
        mintY: mint_y,
        mintLp: mint_lp,
        vaultX: vault_x,
        vaultY: vault_y,
        config: config,
        tokenProgram,
        associatedTokenProgram,
        systemProgram: SystemProgram.programId,
      })
      .signers([admin])
      .rpc();

    console.log("Initialize transaction signature:", tx);

    const configAccount = await program.account.config.fetch(config);
    assert.equal(configAccount.fee, fee);
    assert.equal(configAccount.locked, false);
    assert.equal(configAccount.mintX.toString(), mint_x.toString());
    assert.equal(configAccount.mintY.toString(), mint_y.toString());
  });

  it("Deposit liquidity to pool", async () => {
    user_lp = (await getOrCreateAssociatedTokenAccount(
      connection,
      user,
      mint_lp,
      user.publicKey,
      true
    )).address;

    const depositAmount = new BN(100 * 10 ** DECIMALS);
    const maxX = new BN(50 * 10 ** DECIMALS);
    const maxY = new BN(50 * 10 ** DECIMALS);

    const tx = await program.methods
      .deposit(depositAmount, maxX, maxY)
      .accountsStrict({
        user: user.publicKey,
        mintX: mint_x,
        mintY: mint_y,
        config: config,
        mintLp: mint_lp,
        vaultX: vault_x,
        vaultY: vault_y,
        userX: user_x,
        userY: user_y,
        userLp: user_lp,
        tokenProgram,
        associatedTokenProgram,
        systemProgram: SystemProgram.programId,
      })
      .signers([user])
      .rpc();

    console.log("Deposit transaction signature:", tx);

    const userLpBalance = await connection.getTokenAccountBalance(user_lp);
    assert.ok(parseInt(userLpBalance.value.amount) > 0);
  });

  it("Swap token X for Y", async () => {
    const swapAmount = new BN(5 * 10 ** DECIMALS);
    const minOut = new BN(1 * 10 ** DECIMALS);

    const userXBalanceBefore = await connection.getTokenAccountBalance(user_x);
    const userYBalanceBefore = await connection.getTokenAccountBalance(user_y);

    console.log("Before swap - X:", userXBalanceBefore.value.amount, "Y:", userYBalanceBefore.value.amount);

    const tx = await program.methods
      .swap(true, swapAmount, minOut)
      .accountsStrict({
        user: user.publicKey,
        mintX: mint_x,
        mintY: mint_y,
        config: config,
        mintLp: mint_lp,
        vaultX: vault_x,
        vaultY: vault_y,
        userX: user_x,
        userY: user_y,
        tokenProgram,
        associatedTokenProgram,
        systemProgram: SystemProgram.programId,
      })
      .signers([user])
      .rpc();

    console.log("Swap X for Y transaction signature:", tx);

    const userXBalanceAfter = await connection.getTokenAccountBalance(user_x);
    const userYBalanceAfter = await connection.getTokenAccountBalance(user_y);

    assert.ok(parseInt(userXBalanceAfter.value.amount) < parseInt(userXBalanceBefore.value.amount), "X balance should decrease");
    assert.ok(parseInt(userYBalanceAfter.value.amount) > parseInt(userYBalanceBefore.value.amount), "Y balance should increase");
  });

  it("Swap token Y for X", async () => {
    const swapAmount = new BN(3 * 10 ** DECIMALS);
    const minOut = new BN(1 * 10 ** DECIMALS);

    const userXBalanceBefore = await connection.getTokenAccountBalance(user_x);
    const userYBalanceBefore = await connection.getTokenAccountBalance(user_y);

    console.log("Before swap - X:", userXBalanceBefore.value.amount, "Y:", userYBalanceBefore.value.amount);

    const tx = await program.methods
      .swap(false, swapAmount, minOut)
      .accountsStrict({
        user: user.publicKey,
        mintX: mint_x,
        mintY: mint_y,
        config: config,
        mintLp: mint_lp,
        vaultX: vault_x,
        vaultY: vault_y,
        userX: user_x,
        userY: user_y,
        tokenProgram,
        associatedTokenProgram,
        systemProgram: SystemProgram.programId,
      })
      .signers([user])
      .rpc();

    console.log("Swap Y for X transaction signature:", tx);

    const userXBalanceAfter = await connection.getTokenAccountBalance(user_x);
    const userYBalanceAfter = await connection.getTokenAccountBalance(user_y);

    assert.ok(parseInt(userXBalanceAfter.value.amount) > parseInt(userXBalanceBefore.value.amount), "X balance should increase");
    assert.ok(parseInt(userYBalanceAfter.value.amount) < parseInt(userYBalanceBefore.value.amount), "Y balance should decrease");
  });

  it("Lock pool (admin only)", async () => {
    const tx = await program.methods
      .lock()
      .accountsStrict({
        user: admin.publicKey,
        config: config,
      })
      .signers([admin])
      .rpc();

    console.log("Lock pool transaction signature:", tx);

    const configAccount = await program.account.config.fetch(config);
    assert.equal(configAccount.locked, true);
  });

  it("Unlock pool (admin only)", async () => {
    const tx = await program.methods
      .unlock()
      .accountsStrict({
        user: admin.publicKey,
        config: config,
      })
      .signers([admin])
      .rpc();

    console.log("Unlock pool transaction signature:", tx);

    const configAccount = await program.account.config.fetch(config);
    assert.equal(configAccount.locked, false);
  });

  it("Withdraw liquidity from pool", async () => {
    const userLpBalanceBefore = await connection.getTokenAccountBalance(user_lp);
    const withdrawAmount = new BN(parseInt(userLpBalanceBefore.value.amount) / 2);
    const minX = new BN(1 * 10 ** DECIMALS);
    const minY = new BN(1 * 10 ** DECIMALS);

    const userXBalanceBefore = await connection.getTokenAccountBalance(user_x);
    const userYBalanceBefore = await connection.getTokenAccountBalance(user_y);

    const tx = await program.methods
      .withdraw(withdrawAmount, minX, minY)
      .accountsStrict({
        user: user.publicKey,
        mintX: mint_x,
        mintY: mint_y,
        config: config,
        mintLp: mint_lp,
        vaultX: vault_x,
        vaultY: vault_y,
        userX: user_x,
        userY: user_y,
        userLp: user_lp,
        tokenProgram,
        associatedTokenProgram,
        systemProgram: SystemProgram.programId,
      })
      .signers([user])
      .rpc();

    console.log("Withdraw transaction signature:", tx);

    const userLpBalanceAfter = await connection.getTokenAccountBalance(user_lp);
    const userXBalanceAfter = await connection.getTokenAccountBalance(user_x);
    const userYBalanceAfter = await connection.getTokenAccountBalance(user_y);

    assert.ok(parseInt(userLpBalanceAfter.value.amount) < parseInt(userLpBalanceBefore.value.amount));
    assert.ok(parseInt(userXBalanceAfter.value.amount) > parseInt(userXBalanceBefore.value.amount));
    assert.ok(parseInt(userYBalanceAfter.value.amount) > parseInt(userYBalanceBefore.value.amount));
  });

  it("Should fail when non-admin tries to lock pool", async () => {
    try {
      await program.methods
        .lock()
        .accountsStrict({
          user: user.publicKey,
          config: config,
        })
        .signers([user])
        .rpc();
      
      assert.fail("Expected transaction to fail");
    } catch (error) {
      assert.ok(error.toString().includes("InvalidAuthority") || error.toString().includes("ConstraintSeeds"));
    }
  });

  it("Should fail when trying to deposit to locked pool", async () => {
    await program.methods
      .lock()
      .accountsStrict({
        user: admin.publicKey,
        config: config,
      })
      .signers([admin])
      .rpc();

    try {
      await program.methods
        .deposit(new BN(10 * 10 ** DECIMALS), new BN(5 * 10 ** DECIMALS), new BN(5 * 10 ** DECIMALS))
        .accountsStrict({
          user: user.publicKey,
          mintX: mint_x,
          mintY: mint_y,
          config: config,
          mintLp: mint_lp,
          vaultX: vault_x,
          vaultY: vault_y,
          userX: user_x,
          userY: user_y,
          userLp: user_lp,
          tokenProgram,
          associatedTokenProgram,
          systemProgram: SystemProgram.programId,
        })
        .signers([user])
        .rpc();
      
      assert.fail("Expected transaction to fail");
    } catch (error) {
      assert.ok(error.toString().includes("PoolLocked"));
    }

    await program.methods
      .unlock()
      .accountsStrict({
        user: admin.publicKey,
        config: config,
      })
      .signers([admin])
      .rpc();
  });

  it("Should fail when trying to swap with locked pool", async () => {
    await program.methods
      .lock()
      .accountsStrict({
        user: admin.publicKey,
        config: config,
      })
      .signers([admin])
      .rpc();

    try {
      await program.methods
        .swap(true, new BN(1 * 10 ** DECIMALS), new BN(1))
        .accountsStrict({
          user: user.publicKey,
          mintX: mint_x,
          mintY: mint_y,
          config: config,
          mintLp: mint_lp,
          vaultX: vault_x,
          vaultY: vault_y,
          userX: user_x,
          userY: user_y,
          tokenProgram,
          associatedTokenProgram,
          systemProgram: SystemProgram.programId,
        })
        .signers([user])
        .rpc();
      
      assert.fail("Expected transaction to fail");
    } catch (error) {
      assert.ok(error.toString().includes("PoolLocked"));
    }

    await program.methods
      .unlock()
      .accountsStrict({
        user: admin.publicKey,
        config: config,
      })
      .signers([admin])
      .rpc();
  });

  it("Should fail when trying to withdraw from locked pool", async () => {
    await program.methods
      .lock()
      .accountsStrict({
        user: admin.publicKey,
        config: config,
      })
      .signers([admin])
      .rpc();

    try {
      await program.methods
        .withdraw(new BN(1 * 10 ** DECIMALS), new BN(1), new BN(1))
        .accountsStrict({
          user: user.publicKey,
          mintX: mint_x,
          mintY: mint_y,
          config: config,
          mintLp: mint_lp,
          vaultX: vault_x,
          vaultY: vault_y,
          userX: user_x,
          userY: user_y,
          userLp: user_lp,
          tokenProgram,
          associatedTokenProgram,
          systemProgram: SystemProgram.programId,
        })
        .signers([user])
        .rpc();
      
      assert.fail("Expected transaction to fail");
    } catch (error) {
      assert.ok(error.toString().includes("PoolLocked"));
    }

    await program.methods
      .unlock()
      .accountsStrict({
        user: admin.publicKey,
        config: config,
      })
      .signers([admin])
      .rpc();
  });

  after("Cleanup event listeners", async () => {
    for (const id of listenerIds) {
      await program.removeEventListener(id);
    }
  });
});

const confirmTx = async (signature: string) => {
  const latestBlockhash = await anchor.getProvider().connection.getLatestBlockhash();
  await anchor.getProvider().connection.confirmTransaction(
    {
      signature,
      ...latestBlockhash,
    },
    commitment
  );
};

const confirmTxs = async (signatures: string[]) => {
  await Promise.all(signatures.map(confirmTx));
};