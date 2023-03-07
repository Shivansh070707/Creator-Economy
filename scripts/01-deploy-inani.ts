import { network, ethers } from 'hardhat';
import { developmentChains } from '../helper-hardhat-config';
import { verify } from './utils/verify';
import { Inani } from '../typechain-types';
import { storeContract } from './storeContract';

export async function deployInani(name: string) {
  const maxSupply = ethers.utils.parseEther('1000000000');

  console.log('----------------------------------------------------');
  console.log('Deploying Inani...');

  const Inani = await ethers.getContractFactory('Inani');
  const inani: Inani = await Inani.deploy(maxSupply);
  await inani.deployed();
  await storeContract(
    inani.address,
    JSON.parse(String(inani.interface.format('json'))),
    name,
    'inani'
  );
  console.log(inani.address);
  // Verify the deployment
  if (
    !developmentChains.includes(network.name) &&
    process.env.ETHERSCAN_API_KEY
  ) {
    console.log('Verifying...');
    await verify(inani.address, [maxSupply]);
  }
  return inani;
}
module.exports.tags = ['all', 'inani'];
