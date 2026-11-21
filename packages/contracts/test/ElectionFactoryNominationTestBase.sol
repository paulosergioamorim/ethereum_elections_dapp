// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import {Election} from "../contracts/Election.sol";
import {Party} from "../contracts/Party.sol";
import {Candidate} from "../contracts/Candidate.sol";
import {Candidacy} from "../contracts/Candidacy.sol";
import {CreateElectionCommand} from "../contracts/Types.sol";
import {ElectionFactoryTestBase} from "./ElectionFactoryTestBase.sol";

/// @dev Base dos testes de indicação: cria eleições, partidos e candidatos pela factory.
/// Os nomes dos partidos são fictícios. É abstrata e não tem funções `test*`.
abstract contract ElectionFactoryNominationTestBase is ElectionFactoryTestBase {
    address president1 = address(0xA11CE);
    address president2 = address(0xB0B);
    uint256 private _nextWallet = 0x1000;

    /// @dev Indicação aberta por 1 dia, votação de 2 a 3 dias depois de agora.
    function _election() internal returns (Election) {
        if (factory.commitmentOf(address(this)) == 0) {
            address[] memory voters = new address[](1);
            voters[0] = address(this);
            factory.addAuthorizedVoters(voters);
            factory.registerIdentityCommitment(1);
        }

        return
            factory.createElection(
                CreateElectionCommand(
                    "Eleicao",
                    uint64(block.timestamp + 1 days),
                    uint64(block.timestamp + 2 days),
                    uint64(block.timestamp + 3 days)
                )
            );
    }

    function _party(address president) internal returns (Party) {
        return factory.createParty(president, "Partido Alfa");
    }

    function _candidate(Party party) internal returns (Candidate) {
        vm.prank(party.owner());
        return party.createCandidate(address(uint160(_nextWallet++)), "Candidato");
    }

    function _nominate(
        Election election,
        Candidate candidate
    ) internal returns (Candidacy) {
        vm.prank(Party(candidate.party()).owner());
        return factory.nominate(election, candidate);
    }
}
