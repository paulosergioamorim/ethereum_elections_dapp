// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import {Vm} from "forge-std/Test.sol";
import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";
import {Election} from "../contracts/Election.sol";
import {ElectionFactory} from "../contracts/ElectionFactory.sol";
import {Party} from "../contracts/Party.sol";
import {Candidate} from "../contracts/Candidate.sol";
import {Candidacy} from "../contracts/Candidacy.sol";
import {ElectionPhase} from "../contracts/Types.sol";
import {ElectionFactoryNominationTestBase} from "./ElectionFactoryNominationTestBase.sol";

contract ElectionFactoryNominateTest is ElectionFactoryNominationTestBase {
    // critério 5
    function test_shouldNominateAndCloneACandidacy() public {
        Election election = _election();
        Party party = _party(president1);
        Candidate candidate = _candidate(party);
        Candidacy candidacy = _nominate(election, candidate);

        assertEq(candidacy.owner(), candidate.owner());
        assertEq(candidacy.election(), address(election));
        assertEq(address(candidacy.candidate()), address(candidate));
        assertEq(candidacy.party(), address(party));
        assertEq(address(factory.nomineeOf(address(election), address(party))), address(candidacy));
        assertEq(address(factory.candidacyOf(address(election), address(candidate))), address(candidacy));
        assertTrue(factory.isActive(address(candidacy)));
        assertEq(factory.heldBy(address(candidate)), address(election));
        assertEq(factory.nomineesOf(address(election)).length, 1);
        assertEq(address(factory.nomineesOf(address(election))[0]), address(candidacy));
    }

    function test_shouldEmitNominated() public {
        Election election = _election();
        Party party = _party(president1);
        Candidate candidate = _candidate(party);
        vm.recordLogs();
        Candidacy candidacy = _nominate(election, candidate);
        Vm.Log[] memory logs = vm.getRecordedLogs();
        Vm.Log memory log = logs[logs.length - 1];
        assertEq(log.emitter, address(factory));
        assertEq(log.topics[0], ElectionFactory.Nominated.selector);
        assertEq(address(uint160(uint256(log.topics[1]))), address(election));
        assertEq(address(uint160(uint256(log.topics[2]))), address(party));
        assertEq(address(uint160(uint256(log.topics[3]))), address(candidate));
        assertEq(abi.decode(log.data, (address)), address(candidacy));
    }

    // critério 6
    function test_shouldRevertWithNotPartyPresident(address sender) public {
        vm.assume(sender != president1);
        Election election = _election();
        Candidate candidate = _candidate(_party(president1));
        vm.expectRevert(ElectionFactory.NotPartyPresident.selector);
        vm.prank(sender);
        factory.nominate(election, candidate);
    }

    // critério 6: o presidente de outro partido não indica
    function test_shouldRevertWhenAnotherPartyPresidentNominates() public {
        Election election = _election();
        Candidate candidate = _candidate(_party(president1));
        _party(president2);
        vm.expectRevert(ElectionFactory.NotPartyPresident.selector);
        vm.prank(president2);
        factory.nominate(election, candidate);
    }

    // critério 7
    function test_shouldRevertWithUnknownElection() public {
        Candidate candidate = _candidate(_party(president1));
        vm.expectRevert(ElectionFactory.UnknownElection.selector);
        vm.prank(president1);
        factory.nominate(Election(address(0xDEAD)), candidate);
    }

    // critério 8: candidato implantado à mão que diz ser de um partido real
    function test_shouldRevertWithUnknownCandidateForAForgedCandidate() public {
        Election election = _election();
        Party party = _party(president1);
        Candidate forged = Candidate(Clones.clone(address(new Candidate())));
        forged.initialize(address(0xBAD), "Falso", address(party));
        vm.expectRevert(ElectionFactory.UnknownCandidate.selector);
        vm.prank(president1);
        factory.nominate(election, forged);
    }

    // critério 8: partido que a factory não criou
    function test_shouldRevertWithUnknownCandidateForAForeignParty() public {
        Election election = _election();
        Party foreign = Party(Clones.clone(address(new Party())));
        foreign.initialize(president1, "Partido Beta");
        vm.prank(president1);
        Candidate candidate = foreign.createCandidate(address(0x1234), "Candidato");
        vm.expectRevert(ElectionFactory.UnknownCandidate.selector);
        vm.prank(president1);
        factory.nominate(election, candidate);
    }

    function test_shouldRevertWithUnknownCandidateForANonContract() public {
        Election election = _election();
        vm.expectRevert(ElectionFactory.UnknownCandidate.selector);
        factory.nominate(election, Candidate(address(0x1234)));
    }

    // critério 9
    function test_shouldAcceptTheLastSecondOfNomination() public {
        Election election = _election();
        Candidate candidate = _candidate(_party(president1));
        vm.warp(election.nominationEnd() - 1);
        _nominate(election, candidate);
        assertEq(factory.nomineesOf(address(election)).length, 1);
    }

    function test_shouldRevertWithInvalidPhaseAtNominationEnd() public {
        Election election = _election();
        Candidate candidate = _candidate(_party(president1));
        vm.warp(election.nominationEnd());
        vm.expectRevert(
            abi.encodeWithSelector(
                ElectionFactory.InvalidPhase.selector,
                ElectionPhase.Scheduled,
                ElectionPhase.Nomination
            )
        );
        vm.prank(president1);
        factory.nominate(election, candidate);
    }

    // critério 10
    function test_shouldListNomineesInNominationOrder() public {
        Election election = _election();
        Party party1 = _party(president1);
        Party party2 = _party(president2);
        Candidacy first = _nominate(election, _candidate(party2));
        Candidacy second = _nominate(election, _candidate(party1));
        Candidacy[] memory list = factory.nomineesOf(address(election));
        assertEq(list.length, 2);
        assertEq(address(list[0]), address(first));
        assertEq(address(list[1]), address(second));
        assertEq(address(factory.nomineeOf(address(election), address(party1))), address(second));
        assertEq(address(factory.nomineeOf(address(election), address(party2))), address(first));
    }

    // critério 11
    function test_shouldExposeTheNomineesAsElectionCandidates() public {
        Election election = _election();
        Candidacy candidacy = _nominate(election, _candidate(_party(president1)));
        Candidacy[] memory list = election.candidates();
        assertEq(list.length, 1);
        assertEq(address(list[0]), address(candidacy));
    }

    // critério 14
    function test_shouldReplaceTheNomineeKeepingItsPosition() public {
        Election election = _election();
        Party party1 = _party(president1);
        Party party2 = _party(president2);
        Candidate a = _candidate(party1);
        Candidate b = _candidate(party1);
        Candidacy ofA = _nominate(election, a);
        Candidacy other = _nominate(election, _candidate(party2));
        Candidacy ofB = _nominate(election, b);

        assertNotEq(address(ofA), address(ofB));
        Candidacy[] memory list = factory.nomineesOf(address(election));
        assertEq(list.length, 2);
        assertEq(address(list[0]), address(ofB));
        assertEq(address(list[1]), address(other));
        assertEq(address(factory.nomineeOf(address(election), address(party1))), address(ofB));
        assertFalse(factory.isActive(address(ofA)));
        assertTrue(factory.isActive(address(ofB)));
        assertEq(factory.heldBy(address(a)), address(0));
        assertEq(factory.heldBy(address(b)), address(election));
    }

    // critério 15
    function test_shouldRevertWithAlreadyNominated() public {
        Election election = _election();
        Candidate candidate = _candidate(_party(president1));
        _nominate(election, candidate);
        vm.expectRevert(ElectionFactory.AlreadyNominated.selector);
        vm.prank(president1);
        factory.nominate(election, candidate);
    }

    // critério 18
    function test_shouldRevertWithCandidateBusyInAnotherElection() public {
        Election first = _election();
        Election second = _election();
        Candidate candidate = _candidate(_party(president1));
        _nominate(first, candidate);
        vm.expectRevert(
            abi.encodeWithSelector(ElectionFactory.CandidateBusy.selector, address(first))
        );
        vm.prank(president1);
        factory.nominate(second, candidate);
    }

    function test_shouldFreeTheCandidateWhenTheNomineeIsReplaced() public {
        Election first = _election();
        Election second = _election();
        Party party = _party(president1);
        Candidate a = _candidate(party);
        Candidate b = _candidate(party);
        _nominate(first, a);
        _nominate(first, b);
        _nominate(second, a);
        assertEq(factory.heldBy(address(a)), address(second));
    }

    // critério 19: a candidatura de um candidato preso só termina em votingEnd
    function test_shouldKeepTheCandidateBusyUntilVotingEnd() public {
        Election first = _election();
        Candidate candidate = _candidate(_party(president1));
        _nominate(first, candidate);
        // outra eleição aberta para indicação no último segundo antes de a primeira apurar
        vm.warp(first.votingEnd() - 1);
        Election second = _election();
        vm.expectRevert(
            abi.encodeWithSelector(ElectionFactory.CandidateBusy.selector, address(first))
        );
        vm.prank(president1);
        factory.nominate(second, candidate);
    }

    function test_shouldFreeTheCandidateAtVotingEnd() public {
        Election first = _election();
        Candidate candidate = _candidate(_party(president1));
        _nominate(first, candidate);
        vm.warp(first.votingEnd());
        assertTrue(first.phase() == ElectionPhase.Tally);
        Election second = _election();
        _nominate(second, candidate);
        assertEq(factory.heldBy(address(candidate)), address(second));
    }

    // critério 20
    function test_shouldReuseTheCandidacyWhenNominatedAgain() public {
        Election election = _election();
        Party party = _party(president1);
        Candidate candidate = _candidate(party);
        Candidacy first = _nominate(election, candidate);
        vm.prank(president1);
        factory.withdraw(election, party);
        Candidacy again = _nominate(election, candidate);
        assertEq(address(again), address(first));
        assertTrue(factory.isActive(address(again)));
        assertEq(factory.nomineesOf(address(election)).length, 1);
    }

    // critério 20: saldo e doadores sobrevivem à retirada e à nova indicação
    function test_shouldKeepBalanceAndDonorsWhenNominatedAgain() public {
        Election election = _election();
        Party party = _party(president1);
        Candidate candidate = _candidate(party);
        Candidacy first = _nominate(election, candidate);
        address donor = address(0xD0);
        vm.deal(donor, 2 ether);
        vm.prank(donor);
        first.donate{value: 2 ether}();
        vm.prank(president1);
        factory.withdraw(election, party);
        Candidacy again = _nominate(election, candidate);
        assertEq(address(again).balance, 2 ether);
        assertEq(again.donatedBy(donor), 2 ether);
    }

    // critério 21
    function test_shouldRevertAfterNominationEndForANominee() public {
        Election election = _election();
        Party party = _party(president1);
        Candidate a = _candidate(party);
        _nominate(election, a);
        Candidate b = _candidate(party);
        vm.warp(election.nominationEnd());
        vm.expectRevert(
            abi.encodeWithSelector(
                ElectionFactory.InvalidPhase.selector,
                ElectionPhase.Scheduled,
                ElectionPhase.Nomination
            )
        );
        vm.prank(president1);
        factory.nominate(election, b);
    }
}
