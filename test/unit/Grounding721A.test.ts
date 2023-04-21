import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { assert, expect } from "chai"
import { BigNumber } from "ethers"
import { deployments, ethers, network } from "hardhat"
import { developmentChains } from "../../helper-hardhat-config"
import { Grounding721A } from "../../typechain-types"
import { moveBlocks, moveTime } from "../../utils/move-blocks"

interface GroundingPeriod {
  grounding: boolean
  current: BigNumber
  total: BigNumber
}

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("Grounding721A Unit Tests", function () {
      let grounding721a: Grounding721A
      let accounts: SignerWithAddress[]
      let deployer: SignerWithAddress
      let grounder: SignerWithAddress

      this.beforeEach(async () => {
        accounts = await ethers.getSigners()
        deployer = accounts[0]
        grounder = accounts[1]
        await deployments.fixture(["grounding721a"])
        grounding721a = await ethers.getContract("Grounding721A")
        await grounding721a.mintNft("1")
        await grounding721a.setGroundingOpen(true)
      })
      describe("constructor", function () {
        it("sets name and symbol", async () => {
          const name = await grounding721a.name()
          const symbol = await grounding721a.symbol()
          assert.equal(name, "Spiritual Beings")
          assert.equal(symbol, "SB")
        })
      })

      describe("setGroundingOpen", function () {
        it("reverts if not contract owner", async () => {
          await expect(
            grounding721a.connect(grounder).setGroundingOpen(true)
          ).to.be.revertedWith("Ownable: caller is not the owner")
        })

        it("correctly sets s_groundingOpen", async () => {
          await grounding721a.setGroundingOpen(true)
          const isGroundingOpen = await grounding721a.s_groundingOpen()
          assert.equal(isGroundingOpen, true)
        })
      })

      describe("toggleGrounding", function () {
        it("reverts if not NFT owner", async () => {
          await expect(
            grounding721a.connect(grounder).toggleGrounding(["0"])
          ).to.be.revertedWithCustomError(
            grounding721a,
            "Grounding721A__NotApprovedOrOwner"
          )
        })

        it("reverts if grounding is closed", async () => {
          await grounding721a.setGroundingOpen(false)
          //await grounding721a.approve(deployer.address, "0")
          await expect(
            grounding721a.toggleGrounding(["0"])
          ).to.be.revertedWithCustomError(
            grounding721a,
            "Grounding721A__GroundingClosed"
          )
        })

        it("emits Grounded event correctly", async () => {
          //await grounding721a.approve(deployer.address, "0")
          await expect(grounding721a.toggleGrounding(["0"]))
            .to.emit(grounding721a, "Grounded")
            .withArgs("0")
        })

        it("grounds correctly as non-owner", async () => {
          await grounding721a.connect(grounder).mintNft("1")
          await grounding721a.connect(grounder).approve(deployer.address, "1")
          await expect(grounding721a.toggleGrounding(["1"]))
            .to.emit(grounding721a, "Grounded")
            .withArgs("1")
        })

        it("emits Grounded events correctly", async () => {
          await grounding721a.mintNft("1") // mints tokenId "1"
          //await grounding721a.approve(deployer.address, "0")
          //await grounding721a.approve(deployer.address, "1")
          const tx = await grounding721a.toggleGrounding(["0", "1"])
          const txReciept = await tx.wait(1)
          assert.equal(txReciept.events![0].args!.toString(), "0")
          assert.equal(txReciept.events![1].args!.toString(), "1")
        })

        it("emits Ungrounded event correctly", async () => {
          await grounding721a.approve(deployer.address, "0")
          const tx = await grounding721a.toggleGrounding(["0"])
          tx.wait(1)
          await expect(grounding721a.toggleGrounding(["0"]))
            .to.emit(grounding721a, "Ungrounded")
            .withArgs("0")
        })
      })

      describe("safeTransferWhileGrounding", function () {
        it("transfers successfully when grounding", async () => {
          //await grounding721a.approve(deployer.address, "0")
          await grounding721a.toggleGrounding(["0"])
          await grounding721a.safeTransferWhileGrounding(
            deployer.address,
            grounder.address,
            "0"
          )
          assert.equal(await grounding721a.ownerOf("0"), grounder.address)
        })

        it("reverts when not owner", async () => {
          //await grounding721a.approve(deployer.address, "0")
          await grounding721a.toggleGrounding(["0"])
          await expect(
            grounding721a
              .connect(grounder)
              .safeTransferWhileGrounding(
                deployer.address,
                grounder.address,
                "0"
              )
          ).to.be.revertedWithCustomError(
            grounding721a,
            "Grounding721A__NotApprovedOrOwner"
          )
        })

        it("reverts when grounded and not using safeTransferWhileGrounding", async () => {
          //await grounding721a.approve(deployer.address, "0")
          await grounding721a.toggleGrounding(["0"])
          await expect(
            grounding721a["safeTransferFrom(address,address,uint256)"](
              deployer.address,
              grounder.address,
              "0"
            )
          ).to.be.revertedWithCustomError(
            grounding721a,
            "Grounding721A__CurrentlyGrounding"
          )
        })

        it("safeTransferFrom works when not grounding", async () => {
          //await grounding721a.approve(deployer.address, "0")
          await grounding721a["safeTransferFrom(address,address,uint256)"](
            deployer.address,
            grounder.address,
            "0"
          )
          assert.equal(await grounding721a.ownerOf("0"), grounder.address)
        })
      })

      describe("expelFromGrounding", function () {
        it("reverts if not owner/admin", async () => {
          await grounding721a.approve(deployer.address, "0")
          await grounding721a.toggleGrounding(["0"])
          await expect(
            grounding721a.connect(grounder).expelFromGrounding("0")
          ).to.be.revertedWith("Ownable: caller is not the owner")
        })

        it("reverts if not grounded", async () => {
          await expect(
            grounding721a.expelFromGrounding("0")
          ).to.be.revertedWithCustomError(
            grounding721a,
            "Grounding721A__NotGrounded"
          )
        })

        it("emits events correctly", async () => {
          await grounding721a.approve(deployer.address, "0")
          await grounding721a.toggleGrounding(["0"])
          const tx = await grounding721a.expelFromGrounding("0")
          const receipt = await tx.wait(1)
          assert.equal(receipt.events![0].event, "Ungrounded")
          assert.equal(receipt.events![1].event, "Expelled")
        })

        it("expels correctly", async () => {
          await grounding721a.approve(deployer.address, "0")
          await grounding721a.toggleGrounding(["0"])
          await grounding721a.expelFromGrounding("0")
          const groundingPeriod: GroundingPeriod =
            await grounding721a.getGroundingPeriod("0")
          const isGrounding = groundingPeriod.grounding
          assert.equal(isGrounding, false)
        })
      })

      describe("getGroundingPeriod", function () {
        it("returns correctly before grounding", async () => {
          const groundingPeriod: GroundingPeriod =
            await grounding721a.getGroundingPeriod("0")
          assert.equal(groundingPeriod.grounding, false)
          assert.equal(groundingPeriod.current.toString(), "0")
          assert.equal(groundingPeriod.total.toString(), "0")
        })

        it("returns correctly after grounding", async () => {
          await grounding721a.approve(deployer.address, "0")
          const tx = await grounding721a.toggleGrounding(["0"])
          tx.wait(1)
          const groundingPeriod: GroundingPeriod =
            await grounding721a.getGroundingPeriod("0")
          assert.equal(groundingPeriod.grounding, true)
          assert.equal(groundingPeriod.current.toString(), "0")
          assert.equal(groundingPeriod.total.toString(), "0")
        })

        it("returns correctly after time passed", async () => {
          await grounding721a.approve(deployer.address, "0")
          const tx = await grounding721a.toggleGrounding(["0"])
          tx.wait(1)
          await moveTime(3600)
          await moveBlocks(1)
          const groundingPeriod = await grounding721a.getGroundingPeriod("0")
          assert.equal(groundingPeriod.grounding, true)
          assert.equal(groundingPeriod.current.toString(), "3600")
          assert.equal(groundingPeriod.total.toString(), "3600")
        })

        it("returns correctly after grounding/ungrounding", async () => {
          // Turn on Grounding
          await grounding721a.approve(deployer.address, "0")
          let tx = await grounding721a.toggleGrounding(["0"])
          tx.wait(1)

          //Wait an hour
          await moveTime(3599)
          await moveBlocks(1)

          // Turn off Grounding
          tx = await grounding721a.toggleGrounding(["0"])
          tx.wait(1)

          // Get data
          let groundingPeriod = await grounding721a.getGroundingPeriod("0")
          assert.equal(groundingPeriod.grounding, false)
          assert.equal(groundingPeriod.current.toString(), "0")
          assert.equal(groundingPeriod.total.toString(), "3600")

          // Wait another hour
          await moveTime(3599)
          await moveBlocks(1)

          // Turn on Grounding again
          tx = await grounding721a.toggleGrounding(["0"])
          tx.wait(1)

          // Wait another hour
          await moveTime(3600)
          await moveBlocks(1)

          // Get data again
          groundingPeriod = await grounding721a.getGroundingPeriod("0")
          assert.equal(groundingPeriod.grounding, true)
          assert.equal(groundingPeriod.current.toString(), "3600")
          assert.equal(groundingPeriod.total.toString(), "7200")
        })
      })
    })
