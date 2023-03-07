import { ethers } from 'hardhat';
import { deployMocks } from './00-deploy-mocks';
import { deployInani } from './01-deploy-inani';
import { deployInaniTokenomics } from './02-deploy-inani-tokenomics';
import { deployCreatorEconomy } from './04-creatorEconomy';

async function main() {
  let mocks: any = await deployMocks();
  const inani = await deployInani('Inani');
  const inanitokenomics = await deployInaniTokenomics(
    'InaniTokenomics',
    inani.address
  );
  const creatorEconomy = await deployCreatorEconomy(
    'creator',
    ethers.constants.AddressZero,
    inani.address
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
