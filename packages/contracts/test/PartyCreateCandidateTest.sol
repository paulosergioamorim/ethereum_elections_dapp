// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import {Test, Vm} from "forge-std/Test.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";
import {Party} from "../contracts/Party.sol";
import {Candidate} from "../contracts/Candidate.sol";

contract PartyCreateCandidateTest is Test {
    Party party;
    address president = address(0xA11CE);
    address wallet = address(0xCA11);

    function setUp() public {
        party = Party(Clones.clone(address(new Party())));
        party.initialize(president, "Alfa");
    }

    function test_shouldCreateCandidate() public {
        vm.prank(president);
        Candidate c = party.createCandidate(wallet, "Candidato Um");
        assertEq(c.owner(), wallet);
        assertEq(c.name(), "Candidato Um");
        assertEq(c.party(), address(party));
        assertEq(party.candidates().length, 1);
        assertEq(address(party.candidates()[0]), address(c));
        assertTrue(party.isCandidate(address(c)));
        assertFalse(party.isCandidate(wallet));
    }

    function test_shouldEmitCandidateCreated() public {
        vm.recordLogs();
        vm.prank(president);
        Candidate c = party.createCandidate(wallet, "Candidato Um");
        Vm.Log[] memory logs = vm.getRecordedLogs();
        Vm.Log memory log = logs[logs.length - 1];
        assertEq(log.emitter, address(party));
        assertEq(log.topics[0], Party.CandidateCreated.selector);
        assertEq(address(uint160(uint256(log.topics[1]))), address(c));
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
        party.createCandidate(wallet, "Candidato Um");
    }

    function test_shouldRevertWithInvalidCandidate() public {
        vm.expectRevert(Candidate.InvalidCandidate.selector);
        vm.prank(president);
        party.createCandidate(address(0), "Candidato Um");
    }

    function test_shouldRevertWithEmptyCandidateName() public {
        vm.expectRevert(Candidate.EmptyCandidateName.selector);
        vm.prank(president);
        party.createCandidate(wallet, "");
    }

    function test_shouldAllowDuplicateWalletAndName() public {
        vm.startPrank(president);
        Candidate a = party.createCandidate(wallet, "Candidato Um");
        Candidate b = party.createCandidate(wallet, "Candidato Um");
        vm.stopPrank();
        assertNotEq(address(a), address(b));
        assertEq(party.candidates().length, 2);
    }

    function test_shouldRevertWhenInitializedTwice() public {
        vm.prank(president);
        Candidate c = party.createCandidate(wallet, "Candidato Um");
        vm.expectRevert(Initializable.InvalidInitialization.selector);
        c.initialize(address(2), "Outro", address(3));
        assertEq(c.owner(), wallet);
        assertEq(c.name(), "Candidato Um");
        assertEq(c.party(), address(party));
    }

    function test_shouldLockImplementation() public {
        vm.prank(president);
        Candidate c = party.createCandidate(wallet, "Candidato Um");
        // alvo do clone EIP-1167: bytes 10..29 do runtime code
        bytes memory code = address(c).code;
        address impl;
        assembly {
            impl := shr(96, mload(add(code, 0x2a)))
        }
        assertNotEq(impl, address(0));
        vm.expectRevert(Initializable.InvalidInitialization.selector);
        Candidate(impl).initialize(address(1), "Candidato Um", address(party));
    }

    function test_shouldCreateIsolatedCandidates() public {
        vm.startPrank(president);
        Candidate a = party.createCandidate(address(1), "Candidato Um");
        Candidate b = party.createCandidate(address(2), "Candidato Dois");
        vm.stopPrank();
        assertNotEq(address(a), address(b));
        assertEq(a.owner(), address(1));
        assertEq(b.owner(), address(2));

        vm.deal(address(this), 1 ether);
        a.donate{value: 1 ether}();
        assertEq(address(a).balance, 1 ether);
        assertEq(address(b).balance, 0);
        assertEq(b.donatedBy(address(this)), 0);
    }

    function test_shouldKeepPartyBalanceSeparate() public {
        vm.prank(president);
        Candidate c = party.createCandidate(wallet, "Candidato Um");
        vm.deal(address(this), 1 ether);
        c.donate{value: 1 ether}();
        assertEq(address(party).balance, 0);
        assertEq(party.donatedBy(address(this)), 0);
    }
}
