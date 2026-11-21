// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ElectionFactory} from "../contracts/ElectionFactory.sol";
import {Party} from "../contracts/Party.sol";
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
        factory.createParty(address(1), "PT");
    }

    function test_shouldRevertWithInvalidPresident() public {
        vm.expectRevert(ElectionFactory.InvalidPresident.selector);
        factory.createParty(address(0), "PT");
    }

    function test_shouldRevertWithEmptyPartyName() public {
        vm.expectRevert(ElectionFactory.EmptyPartyName.selector);
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
        Party party = factory.createParty(address(1), "PT");
        Party[] memory list = factory.parties();
        assertEq(list.length, 1);
        assertEq(address(list[0]), address(party));
        assertTrue(factory.isParty(address(party)));
        assertFalse(factory.isParty(address(1)));
    }

    function test_shouldEmitPartyCreated() public {
        // o endereço do contrato criado é o de `computeCreateAddress` do nonce da factory
        address expected = vm.computeCreateAddress(
            address(factory),
            vm.getNonce(address(factory))
        );
        vm.expectEmit(true, false, false, false, address(factory));
        emit PartyCreated(expected);
        factory.createParty(address(1), "PT");
    }

    function test_shouldCreateDistinctParties() public {
        Party a = factory.createParty(address(1), "PT");
        Party b = factory.createParty(address(1), "PT");
        assertNotEq(address(a), address(b));
        assertEq(factory.parties().length, 2);
    }
}
