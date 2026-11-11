// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import {ElectionFactory} from "../contracts/ElectionFactory.sol";
import {ElectionFactoryTestBase} from "./ElectionFactoryTestBase.sol";

contract ElectionFactoryRenounceOwnershipTest is ElectionFactoryTestBase {
    function test_shouldRevertWithRenounceDisabled() public {
        vm.expectRevert(ElectionFactory.RenounceDisabled.selector);
        factory.renounceOwnership();
    }
}
