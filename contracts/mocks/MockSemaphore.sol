// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import {MIN_DEPTH, MAX_DEPTH} from "@semaphore-protocol/contracts/base/Constants.sol";
import {IElectionSemaphore} from "../Types.sol";

/// @notice Semaphore falso para testes unitários em Solidity. NÃO implantar fora dos testes.
/// @dev Implementa IElectionSemaphore (ISemaphore + ISemaphoreGroups), então o compilador garante
/// que as assinaturas, os erros e os eventos são os mesmos do Semaphore v4. Os erros do LeanIMT
/// são declarados aqui com as mesmas assinaturas, para os seletores baterem com os reais.
/// Diferenças em relação ao real:
/// - não verifica a prova ZK: aceita qualquer `points`, a menos que `setAcceptProofs(false)`
/// - a "raiz" é um hash encadeado das operações, não uma Merkle tree Poseidon
/// - os siblings de `removeMember` são ignorados
/// - raízes antigas nunca expiram (equivale a `merkleTreeDuration` infinito)
/// - funções que os contratos não usam revertem com `NotImplementedInMock`
contract MockSemaphore is IElectionSemaphore {
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

    // InternalLeanIMT (não fazem parte das interfaces do Semaphore)
    error LeafCannotBeZero();
    error LeafAlreadyExists();
    error LeafDoesNotExist();

    // exclusivo do mock
    error NotImplementedInMock();

    // igual ao Semaphore real: não checa se o grupo existe, então um grupo
    // inexistente (admin zero) reverte como "não é o admin"
    modifier onlyGroupAdmin(uint256 groupId) {
        if (_groups[groupId].admin != msg.sender) {
            revert Semaphore__CallerIsNotTheGroupAdmin();
        }

        _;
    }

    modifier onlyExistingGroup(uint256 groupId) {
        if (_groups[groupId].admin == address(0)) {
            revert Semaphore__GroupDoesNotExist();
        }

        _;
    }

    /// @dev Auxiliar de teste: com `false`, todo `validateProof` reverte como prova inválida.
    function setAcceptProofs(bool accept) external {
        acceptProofs = accept;
    }

    // ---------------------------------------------------------------- grupos

    function createGroup() external returns (uint256) {
        return _createGroup(msg.sender, 1 hours);
    }

    function createGroup(address admin) external returns (uint256) {
        return _createGroup(admin, 1 hours);
    }

    function createGroup(
        address admin,
        uint256 merkleTreeDuration
    ) external returns (uint256) {
        return _createGroup(admin, merkleTreeDuration);
    }

    function updateGroupAdmin(uint256, address) external pure {
        revert NotImplementedInMock();
    }

    function acceptGroupAdmin(uint256) external pure {
        revert NotImplementedInMock();
    }

    function updateGroupMerkleTreeDuration(uint256, uint256) external pure {
        revert NotImplementedInMock();
    }

    // --------------------------------------------------------------- membros

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

    function addMembers(uint256, uint256[] calldata) external pure {
        revert NotImplementedInMock();
    }

    function updateMember(
        uint256,
        uint256,
        uint256,
        uint256[] calldata
    ) external pure {
        revert NotImplementedInMock();
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

    // ---------------------------------------------------------------- provas

    function validateProof(
        uint256 groupId,
        SemaphoreProof calldata proof
    ) external {
        // mesma ordem de checagens do Semaphore v4, para os testes reverterem com o mesmo erro
        MockGroup storage group = _groups[groupId];

        if (group.usedNullifiers[proof.nullifier]) {
            revert Semaphore__YouAreUsingTheSameNullifierTwice();
        }

        if (!verifyProof(groupId, proof)) {
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

    function verifyProof(
        uint256 groupId,
        SemaphoreProof calldata proof
    ) public view onlyExistingGroup(groupId) returns (bool) {
        MockGroup storage group = _groups[groupId];

        if (proof.merkleTreeDepth < MIN_DEPTH || proof.merkleTreeDepth > MAX_DEPTH) {
            revert Semaphore__MerkleTreeDepthIsNotSupported();
        }

        if (group.size == 0) {
            revert Semaphore__GroupHasNoMembers();
        }

        if (!group.knownRoots[proof.merkleTreeRoot]) {
            revert Semaphore__MerkleTreeRootIsNotPartOfTheGroup();
        }

        // no real, aqui o Verifier confere a prova Groth16
        return acceptProofs;
    }

    // -------------------------------------------------------------- leituras

    function getGroupAdmin(uint256 groupId) external view returns (address) {
        return _groups[groupId].admin;
    }

    function hasMember(
        uint256 groupId,
        uint256 identityCommitment
    ) external view returns (bool) {
        return _groups[groupId].indexOf[identityCommitment] != 0;
    }

    function indexOf(
        uint256 groupId,
        uint256 identityCommitment
    ) external view returns (uint256) {
        uint256 indexPlusOne = _groups[groupId].indexOf[identityCommitment];

        if (indexPlusOne == 0) {
            revert LeafDoesNotExist();
        }

        return indexPlusOne - 1;
    }

    function getMerkleTreeRoot(uint256 groupId) external view returns (uint256) {
        return _groups[groupId].merkleTreeRoot;
    }

    /// @dev Mesma profundidade do LeanIMT: o menor `d` com 2^d >= size.
    function getMerkleTreeDepth(uint256 groupId) external view returns (uint256 depth) {
        uint256 size = _groups[groupId].size;

        while ((uint256(1) << depth) < size) {
            ++depth;
        }
    }

    function getMerkleTreeSize(uint256 groupId) external view returns (uint256) {
        return _groups[groupId].size;
    }

    // ------------------------------------------------------------- internas

    function _createGroup(
        address admin,
        uint256 merkleTreeDuration
    ) private returns (uint256 groupId) {
        groupId = groupCounter++;

        MockGroup storage group = _groups[groupId];
        group.admin = admin;
        group.merkleTreeDuration = merkleTreeDuration;

        emit GroupCreated(groupId);
        emit GroupAdminUpdated(groupId, address(0), admin);
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
