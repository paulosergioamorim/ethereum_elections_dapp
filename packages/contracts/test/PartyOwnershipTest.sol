// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import {Test} from "forge-std/Test.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";
import {Party} from "../contracts/Party.sol";
import {DonationHolder} from "../contracts/DonationHolder.sol";

contract PartyOwnershipTest is Test {
    Party party;
    address president = address(0xA11CE);
    address newPresident = address(0xB0B);

    function setUp() public {
        party = Party(Clones.clone(address(new Party())));
        party.initialize(president, "Test Party");
        vm.deal(address(this), 1 ether);
        party.donate{value: 1 ether}();
    }

    function test_shouldKeepPresidentUntilAccepted() public {
        vm.prank(president);
        party.transferOwnership(newPresident);
        assertEq(party.owner(), president);
        assertEq(party.pendingOwner(), newPresident);

        vm.prank(newPresident);
        party.acceptOwnership();
        assertEq(party.owner(), newPresident);
    }

    function test_shouldRevertFormerPresidentWithdrawAfterHandover() public {
        vm.prank(president);
        party.transferOwnership(newPresident);
        vm.prank(newPresident);
        party.acceptOwnership();

        vm.expectRevert(
            abi.encodeWithSelector(
                Ownable.OwnableUnauthorizedAccount.selector,
                president
            )
        );
        vm.prank(president);
        party.withdraw(president, 1);

        vm.prank(newPresident);
        party.withdraw(newPresident, 1 ether);
        assertEq(newPresident.balance, 1 ether);
    }

    function test_shouldRevertWithRenounceDisabled() public {
        vm.expectRevert(DonationHolder.RenounceDisabled.selector);
        vm.prank(president);
        party.renounceOwnership();
    }
}
