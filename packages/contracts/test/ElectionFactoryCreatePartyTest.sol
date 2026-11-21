// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import {Vm} from "forge-std/Vm.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ElectionFactory} from "../contracts/ElectionFactory.sol";
import {Party} from "../contracts/Party.sol";
import {Candidate} from "../contracts/Candidate.sol";
import {ElectionFactoryTestBase} from "./ElectionFactoryTestBase.sol";

contract ElectionFactoryCreatePartyTest is ElectionFactoryTestBase {
    event PartyCreated(address indexed party);

    function test_shouldRevertWithOnlyOwner(
        address sender
    ) public notOwner(sender) {
        vm.expectRevert(
            abi.encodeWithSelector(
                Ownable.OwnableUnauthorizedAccount.selector,
                sender
            )
        );
        vm.prank(sender);
        factory.createParty(address(1), "Test Party");
    }

    function test_shouldRevertWithInvalidPresident() public {
        vm.expectRevert(Party.InvalidPresident.selector);
        factory.createParty(address(0), "Test Party");
    }

    function test_shouldRevertWithEmptyPartyName() public {
        vm.expectRevert(Party.EmptyPartyName.selector);
        factory.createParty(address(1), "");
    }

    function test_shouldStorePresidentAndName(
        address president,
        string calldata name
    ) public {
        vm.assume(president != address(0) && bytes(name).length > 0);
        Party party = factory.createParty(president, name);
        assertEq(party.owner(), president);
        assertEq(party.name(), name);
    }

    function test_shouldRegisterParty() public {
        Party party = factory.createParty(address(1), "Test Party");
        Party[] memory list = factory.parties();
        assertEq(list.length, 1);
        assertEq(address(list[0]), address(party));
        assertTrue(factory.isParty(address(party)));
        assertFalse(factory.isParty(address(1)));
    }

    function test_shouldEmitPartyCreated() public {
        vm.recordLogs();
        Party party = factory.createParty(address(1), "Test Party");
        Vm.Log[] memory logs = vm.getRecordedLogs();
        Vm.Log memory log = logs[logs.length - 1];
        assertEq(log.emitter, address(factory));
        assertEq(log.topics[0], PartyCreated.selector);
        assertEq(address(uint160(uint256(log.topics[1]))), address(party));
    }

    function test_shouldRevertWhenInitializedTwice() public {
        Party party = factory.createParty(address(1), "Test Party");
        vm.expectRevert(Initializable.InvalidInitialization.selector);
        party.initialize(address(2), "Other");
    }

    function test_shouldLockImplementation() public {
        Party party = factory.createParty(address(1), "Test Party");
        // a implementação é o alvo do clone EIP-1167: bytes 10..29 do runtime code
        bytes memory code = address(party).code;
        address impl;
        assembly {
            impl := shr(96, mload(add(code, 0x2a)))
        }
        assertNotEq(impl, address(0));
        vm.expectRevert(Initializable.InvalidInitialization.selector);
        Party(impl).initialize(address(1), "Test Party");
    }

    function test_shouldCreateIsolatedParties() public {
        Party a = factory.createParty(address(1), "Alfa");
        Party b = factory.createParty(address(2), "Partido Beta");
        assertNotEq(address(a), address(b));
        assertEq(factory.parties().length, 2);
        assertEq(a.owner(), address(1));
        assertEq(b.owner(), address(2));
        assertEq(a.name(), "Alfa");
        assertEq(b.name(), "Partido Beta");

        vm.deal(address(this), 1 ether);
        a.donate{value: 1 ether}();
        assertEq(address(a).balance, 1 ether);
        assertEq(address(b).balance, 0);
        assertEq(b.donatedBy(address(this)), 0);
    }

    function test_shouldLetFactoryPartyPresidentCreateCandidate() public {
        Party party = factory.createParty(address(0xA11CE), "Alfa");
        vm.prank(address(0xA11CE));
        Candidate candidate = party.createCandidate(address(0xCA11), "Candidato Um");
        assertEq(candidate.owner(), address(0xCA11));
        assertEq(candidate.name(), "Candidato Um");
        assertEq(candidate.party(), address(party));
        assertTrue(party.isCandidate(address(candidate)));
        assertEq(party.candidates().length, 1);
    }
}
