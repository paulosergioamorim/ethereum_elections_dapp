// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import {Vm} from "forge-std/Test.sol";
import {Election} from "../contracts/Election.sol";
import {ElectionFactory} from "../contracts/ElectionFactory.sol";
import {Party} from "../contracts/Party.sol";
import {Candidate} from "../contracts/Candidate.sol";
import {Candidacy} from "../contracts/Candidacy.sol";
import {ElectionPhase} from "../contracts/Types.sol";
import {ElectionFactoryNominationTestBase} from "./ElectionFactoryNominationTestBase.sol";

contract ElectionFactoryWithdrawNominationTest is ElectionFactoryNominationTestBase {
    // critério 16
    function test_shouldWithdrawAndFreeTheCandidate() public {
        Election election = _election();
        Party party = _party(president1);
        Candidate candidate = _candidate(party);
        Candidacy candidacy = _nominate(election, candidate);

        vm.recordLogs();
        vm.prank(president1);
        factory.withdraw(election, party);
        Vm.Log[] memory logs = vm.getRecordedLogs();
        Vm.Log memory log = logs[logs.length - 1];
        assertEq(log.topics[0], ElectionFactory.NominationWithdrawn.selector);
        assertEq(abi.decode(log.data, (address)), address(candidacy));

        assertEq(factory.nomineesOf(address(election)).length, 0);
        assertEq(address(factory.nomineeOf(address(election), address(party))), address(0));
        assertFalse(factory.isActive(address(candidacy)));
        assertEq(factory.heldBy(address(candidate)), address(0));
    }

    function test_shouldMoveTheLastNomineeIntoTheFreedPosition() public {
        Election election = _election();
        Party party1 = _party(president1);
        Party party2 = _party(president2);
        Party party3 = _party(president2);
        _nominate(election, _candidate(party1));
        Candidacy second = _nominate(election, _candidate(party2));
        Candidacy third = _nominate(election, _candidate(party3));

        vm.prank(president1);
        factory.withdraw(election, party1);

        Candidacy[] memory list = factory.nomineesOf(address(election));
        assertEq(list.length, 2);
        assertEq(address(list[0]), address(third));
        assertEq(address(list[1]), address(second));

        // a posição movida continua certa: retirar o que foi movido
        vm.prank(president2);
        factory.withdraw(election, party3);
        list = factory.nomineesOf(address(election));
        assertEq(list.length, 1);
        assertEq(address(list[0]), address(second));
    }

    // critério 17
    function test_shouldRevertWithNotPartyPresident(address sender) public {
        vm.assume(sender != president1);
        Election election = _election();
        Party party = _party(president1);
        _nominate(election, _candidate(party));
        vm.expectRevert(ElectionFactory.NotPartyPresident.selector);
        vm.prank(sender);
        factory.withdraw(election, party);
    }

    function test_shouldRevertWithUnknownParty() public {
        Election election = _election();
        vm.expectRevert(ElectionFactory.UnknownParty.selector);
        factory.withdraw(election, Party(address(0xDEAD)));
    }

    function test_shouldRevertWithUnknownElection() public {
        Party party = _party(president1);
        vm.expectRevert(ElectionFactory.UnknownElection.selector);
        vm.prank(president1);
        factory.withdraw(Election(address(0xDEAD)), party);
    }

    function test_shouldRevertWithNotNominated() public {
        Election election = _election();
        Party party = _party(president1);
        vm.expectRevert(ElectionFactory.NotNominated.selector);
        vm.prank(president1);
        factory.withdraw(election, party);
    }

    function test_shouldRevertWithInvalidPhaseAfterNominationEnd() public {
        Election election = _election();
        Party party = _party(president1);
        _nominate(election, _candidate(party));
        vm.warp(election.nominationEnd());
        vm.expectRevert(
            abi.encodeWithSelector(
                ElectionFactory.InvalidPhase.selector,
                ElectionPhase.Scheduled,
                ElectionPhase.Nomination
            )
        );
        vm.prank(president1);
        factory.withdraw(election, party);
    }

    // critério 18: retirar libera o candidato para outra eleição
    function test_shouldAllowNominatingElsewhereAfterWithdrawing() public {
        Election first = _election();
        Election second = _election();
        Party party = _party(president1);
        Candidate candidate = _candidate(party);
        _nominate(first, candidate);
        vm.prank(president1);
        factory.withdraw(first, party);
        _nominate(second, candidate);
        assertEq(factory.heldBy(address(candidate)), address(second));
    }
}
