// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import {Test} from "forge-std/Test.sol";
import {IDonatable} from "../contracts/IDonatable.sol";
import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";
import {Party} from "../contracts/Party.sol";
import {Candidate} from "../contracts/Candidate.sol";

contract CandidateDonateTest is Test {
    Candidate candidate;
    address donor = address(0xD0);

    function setUp() public {
        Party party = Party(Clones.clone(address(new Party())));
        party.initialize(address(0xA11CE), "Alfa");
        vm.prank(address(0xA11CE));
        candidate = party.createCandidate(address(0xCA11), "Candidato Um");
        vm.deal(donor, 100 ether);
    }

    function test_shouldAcceptOneWei() public {
        vm.prank(donor);
        candidate.donate{value: 1}();
        assertEq(candidate.donatedBy(donor), 1);
        assertEq(address(candidate).balance, 1);
    }

    function test_shouldAccumulatePerDonor() public {
        vm.startPrank(donor);
        candidate.donate{value: 1 ether}();
        candidate.donate{value: 2 ether}();
        vm.stopPrank();
        assertEq(candidate.donatedBy(donor), 3 ether);
        assertEq(address(candidate).balance, 3 ether);
    }

    function test_shouldEmitDonated(uint96 amount) public {
        vm.assume(amount > 0);
        vm.deal(donor, amount);
        vm.expectEmit(true, false, false, true, address(candidate));
        emit IDonatable.Donated(donor, amount);
        vm.prank(donor);
        candidate.donate{value: amount}();
    }

    function test_shouldRevertWithZeroDonation() public {
        vm.expectRevert(IDonatable.ZeroDonation.selector);
        vm.prank(donor);
        candidate.donate();
    }

    function test_shouldRevertOnPlainTransfer() public {
        vm.prank(donor);
        (bool ok, ) = address(candidate).call{value: 1 ether}("");
        assertFalse(ok);
    }

    function test_shouldRevertOnUnknownCalldata() public {
        vm.prank(donor);
        (bool ok, ) = address(candidate).call{value: 1 ether}(hex"deadbeef");
        assertFalse(ok);
    }
}
