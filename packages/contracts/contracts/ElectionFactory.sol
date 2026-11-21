// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Election} from "./Election.sol";
import {Party} from "./Party.sol";
import {CreateElectionCommand, IElectionSemaphore} from "./Types.sol";

contract ElectionFactory is Ownable {
    // Tempo consideravelmente grande sem overflow em aritmética com a duração da MTree
    uint256 private constant MERKLE_TREE_DURATION = type(uint64).max;

    address private immutable _base = address(new Election());
    address private immutable _partyBase = address(new Party());
    Election[] private _elections;
    Party[] private _parties;

    modifier onlyAuthorizedVoter() {
        if (!isAuthorized[msg.sender]) {
            revert UnauthorizedVoter();
        }

        _;
    }

    constructor(IElectionSemaphore _sem) Ownable(msg.sender) {
        sem = _sem;
        // a factory é a admin do grupo, e as raízes antigas nunca expiram
        groupId = sem.createGroup(address(this), MERKLE_TREE_DURATION);
    }

    IElectionSemaphore public immutable sem;
    mapping(address => bool) public isAuthorized;
    mapping(address => uint256) public commitmentOf;
    mapping(address => bool) public isElection;
    mapping(address => bool) public isParty;
    uint256 public immutable groupId;

    event ElectionCreated(address indexed election);
    event PartyCreated(address indexed party);
    event VoterAuthorized(address indexed voter);
    event VoterRemoved(address indexed voter);
    event IdentityRegistered(address indexed voter, uint256 commitment);

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

    function createParty(
        address president,
        string calldata name
    ) external onlyOwner returns (Party party) {
        party = Party(Clones.clone(_partyBase));
        party.initialize(president, name);
        _parties.push(party);
        isParty[address(party)] = true;
        emit PartyCreated(address(party));
    }

    function parties() external view returns (Party[] memory) {
        return _parties;
    }

    function elections() external view returns (Election[] memory) {
        return _elections;
    }

    function renounceOwnership() public pure override {
        revert RenounceDisabled();
    }
}
