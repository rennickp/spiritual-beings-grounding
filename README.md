# Spiritual Beings Grounding

SpiritualBeingsGrounding.sol uses an @openzeppelin ERC721 contract as a base.
Grounding721A.sol uses Azuki ERC721A as a base.

It uses a "soft-staking" approach that allows users to "ground/stake" their SpiritualBeings NFT without it leaving their wallet.

This is done by preventing a user from transferring ownership or selling while it is grounded except when using the ```safeTransferWhileGrounding()``` function.

If an NFT holder attempts to list their grounded NFT to manipulate floor price, an admin/owner can expel the SpiritualBeing from being grounded, thus allowing a sale to take place.

# Getting Started

```shell
yarn
yarn hardhat test
```
