// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import {Test} from "forge-std/Test.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";
import {Party} from "../contracts/Party.sol";
import {Candidate} from "../contracts/Candidate.sol";
import {DonationHolder} from "../contracts/DonationHolder.sol";

contract RejectsEtherCandidate {}

contract CandidateWithdrawTest is Test {
    Candidate candidate;
    address president = address(0xA11CE);
    address wallet = address(0xCA11);
    address donor = address(0xD0);
    address payable recipient = payable(address(0xBEEF));

    function setUp() public {
        Party party = Party(Clones.clone(address(new Party())));
        party.initialize(president, "Alfa");
        vm.prank(president);
        candidate = party.createCandidate(wallet, "Candidato Um");
        vm.deal(donor, 100 ether);
        vm.prank(donor);
        candidate.donate{value: 10 ether}();
    }

    function test_shouldWithdrawPartial() public {
        vm.expectEmit(true, false, false, true, address(candidate));
        emit DonationHolder.Withdrawn(recipient, 4 ether);
        vm.prank(wallet);
        candidate.withdraw(recipient, 4 ether);
        assertEq(recipient.balance, 4 ether);
        assertEq(address(candidate).balance, 6 ether);
        assertEq(candidate.donatedBy(donor), 10 ether);
    }

    function test_shouldWithdrawWholeBalance() public {
        vm.prank(wallet);
        candidate.withdraw(recipient, 10 ether);
        assertEq(address(candidate).balance, 0);
        assertEq(recipient.balance, 10 ether);
    }

    function test_shouldAcceptZeroAmount() public {
        vm.prank(wallet);
        candidate.withdraw(recipient, 0);
        assertEq(address(candidate).balance, 10 ether);
    }

    function test_shouldRevertWithOnlyCandidateWallet(address sender) public {
        vm.assume(sender != wallet);
        vm.expectRevert(
            abi.encodeWithSelector(
                Ownable.OwnableUnauthorizedAccount.selector,
                sender
            )
        );
        vm.prank(sender);
        candidate.withdraw(recipient, 1);
    }

    function test_shouldRevertForPresident() public {
        vm.expectRevert(
            abi.encodeWithSelector(
                Ownable.OwnableUnauthorizedAccount.selector,
                president
            )
        );
        vm.prank(president);
        candidate.withdraw(president, 1);
    }

    function test_shouldRevertWithInsufficientBalance() public {
        vm.expectRevert(
            abi.encodeWithSelector(
                DonationHolder.InsufficientBalance.selector,
                10 ether,
                10 ether + 1
            )
        );
        vm.prank(wallet);
        candidate.withdraw(recipient, 10 ether + 1);
    }

    function test_shouldRevertWithInvalidRecipient() public {
        vm.expectRevert(DonationHolder.InvalidRecipient.selector);
        vm.prank(wallet);
        candidate.withdraw(address(0), 1);
    }

    function test_shouldRevertWithWithdrawFailedAndKeepBalance() public {
        address rejecter = address(new RejectsEtherCandidate());
        vm.expectRevert(DonationHolder.WithdrawFailed.selector);
        vm.prank(wallet);
        candidate.withdraw(rejecter, 1 ether);
        assertEq(address(candidate).balance, 10 ether);
    }

    function test_shouldDisableRenounceOwnership() public {
        vm.expectRevert(DonationHolder.RenounceDisabled.selector);
        vm.prank(wallet);
        candidate.renounceOwnership();
        assertEq(candidate.owner(), wallet);
    }
}
