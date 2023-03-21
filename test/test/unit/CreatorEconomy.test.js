const { assert, expect } = require("chai")
const { network, deployments, ethers } = require("hardhat")
const { developmentChains } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("CreatorEconomy", function () {
          let deployer, creator1, creator2, user1
          let inani, creatorEconomy
          beforeEach(async () => {
              const accounts = await ethers.getSigners()
              deployer = accounts[0]
              creator1 = accounts[1]
              creator2 = accounts[2]
              user1 = accounts[3]
              await deployments.fixture(["all"])
              inani = await ethers.getContract("Inani")
              creatorEconomy = await ethers.getContract("CreatorEconomy")
          })

          describe("constructor", function () {
              it("set the INA token contract correctly", async () => {
                  const inaAddress = (await creatorEconomy.getInaTokenAddress()).toString()
                  assert.equal(inaAddress, inani.address.toString())
              })
          })
          describe("addCreator", function () {
              it("creates a new creator token and adds creator to the platform", async () => {
                  // prepare function arguments and mint initial liquidity to creator for testing
                  const initialLiquidityInIna = ethers.utils.parseEther("5000")
                  await inani.mint(creator1.address, initialLiquidityInIna)
                  // approve CreatorEconomy to pull initial liquidity from creator1
                  await inani
                      .connect(creator1)
                      .approve(creatorEconomy.address, initialLiquidityInIna)
                  const creatorTokenName = "CTOKEN"
                  const creatorTokenSymbol = "CTK"
                  await creatorEconomy.addCreator(
                      creator1.address,
                      creatorTokenName,
                      creatorTokenSymbol
                  )
                  // check if creator has been added with its new creator token and token pool
                  const ctkAddress = await creatorEconomy.getCreatorTokenAddress(creator1.address)
                  expect(ctkAddress).to.not.equal(ethers.constants.AddressZero)
              })
          })
          describe("buyCreatorTokens", function () {
              it("user buys creator tokens for given INA tokens", async () => {
                  const initialLiquidityInIna = ethers.utils.parseEther("5000")
                  await inani.mint(creator1.address, initialLiquidityInIna)
                  await inani
                      .connect(creator1)
                      .approve(creatorEconomy.address, initialLiquidityInIna)
                  const creatorTokenName = "CTOKEN"
                  const creatorTokenSymbol = "CTK"
                  await creatorEconomy.addCreator(
                      creator1.address,
                      creatorTokenName,
                      creatorTokenSymbol
                  )
                  const supplyBeforeBuy = await creatorEconomy.getCurrentSupply(creator1.address)
                  // let user1 buy some tokens of creator1
                  const inaTokensToDeposit = ethers.utils.parseEther("500")
                  await inani.mint(user1.address, inaTokensToDeposit)
                  await inani.connect(user1).approve(creatorEconomy.address, inaTokensToDeposit)
                  await creatorEconomy
                      .connect(user1)
                      .buyCreatorTokens(creator1.address, inaTokensToDeposit)
                  const supplyAfterBuy = await creatorEconomy.getCurrentSupply(creator1.address)
                  const user1Balance = await creatorEconomy
                      .connect(user1)
                      .getUserBalanceForCreatorToken(creator1.address)
                  assert.equal(
                      supplyAfterBuy.sub(supplyBeforeBuy).toString(),
                      user1Balance.toString()
                  )
              })
          })
          describe("redeemCreatorTokens", function () {
              it("user redeems creator tokens to get INA tokens", async () => {
                  const initialLiquidityInIna = ethers.utils.parseEther("5000")
                  await inani.mint(creator1.address, initialLiquidityInIna)
                  await inani
                      .connect(creator1)
                      .approve(creatorEconomy.address, initialLiquidityInIna)
                  const creatorTokenName = "CTOKEN"
                  const creatorTokenSymbol = "CTK"
                  await creatorEconomy.addCreator(
                      creator1.address,
                      creatorTokenName,
                      creatorTokenSymbol
                  )
                  // let user1 first buy some tokens of creator1
                  const inaTokensToDeposit = ethers.utils.parseEther("500")
                  await inani.mint(user1.address, inaTokensToDeposit)
                  await inani.connect(user1).approve(creatorEconomy.address, inaTokensToDeposit)
                  await creatorEconomy
                      .connect(user1)
                      .buyCreatorTokens(creator1.address, inaTokensToDeposit)
                  const user1Balance = await creatorEconomy
                      .connect(user1)
                      .getUserBalanceForCreatorToken(creator1.address)
                  const tokensToRedeem = user1Balance
                  const supplyBeforeRedeem = await creatorEconomy.getCurrentSupply(creator1.address)
                  // let user1 redeem
                  await creatorEconomy
                      .connect(user1)
                      .redeemCreatorTokens(creator1.address, tokensToRedeem)
                  const supplyAfterRedeem = await creatorEconomy.getCurrentSupply(creator1.address)
                  assert.equal(
                      supplyBeforeRedeem.sub(supplyAfterRedeem).toString(),
                      tokensToRedeem.toString()
                  )
              })
          })
          describe("swapCreatorTokens", function () {
              it("swaps tokens of a creator with another creator's tokens", async () => {
                  // add two creators
                  const initialLiquidityInIna = ethers.utils.parseEther("5000")
                  await inani.mint(creator1.address, initialLiquidityInIna)
                  await inani.mint(creator2.address, initialLiquidityInIna)
                  await inani
                      .connect(creator1)
                      .approve(creatorEconomy.address, initialLiquidityInIna)
                  await inani
                      .connect(creator2)
                      .approve(creatorEconomy.address, initialLiquidityInIna)
                  await creatorEconomy.addCreator(creator1.address, "CTOKEN1", "CTK1")
                  await creatorEconomy.addCreator(creator2.address, "CTOKEN2", "CTK2")
                  // let user1 first buy some tokens of creator1
                  const inaTokensToDeposit = ethers.utils.parseEther("500")
                  await inani.mint(user1.address, inaTokensToDeposit)
                  await inani.connect(user1).approve(creatorEconomy.address, inaTokensToDeposit)
                  await creatorEconomy
                      .connect(user1)
                      .buyCreatorTokens(creator1.address, inaTokensToDeposit)
                  const user1BalanceCtk1Before = await creatorEconomy
                      .connect(user1)
                      .getUserBalanceForCreatorToken(creator1.address)

                  const SwapFromTokensAmount = user1BalanceCtk1Before
                  const supplyCtk1Before = await creatorEconomy.getCurrentSupply(creator1.address)
                  const supplyCtk2Before = await creatorEconomy.getCurrentSupply(creator2.address)
                  // perform swap
                  await creatorEconomy
                      .connect(user1)
                      .swapCreatorTokens(
                          await creatorEconomy.getCreatorTokenAddress(creator1.address),
                          SwapFromTokensAmount,
                          await creatorEconomy.getCreatorTokenAddress(creator2.address)
                      )
                  const supplyCtk1After = await creatorEconomy.getCurrentSupply(creator1.address)
                  const supplyCtk2After = await creatorEconomy.getCurrentSupply(creator2.address)
                  const user1BalanceCtk2After = await creatorEconomy
                      .connect(user1)
                      .getUserBalanceForCreatorToken(creator2.address)
                  assert.equal(
                      supplyCtk1Before.sub(supplyCtk1After).toString(),
                      SwapFromTokensAmount.toString()
                  )
                  assert.equal(
                      supplyCtk2After.sub(supplyCtk2Before).toString(),
                      user1BalanceCtk2After.toString()
                  )
              })
          })
      })
