// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {IHooks} from "v4-core/interfaces/IHooks.sol";
import {IPoolManager} from "v4-core/interfaces/IPoolManager.sol";
import {PoolKey} from "v4-core/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "v4-core/types/PoolId.sol";
import {BalanceDelta} from "v4-core/types/BalanceDelta.sol";
import {BeforeSwapDelta, BeforeSwapDeltaLibrary} from "v4-core/types/BeforeSwapDelta.sol";
import {StateLibrary} from "v4-core/libraries/StateLibrary.sol";
import {FullMath} from "v4-core/libraries/FullMath.sol";

/// @title PrivoraGuardHook (Privora Guard)
/// @notice Uniswap v4 hook that protects thin pools: a single swap may not move the pool price by more than
///         `maxMoveBps` (basis points). Larger swaps revert, so users (and the V4Quoter) see "blocked" instead of
///         a terrible fill. It also keeps simple per-pool stats. Permissions: beforeSwap + afterSwap only.
/// @dev The hook address must have the low 14 bits 0x00C0 (BEFORE_SWAP | AFTER_SWAP); deploy through CREATE2 with a mined salt.
contract PrivoraGuardHook {
    using PoolIdLibrary for PoolKey;
    using StateLibrary for IPoolManager;

    IPoolManager public immutable poolManager;
    /// @notice Max allowed price move per swap, in basis points of price (1000 = 10%).
    uint256 public immutable maxMoveBps;

    mapping(PoolId => uint160) private priceBefore;
    mapping(PoolId => uint256) public swapCount;
    mapping(PoolId => uint256) public largestMoveBps; // largest price move seen on an allowed swap

    error NotPoolManager();
    error PriceMoveTooLarge(uint256 moveBps, uint256 maxMoveBps);

    event GuardedSwap(PoolId indexed id, address indexed sender, uint256 moveBps);

    constructor(IPoolManager _poolManager, uint256 _maxMoveBps) {
        require(_maxMoveBps > 0 && _maxMoveBps < 10_000, "bad max");
        poolManager = _poolManager;
        maxMoveBps = _maxMoveBps;
    }

    modifier onlyPoolManager() {
        if (msg.sender != address(poolManager)) revert NotPoolManager();
        _;
    }

    function beforeSwap(address, PoolKey calldata key, IPoolManager.SwapParams calldata, bytes calldata)
        external
        onlyPoolManager
        returns (bytes4, BeforeSwapDelta, uint24)
    {
        PoolId id = key.toId();
        (uint160 sqrtP,,,) = poolManager.getSlot0(id);
        priceBefore[id] = sqrtP;
        return (IHooks.beforeSwap.selector, BeforeSwapDeltaLibrary.ZERO_DELTA, 0);
    }

    function afterSwap(address sender, PoolKey calldata key, IPoolManager.SwapParams calldata, BalanceDelta, bytes calldata)
        external
        onlyPoolManager
        returns (bytes4, int128)
    {
        PoolId id = key.toId();
        (uint160 sqrtAfter,,,) = poolManager.getSlot0(id);
        uint160 sqrtBefore = priceBefore[id];
        // price ratio (bps) = (sqrtAfter / sqrtBefore)^2 * 1e4
        uint256 r = FullMath.mulDiv(uint256(sqrtAfter), 1e4, uint256(sqrtBefore)); // sqrt ratio * 1e4
        uint256 ratioBps = (r * r) / 1e4;
        uint256 moveBps = ratioBps >= 1e4 ? ratioBps - 1e4 : 1e4 - ratioBps;
        if (moveBps > maxMoveBps) revert PriceMoveTooLarge(moveBps, maxMoveBps);
        swapCount[id] += 1;
        if (moveBps > largestMoveBps[id]) largestMoveBps[id] = moveBps;
        emit GuardedSwap(id, sender, moveBps);
        return (IHooks.afterSwap.selector, 0);
    }
}
