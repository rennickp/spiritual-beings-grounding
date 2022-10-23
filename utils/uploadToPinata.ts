import pinataSDK from "@pinata/sdk"
import path from "path"
import * as fs from "fs"
import "dotenv/config"
import { PinataPinResponse } from "@pinata/sdk"
import { string } from "hardhat/internal/core/params/argumentTypes"

interface MetaDataTemplate {
  name: string
  description: string
  image: string
  attributes: {
    trait_type: string
    value: number
  }[]
}

const pinataApiKey = process.env.PINATA_API_KEY
const pinataSecret = process.env.PINATA_SECRET
const pinata = pinataSDK(pinataApiKey!, pinataSecret!)

export const storeImages = async (imagesFilePath: string) => {
  const fullImagesPath = path.resolve(imagesFilePath)
  const files = fs.readdirSync(fullImagesPath)
  let responses: PinataPinResponse[] = []
  console.log("Uploading to Pinata (IPFS)!")
  for (const fileIndex in files) {
    console.log(`Working on ${fileIndex}...`)
    const readableStreamForfile = fs.createReadStream(
      `${fullImagesPath}/${files[fileIndex]}`
    )
    try {
      const response = await pinata.pinFileToIPFS(readableStreamForfile)
      responses.push(response)
    } catch (error) {
      console.error(error)
    }
  }
  return { responses, files }
}

export const storeTokenUriMetadata = async (metadata: MetaDataTemplate) => {
  try {
    const response = await pinata.pinJSONToIPFS(metadata)
    return response
  } catch (error) {
    console.error(error)
  }
  return null
}
