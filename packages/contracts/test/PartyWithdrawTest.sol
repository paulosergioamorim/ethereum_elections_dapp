// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import {Test} from "forge-std/Test.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";
import {Party} from "../contracts/Party.sol";

contract RejectsEther {}

contract PartyWithdrawTest is Test {
    Party party;
    address president = address(0xA11CE);
    address donor = address(0xD0);
    address payable recipient = payable(address(0xBEEF));

    function setUp() public {
        party = Party(Clones.clone(address(new Party())));
        party.initialize(president, "Test Party");
        vm.deal(donor, 100 ether);
        vm.prank(donor);
        party.donate{value: 10 ether}();
    }

    function test_shouldWithdrawPartial() public {
        vm.expectEmit(true, false, false, true, address(party));
        emit Party.Withdrawn(recipient, 4 ether);
        vm.prank(president);
        party.withdraw(recipient, 4 ether);
        assertEq(recipient.balance, 4 ether);
        assertEq(address(party).balance, 6 ether);
        assertEq(party.donatedBy(donor), 10 ether);
    }

    function test_shouldWithdrawWholeBalance() public {
        vm.prank(president);
        party.withdraw(recipient, 10 ether);
        assertEq(address(party).balance, 0);
        assertEq(recipient.balance, 10 ether);
    }

    function test_shouldAcceptZeroAmount() public {
        vm.prank(president);
        party.withdraw(recipient, 0);
        assertEq(recipient.balance, 0);
        assertEq(address(party).balance, 10 ether);
    }

    function test_shouldRevertWithOnlyPresident(address sender) public {
        vm.assume(sender != president);
        vm.expectRevert(
            abi.encodeWithSelector(
                Ownable.OwnableUnauthorizedAccount.selector,
                sender
            )
        );
        vm.prank(sender);
        party.withdraw(recipient, 1);
    }

    function test_shouldRevertWithInsufficientBalance() public {
        vm.expectRevert(
            abi.encodeWithSelector(
                Party.InsufficientBalance.selector,
                10 ether,
                10 ether + 1
            )
        );
        vm.prank(president);
        party.withdraw(recipient, 10 ether + 1);
    }

    function test_shouldRevertWithInvalidRecipient() public {
        vm.expectRevert(Party.InvalidRecipient.selector);
        vm.prank(president);
        party.withdraw(address(0), 1);
    }

    function test_shouldRevertWithWithdrawFailedAndKeepBalance() public {
        address rejecter = address(new RejectsEther());
        vm.expectRevert(Party.WithdrawFailed.selector);
        vm.prank(president);
        party.withdraw(rejecter, 1 ether);
        assertEq(address(party).balance, 10 ether);
    }
}
