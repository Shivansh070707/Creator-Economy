const { assert, expect } = require("chai")
const { network, deployments, ethers } = require("hardhat")
const { developmentChains } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Inani", function () {
          const maxSupply = ethers.utils.parseEther("1000000000")
          let inani
          let deployer
          beforeEach(async () => {
              // const accounts = await ethers.getSigners()
              // deployer = accounts[0]
              deployer = (await getNamedAccounts()).deployer
              await deployments.fixture(["all"])
              inani = await ethers.getContract("Inani", deployer)
          })

          describe("constructor", function () {
              it("sets the token name, symbol and maxSupply correctly", async () => {
                  const name = await inani.name()
                  const symbol = await inani.symbol()
                  const maxSupplyIna = await inani.getMaxSupply()
                  assert.equal(name, "INANI")
                  assert.equal(symbol, "INA")
                  assert.equal(maxSupplyIna.toString(), maxSupply)
              })
          })
      })
