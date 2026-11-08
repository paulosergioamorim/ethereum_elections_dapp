// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Election} from "./Election.sol";
import {CreateElectionCommand, IElectionSemaphore} from "./Types.sol";

contract ElectionFactory is Ownable {
    address private immutable _base = address(new Election());
    Election[] private _elections;

    modifier onlyAuthorizedVoter() {
        if (!isAuthorized[msg.sender]) {
            revert UnauthorizedVoter();
        }
        _;
    }

    constructor(IElectionSemaphore _sem) Ownable(msg.sender) {
        sem = _sem;
        // set contract as the admin group and merkle tree duration to max
        groupId = sem.createGroup(address(this), type(uint256).max);
    }

    IElectionSemaphore public immutable sem;
    mapping(address => bool) public isAuthorized;
    mapping(address => uint256) public commitmentOf;
    mapping(address => bool) public isElection;
    uint256 public immutable groupId;

    event ElectionCreated(address indexed election);
    event VoterAuthorized(address indexed voter);
    event VoterRemoved(address indexed voter);
    event IdentityRegistered(address indexed voter, uint256 commitment);

    error InvalidElection();
    error InvalidVoterAddress();
    error AlreadyRegisteredIdentityCommitment();
    error CommitmentCannotBeZero();
    error UnauthorizedVoter();
    error RenounceDisabled();

    function addAuthorizedVoters(address[] calldata voters) external onlyOwner {
        for (uint256 i = 0; i < voters.length; ++i) {
            address voter = voters[i];

            if (voter == address(0)) {
                revert InvalidVoterAddress();
            }

            isAuthorized[voter] = true;
            emit VoterAuthorized(voter);
        }
    }

    function removeVoter(
        address voter,
        uint256[] calldata siblings
    ) external onlyOwner {
        if (!isAuthorized[voter]) {
            revert UnauthorizedVoter();
        }

        uint256 commitment = commitmentOf[voter];

        if (commitment != 0) {
            sem.removeMember(groupId, commitment, siblings);
            commitmentOf[voter] = 0;
        }

        isAuthorized[voter] = false;
        emit VoterRemoved(voter);
    }

    function registerIdentityCommitment(
        uint256 identityCommitment
    ) external onlyAuthorizedVoter {
        if (identityCommitment == 0) {
            revert CommitmentCannotBeZero();
        }

        address voter = msg.sender;

        if (commitmentOf[voter] != 0) {
            revert AlreadyRegisteredIdentityCommitment();
        }

        commitmentOf[voter] = identityCommitment;
        sem.addMember(groupId, identityCommitment);
        emit IdentityRegistered(voter, identityCommitment);
    }

    function createElection(
        CreateElectionCommand calldata command
    ) external onlyOwner returns (Election election) {
        address addr = Clones.clone(_base);
        election = Election(addr);
        uint256 root = sem.getMerkleTreeRoot(groupId);
        election.initialize(sem, groupId, root, command);
        _elections.push(election);
        isElection[addr] = true;
        emit ElectionCreated(addr);
    }

    function elections() external view returns (Election[] memory) {
        return _elections;
    }

    function renounceOwnership() public pure override {
        revert RenounceDisabled();
    }
}
