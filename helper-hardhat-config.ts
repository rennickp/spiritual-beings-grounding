import { ethers } from "hardhat"

export interface NetworkConfigItem {
  name?: string
  subscriptionId?: string
  gasLane?: string
  keepersUpdateInterval?: string
  entranceFee?: string
  callbackGasLimit?: string
  vrfCoordinatorV2?: string
  blockConfirmations?: number
  mintFee: string
  ethUsdPriceFeed?: string
}

export interface NetworkConfigInfo {
  [key: string]: NetworkConfigItem
}

export const networkConfig: NetworkConfigInfo = {
  default: {
    name: "hardhat",
    keepersUpdateInterval: "30",
    mintFee: "10000000000000000", // 0.01 ETH
  },
  5: {
    name: "goerli",
    vrfCoordinatorV2: "0x2Ca8E0C643bDe4C2E08ab1fA0da3401AdAD7734D",
    entranceFee: ethers.utils.parseEther("0.01").toString(),
    gasLane:
      "0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15",
    subscriptionId: "2877",
    callbackGasLimit: "500000", // 500,000
    keepersUpdateInterval: "30", // 30sec
    blockConfirmations: 3,
    mintFee: "10000000000000000", // 0.01 ETH
    ethUsdPriceFeed: "0xD4a33860578De61DBAbDc8BFdb98FD742fA7028e"
  },
  31337: {
    name: "localhost",
    entranceFee: ethers.utils.parseEther("0.1").toString(),
    gasLane:
      "0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15", // hardhat doesn't care what we use
    callbackGasLimit: "500000",
    keepersUpdateInterval: "30",
    blockConfirmations: 1,
    subscriptionId: "1",
    mintFee: "10000000000000000", // 0.01 ETH
  },
}

export const DECIMALS = "18"
export const INITIAL_PRICE = "200000000000000000000"
export const developmentChains = ["hardhat", "localhost"]
