const { assert, expect } = require("chai")
const { network, deployments, ethers } = require("hardhat")
const { developmentChains } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("VideoNftSoulbound", function () {
          let deployer, user1
          let videoNftSoulbound
          beforeEach(async () => {
              const accounts = await ethers.getSigners()
              deployer = accounts[0]
              user1 = accounts[1]
              await deployments.fixture(["all"])
              videoNftSoulbound = await ethers.getContract("VideoNftSoulbound")
          })

          describe("mintNft", function () {
              it("mints the soulbound NFT", async () => {
                  await videoNftSoulbound.mintNft()
                  const balance = await videoNftSoulbound.balanceOf(deployer.address)
                  const owner = await videoNftSoulbound.ownerOf(0)
                  assert.equal(balance.toString(), "1")
                  assert.equal(owner, deployer.address)
              })
          })
          describe("approve", function () {
              it("reverts when approving permission to transfer", async () => {
                  await expect(videoNftSoulbound.approve(user1.address, 0)).to.be.revertedWith(
                      "VideoNftSoulbound__NoTransferAllowed"
                  )
              })
          })
      })
