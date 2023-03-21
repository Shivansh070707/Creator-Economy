import { ethers } from 'ethers';
import InaTokenonics from './build/polygon/testnet/InaniTokenomics/inaniTokenomics.json';
import CreatorEconomyFacet from './build/polygon/testnet/creator/CreatorEconomyFacet.json';
import CreatorEconomyFacet2 from './build/polygon/testnet/creator/CreatorEconomyFacet2.json';
import Ina from './build/polygon/testnet/Inani/inani.json';
import React, { useState } from 'react';
const creatorAddress = '0x8C876532527D20010fA0Ec23Ca2b666Edf3DCB5D';

const networks = {
  polygon: {
    chainId: `0x${Number(80001).toString(16)}`,
    chainName: 'Polygon Testnet',
    nativeCurrency: {
      name: 'MATIC',
      symbol: 'MATIC',
      decimals: 18,
    },
    rpcUrls: ['https://rpc-mumbai.maticvigil.com/'],
    blockExplorerUrls: ['https://mumbai.polygonscan.com/'],
  },
};

function Creator() {
  const [account, setaccount] = useState('');
  const [inaTokenAddress, setInaTokenAddress] = useState('');
  const [inaContract, setinaContract] = useState(null);
  const [address, setaddress] = useState('');
  const [connect, setconnect] = useState('Connect Wallet');
  const [provider, setprovider] = useState(null);
  const [inaTokenomics, setinaTokenomics] = useState('');
  const [inputValue, setInputValue] = useState('');

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert('Please Install Metamask');
    }
    await window.ethereum.request({ method: 'eth_requestAccounts' });
    const Provider = new ethers.providers.Web3Provider(window.ethereum);
    setprovider(Provider);
    const Account = provider.getSigner();
    setaccount(Account);
    const Address = await Account.getAddress();
    setaddress(Address);
    setconnect('connected :');

    const ina = new ethers.Contract(Ina.address, Ina.abi, provider.getSigner());
    setinaContract(ina);
    const inaTokenonicscontract = new ethers.Contract(
      InaTokenonics.address,
      InaTokenonics.abi,
      provider.getSigner()
    );
    setinaTokenomics(inaTokenonicscontract);

    const creatorFacet1 = new ethers.Contract(
      creatorAddress,
      CreatorEconomyFacet.abi,
      provider.getSigner()
    );
    const creatorFacet2 = new ethers.Contract(
      creatorAddress,
      CreatorEconomyFacet2.abi,
      provider.getSigner()
    );
    let inaaddress = await creatorFacet2.getInaTokenAddress();
    setInaTokenAddress(inaaddress);

    if (provider.network !== 'matic') {
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              ...networks['polygon'],
            },
          ],
        });
      } catch (e) {
        alert('Please switch to polygon network');
      }
    }
  };
  const BuyIna = async (e) => {
    e.preventDefault();
    console.log(e.target.value);
    const buyToken = await inaTokenomics
      .connect(account)
      .buyTokenPrivateSale('Matic', e.target.value, { value: e.target.value });
    await buyToken.wait();
  };
  const handleInputChange = (event) => {
    setInputValue(event.target.value);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      const Value = inputValue.trim();

      const Matic = new ethers.Contract(
        '0x0000000000000000000000000000000000001010',
        Ina.abi,
        account
      );

      const app = await Matic.connect(account).approve(
        inaTokenomics.address,
        Value
      );
      const buyToken = await inaTokenomics
        .connect(account)
        .buyTokenPrivateSale('Matic', Value);
      await buyToken.wait();
    } catch (error) {
      alert('invalid hash');
      console.log(error);
    }
  };
  return (
    <div>
      <u onClick={connectWallet}> {connect} </u>
      <p>wallet address: {address}</p>
      <p>INA Token Address: {inaTokenAddress}</p>
      <form onSubmit={handleSubmit}>
        <label>
          Buy Ina with Matic
          <input
            type='number'
            value={inputValue}
            onChange={handleInputChange}
          />
        </label>
        <button type='submit'>Search</button>
      </form>
    </div>
  );
}

export default Creator;
