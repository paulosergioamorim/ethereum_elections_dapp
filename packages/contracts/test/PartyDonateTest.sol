// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import {Test} from "forge-std/Test.sol";
import {IDonatable} from "../contracts/IDonatable.sol";
import {Party} from "../contracts/Party.sol";

contract PartyDonateTest is Test {
    Party party;
    address president = address(0xA11CE);
    address donor = address(0xD0);

    function setUp() public {
        party = new Party(president, "PT");
        vm.deal(donor, 100 ether);
    }

    function test_shouldAcceptOneWei() public {
        vm.prank(donor);
        party.donate{value: 1}();
        assertEq(party.donatedBy(donor), 1);
        assertEq(address(party).balance, 1);
    }

    function test_shouldAccumulatePerDonor() public {
        vm.startPrank(donor);
        party.donate{value: 1 ether}();
        party.donate{value: 2 ether}();
        vm.stopPrank();
        assertEq(party.donatedBy(donor), 3 ether);
        assertEq(address(party).balance, 3 ether);
    }

    function test_shouldEmitDonated(uint96 amount) public {
        vm.assume(amount > 0);
        vm.deal(donor, amount);
        vm.expectEmit(true, false, false, true, address(party));
        emit IDonatable.Donated(donor, amount);
        vm.prank(donor);
        party.donate{value: amount}();
    }

    function test_shouldRevertWithZeroDonation() public {
        vm.expectRevert(IDonatable.ZeroDonation.selector);
        vm.prank(donor);
        party.donate();
    }

    function test_shouldRevertOnPlainTransfer() public {
        vm.prank(donor);
        (bool ok, ) = address(party).call{value: 1 ether}("");
        assertFalse(ok);
    }

    function test_shouldRevertOnUnknownCalldata() public {
        vm.prank(donor);
        (bool ok, ) = address(party).call{value: 1 ether}(hex"deadbeef");
        assertFalse(ok);
        assertEq(address(party).balance, 0);
    }

    function test_shouldImplementIDonatable() public {
        vm.prank(donor);
        IDonatable(address(party)).donate{value: 1}();
        assertEq(party.donatedBy(donor), 1);
    }
}
