// contracts/Inani.sol
// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

error Inani__WalletLocked();
error Inani__MaxSupplyCrossed();

// error Inani__NotAllowedToMInt();

contract Inani is ERC20, Ownable {
    uint256 private immutable i_maxSupply;

    mapping(address => uint256) lockedWalletsTillBlockNumber; // wallet address locked till the block number mapping
    // mapping(address => bool) private allowedToMint; // addresses allowed to mint by owner

    event WalletLocked(address indexed wallet, uint256 blockNumber);

    modifier unlocked(address wallet) {
        if (block.number <= lockedWalletsTillBlockNumber[wallet]) {
            revert Inani__WalletLocked();
        }
        _;
    }

    modifier maxSupplyNotReached(uint256 amount) {
        if (totalSupply() + amount > i_maxSupply) {
            revert Inani__MaxSupplyCrossed();
        }
        _;
    }

    // modifier isAllowedToMint(address caller) {
    //     if (!allowedToMint[caller]) {
    //         revert Inani__NotAllowedToMInt();
    //     }
    //     _;
    // }

    constructor(uint256 maxSupply) ERC20("INANI", "INA") {
        i_maxSupply = maxSupply;
    }

    function mint(address to, uint256 amount)
        public
        onlyOwner
        maxSupplyNotReached(amount)
    {
        _mint(to, amount);
    }

    function mintAndLockFounderAndTeamTokens(address escrow, uint256 amount)
        external
        onlyOwner
        returns (bool success)
    {
        _mint(escrow, amount);
        lockWallet(escrow, block.number + (365 * 24 * 3600) / 12);
        success = true;
    }

    function lockWallet(address wallet, uint256 blockNumber)
        public
        onlyOwner
        returns (bool)
    {
        lockedWalletsTillBlockNumber[wallet] = blockNumber;
        emit WalletLocked(wallet, blockNumber);
        return true;
    }

    // function allowMinting(address minter) external onlyOwner {
    //     allowedToMint[minter] = true;
    // }

    function transfer(address to, uint256 amount)
        public
        virtual
        override
        unlocked(msg.sender)
        returns (bool)
    {
        address owner = _msgSender();
        _transfer(owner, to, amount);
        return true;
    }

    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public virtual override unlocked(from) returns (bool) {
        address spender = _msgSender();
        _spendAllowance(from, spender, amount);
        _transfer(from, to, amount);
        return true;
    }

    function getMaxSupply() public view returns (uint256) {
        return i_maxSupply;
    }
}
