// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import {Election} from "../contracts/Election.sol";
import {Party} from "../contracts/Party.sol";
import {Candidate} from "../contracts/Candidate.sol";
import {Candidacy, ICandidacyStatus} from "../contracts/Candidacy.sol";
import {DonationHolder} from "../contracts/DonationHolder.sol";
import {IDonatable} from "../contracts/IDonatable.sol";
import {ElectionFactoryNominationTestBase} from "./ElectionFactoryNominationTestBase.sol";

contract CandidacyTest is ElectionFactoryNominationTestBase {
    Election election;
    Party party;
    Candidate candidate;
    Candidacy candidacy;
    address donor = address(0xD0);
    address wallet;

    function setUp() public override {
        super.setUp();
        election = _election();
        party = _party(president1);
        candidate = _candidate(party);
        candidacy = _nominate(election, candidate);
        wallet = candidate.owner();
        vm.deal(donor, 100 ether);
    }

    // critério 12
    function test_shouldRevertWhenInitializedAgain() public {
        vm.expectRevert(Initializable.InvalidInitialization.selector);
        candidacy.initialize(address(1), address(2), candidate, address(3), ICandidacyStatus(address(factory)));
        assertEq(candidacy.owner(), wallet);
        assertEq(candidacy.election(), address(election));
    }

    function test_shouldLockTheImplementation() public {
        Candidacy implementation = new Candidacy();
        vm.expectRevert(Initializable.InvalidInitialization.selector);
        implementation.initialize(address(1), address(2), candidate, address(3), ICandidacyStatus(address(factory)));
    }

    // critério 27
    function test_shouldAcceptDonations() public {
        vm.prank(donor);
        candidacy.donate{value: 1 ether}();
        vm.prank(donor);
        candidacy.donate{value: 2 ether}();
        assertEq(candidacy.donatedBy(donor), 3 ether);
        assertEq(address(candidacy).balance, 3 ether);
    }

    function test_shouldAcceptOneWei() public {
        vm.prank(donor);
        candidacy.donate{value: 1}();
        assertEq(candidacy.donatedBy(donor), 1);
    }

    function test_shouldEmitDonated() public {
        vm.expectEmit(true, false, false, true, address(candidacy));
        emit IDonatable.Donated(donor, 1 ether);
        vm.prank(donor);
        candidacy.donate{value: 1 ether}();
    }

    // critério 28
    function test_shouldRevertWithZeroDonation() public {
        vm.expectRevert(IDonatable.ZeroDonation.selector);
        vm.prank(donor);
        candidacy.donate();
    }

    // critério 29
    function test_shouldRefuseDonationsAfterWithdrawingTheNomination() public {
        vm.prank(donor);
        candidacy.donate{value: 1 ether}();
        vm.prank(president1);
        factory.withdrawNomination(election, party);
        vm.expectRevert(Candidacy.NominationInactive.selector);
        vm.prank(donor);
        candidacy.donate{value: 1 ether}();
        assertEq(candidacy.donatedBy(donor), 1 ether);
        assertEq(address(candidacy).balance, 1 ether);
    }

    function test_shouldRefuseDonationsAfterTheNomineeIsReplaced() public {
        Candidate other = _candidate(party);
        _nominate(election, other);
        vm.expectRevert(Candidacy.NominationInactive.selector);
        vm.prank(donor);
        candidacy.donate{value: 1 ether}();
    }

    // critério 30
    function test_shouldRevertOnPlainTransfer() public {
        vm.prank(donor);
        (bool ok, ) = address(candidacy).call{value: 1 ether}("");
        assertFalse(ok);
        vm.prank(donor);
        (ok, ) = address(candidacy).call{value: 1 ether}(hex"deadbeef");
        assertFalse(ok);
    }

    // critério 31
    function test_shouldWithdraw() public {
        vm.prank(donor);
        candidacy.donate{value: 3 ether}();
        address to = address(0x70);
        vm.prank(wallet);
        candidacy.withdraw(to, 1 ether);
        assertEq(to.balance, 1 ether);
        assertEq(address(candidacy).balance, 2 ether);
        assertEq(candidacy.donatedBy(donor), 3 ether);
        vm.prank(wallet);
        candidacy.withdraw(to, 2 ether);
        assertEq(address(candidacy).balance, 0);
        vm.prank(wallet);
        candidacy.withdraw(to, 0);
    }

    function test_shouldWithdrawAfterTheNominationIsWithdrawn() public {
        vm.prank(donor);
        candidacy.donate{value: 1 ether}();
        vm.prank(president1);
        factory.withdrawNomination(election, party);
        address to = address(0x70);
        vm.prank(wallet);
        candidacy.withdraw(to, 1 ether);
        assertEq(to.balance, 1 ether);
    }

    // critério 32
    function test_shouldRevertWithOnlyOwner() public {
        vm.prank(donor);
        candidacy.donate{value: 1 ether}();
        // nem o presidente do partido saca
        vm.expectRevert(
            abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, president1)
        );
        vm.prank(president1);
        candidacy.withdraw(president1, 1);
    }

    function test_shouldRevertWithInsufficientBalance() public {
        vm.prank(donor);
        candidacy.donate{value: 1 ether}();
        vm.expectRevert(
            abi.encodeWithSelector(DonationHolder.InsufficientBalance.selector, 1 ether, 1 ether + 1)
        );
        vm.prank(wallet);
        candidacy.withdraw(address(0x70), 1 ether + 1);
    }

    function test_shouldRevertWithInvalidRecipient() public {
        vm.expectRevert(DonationHolder.InvalidRecipient.selector);
        vm.prank(wallet);
        candidacy.withdraw(address(0), 0);
    }

    function test_shouldRevertWithWithdrawFailed() public {
        vm.prank(donor);
        candidacy.donate{value: 1 ether}();
        address rejecting = address(new Rejecting());
        vm.expectRevert(DonationHolder.WithdrawFailed.selector);
        vm.prank(wallet);
        candidacy.withdraw(rejecting, 1 ether);
        assertEq(address(candidacy).balance, 1 ether);
    }

    // critério 33
    function test_shouldRevertOnRenounceOwnership() public {
        vm.expectRevert(DonationHolder.RenounceDisabled.selector);
        candidacy.renounceOwnership();
    }
}

contract Rejecting {
    receive() external payable {
        revert();
    }
}
