// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import {ISemaphore} from "@semaphore-protocol/contracts/interfaces/ISemaphore.sol";
import {MIN_DEPTH, MAX_DEPTH} from "@semaphore-protocol/contracts/base/Constants.sol";

/// @notice Semaphore falso para testes unitários em Solidity. NÃO implantar fora dos testes.
/// @dev Imita só as funções usadas por ElectionFactory e Election. Os erros e eventos têm as
/// mesmas assinaturas do Semaphore v4 e do LeanIMT, então os seletores batem com os reais e
/// os mesmos `vm.expectRevert(...)` funcionam contra o Semaphore verdadeiro (passo 7).
/// Diferenças em relação ao real:
/// - não verifica a prova ZK: aceita qualquer `points`, a menos que `setAcceptProofs(false)`
/// - a "raiz" é um hash encadeado das operações, não uma Merkle tree Poseidon
/// - os siblings de `removeMember` são ignorados
/// - raízes antigas nunca expiram (equivale a `merkleTreeDuration` infinito)
contract MockSemaphore {
    struct MockGroup {
        address admin;
        uint256 merkleTreeDuration;
        uint256 merkleTreeRoot;
        uint256 size;
        mapping(uint256 identityCommitment => uint256 indexPlusOne) indexOf;
        mapping(uint256 merkleTreeRoot => bool) knownRoots;
        mapping(uint256 nullifier => bool) usedNullifiers;
    }

    uint256 public groupCounter;
    bool public acceptProofs = true;
    mapping(uint256 groupId => MockGroup) private _groups;

    // ISemaphoreGroups
    error Semaphore__GroupDoesNotExist();
    error Semaphore__CallerIsNotTheGroupAdmin();

    // ISemaphore
    error Semaphore__GroupHasNoMembers();
    error Semaphore__MerkleTreeDepthIsNotSupported();
    error Semaphore__MerkleTreeRootIsNotPartOfTheGroup();
    error Semaphore__YouAreUsingTheSameNullifierTwice();
    error Semaphore__InvalidProof();

    // InternalLeanIMT
    error LeafCannotBeZero();
    error LeafAlreadyExists();
    error LeafDoesNotExist();

    event GroupCreated(uint256 indexed groupId);
    event MemberAdded(
        uint256 indexed groupId,
        uint256 index,
        uint256 identityCommitment,
        uint256 merkleTreeRoot
    );
    event MemberRemoved(
        uint256 indexed groupId,
        uint256 index,
        uint256 identityCommitment,
        uint256 merkleTreeRoot
    );
    event ProofValidated(
        uint256 indexed groupId,
        uint256 merkleTreeDepth,
        uint256 indexed merkleTreeRoot,
        uint256 nullifier,
        uint256 message,
        uint256 indexed scope,
        uint256[8] points
    );

    modifier onlyGroupAdmin(uint256 groupId) {
        address admin = _groups[groupId].admin;

        if (admin == address(0)) {
            revert Semaphore__GroupDoesNotExist();
        }

        if (admin != msg.sender) {
            revert Semaphore__CallerIsNotTheGroupAdmin();
        }

        _;
    }

    /// @dev Auxiliar de teste: com `false`, todo `validateProof` reverte como prova inválida.
    function setAcceptProofs(bool accept) external {
        acceptProofs = accept;
    }

    function createGroup(
        address admin,
        uint256 merkleTreeDuration
    ) external returns (uint256 groupId) {
        groupId = groupCounter++;

        MockGroup storage group = _groups[groupId];
        group.admin = admin;
        group.merkleTreeDuration = merkleTreeDuration;

        emit GroupCreated(groupId);
    }

    function addMember(
        uint256 groupId,
        uint256 identityCommitment
    ) external onlyGroupAdmin(groupId) {
        MockGroup storage group = _groups[groupId];

        if (identityCommitment == 0) {
            revert LeafCannotBeZero();
        }

        if (group.indexOf[identityCommitment] != 0) {
            revert LeafAlreadyExists();
        }

        uint256 index = group.size;
        group.indexOf[identityCommitment] = index + 1;
        ++group.size;

        uint256 root = _updateRoot(group, identityCommitment, true);

        emit MemberAdded(groupId, index, identityCommitment, root);
    }

    function removeMember(
        uint256 groupId,
        uint256 identityCommitment,
        uint256[] calldata
    ) external onlyGroupAdmin(groupId) {
        MockGroup storage group = _groups[groupId];
        uint256 indexPlusOne = group.indexOf[identityCommitment];

        if (indexPlusOne == 0) {
            revert LeafDoesNotExist();
        }

        // como no LeanIMT: a folha vira zero, o tamanho da árvore não muda e o
        // commitment pode ser cadastrado de novo depois
        group.indexOf[identityCommitment] = 0;

        uint256 root = _updateRoot(group, identityCommitment, false);

        emit MemberRemoved(groupId, indexPlusOne - 1, identityCommitment, root);
    }

    function getMerkleTreeRoot(uint256 groupId) external view returns (uint256) {
        return _groups[groupId].merkleTreeRoot;
    }

    function hasMember(
        uint256 groupId,
        uint256 identityCommitment
    ) external view returns (bool) {
        return _groups[groupId].indexOf[identityCommitment] != 0;
    }

    function validateProof(
        uint256 groupId,
        ISemaphore.SemaphoreProof calldata proof
    ) external {
        // mesma ordem de checagens do Semaphore v4, para os testes reverterem com o mesmo erro
        MockGroup storage group = _groups[groupId];

        if (group.usedNullifiers[proof.nullifier]) {
            revert Semaphore__YouAreUsingTheSameNullifierTwice();
        }

        if (group.admin == address(0)) {
            revert Semaphore__GroupDoesNotExist();
        }

        if (proof.merkleTreeDepth < MIN_DEPTH || proof.merkleTreeDepth > MAX_DEPTH) {
            revert Semaphore__MerkleTreeDepthIsNotSupported();
        }

        if (group.size == 0) {
            revert Semaphore__GroupHasNoMembers();
        }

        if (!group.knownRoots[proof.merkleTreeRoot]) {
            revert Semaphore__MerkleTreeRootIsNotPartOfTheGroup();
        }

        if (!acceptProofs) {
            revert Semaphore__InvalidProof();
        }

        group.usedNullifiers[proof.nullifier] = true;

        emit ProofValidated(
            groupId,
            proof.merkleTreeDepth,
            proof.merkleTreeRoot,
            proof.nullifier,
            proof.message,
            proof.scope,
            proof.points
        );
    }

    /// @dev Encadeia a operação na raiz anterior: cada cadastro ou remoção gera uma raiz
    /// nova e diferente de zero, e todas as raízes já vistas continuam válidas.
    function _updateRoot(
        MockGroup storage group,
        uint256 identityCommitment,
        bool isAddition
    ) private returns (uint256 root) {
        root = uint256(
            keccak256(abi.encode(group.merkleTreeRoot, identityCommitment, isAddition))
        );

        group.merkleTreeRoot = root;
        group.knownRoots[root] = true;
    }
}
