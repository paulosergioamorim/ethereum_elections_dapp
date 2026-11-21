// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Election} from "./Election.sol";
import {Party} from "./Party.sol";
import {Candidate} from "./Candidate.sol";
import {Candidacy, ICandidacyStatus} from "./Candidacy.sol";
import {CreateElectionCommand, ElectionPhase, IElectionSemaphore, INominees} from "./Types.sol";

contract ElectionFactory is Ownable {
    // Tempo consideravelmente grande sem overflow em aritmética com a duração da MTree
    uint256 private constant MERKLE_TREE_DURATION = type(uint64).max;

    address private immutable _base = address(new Election());
    address private immutable _partyBase = address(new Party());
    address private immutable _candidacyBase = address(new Candidacy());
    Election[] private _elections;
    Party[] private _parties;
    mapping(address election => Candidacy[]) private _nominees;
    /// @dev Posição da candidatura ativa em `_nominees` da sua eleição.
    mapping(address candidacy => uint256) private _position;

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
    /// @dev A candidatura ativa de cada partido na eleição (zero se não indicou).
    mapping(address election => mapping(address party => Candidacy)) public nomineeOf;
    /// @dev A candidatura (ativa ou não) de um candidato na eleição; criada uma vez e reaproveitada.
    mapping(address election => mapping(address candidate => Candidacy)) public candidacyOf;
    mapping(address candidacy => bool) public isActive;
    /// @dev Eleição que prende o candidato por uma indicação ativa.
    mapping(address candidate => address) public heldBy;

    event ElectionCreated(address indexed election);
    event PartyCreated(address indexed party);
    event VoterAuthorized(address indexed voter);
    event VoterRemoved(address indexed voter);
    event IdentityRegistered(address indexed voter, uint256 commitment);
    event Nominated(
        address indexed election,
        address indexed party,
        address indexed candidate,
        address candidacy
    );
    event NominationWithdrawn(
        address indexed election,
        address indexed party,
        address indexed candidate,
        address candidacy
    );

    error InvalidVoterAddress();
    error AlreadyRegisteredIdentityCommitment();
    error CommitmentCannotBeZero();
    error UnauthorizedVoter();
    error RenounceDisabled();
    error UnknownElection();
    error UnknownParty();
    error UnknownCandidate();
    error NotPartyPresident();
    error InvalidPhase(ElectionPhase current, ElectionPhase expected);
    error AlreadyNominated();
    error CandidateBusy(address election);
    error NotNominated();

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
        election.initialize(sem, groupId, root, INominees(address(this)), command);
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

    /// @dev Indica `candidate` pelo partido dele em `election`, durante a fase de indicação, trocando
    /// o indicado anterior do partido. A candidatura é criada uma vez por par e reaproveitada.
    function nominate(
        Election election,
        Candidate candidate
    ) external returns (Candidacy candidacy) {
        if (!isElection[address(election)]) {
            revert UnknownElection();
        }

        if (address(candidate).code.length == 0) {
            revert UnknownCandidate();
        }

        address party = candidate.party();

        if (!isParty[party] || !Party(party).isCandidate(address(candidate))) {
            revert UnknownCandidate();
        }

        if (Party(party).owner() != msg.sender) {
            revert NotPartyPresident();
        }

        _requireNomination(election);

        Candidacy previous = nomineeOf[address(election)][party];
        address held = heldBy[address(candidate)];

        if (held == address(election)) {
            revert AlreadyNominated();
        }

        if (held != address(0) && Election(held).votingEnd() > block.timestamp) {
            revert CandidateBusy(held);
        }

        candidacy = candidacyOf[address(election)][address(candidate)];

        if (address(candidacy) == address(0)) {
            candidacy = Candidacy(Clones.clone(_candidacyBase));
            candidacy.initialize(
                candidate.owner(),
                address(election),
                candidate,
                party,
                ICandidacyStatus(address(this))
            );
            candidacyOf[address(election)][address(candidate)] = candidacy;
        }

        isActive[address(candidacy)] = true;
        heldBy[address(candidate)] = address(election);
        nomineeOf[address(election)][party] = candidacy;

        if (address(previous) == address(0)) {
            _position[address(candidacy)] = _nominees[address(election)].length;
            _nominees[address(election)].push(candidacy);
        } else {
            _deactivate(previous);
            uint256 position = _position[address(previous)];
            _nominees[address(election)][position] = candidacy;
            _position[address(candidacy)] = position;
        }

        emit Nominated(
            address(election),
            party,
            address(candidate),
            address(candidacy)
        );
    }

    /// @dev Retira o indicado do partido; a candidatura fica inativa e o saldo continua sacável.
    function withdraw(Election election, Party party) external {
        if (!isElection[address(election)]) {
            revert UnknownElection();
        }

        if (!isParty[address(party)]) {
            revert UnknownParty();
        }

        if (party.owner() != msg.sender) {
            revert NotPartyPresident();
        }

        _requireNomination(election);

        Candidacy candidacy = nomineeOf[address(election)][address(party)];

        if (address(candidacy) == address(0)) {
            revert NotNominated();
        }

        Candidacy[] storage list = _nominees[address(election)];
        uint256 position = _position[address(candidacy)];
        Candidacy last = list[list.length - 1];
        list[position] = last;
        _position[address(last)] = position;
        list.pop();

        delete nomineeOf[address(election)][address(party)];
        _deactivate(candidacy);

        emit NominationWithdrawn(
            address(election),
            address(party),
            address(candidacy.candidate()),
            address(candidacy)
        );
    }

    function nomineesOf(
        address election
    ) external view returns (Candidacy[] memory) {
        return _nominees[election];
    }

    function _requireNomination(Election election) private view {
        ElectionPhase current = election.phase();

        if (current != ElectionPhase.Nomination) {
            revert InvalidPhase(current, ElectionPhase.Nomination);
        }
    }

    function _deactivate(Candidacy candidacy) private {
        isActive[address(candidacy)] = false;
        delete heldBy[address(candidacy.candidate())];
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
