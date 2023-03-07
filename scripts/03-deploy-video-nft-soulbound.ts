import { network, ethers } from 'hardhat';
import { developmentChains } from '../helper-hardhat-config';
import { verify } from './utils/verify';

export async function deployVideoNFt() {
  console.log('----------------------------------------------------');
  console.log('Deploying VideoNftSoulbound...');
  const args = [];
  const VideoNftSoulbound = await ethers.getContractFactory(
    'VideoNftSoulbound'
  );
  const videoNftSoulbound = await VideoNftSoulbound.deploy();
  await videoNftSoulbound.deployed();
  // Verify the deployment
  if (
    !developmentChains.includes(network.name) &&
    process.env.POLYGONSCAN_API_KEY
  ) {
    console.log('Verifying...');
    await verify(videoNftSoulbound.address, args);
  }
}

module.exports.tags = ['all', 'videoNftSoulbound'];
