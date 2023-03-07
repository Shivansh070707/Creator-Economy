import { ethers } from 'hardhat';
import * as fs from 'fs';
const CHAIN = process.env.CHAIN;
const ENV = process.env.ENV;

export async function storeContract(
  address: string,
  abi: string | string[],
  name: string,
  filename: string
) {
  if (!Boolean(CHAIN) || !Boolean(ENV)) {
    console.log(
      `First set the "CHAIN" and "ENV" variables in .env file at the root folder`
    );
    process.exit(1);
  } else if (ENV != 'localhost') {
    try {
      fs.mkdirSync(`./build/${CHAIN}/${ENV}/${name}`, { recursive: true });
    } catch (e) {
      console.log('Unable to make file', e);
    }
  }
  // ----------------- MODIFIED FOR SAVING DEPLOYMENT DATA ----------------- //

  /**
   * @summary A build folder will be created in the root directory of the project
   * where the ABI, bytecode and the deployed address will be saved inside a JSON file.
   */

  let res = await ethers.provider.getNetwork();
  let network = {
    name: res.name == 'unknown' ? 'localhost' : res.name,
    chainId: res.chainId,
  };

  const output = {
    address,
    network,
    abi,
  };

  try {
    if (ENV != 'localhost') {
      fs.writeFileSync(
        `./build/${CHAIN}/${ENV}/${name}/${filename}.json`,
        JSON.stringify(output, null, 2)
      );
    }
  } catch (error) {
    console.log(error);
  }

  // ----------------------------------------------------------------------- //
}
