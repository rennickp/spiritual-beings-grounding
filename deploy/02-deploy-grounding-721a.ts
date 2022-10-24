import { deployments, ethers, network } from "hardhat"
import { developmentChains, networkConfig } from "../helper-hardhat-config"
import { verify } from "../utils/verify"
import "dotenv/config"

const deployGrounding721a = async () => {
  const { deploy, log } = deployments
  const accounts = await ethers.getSigners()
  const deployer = accounts[0]
  const staker = accounts[1]
  const chainId = network.config.chainId
  let args = ["Spiritual Beings", "SB"]

  const grounding721a = await deploy("Grounding721A", {
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
    await verify(grounding721a.address, args)
  }

  log("--------------------------------------")
}

export default deployGrounding721a
deployGrounding721a.tags = ["all", "grounding721a"]
