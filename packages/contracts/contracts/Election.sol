// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import {CreateElectionCommand, ElectionPhase, IElectionSemaphore} from "./Types.sol";

contract Election is Initializable {
    string[] private _candidates;
    bytes32[] private _commitments;

    modifier onlyValidDataInitializer(
        IElectionSemaphore _sem,
        uint256 _merkleTreeRoot,
        CreateElectionCommand calldata command
    ) {
        if (address(_sem) == address(0)) {
            revert InvalidSemaphore();
        }

        if (_merkleTreeRoot == 0) {
            revert InvalidMerkleRoot();
        }

        if (command.votingStart < block.timestamp) {
            revert InvalidVotingStart();
        }

        if (command.votingStart >= command.votingEnd) {
            revert InvalidVotingDuration();
        }

        if (command.candidates.length <= 1) {
            revert InvalidCandidatesQuantity();
        }

        _;
    }

    modifier onlyInPhase(ElectionPhase _phase) {
        if (phase() != _phase) {
            revert InvalidPhase(phase(), _phase);
        }
        _;
    }

    constructor() {
        _disableInitializers();
    }

    IElectionSemaphore sem;
    mapping(uint256 index => bool) public isRevealed;
    string public title;
    uint256 public groupId;
    uint256 public merkleTreeRoot;
    uint64 public votingStart;
    uint64 public votingEnd;
    uint256 public nullVotes;
    uint256 public revealedCount;
    uint64 public createdAtBlock;
    uint256[] private _tally;

    event VoteCast(
        uint256 indexed nullifier,
        uint256 indexed index,
        bytes32 commitment,
        bytes ciphertext
    );
    event VoteRevealed(uint256 indexed index, uint256 option);

    error InvalidSemaphore();
    error InvalidMerkleRoot();
    error InvalidVotingDuration();
    error InvalidVotingStart();
    error InvalidCandidatesQuantity();
    error InvalidPhase(ElectionPhase current, ElectionPhase expected);
    error InvalidReveal(uint256 index);
    error LengthMismatch();
    error MerkleRootMismatch();
    error InvalidScope();
    error InvalidMessage();

    function initialize(
        IElectionSemaphore _sem,
        uint256 _groupId,
        uint256 _merkleTreeRoot,
        CreateElectionCommand calldata command
    )
        external
        initializer
        onlyValidDataInitializer(_sem, _merkleTreeRoot, command)
    {
        createdAtBlock = uint64(block.number);
        sem = _sem;
        groupId = _groupId;
        merkleTreeRoot = _merkleTreeRoot;
        title = command.title;

        for (uint256 i = 0; i < command.candidates.length; ++i) {
            _candidates.push(command.candidates[i]);
            _tally.push(0);
        } // Copying nested calldata dynamic arrays to storage is not implemented in the old code generator

        votingStart = command.votingStart;
        votingEnd = command.votingEnd;
    }

    function vote(
        IElectionSemaphore.SemaphoreProof calldata proof,
        bytes32 commitment,
        bytes calldata ciphertext
    ) external onlyInPhase(ElectionPhase.Voting) {
        // a prova precisa ser contra o cadastro congelado na criação da eleição
        if (proof.merkleTreeRoot != merkleTreeRoot) {
            revert MerkleRootMismatch();
        }

        // o nullifier depende do scope: sem esta checagem, outro scope permitiria votar de novo
        if (proof.scope != uint256(uint160(address(this)))) {
            revert InvalidScope();
        }

        // amarra a prova ao conteúdo do voto, impedindo que um relayer troque commitment ou ciphertext
        if (
            proof.message !=
            uint256(keccak256(abi.encode(commitment, keccak256(ciphertext))))
        ) {
            revert InvalidMessage();
        }

        // verifica a prova ZK e marca o nullifier como usado (reverte se já foi usado)
        sem.validateProof(groupId, proof);

        uint256 index = _commitments.length;
        _commitments.push(commitment);

        emit VoteCast(proof.nullifier, index, commitment, ciphertext);
    }

    function revealBatch(
        uint256[] calldata indexes,
        uint256[] calldata options,
        bytes32[] calldata salts
    ) external onlyInPhase(ElectionPhase.Tally) {
        if (
            options.length != indexes.length || salts.length != indexes.length
        ) {
            revert LengthMismatch();
        }

        for (uint256 i = 0; i < indexes.length; ++i) {
            uint256 idx = indexes[i];

            if (isRevealed[idx]) {
                continue; // outro apurador já revelou
            }

            if (
                keccak256(abi.encode(options[i], salts[i])) != _commitments[idx]
            ) {
                revert InvalidReveal(idx);
            }

            isRevealed[idx] = true;
            ++revealedCount;

            if (options[i] < _tally.length) {
                ++_tally[options[i]];
            } else {
                ++nullVotes;
            }

            emit VoteRevealed(idx, options[i]);
        }
    }

    function results()
        external
        view
        returns (uint256[] memory, uint256, uint256)
    {
        return (_tally, nullVotes, _commitments.length - revealedCount);
    }

    function phase() public view returns (ElectionPhase) {
        uint256 timestamp = block.timestamp;

        if (timestamp < votingStart) {
            return ElectionPhase.Scheduled;
        }

        if (votingEnd <= timestamp) {
            return ElectionPhase.Tally;
        }

        return ElectionPhase.Voting;
    }

    function candidates() external view returns (string[] memory) {
        return _candidates;
    }
}
