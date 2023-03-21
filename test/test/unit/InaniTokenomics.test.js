const { assert, expect } = require("chai")
const { network, deployments, ethers } = require("hardhat")
const { developmentChains } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("InaniTokenomics", function () {
          const maxSupply = ethers.utils.parseEther("1000000000")
          let deployer, user1, user2, user3
          let inani,
              inaniTokenomics,
              inaniTokenomicsUser1,
              inaniTokenomicsUser2,
              inaniTokenomicsUser3
          let weth,
              usdt,
              matic,
              wethUsdPriceFeed,
              usdtUsdPriceFeed,
              maticUsdPriceFeed,
              wethUser2,
              maticUser3
          beforeEach(async () => {
              const accounts = await ethers.getSigners()
              deployer = accounts[0]
              user1 = accounts[1]
              user2 = accounts[2]
              user3 = accounts[3]
              await deployments.fixture(["all"])
              inani = await ethers.getContract("Inani")
              inaniTokenomics = await ethers.getContract("InaniTokenomics")
              inaniTokenomicsUser1 = inaniTokenomics.connect(user1)
              inaniTokenomicsUser2 = inaniTokenomics.connect(user2)
              inaniTokenomicsUser3 = inaniTokenomics.connect(user3)
              weth = await ethers.getContract("WrappedEther")
              wethUser2 = weth.connect(user2)
              usdt = await ethers.getContract("Tether")
              matic = await ethers.getContract("Matic")
              maticUser3 = matic.connect(user3)
              wethUsdPriceFeed = await ethers.getContract("WethToUsdPriceFeed")
              usdtUsdPriceFeed = await ethers.getContract("UsdtToUsdPriceFeed")
              maticUsdPriceFeed = await ethers.getContract("MaticToUsdPriceFeed")
          })

          describe("whitelistForPrivateSale", function () {
              it("whitelist the investor for private sale", async () => {
                  await inaniTokenomics.whitelistForPrivateSale(user1.address)
                  const isWhitelisted = await inaniTokenomics.isWhitelistedForPrivateSale(
                      user1.address
                  )
                  assert.equal(isWhitelisted, true)
              })
          })
          describe("startPrivateSale", function () {
              it("starts the private sale", async () => {
                  // first the INA tokens to be minted to InaniTokenomics contract by deployer
                  const inaTokensToMint = await inaniTokenomics.getTokensToSellInPrivateSale()
                  await inani.mint(inaniTokenomics.address, inaTokensToMint)
                  const getInaBalance = await inani.balanceOf(inaniTokenomics.address)
                  assert.equal(getInaBalance.toString(), inaTokensToMint.toString())
                  await inaniTokenomics.startPrivateSale()
                  const isPrivateSaleRunning = await inaniTokenomics.getPrivateSaleStatus()
                  assert.equal(isPrivateSaleRunning, true)
              })
          })
          describe("buyTokenPrivateSale", function () {
              it("buy INA token by whitelisted investors", async () => {
                  // whitelist investors
                  await inaniTokenomics.whitelistForPrivateSale(user2.address)
                  await inaniTokenomics.whitelistForPrivateSale(user3.address)
                  // mint some weth to user2 to buy INA tokens
                  const wethToMint = ethers.utils.parseEther("5")
                  await weth.mint(user2.address, wethToMint)
                  // mint some matic to user3 to buy INA tokens
                  const maticToMint = ethers.utils.parseEther("5000")
                  await matic.mint(user3.address, maticToMint)
                  // mint INA tokens to InaniTokenomics before start of private sale
                  const inaTokensToMint = await inaniTokenomics.getTokensToSellInPrivateSale()
                  await inani.mint(inaniTokenomics.address, inaTokensToMint)
                  // start private sale
                  await inaniTokenomics.startPrivateSale()
                  // get INA tokens balance for InaniTokenomics before buy
                  const balanceInaBefore = await inani.balanceOf(inaniTokenomics.address)
                  // approve InaniTokenomics the allowance for WETH and MATIC by user2 and user3
                  await wethUser2.approve(inaniTokenomics.address, wethToMint)
                  await maticUser3.approve(inaniTokenomics.address, maticToMint)
                  // buy INA tokens using WETH by user2
                  await inaniTokenomicsUser2.buyTokenPrivateSale("WETH", wethToMint)
                  // buy INA tokens using MATIC by user3
                  await inaniTokenomicsUser3.buyTokenPrivateSale("MATIC", maticToMint)
                  // get INA tokens balance for InaniTokenomics after buy
                  const balanceInaAfter = await inani.balanceOf(inaniTokenomics.address)
                  // get INA tokens balance for user1 and user2
                  const balanceInaUser2 = await inani.balanceOf(user2.address)
                  const balanceInaUser3 = await inani.balanceOf(user3.address)
                  assert.equal(
                      balanceInaBefore.sub(balanceInaAfter).toString(),
                      balanceInaUser2.add(balanceInaUser3).toString()
                  )
              })
          })
      })
