import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { assert, expect } from "chai"
import { BigNumber } from "ethers"
import { deployments, ethers, network } from "hardhat"
import { developmentChains } from "../../helper-hardhat-config"
import { SpiritualBeingsGrounding } from "../../typechain-types"
import { moveBlocks, moveTime } from "../../utils/move-blocks"

interface GroundingPeriod {
  grounding: boolean
  current: BigNumber
  total: BigNumber
}

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("Spiritual Beings Grounding Unit Tests", function () {
      let spiritualBeingsGrounding: SpiritualBeingsGrounding
      let accounts: SignerWithAddress[]
      let deployer: SignerWithAddress
      let grounder: SignerWithAddress

      this.beforeEach(async () => {
        accounts = await ethers.getSigners()
        deployer = accounts[0]
        grounder = accounts[1]
        await deployments.fixture(["all"])
        spiritualBeingsGrounding = await ethers.getContract(
          "SpiritualBeingsGrounding"
        )
        await spiritualBeingsGrounding.mintNft()
        await spiritualBeingsGrounding.setGroundingOpen(true)
      })
      describe("constructor", function () {
        it("sets name and symbol", async () => {
          const name = await spiritualBeingsGrounding.name()
          const symbol = await spiritualBeingsGrounding.symbol()
          assert.equal(name, "Spiritual Beings")
          assert.equal(symbol, "SB")
        })
      })

      describe("setGroundingOpen", function () {
        it("reverts if not contract owner", async () => {
          await expect(
            spiritualBeingsGrounding.connect(grounder).setGroundingOpen(true)
          ).to.be.revertedWith("Ownable: caller is not the owner")
        })

        it("correctly sets s_groundingOpen", async () => {
          await spiritualBeingsGrounding.setGroundingOpen(true)
          const isGroundingOpen =
            await spiritualBeingsGrounding.s_groundingOpen()
          assert.equal(isGroundingOpen, true)
        })
      })

      describe("toggleGrounding", function () {
        it("reverts if not NFT owner", async () => {
          await expect(
            spiritualBeingsGrounding.connect(grounder).toggleGrounding(["0"])
          ).to.be.revertedWithCustomError(
            spiritualBeingsGrounding,
            "SpiritualBeingsGrounding__NotApprovedOrOwner"
          )
        })

        it("reverts if grounding is closed", async () => {
          await spiritualBeingsGrounding.setGroundingOpen(false)
          await expect(
            spiritualBeingsGrounding.toggleGrounding(["0"])
          ).to.be.revertedWithCustomError(
            spiritualBeingsGrounding,
            "SpiritualBeingsGrounding__GroundingClosed"
          )
        })

        it("emits Grounded event correctly", async () => {
          await expect(spiritualBeingsGrounding.toggleGrounding(["0"]))
            .to.emit(spiritualBeingsGrounding, "Grounded")
            .withArgs("0")
        })

        it("emits Grounded events correctly", async () => {
          await spiritualBeingsGrounding.mintNft() // mints tokenId "1"
          const tx = await spiritualBeingsGrounding.toggleGrounding(["0", "1"])
          const txReciept = await tx.wait(1)
          assert.equal(txReciept.events![0].args!.toString(), "0")
          assert.equal(txReciept.events![1].args!.toString(), "1")
        })

        it("emits Ungrounded event correctly", async () => {
          const tx = await spiritualBeingsGrounding.toggleGrounding(["0"])
          tx.wait(1)
          await expect(spiritualBeingsGrounding.toggleGrounding(["0"]))
            .to.emit(spiritualBeingsGrounding, "Ungrounded")
            .withArgs("0")
        })
      })

      describe("safeTransferWhileGrounding", function () {
        it("transfers successfully when grounding", async () => {
          await spiritualBeingsGrounding.toggleGrounding(["0"])
          await spiritualBeingsGrounding.safeTransferWhileGrounding(
            deployer.address,
            grounder.address,
            "0"
          )
          assert.equal(
            await spiritualBeingsGrounding.ownerOf("0"),
            grounder.address
          )
        })

        it("reverts when not owner", async () => {
          await spiritualBeingsGrounding.toggleGrounding(["0"])
          await expect(
            spiritualBeingsGrounding
              .connect(grounder)
              .safeTransferWhileGrounding(
                deployer.address,
                grounder.address,
                "0"
              )
          ).to.be.revertedWithCustomError(
            spiritualBeingsGrounding,
            "SpiritualBeingsGrounding__NotApprovedOrOwner"
          )
        })

        it("reverts when grounded and not using safeTransferWhileGrounding", async () => {
          await spiritualBeingsGrounding.toggleGrounding(["0"])
          await expect(
            spiritualBeingsGrounding[
              "safeTransferFrom(address,address,uint256)"
            ](deployer.address, grounder.address, "0")
          ).to.be.revertedWithCustomError(
            spiritualBeingsGrounding,
            "SpiritualBeingsGrounding__CurrentlyGrounding"
          )
        })
      })

      describe("expelFromGrounding", function () {
        it("reverts if not owner/admin", async () => {
          await spiritualBeingsGrounding.toggleGrounding(["0"])
          await expect(
            spiritualBeingsGrounding.connect(grounder).expelFromGrounding("0")
          ).to.be.revertedWith("Ownable: caller is not the owner")
        })

        it("reverts if not grounded", async () => {
          await expect(
            spiritualBeingsGrounding.expelFromGrounding("0")
          ).to.be.revertedWithCustomError(
            spiritualBeingsGrounding,
            "SpiritualBeingsGrounding__NotGrounded"
          )
        })

        it("emits events correctly", async () => {
          await spiritualBeingsGrounding.toggleGrounding(["0"])
          const tx = await spiritualBeingsGrounding.expelFromGrounding("0")
          const receipt = await tx.wait(1)
          assert.equal(receipt.events![0].event, "Ungrounded")
          assert.equal(receipt.events![1].event, "Expelled")
        })

        it("expels correctly", async () => {
          await spiritualBeingsGrounding.toggleGrounding(["0"])
          await spiritualBeingsGrounding.expelFromGrounding("0")
          const groundingPeriod: GroundingPeriod =
            await spiritualBeingsGrounding.getGroundingPeriod("0")
          const isGrounding = groundingPeriod.grounding
          assert.equal(isGrounding, false)
        })
      })

      describe("getGroundingPeriod", function () {
        it("returns correctly before grounding", async () => {
          const groundingPeriod: GroundingPeriod =
            await spiritualBeingsGrounding.getGroundingPeriod("0")
          assert.equal(groundingPeriod.grounding, false)
          assert.equal(groundingPeriod.current.toString(), "0")
          assert.equal(groundingPeriod.total.toString(), "0")
        })

        it("returns correctly after grounding", async () => {
          const tx = await spiritualBeingsGrounding.toggleGrounding(["0"])
          tx.wait(1)
          const groundingPeriod: GroundingPeriod =
            await spiritualBeingsGrounding.getGroundingPeriod("0")
          assert.equal(groundingPeriod.grounding, true)
          assert.equal(groundingPeriod.current.toString(), "0")
          assert.equal(groundingPeriod.total.toString(), "0")
        })

        it("returns correctly after time passed", async () => {
          const tx = await spiritualBeingsGrounding.toggleGrounding(["0"])
          tx.wait(1)
          await moveTime(3600)
          await moveBlocks(1)
          const groundingPeriod =
            await spiritualBeingsGrounding.getGroundingPeriod("0")
          assert.equal(groundingPeriod.grounding, true)
          assert.equal(groundingPeriod.current.toString(), "3600")
          assert.equal(groundingPeriod.total.toString(), "3600")
        })

        it("returns correctly after grounding/ungrounding", async () => {
          // Turn on Grounding
          let tx = await spiritualBeingsGrounding.toggleGrounding(["0"])
          tx.wait(1)

          //Wait an hour
          await moveTime(3599)
          await moveBlocks(1)

          // Turn off Grounding
          tx = await spiritualBeingsGrounding.toggleGrounding(["0"])
          tx.wait(1)

          // Get data
          let groundingPeriod =
            await spiritualBeingsGrounding.getGroundingPeriod("0")
          assert.equal(groundingPeriod.grounding, false)
          assert.equal(groundingPeriod.current.toString(), "0")
          assert.equal(groundingPeriod.total.toString(), "3600")

          // Wait another hour
          await moveTime(3599)
          await moveBlocks(1)

          // Turn on Grounding again
          tx = await spiritualBeingsGrounding.toggleGrounding(["0"])
          tx.wait(1)

          // Wait another hour
          await moveTime(3600)
          await moveBlocks(1)

          // Get data again
          groundingPeriod = await spiritualBeingsGrounding.getGroundingPeriod(
            "0"
          )
          assert.equal(groundingPeriod.grounding, true)
          assert.equal(groundingPeriod.current.toString(), "3600")
          assert.equal(groundingPeriod.total.toString(), "7200")
        })
      })
    })
