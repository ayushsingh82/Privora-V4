// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Deployers} from "v4-core-test/utils/Deployers.sol";
import {Hooks} from "v4-core/libraries/Hooks.sol";
import {IHooks} from "v4-core/interfaces/IHooks.sol";
import {IPoolManager} from "v4-core/interfaces/IPoolManager.sol";
import {PoolKey} from "v4-core/types/PoolKey.sol";
import {PoolId} from "v4-core/types/PoolId.sol";
import {Currency} from "v4-core/types/Currency.sol";
import {TickMath} from "v4-core/libraries/TickMath.sol";
import {PoolSwapTest} from "v4-core/test/PoolSwapTest.sol";
import {PrivoraGuardHook} from "../src/PrivoraGuardHook.sol";

contract PrivoraGuardHookTest is Deployers {
    PrivoraGuardHook hook;
    PoolKey hkey;
    PoolId hid;

    function setUp() public {
        deployFreshManagerAndRouters();
        (currency0, currency1) = deployMintAndApprove2Currencies();
        address flagged = address(uint160(Hooks.BEFORE_SWAP_FLAG | Hooks.AFTER_SWAP_FLAG) ^ (0x4444 << 144));
        deployCodeTo("PrivoraGuardHook.sol:PrivoraGuardHook", abi.encode(manager, 1000), flagged); // 10% max move
        hook = PrivoraGuardHook(flagged);
        (hkey, hid) = initPoolAndAddLiquidity(currency0, currency1, IHooks(flagged), 3000, SQRT_PRICE_1_1);
    }

    function _swap(int256 amt) internal {
        swapRouter.swap(hkey, IPoolManager.SwapParams(true, amt, TickMath.MIN_SQRT_PRICE + 1), PoolSwapTest.TestSettings(false, false), "");
    }

    function test_smallSwapPasses_andCounts() public {
        _swap(-0.001 ether);
        assertEq(hook.swapCount(hid), 1);
        assertGt(hook.largestMoveBps(hid), 0);
        assertLe(hook.largestMoveBps(hid), 1000);
    }

    function test_hugeSwapReverts() public {
        vm.expectRevert(); // wrapped by the PoolManager (WrappedError around PriceMoveTooLarge)
        _swap(-5 ether);
        assertEq(hook.swapCount(hid), 0);
    }

    function test_onlyPoolManager() public {
        vm.expectRevert(PrivoraGuardHook.NotPoolManager.selector);
        hook.beforeSwap(address(this), hkey, IPoolManager.SwapParams(true, -1, 0), "");
    }
}
