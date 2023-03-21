import { ethers } from 'hardhat';
import Ina from '../build/polygon/testnet/Inani/inani.json';
import InaniTokenomics from '../build/polygon/testnet/InaniTokenomics/inaniTokenomics.json';
import CreatorFacet1 from '../build/polygon/testnet/creator/CreatorEconomyFacet.json';
import CreatorFacet2 from '../build/polygon/testnet/creator/CreatorEconomyFacet2.json';
import Matic from '../build/polygon/testnet/WMatic.json';
const creatorAddress = '0x9D7Af2FC2967cBD41ccc7138306d318dD0256311';
async function main() {
  const inaniTokenomics = await ethers.getContractAt(
    InaniTokenomics.abi,
    InaniTokenomics.address
  );
  const ina = await ethers.getContractAt(Ina.abi, Ina.address);
  const creatorFacet1 = await ethers.getContractAt(
    CreatorFacet1.abi,
    creatorAddress
  );
  const creatorFacet2 = await ethers.getContractAt(
    CreatorFacet2.abi,
    creatorAddress
  );
  const WMatic = await ethers.getContractAt(
    Matic,
    '0x9c3C9283D3e44854697Cd22D3Faa240Cfb032889'
  );
  console.log('1');

  await ina.mint(
    '0x068aeB7f11fb0d5e27BbbDfD07a63B59D0448Da8',
    ethers.utils.parseEther('50000')
  );
  console.log('2');
  await ina.approve(creatorFacet2.address, ethers.utils.parseEther('50000'));
  console.log('2');
  // await creatorFacet2.addCreator(
  //   '0x068aeB7f11fb0d5e27BbbDfD07a63B59D0448Da8',
  //   'Shiv',
  //   'ss'
  // );
  await creatorFacet1.buyCreatorTokens(
    '0x068aeB7f11fb0d5e27BbbDfD07a63B59D0448Da8',
    ethers.utils.parseEther('500')
  );
  console.log('2');
  // await ina.mint(inaniTokenomics.address, ethers.utils.parseEther('93750000'));
  // //start private sale
  // const start = await inaniTokenomics.startPrivateSale();
  // //whitelist member
  // const white = await inaniTokenomics.whitelistForPrivateSale(
  //   '0x0979fd89541d0ba66739fA4611A59D1A5558382C'
  // );
  // Buy Ina Tokens

  // console.log('1');
  // await WMatic.deposit({ value: ethers.utils.parseEther('0.1') });
  // await WMatic.approve(inaniTokenomics.address, ethers.utils.parseEther('0.1'));

  // const buyIna = await inaniTokenomics.buyTokenPrivateSale(
  //   'Matic',
  //   ethers.utils.parseEther('0.1')
  // );
  // console.log('f');
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
