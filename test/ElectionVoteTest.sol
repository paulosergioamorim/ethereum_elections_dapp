// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import {Election} from "../contracts/Election.sol";
import {ElectionPhase, IElectionSemaphore} from "../contracts/Types.sol";
import {ElectionTestBase} from "./ElectionTestBase.sol";
import {ISemaphore} from "@semaphore-protocol/contracts/interfaces/ISemaphore.sol";

contract ElectionVoteTest is ElectionTestBase {
    function test_shouldRevertWithInvalidPhaseWhenScheduled(
        uint256 nullifier,
        bytes32 commitment,
        bytes calldata ciphertext
    ) public initialized {
        IElectionSemaphore.SemaphoreProof memory proof = _validProof(
            nullifier,
            commitment,
            ciphertext
        );
        vm.expectRevert(
            abi.encodeWithSelector(
                Election.InvalidPhase.selector,
                ElectionPhase.Scheduled,
                ElectionPhase.Voting
            )
        );
        election.vote(proof, commitment, ciphertext);
    }

    function test_shouldRevertWithInvalidPhaseWhenTally(
        uint256 nullifier,
        bytes32 commitment,
        bytes calldata ciphertext
    ) public initialized inTally {
        IElectionSemaphore.SemaphoreProof memory proof = _validProof(
            nullifier,
            commitment,
            ciphertext
        );
        vm.expectRevert(
            abi.encodeWithSelector(
                Election.InvalidPhase.selector,
                ElectionPhase.Tally,
                ElectionPhase.Voting
            )
        );
        election.vote(proof, commitment, ciphertext);
    }

    function test_shouldRevertWithMerkleRootMismatch(
        uint256 proofMerkleTreeRoot,
        uint256 nullifier,
        bytes32 commitment,
        bytes calldata ciphertext
    ) public initialized inVoting {
        vm.assume(proofMerkleTreeRoot != merkleTreeRoot);
        IElectionSemaphore.SemaphoreProof memory proof = _validProof(
            nullifier,
            commitment,
            ciphertext
        );
        proof.merkleTreeRoot = proofMerkleTreeRoot;
        vm.expectRevert(Election.MerkleRootMismatch.selector);
        election.vote(proof, commitment, ciphertext);
    }

    function test_shouldRevertWithInvalidScope(
        uint256 scope,
        uint256 nullifier,
        bytes32 commitment,
        bytes calldata ciphertext
    ) public initialized inVoting {
        vm.assume(scope != uint256(uint160(address(election))));
        IElectionSemaphore.SemaphoreProof memory proof = _validProof(
            nullifier,
            commitment,
            ciphertext
        );
        proof.scope = scope;
        vm.expectRevert(Election.InvalidScope.selector);
        election.vote(proof, commitment, ciphertext);
    }

    function test_shouldRevertWithInvalidMessageWhenCommitmentChanged(
        uint256 nullifier,
        bytes32 commitment,
        bytes32 otherCommitment,
        bytes calldata ciphertext
    ) public initialized inVoting {
        vm.assume(commitment != otherCommitment);
        IElectionSemaphore.SemaphoreProof memory proof = _validProof(
            nullifier,
            otherCommitment,
            ciphertext
        );
        vm.expectRevert(Election.InvalidMessage.selector);
        election.vote(proof, commitment, ciphertext);
    }

    function test_shouldRevertWithInvalidMessageWhenCiphertextChanged(
        uint256 nullifier,
        bytes32 commitment,
        bytes calldata ciphertext,
        bytes calldata otherCiphertext
    ) public initialized inVoting {
        vm.assume(keccak256(ciphertext) != keccak256(otherCiphertext));
        IElectionSemaphore.SemaphoreProof memory proof = _validProof(
            nullifier,
            commitment,
            otherCiphertext
        );
        vm.expectRevert(Election.InvalidMessage.selector);
        election.vote(proof, commitment, ciphertext);
    }

    function test_shouldRevertWithSameNullifierTwice(
        uint256 nullifier,
        bytes32 commitment,
        bytes calldata ciphertext
    ) public initialized inVoting {
        IElectionSemaphore.SemaphoreProof memory proof = _validProof(
            nullifier,
            commitment,
            ciphertext
        );
        election.vote(proof, commitment, ciphertext);
        vm.expectRevert(
            ISemaphore.Semaphore__YouAreUsingTheSameNullifierTwice.selector
        );
        election.vote(proof, commitment, ciphertext);
    }

    function test_shouldRevertWithInvalidProof(
        uint256 nullifier,
        bytes32 commitment,
        bytes calldata ciphertext
    ) public initialized inVoting {
        sem.setAcceptProofs(false);
        IElectionSemaphore.SemaphoreProof memory proof = _validProof(
            nullifier,
            commitment,
            ciphertext
        );
        vm.expectRevert(ISemaphore.Semaphore__InvalidProof.selector);
        election.vote(proof, commitment, ciphertext);
    }

    function test_shouldCallValidateProof(
        uint256 nullifier,
        bytes32 commitment,
        bytes calldata ciphertext
    ) public initialized inVoting {
        IElectionSemaphore.SemaphoreProof memory proof = _validProof(
            nullifier,
            commitment,
            ciphertext
        );
        vm.expectCall(
            address(sem),
            abi.encodeCall(sem.validateProof, (groupId, proof))
        );
        election.vote(proof, commitment, ciphertext);
    }

    function test_shouldStoreCommitment(
        uint256 nullifier,
        bytes32 commitment,
        bytes calldata ciphertext
    ) public initialized inVoting {
        IElectionSemaphore.SemaphoreProof memory proof = _validProof(
            nullifier,
            commitment,
            ciphertext
        );
        election.vote(proof, commitment, ciphertext);
        (, , uint256 unrevealed) = election.results();
        assertEq(unrevealed, 1);
    }
}
