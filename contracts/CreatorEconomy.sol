// conracts/CreatorEconomy.sol
// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import "./CreatorToken.sol";
//import "./Inani.sol";
import "@prb/math/src/UD60x18.sol";

//error CreatorEconomy__CreatorAlreadyAdded();
error CreatorEconomy__NotEnoughBalance();
error CreatorEconomy__NotEnoughAllowance();
error CreatorEconomy__CanNotExceedSupplyCap();
error CreatorEconomy__NotEnoughToRedeem();
error CreatorEconomy__SupplyCanNotGoBelowGenesisTokens();
error CreatorEconomy__NotEnoughBalanceForInitialLiquidity();
error CreatorEconomy__NotEnoughAllowanceForInitialLiquidity();
error CreatorEconomy__InvalidTokenAddress();
error CreatorEconomy__NotEnoughBalanceToSWap();

contract CreatorEconomy {
    struct CreatorTokenPool {
        CreatorToken creatorToken; // currentSupply can be taken from this token contract
        uint256 currentReserves; // in INA
    }

    address public immutable i_inaniTokenAddress;
    IERC20 public immutable i_inani;
    uint256 private constant SUPPLY_CAP = 210000 * (10**18); // max supply that can be minted for a token
    uint256 private constant INITIAL_SUPPLY = 50000 * (10**18); // goes to the creator
    // UD60x18 private constant RESERVE_RATIO = ud(0.05e18); // in percentage
    uint256 public constant INITIAL_LIQUIDITY = 5000 * (10**18); // in INA

    // mapping the creator to their token pool
    mapping(address => CreatorTokenPool) private creatorToPool;
    // mapping users to their creator tokens' balances
    mapping(address => mapping(address => uint256)) private userToBalances;
    // mapping creator token address to creator address
    mapping(address => address) private tokenToCreator;

    event CreatorAdded(address indexed creator, address indexed creatorToken);
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

    constructor(address inaniTokenAddress) {
        i_inaniTokenAddress = inaniTokenAddress;
        i_inani = IERC20(inaniTokenAddress);
    }

    // modifier notAlreadyAdded(address _creator) {
    //     _;
    // }

    // To add new creator to the platform
    function addCreator(
        address creator,
        string memory tokenName,
        string memory tokenSymbol
    ) external {
        require(
            address(creatorToPool[creator].creatorToken) == address(0),
            "Creator already added"
        );
        // check if creator has enough INA tokens for initial liquidity
        if (i_inani.balanceOf(creator) < INITIAL_LIQUIDITY) {
            revert CreatorEconomy__NotEnoughBalanceForInitialLiquidity();
        }
        // also, the creator must have approved the allowance to this contract
        if (i_inani.allowance(creator, address(this)) < INITIAL_LIQUIDITY) {
            revert CreatorEconomy__NotEnoughAllowanceForInitialLiquidity();
        }
        // pull the initial liquidity from creator
        i_inani.transferFrom(creator, address(this), INITIAL_LIQUIDITY);
        // create new cretor token with INITIAL_SUPPLY minted to the creator
        CreatorToken _creatorToken = new CreatorToken(
            tokenName,
            tokenSymbol,
            creator,
            INITIAL_SUPPLY
        );
        // create the pool for this creator token
        CreatorTokenPool memory newCreatorTokenPool = CreatorTokenPool(
            _creatorToken,
            // 1 * (10 ** 18),
            INITIAL_LIQUIDITY
        );
        // update the mapping for creators to their respective pool
        creatorToPool[creator] = newCreatorTokenPool;
        // update token to creator mapping
        tokenToCreator[address(_creatorToken)] = creator;
        emit CreatorAdded(creator, address(_creatorToken));
    }

    // To purchase creator tokens
    // Returns number of Creator tokens received for given number of INA tokens deposited
    function buyCreatorTokens(address creator, uint256 inaTokensDeposited)
        public
        returns (uint256)
    {
        if (inaTokensDeposited == 0) {
            return 0;
        }
        // first check whether msg.sender has enough INA tokens
        if (i_inani.balanceOf(msg.sender) < inaTokensDeposited) {
            revert CreatorEconomy__NotEnoughBalance();
        }
        // next, check if the user has approved the allowance for this contract
        if (i_inani.allowance(msg.sender, address(this)) < inaTokensDeposited) {
            revert CreatorEconomy__NotEnoughAllowance();
        }
        // Now calculate how many Creator tokens can be bought with inaTokensDeposited
        UD60x18 currentReservesInUd = ud(
            creatorToPool[creator].currentReserves
        );
        UD60x18 currentSupplyInUd = ud(
            creatorToPool[creator].creatorToken.totalSupply()
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
            creatorToPool[creator].creatorToken.totalSupply() +
                creatorTokensBought >
            SUPPLY_CAP
        ) {
            revert CreatorEconomy__CanNotExceedSupplyCap();
        }
        // Now, we can mint new creator tokens and update the creatorTokenPool parameters accordingly
        i_inani.transferFrom(msg.sender, address(this), inaTokensDeposited);
        creatorToPool[creator].creatorToken.mint(
            msg.sender,
            creatorTokensBought
        );
        // update the pool
        creatorToPool[creator].currentReserves += inaTokensDeposited;
        // update the users' balances mapping
        userToBalances[msg.sender][
            address(creatorToPool[creator].creatorToken)
        ] += creatorTokensBought;
        emit CreatorTokensMinted(msg.sender, creator, creatorTokensBought);
        return creatorTokensBought;
    }

    // To redeem creator tokens
    // Returns number of INA tokens received for given number of creator tokens to redeem
    function redeemCreatorTokens(address creator, uint256 creatorTokensToRedeem)
        public
        returns (uint256)
    {
        if (creatorTokensToRedeem == 0) {
            return 0;
        }
        // first, check if the user has enough tokens to redeem
        if (
            creatorToPool[creator].creatorToken.balanceOf(msg.sender) <
            creatorTokensToRedeem
        ) {
            revert CreatorEconomy__NotEnoughToRedeem();
        }
        // check that after redemption, the currentSupply should not go below the INITIAL_SUPPLY
        if (
            creatorToPool[creator].creatorToken.totalSupply() -
                creatorTokensToRedeem <
            INITIAL_SUPPLY
        ) {
            revert CreatorEconomy__SupplyCanNotGoBelowGenesisTokens();
        }
        // Now, we may go ahead with the redemption request
        UD60x18 currentReservesInUd = ud(
            creatorToPool[creator].currentReserves
        );
        UD60x18 currentSupplyInUd = ud(
            creatorToPool[creator].creatorToken.totalSupply()
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
        creatorToPool[creator].creatorToken.burn(
            msg.sender,
            creatorTokensToRedeem
        );
        // transfer INA tokens to user
        i_inani.transfer(msg.sender, inaTokens);
        // update the pool
        creatorToPool[creator].currentReserves -= inaTokens;
        // update the users' balances mapping
        userToBalances[msg.sender][
            address(creatorToPool[creator].creatorToken)
        ] -= creatorTokensToRedeem;
        emit CreatorTokensBurnt(msg.sender, creator, creatorTokensToRedeem);
        return inaTokens;
    }

    // To swap creator tokens
    function swapCreatorTokens(
        address swapFrom,
        uint256 swapFromAmount,
        address swapTo
    ) public returns (bool) {
        // check if both token addresses are valid
        if (swapFrom == address(0) || swapTo == address(0)) {
            revert CreatorEconomy__InvalidTokenAddress();
        }
        // check if the user has enough balance of tokens to be swapped
        if (CreatorToken(swapFrom).balanceOf(msg.sender) < swapFromAmount) {
            revert CreatorEconomy__NotEnoughBalanceToSWap();
        }
        address swapFromCreator = tokenToCreator[swapFrom];
        address swapToCreator = tokenToCreator[swapTo];
        // get equivalent INA tokens for swapFromAmount
        if (
            creatorToPool[swapFromCreator].creatorToken.totalSupply() -
                swapFromAmount <
            INITIAL_SUPPLY
        ) {
            revert CreatorEconomy__SupplyCanNotGoBelowGenesisTokens();
        }
        UD60x18 currentFromReservesInUd = ud(
            creatorToPool[swapFromCreator].currentReserves
        );
        UD60x18 currentFromSupplyInUd = ud(
            creatorToPool[swapFromCreator].creatorToken.totalSupply()
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
        creatorToPool[swapFromCreator].creatorToken.burn(
            msg.sender,
            swapFromAmount
        );
        // update the pool
        creatorToPool[swapFromCreator].currentReserves -= inaTokens;
        // update the users' balances mapping
        userToBalances[msg.sender][
            address(creatorToPool[swapFromCreator].creatorToken)
        ] -= swapFromAmount;

        // Now, get swapTo tokens using these inaTokens
        UD60x18 currentToReservesInUd = ud(
            creatorToPool[swapToCreator].currentReserves
        );
        UD60x18 currentToSupplyInUd = ud(
            creatorToPool[swapToCreator].creatorToken.totalSupply()
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
            creatorToPool[swapToCreator].creatorToken.totalSupply() +
                swapToAmount >
            SUPPLY_CAP
        ) {
            revert CreatorEconomy__CanNotExceedSupplyCap();
        }
        creatorToPool[swapToCreator].creatorToken.mint(
            msg.sender,
            swapToAmount
        );
        // update the pool
        creatorToPool[swapToCreator].currentReserves += inaTokens;
        // update the users' balances mapping
        userToBalances[msg.sender][
            address(creatorToPool[swapToCreator].creatorToken)
        ] += swapToAmount;
        return true;
    }

    // view and pure functions
    function getInaTokenAddress() public view returns (address) {
        return address(i_inani);
    }

    function getCreatorTokenAddress(address creator)
        public
        view
        returns (address)
    {
        return address(creatorToPool[creator].creatorToken);
    }

    function getUserBalanceForCreatorToken(address creator)
        public
        view
        returns (uint256)
    {
        return creatorToPool[creator].creatorToken.balanceOf(msg.sender);
    }

    function getCurrentSupply(address creator) public view returns (uint256) {
        return creatorToPool[creator].creatorToken.totalSupply();
    }
}
