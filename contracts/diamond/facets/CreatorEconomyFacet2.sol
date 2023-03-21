// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;
import {LibDiamond, CreatorToken} from "../libraries/LibDiamond.sol";

import "../../Inani.sol";

error CreatorEconomy__NotEnoughBalance();
error CreatorEconomy__NotEnoughAllowance();
error CreatorEconomy__NotEnoughBalanceForInitialLiquidity();
error CreatorEconomy__NotEnoughAllowanceForInitialLiquidity();

contract CreatorEconomyFacet2 {
    event CreatorAdded(address indexed creator, address indexed creatorToken);

    function addCreator(
        address creator,
        string memory tokenName,
        string memory tokenSymbol
    ) external {
        LibDiamond.CreatorEconomyStorage storage c = LibDiamond
            .creatorEconomyStorage();
        require(
            address(c.creatorToPool[creator].creatorToken) == address(0),
            "Creator already added"
        );
        // check if creator has enough INA tokens for initial liquidity
        if (Inani(c.i_inani).balanceOf(creator) < c.INITIAL_LIQUIDITY) {
            revert CreatorEconomy__NotEnoughBalanceForInitialLiquidity();
        }
        // also, the creator must have approved the allowance to this contract
        if (
            Inani(c.i_inani).allowance(creator, address(this)) <
            c.INITIAL_LIQUIDITY
        ) {
            revert CreatorEconomy__NotEnoughAllowanceForInitialLiquidity();
        }
        // pull the initial liquidity from creator
        Inani(c.i_inani).transferFrom(
            creator,
            address(this),
            c.INITIAL_LIQUIDITY
        );
        // create new cretor token with INITIAL_SUPPLY minted to the creator
        CreatorToken _creatorToken = new CreatorToken(
            tokenName,
            tokenSymbol,
            creator,
            c.INITIAL_SUPPLY
        );
        // create the pool for this creator token
        LibDiamond.CreatorTokenPool memory newCreatorTokenPool = LibDiamond
            .CreatorTokenPool(
                _creatorToken,
                // 1 * (10 ** 18),
                c.INITIAL_LIQUIDITY,
                0,
                1 * 10 ** 18
            );
        // update the mapping for creators to their respective pool
        c.creatorToPool[creator] = newCreatorTokenPool;
        // update token to creator mapping
        c.tokenToCreator[address(_creatorToken)] = creator;
        emit CreatorAdded(creator, address(_creatorToken));
    }

    // view and pure functions
    function getInaTokenAddress() external view returns (address) {
        LibDiamond.CreatorEconomyStorage storage c = LibDiamond
            .creatorEconomyStorage();
        return address(c.i_inani);
    }

    function getCreatorTokenAddress(
        address creator
    ) external view returns (address) {
        LibDiamond.CreatorEconomyStorage storage c = LibDiamond
            .creatorEconomyStorage();
        return address(c.creatorToPool[creator].creatorToken);
    }

    function getUserBalanceForCreatorToken(
        address creator
    ) external view returns (uint256) {
        LibDiamond.CreatorEconomyStorage storage c = LibDiamond
            .creatorEconomyStorage();
        return c.creatorToPool[creator].creatorToken.balanceOf(msg.sender);
    }

    function getCurrentSupply(address creator) external view returns (uint256) {
        LibDiamond.CreatorEconomyStorage storage c = LibDiamond
            .creatorEconomyStorage();
        return c.creatorToPool[creator].creatorToken.totalSupply();
    }

    function initialLiquidity() external view returns (uint256) {
        LibDiamond.CreatorEconomyStorage storage c = LibDiamond
            .creatorEconomyStorage();
        return c.INITIAL_LIQUIDITY;
    }

    function initialSupply() external view returns (uint256) {
        LibDiamond.CreatorEconomyStorage storage c = LibDiamond
            .creatorEconomyStorage();
        return c.INITIAL_SUPPLY;
    }

    function supplyCap() external view returns (uint256) {
        LibDiamond.CreatorEconomyStorage storage c = LibDiamond
            .creatorEconomyStorage();
        return c.SUPPLY_CAP;
    }
}
