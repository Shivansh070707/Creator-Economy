// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { ethers } from 'hardhat';
import { getSelectorsFromContract, FacetCutAction } from './libraries';
import { storeContract } from './storeContract';
import {
  CreatorEconomyFacet,
  CreatorEconomyFacet2,
  Diamond,
  DiamondCutFacet,
  DiamondLoupeFacet,
  OwnershipFacet,
} from '../typechain-types';

export async function deployCreatorEconomy(
  name: string,
  owner: string,
  inaniAddress: string
) {
  console.log('**** Deploying AutoFarm diamond ...');

  // deploy DiamondCutFacet
  const DiamondCutFacet = await ethers.getContractFactory('DiamondCutFacet');
  let diamondCutFacet: DiamondCutFacet = await DiamondCutFacet.deploy();
  await diamondCutFacet.deployed();

  await storeContract(
    diamondCutFacet.address,
    JSON.parse(String(diamondCutFacet.interface.format('json'))),
    name,
    'DiamondCutFacet'
  );

  console.log('DiamondCutFacet deployed at: ', diamondCutFacet.address);

  // deploy Diamond
  const Diamond = await ethers.getContractFactory('Diamond');
  const diamond: Diamond = await Diamond.deploy(
    owner,
    diamondCutFacet.address,
    inaniAddress
  );
  await diamond.deployed();

  let diamondAddress: string = diamond.address.toString();

  await storeContract(
    diamond.address,
    JSON.parse(String(diamond.interface.format('json'))),
    name,
    'Diamond'
  );

  console.log('Diamond deployed at: ', diamond.address);

  // deploy facets
  // console.log("Deploying facets");
  const FacetNames = [
    'DiamondLoupeFacet',
    'OwnershipFacet',
    'CreatorEconomyFacet',
    'CreatorEconomyFacet2',
  ];
  const cut = [];
  let fileData = [];
  for (const facetName of FacetNames) {
    const Facet = await ethers.getContractFactory(facetName);
    const facet = await Facet.deploy();
    await facet.deployed();
    fileData.push({
      address: facet.address,
      abi: JSON.parse(String(facet.interface.format('json'))),
    });

    console.log(`${facetName} deployed at ${facet.address}`);

    const selectors = getSelectorsFromContract(facet);
    cut.push({
      facetAddress: facet.address,
      action: FacetCutAction.Add,
      functionSelectors: selectors.getSelectors(),
    });
  }

  let DiamondLoupeFacetData = {
    fileData: fileData[0],
  };
  await storeContract(
    DiamondLoupeFacetData.fileData.address,
    DiamondLoupeFacetData.fileData.abi,
    name,
    'DiamondLoupeFacet'
  );
  let OwnershipFacetData = {
    fileData: fileData[1],
  };
  await storeContract(
    OwnershipFacetData.fileData.address,
    OwnershipFacetData.fileData.abi,
    name,
    'OwnershipFacet'
  );

  let CreatorEconomyFacetData = {
    fileData: fileData[2],
  };
  await storeContract(
    CreatorEconomyFacetData.fileData.address,
    CreatorEconomyFacetData.fileData.abi,
    name,
    'CreatorEconomyFacet'
  );

  let CreatorEconomyFacet2Data = {
    fileData: fileData[3],
  };
  await storeContract(
    CreatorEconomyFacet2Data.fileData.address,
    CreatorEconomyFacet2Data.fileData.abi,
    name,
    'CreatorEconomyFacet2'
  );

  console.log('**** CreatorEconomyFacet Diamond deploy end');

  diamondCutFacet = await ethers.getContractAt(
    'DiamondCutFacet',
    diamondAddress
  );

  let diamondLoupeFacet: DiamondLoupeFacet = await ethers.getContractAt(
    'DiamondLoupeFacet',
    diamondAddress
  );
  let OwnershipFacet: OwnershipFacet = await ethers.getContractAt(
    'OwnershipFacet',
    diamondAddress
  );

  let CreatorEconomyFacet: CreatorEconomyFacet = await ethers.getContractAt(
    'CreatorEconomyFacet',
    diamondAddress
  );
  let CreatorEconomyFacet2: CreatorEconomyFacet2 = await ethers.getContractAt(
    'CreatorEconomyFacet2',
    diamondAddress
  );

  return {
    diamondAddress,
    diamondCutFacet,
    CreatorEconomyFacet,
    CreatorEconomyFacet2,
    OwnershipFacet,
    diamondLoupeFacet,
  };
}
module.exports.tags = ['all', 'creatorEconomy'];
