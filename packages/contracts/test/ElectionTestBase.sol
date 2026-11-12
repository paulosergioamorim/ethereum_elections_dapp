// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import {Test} from "forge-std/Test.sol";
import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";
import {Election} from "../contracts/Election.sol";
import {MockSemaphore} from "../contracts/mocks/MockSemaphore.sol";
import {IElectionSemaphore} from "../contracts/Types.sol";
import {ElectionTestLib} from "./ElectionTestLib.sol";

/// @dev Base comum dos testes de Election. É abstrata e não tem funções `test*`,
/// então o Hardhat não a executa como teste.
/// O próprio teste é admin do grupo no mock, então registra membros sem passar pela factory.
/// `election` é um clone ainda NÃO inicializado: cada teste decide como inicializá-lo.
abstract contract ElectionTestBase is Test {
    Election election;
    MockSemaphore sem;
    uint256 groupId;
    uint256 merkleTreeRoot;
    uint256 private _nextNullifier;

    /// @dev Inicializa o clone com `ElectionTestLib.validCommand()`.
    modifier initialized() {
        election.initialize(
            sem,
            groupId,
            merkleTreeRoot,
            ElectionTestLib.validCommand()
        );

        _;
    }

    /// @dev Avança para o primeiro instante da votação. Use depois de `initialized`.
    modifier inVoting() {
        vm.warp(election.votingStart());

        _;
    }

    /// @dev Avança para o primeiro instante da apuração. Use depois de `initialized`.
    modifier inTally() {
        vm.warp(election.votingEnd());

        _;
    }

    function setUp() public {
        sem = new MockSemaphore();
        groupId = sem.createGroup(address(this), type(uint64).max);
        sem.addMember(groupId, 1);
        merkleTreeRoot = sem.getMerkleTreeRoot(groupId);
        election = Election(Clones.clone(address(new Election())));
    }

    /// @dev Message que amarra a prova ao conteúdo do voto, igual à calculada em `vote`.
    function _message(
        bytes32 commitment,
        bytes memory ciphertext
    ) internal pure returns (uint256) {
        return uint256(keccak256(abi.encode(commitment, keccak256(ciphertext))));
    }

    /// @dev Prova aceita pelo mock e por todas as checagens de `vote`.
    /// Cada teste de revert estraga um único campo do resultado.
    function _validProof(
        uint256 nullifier,
        bytes32 commitment,
        bytes memory ciphertext
    ) internal view returns (IElectionSemaphore.SemaphoreProof memory proof) {
        proof.merkleTreeDepth = 1;
        proof.merkleTreeRoot = merkleTreeRoot;
        proof.nullifier = nullifier;
        proof.message = _message(commitment, ciphertext);
        proof.scope = uint256(uint160(address(election)));
    }

    /// @dev Commitment do voto, igual ao comparado em `revealBatch`.
    function _commit(
        uint256 option,
        bytes32 salt
    ) internal pure returns (bytes32) {
        return keccak256(abi.encode(option, salt));
    }

    /// @dev Avança para a votação e registra um voto que abre com `(option, salt)`.
    /// É função, e não modificador, para rodar depois de um `bound` no corpo do teste.
    /// Cada chamada usa um nullifier novo; devolve o índice do voto.
    function _castVote(
        uint256 option,
        bytes32 salt
    ) internal returns (uint256 index) {
        vm.warp(election.votingStart());
        (, , uint256 unrevealed) = election.results();
        index = unrevealed + election.revealedCount();
        bytes32 commitment = _commit(option, salt);
        election.vote(
            _validProof(_nextNullifier++, commitment, ""),
            commitment,
            ""
        );
    }
}
