// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Election} from "./Election.sol";
import {CreateElectionCommand, IElectionSemaphore} from "./Types.sol";

contract ElectionFactory is Ownable {
    address private immutable _base = address(new Election());
    Election[] private _elections;

    modifier onlyAuthorizedUser() {
        if (!isAuthorized[msg.sender]) {
            revert UnauthorizedUser();
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
    event VoterAuthorized(address indexed user);
    event VoterRevoked(address indexed user);
    event IdentityRegistered(address indexed user, uint256 commitment);

    error InvalidElection();
    error InvalidUserAddress();
    error AlreadyRegisteredIdentityCommitment();
    error CommitmentCannotBeZero();
    error UnauthorizedUser();
    error RenounceDisabled();

    function addAuthorizedUsers(address[] calldata users) external onlyOwner {
        for (uint256 i = 0; i < users.length; ++i) {
            address user = users[i];

            if (user == address(0)) {
                revert InvalidUserAddress();
            }

            isAuthorized[user] = true;
            emit VoterAuthorized(user);
        }
    }

    function revokeVoter(address user, uint256[] calldata siblings) external onlyOwner {
        if (!isAuthorized[user]) {
            return;
        }

        uint256 commitment = commitmentOf[user];

        if (commitment != 0) {
            sem.removeMember(groupId, commitment, siblings);
            commitmentOf[user] = 0;
        }

        isAuthorized[user] = false;
        emit VoterRevoked(user);
    }

    function registerIdentityCommitment(
        uint256 identityCommitment
    ) external onlyAuthorizedUser {
        if (identityCommitment == 0) {
            revert CommitmentCannotBeZero();
        }

        address user = msg.sender;

        if (commitmentOf[user] != 0) {
            revert AlreadyRegisteredIdentityCommitment();
        }

        commitmentOf[user] = identityCommitment;
        sem.addMember(groupId, identityCommitment);
        emit IdentityRegistered(user, identityCommitment);
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
