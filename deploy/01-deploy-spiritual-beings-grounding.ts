import { deployments, ethers, network } from "hardhat"
import { developmentChains, networkConfig } from "../helper-hardhat-config"
import { verify } from "../utils/verify"
import "dotenv/config"

const deploySpiritualBeingsGrounding = async () => {
  const { deploy, log } = deployments
  const accounts = await ethers.getSigners()
  const deployer = accounts[0]
  const staker = accounts[1]
  const chainId = network.config.chainId
  let args = ["Spiritual Beings", "SB"]

  const spiritualBeingsGrounding = await deploy("SpiritualBeingsGrounding", {
    from: deployer.address,
    args: args,
    log: true,
    waitConfirmations: networkConfig[chainId!].blockConfirmations || 1,
  })

  if (
    !developmentChains.includes(network.name) &&
    process.env.ETHERSCAN_API_KEY
  ) {
    log("Verifying...")
    await verify(spiritualBeingsGrounding.address, args)
  }

  log("--------------------------------------")
}

export default deploySpiritualBeingsGrounding
deploySpiritualBeingsGrounding.tags = ["all", "spiritualbeingsgrounding"]
