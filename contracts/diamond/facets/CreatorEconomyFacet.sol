// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;
import {LibDiamond, CreatorToken} from "../libraries/LibDiamond.sol";

import "../../Inani.sol";
import "@prb/math/src/UD60x18.sol";

error CreatorEconomy__NotEnoughBalance();
error CreatorEconomy__NotEnoughAllowance();
error CreatorEconomy__CanNotExceedSupplyCap();
error CreatorEconomy__NotEnoughToRedeem();
error CreatorEconomy__SupplyCanNotGoBelowGenesisTokens();
error CreatorEconomy__InvalidTokenAddress();
error CreatorEconomy__NotEnoughBalanceToSWap();

contract CreatorEconomyFacet {
    event CreatorTokensMinted(
        address indexed user,
        address indexed creator,
        uint256 tokensMinted
    );
    event CreatorTokensBurnt(
        address indexed user,
        address indexed creator,
        uint256 tokensBurnt
    );

    function buyCreatorTokens(
        address creator,
        uint256 inaTokensDeposited
    ) external returns (uint256) {
        LibDiamond.CreatorEconomyStorage storage c = LibDiamond
            .creatorEconomyStorage();
        if (inaTokensDeposited == 0) {
            return 0;
        }
        // first check whether msg.sender has enough INA tokens
        if (Inani(c.i_inani).balanceOf(msg.sender) < inaTokensDeposited) {
            revert CreatorEconomy__NotEnoughBalance();
        }
        // next, check if the user has approved the allowance for this contract
        if (
            Inani(c.i_inani).allowance(msg.sender, address(this)) <
            inaTokensDeposited
        ) {
            revert CreatorEconomy__NotEnoughAllowance();
        }
        // Now calculate how many Creator tokens can be bought with inaTokensDeposited
        UD60x18 currentReservesInUd = ud(
            c.creatorToPool[creator].currentReserves
        );
        UD60x18 currentSupplyInUd = ud(
            c.creatorToPool[creator].creatorToken.totalSupply()
        );
        UD60x18 inaTokensDepositedInUd = ud(inaTokensDeposited);
        UD60x18 reserveRatioInUd = ud(0.10e18); // representing 10%
        UD60x18 creatorTokensInUd = currentSupplyInUd.mul(
            (
                (ud(1e18).add(inaTokensDepositedInUd.div(currentReservesInUd)))
                    .pow(reserveRatioInUd)
            ).sub(ud(1e18))
        );
        uint256 creatorTokensBought = unwrap(creatorTokensInUd);
        // next, check whether the supply cap is not breached
        if (
            c.creatorToPool[creator].creatorToken.totalSupply() +
                creatorTokensBought >
            c.SUPPLY_CAP
        ) {
            revert CreatorEconomy__CanNotExceedSupplyCap();
        }
        // Now, we can mint new creator tokens and update the creatorTokenPool parameters accordingly
        Inani(c.i_inani).transferFrom(
            msg.sender,
            address(this),
            inaTokensDeposited
        );
        c.creatorToPool[creator].creatorToken.mint(
            msg.sender,
            creatorTokensBought
        );
        // update the pool
        c.creatorToPool[creator].currentReserves += inaTokensDeposited;
        // update the users' balances mapping
        c.userToBalances[msg.sender][
            address(c.creatorToPool[creator].creatorToken)
        ] += creatorTokensBought;
        emit CreatorTokensMinted(msg.sender, creator, creatorTokensBought);
        return creatorTokensBought;
    }

    // To redeem creator tokens
    // Returns number of INA tokens received for given number of creator tokens to redeem
    function redeemCreatorTokens(
        address creator,
        uint256 creatorTokensToRedeem
    ) external returns (uint256) {
        LibDiamond.CreatorEconomyStorage storage c = LibDiamond
            .creatorEconomyStorage();
        if (creatorTokensToRedeem == 0) {
            return 0;
        }
        // first, check if the user has enough tokens to redeem
        if (
            c.creatorToPool[creator].creatorToken.balanceOf(msg.sender) <
            creatorTokensToRedeem
        ) {
            revert CreatorEconomy__NotEnoughToRedeem();
        }
        // check that after redemption, the currentSupply should not go below the INITIAL_SUPPLY
        if (
            c.creatorToPool[creator].creatorToken.totalSupply() -
                creatorTokensToRedeem <
            c.INITIAL_SUPPLY
        ) {
            revert CreatorEconomy__SupplyCanNotGoBelowGenesisTokens();
        }
        // Now, we may go ahead with the redemption request
        UD60x18 currentReservesInUd = ud(
            c.creatorToPool[creator].currentReserves
        );
        UD60x18 currentSupplyInUd = ud(
            c.creatorToPool[creator].creatorToken.totalSupply()
        );
        UD60x18 creatorTokensToRedeemInUd = ud(creatorTokensToRedeem);
        UD60x18 reserveRatioInUd = ud(0.10e18); // representing 10%
        UD60x18 inaTokensInUd = currentReservesInUd.mul(
            ud(1e18).sub(
                (
                    (
                        (currentSupplyInUd.sub(creatorTokensToRedeemInUd)).pow(
                            ud(1e18).div(reserveRatioInUd)
                        )
                    ).div(currentSupplyInUd.pow(ud(1e18).div(reserveRatioInUd)))
                )
            )
        );
        uint256 inaTokens = unwrap(inaTokensInUd);
        // burn creator tokens redeemed
        c.creatorToPool[creator].creatorToken.burn(
            msg.sender,
            creatorTokensToRedeem
        );
        // transfer INA tokens to user
        Inani(c.i_inani).transfer(msg.sender, inaTokens);
        // update the pool
        c.creatorToPool[creator].currentReserves -= inaTokens;
        // update the users' balances mapping
        c.userToBalances[msg.sender][
            address(c.creatorToPool[creator].creatorToken)
        ] -= creatorTokensToRedeem;
        emit CreatorTokensBurnt(msg.sender, creator, creatorTokensToRedeem);
        return inaTokens;
    }

    function stakeCreatorTokens(
        address creator,
        uint256 creatorTokensToStake
    ) external {
        LibDiamond.CreatorEconomyStorage storage c = LibDiamond
            .creatorEconomyStorage();
        if (creatorTokensToStake == 0) {
            return;
        }
        // first, check if the user has enough creator tokens to stake
        if (
            c.creatorToPool[creator].creatorToken.balanceOf(msg.sender) <
            creatorTokensToStake
        ) {
            revert CreatorEconomy__NotEnoughBalance();
        }
        // transfer the creator tokens from the user to this contract
        c.creatorToPool[creator].creatorToken.transferFrom(
            msg.sender,
            address(this),
            creatorTokensToStake
        );
        // update the user's balances mapping
        c.userToBalances[msg.sender][
            address(c.creatorToPool[creator].creatorToken)
        ] -= creatorTokensToStake;
        // update the creatorTokenPool's totalStakedTokens and stakedBalances mapping
        c.creatorToPool[creator].totalStakedTokens += creatorTokensToStake;
        c.stakedBalances[creator][msg.sender] += creatorTokensToStake;
    }

    function withdrawStakedCreatorTokens(address creator) external {
        LibDiamond.CreatorEconomyStorage storage c = LibDiamond
            .creatorEconomyStorage();
        uint256 stakedCreatorTokens = c.stakedBalances[creator][msg.sender];
        if (stakedCreatorTokens == 0) {
            return;
        }
        // calculate the INA tokens to reward the user with
        uint256 inaTokensToReward = (stakedCreatorTokens *
            (c.creatorToPool[creator].INA_REWARD_PER_CREATOR_TOKEN)) / (1e18);
        // transfer the INA tokens to the user
        Inani(c.i_inani).transfer(msg.sender, inaTokensToReward);
        // update the creatorTokenPool's totalStakedTokens and stakedBalances mapping
        c.creatorToPool[creator].totalStakedTokens -= stakedCreatorTokens;
        c.stakedBalances[creator][msg.sender] = 0;
        // transfer the creator tokens back to the user
        c.creatorToPool[creator].creatorToken.transfer(
            msg.sender,
            stakedCreatorTokens
        );
    }

    // To swap creator tokens
    function swapCreatorTokens(
        address swapFrom,
        uint256 swapFromAmount,
        address swapTo
    ) external returns (bool) {
        LibDiamond.CreatorEconomyStorage storage c = LibDiamond
            .creatorEconomyStorage();
        // check if both token addresses are valid
        if (swapFrom == address(0) || swapTo == address(0)) {
            revert CreatorEconomy__InvalidTokenAddress();
        }
        // check if the user has enough balance of tokens to be swapped
        if (CreatorToken(swapFrom).balanceOf(msg.sender) < swapFromAmount) {
            revert CreatorEconomy__NotEnoughBalanceToSWap();
        }
        address swapFromCreator = c.tokenToCreator[swapFrom];
        address swapToCreator = c.tokenToCreator[swapTo];
        // get equivalent INA tokens for swapFromAmount
        if (
            c.creatorToPool[swapFromCreator].creatorToken.totalSupply() -
                swapFromAmount <
            c.INITIAL_SUPPLY
        ) {
            revert CreatorEconomy__SupplyCanNotGoBelowGenesisTokens();
        }
        UD60x18 currentFromReservesInUd = ud(
            c.creatorToPool[swapFromCreator].currentReserves
        );
        UD60x18 currentFromSupplyInUd = ud(
            c.creatorToPool[swapFromCreator].creatorToken.totalSupply()
        );
        UD60x18 swapFromAmountInUd = ud(swapFromAmount);
        UD60x18 reserveRatioInUd = ud(0.10e18); // representing 10%
        UD60x18 inaTokensInUd = currentFromReservesInUd.mul(
            ud(1e18).sub(
                (
                    (
                        (currentFromSupplyInUd.sub(swapFromAmountInUd)).pow(
                            ud(1e18).div(reserveRatioInUd)
                        )
                    ).div(
                            currentFromSupplyInUd.pow(
                                ud(1e18).div(reserveRatioInUd)
                            )
                        )
                )
            )
        );
        uint256 inaTokens = unwrap(inaTokensInUd);
        c.creatorToPool[swapFromCreator].creatorToken.burn(
            msg.sender,
            swapFromAmount
        );
        // update the pool
        c.creatorToPool[swapFromCreator].currentReserves -= inaTokens;
        // update the users' balances mapping
        c.userToBalances[msg.sender][
            address(c.creatorToPool[swapFromCreator].creatorToken)
        ] -= swapFromAmount;

        // Now, get swapTo tokens using these inaTokens
        UD60x18 currentToReservesInUd = ud(
            c.creatorToPool[swapToCreator].currentReserves
        );
        UD60x18 currentToSupplyInUd = ud(
            c.creatorToPool[swapToCreator].creatorToken.totalSupply()
        );
        UD60x18 swapToAmountInUd = currentToSupplyInUd.mul(
            (
                (ud(1e18).add(inaTokensInUd.div(currentToReservesInUd))).pow(
                    reserveRatioInUd
                )
            ).sub(ud(1e18))
        );
        uint256 swapToAmount = unwrap(swapToAmountInUd);
        // next, check whether the supply cap is not breached
        if (
            c.creatorToPool[swapToCreator].creatorToken.totalSupply() +
                swapToAmount >
            c.SUPPLY_CAP
        ) {
            revert CreatorEconomy__CanNotExceedSupplyCap();
        }
        c.creatorToPool[swapToCreator].creatorToken.mint(
            msg.sender,
            swapToAmount
        );
        // update the pool
        c.creatorToPool[swapToCreator].currentReserves += inaTokens;
        // update the users' balances mapping
        c.userToBalances[msg.sender][
            address(c.creatorToPool[swapToCreator].creatorToken)
        ] += swapToAmount;
        return true;
    }
}
