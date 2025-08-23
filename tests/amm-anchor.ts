import * as anchor from "@coral-xyz/anchor";
import { BN } from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { AmmAnchor } from "../target/types/amm_anchor";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
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

describe("AMM Tests", () => {

  anchor.setProvider(anchor.AnchorProvider.env());
  const program = anchor.workspace.AmmAnchor as Program<AmmAnchor>;
  const connection = anchor.getProvider().connection;

  const admin = new Keypair();
  const user = new Keypair();
  const seed = new BN(randomBytes(8));
  const fee = 300; 
  const DECIMALS = 6;

  const config = PublicKey.findProgramAddressSync(
    [Buffer.from("config"), seed.toArrayLike(Buffer, "le", 8)], 
    program.programId
  )[0];

  const mint_lp = PublicKey.findProgramAddressSync(
    [Buffer.from("lp"), config.toBuffer()],
    program.programId
  )[0];

  let mint_x: PublicKey;
  let mint_y: PublicKey;
  let vault_x: PublicKey;
  let vault_y: PublicKey;
  let user_x: PublicKey;
  let user_y: PublicKey;
  let user_lp: PublicKey;

  before("Setup", async () => {
    const adminAirdrop = await connection.requestAirdrop(admin.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL);
    const userAirdrop = await connection.requestAirdrop(user.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL);
    
    await connection.confirmTransaction(adminAirdrop);
    await connection.confirmTransaction(userAirdrop);

    mint_x = await createMint(connection, admin, admin.publicKey, admin.publicKey, DECIMALS);
    mint_y = await createMint(connection, admin, admin.publicKey, admin.publicKey, DECIMALS);

    vault_x = await getAssociatedTokenAddress(mint_x, config, true);
    vault_y = await getAssociatedTokenAddress(mint_y, config, true);

    user_x = (await getOrCreateAssociatedTokenAccount(connection, user, mint_x, user.publicKey)).address;
    user_y = (await getOrCreateAssociatedTokenAccount(connection, user, mint_y, user.publicKey)).address;

    await mintTo(connection, admin, mint_x, user_x, admin.publicKey, 1000 * 10 ** DECIMALS);
    await mintTo(connection, admin, mint_y, user_y, admin.publicKey, 1000 * 10 ** DECIMALS);
  });

  it("Initialize pool", async () => {
    await program.methods
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

    const configAccount = await program.account.config.fetch(config);
    assert.equal(configAccount.fee, fee);
    assert.equal(configAccount.locked, false);
  });

  it("Deposit liquidity", async () => {
    user_lp = (await getOrCreateAssociatedTokenAccount(connection, user, mint_lp, user.publicKey)).address;

    const depositAmount = new BN(100 * 10 ** DECIMALS);
    const maxX = new BN(50 * 10 ** DECIMALS);
    const maxY = new BN(50 * 10 ** DECIMALS);

    await program.methods
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

    const userLpBalance = await connection.getTokenAccountBalance(user_lp);
    assert.ok(parseInt(userLpBalance.value.amount) > 0);
  });

  it("Swap X for Y", async () => {
    const swapAmount = new BN(5 * 10 ** DECIMALS);
    const minOut = new BN(1 * 10 ** DECIMALS);

    const userXBefore = await connection.getTokenAccountBalance(user_x);
    const userYBefore = await connection.getTokenAccountBalance(user_y);

    await program.methods
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

    const userXAfter = await connection.getTokenAccountBalance(user_x);
    const userYAfter = await connection.getTokenAccountBalance(user_y);

    assert.ok(parseInt(userXAfter.value.amount) < parseInt(userXBefore.value.amount));
    assert.ok(parseInt(userYAfter.value.amount) > parseInt(userYBefore.value.amount));
  });

  it("Swap Y for X", async () => {
    const swapAmount = new BN(3 * 10 ** DECIMALS);
    const minOut = new BN(1 * 10 ** DECIMALS);

    const userXBefore = await connection.getTokenAccountBalance(user_x);
    const userYBefore = await connection.getTokenAccountBalance(user_y);

    await program.methods
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

    const userXAfter = await connection.getTokenAccountBalance(user_x);
    const userYAfter = await connection.getTokenAccountBalance(user_y);

    assert.ok(parseInt(userXAfter.value.amount) > parseInt(userXBefore.value.amount));
    assert.ok(parseInt(userYAfter.value.amount) < parseInt(userYBefore.value.amount));
  });

  it("Lock and unlock pool", async () => {
    await program.methods
      .lock()
      .accountsStrict({
        user: admin.publicKey,
        config: config,
      })
      .signers([admin])
      .rpc();

    let configAccount = await program.account.config.fetch(config);
    assert.equal(configAccount.locked, true);

    await program.methods
      .unlock()
      .accountsStrict({
        user: admin.publicKey,
        config: config,
      })
      .signers([admin])
      .rpc();

    configAccount = await program.account.config.fetch(config);
    assert.equal(configAccount.locked, false);
  });

  it("Withdraw liquidity", async () => {
    const userLpBefore = await connection.getTokenAccountBalance(user_lp);
    const withdrawAmount = new BN(parseInt(userLpBefore.value.amount) / 2);
    const minX = new BN(1 * 10 ** DECIMALS);
    const minY = new BN(1 * 10 ** DECIMALS);

    const userXBefore = await connection.getTokenAccountBalance(user_x);
    const userYBefore = await connection.getTokenAccountBalance(user_y);

    await program.methods
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

    const userLpAfter = await connection.getTokenAccountBalance(user_lp);
    const userXAfter = await connection.getTokenAccountBalance(user_x);
    const userYAfter = await connection.getTokenAccountBalance(user_y);

    assert.ok(parseInt(userLpAfter.value.amount) < parseInt(userLpBefore.value.amount));
    assert.ok(parseInt(userXAfter.value.amount) > parseInt(userXBefore.value.amount));
    assert.ok(parseInt(userYAfter.value.amount) > parseInt(userYBefore.value.amount));
  });
});