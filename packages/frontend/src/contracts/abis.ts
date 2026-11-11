// Gerado por scripts/export-abis.ts a partir de artifacts/. Não edite à mão: rode `pnpm export-abis`.

export const electionFactoryAbi = [
  {
    "inputs": [
      {
        "internalType": "contract IElectionSemaphore",
        "name": "_sem",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [],
    "name": "AlreadyRegisteredIdentityCommitment",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "CommitmentCannotBeZero",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "FailedDeployment",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "balance",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "needed",
        "type": "uint256"
      }
    ],
    "name": "InsufficientBalance",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidVoterAddress",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      }
    ],
    "name": "OwnableInvalidOwner",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "OwnableUnauthorizedAccount",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "RenounceDisabled",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "UnauthorizedVoter",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "election",
        "type": "address"
      }
    ],
    "name": "ElectionCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "voter",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "commitment",
        "type": "uint256"
      }
    ],
    "name": "IdentityRegistered",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "previousOwner",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
      }
    ],
    "name": "OwnershipTransferred",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "voter",
        "type": "address"
      }
    ],
    "name": "VoterAuthorized",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "voter",
        "type": "address"
      }
    ],
    "name": "VoterRemoved",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "address[]",
        "name": "voters",
        "type": "address[]"
      }
    ],
    "name": "addAuthorizedVoters",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "commitmentOf",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          {
            "internalType": "string",
            "name": "title",
            "type": "string"
          },
          {
            "internalType": "string[]",
            "name": "candidates",
            "type": "string[]"
          },
          {
            "internalType": "uint64",
            "name": "votingStart",
            "type": "uint64"
          },
          {
            "internalType": "uint64",
            "name": "votingEnd",
            "type": "uint64"
          }
        ],
        "internalType": "struct CreateElectionCommand",
        "name": "command",
        "type": "tuple"
      }
    ],
    "name": "createElection",
    "outputs": [
      {
        "internalType": "contract Election",
        "name": "election",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "elections",
    "outputs": [
      {
        "internalType": "contract Election[]",
        "name": "",
        "type": "address[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "groupId",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "isAuthorized",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "isElection",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "identityCommitment",
        "type": "uint256"
      }
    ],
    "name": "registerIdentityCommitment",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "voter",
        "type": "address"
      },
      {
        "internalType": "uint256[]",
        "name": "siblings",
        "type": "uint256[]"
      }
    ],
    "name": "removeVoter",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "renounceOwnership",
    "outputs": [],
    "stateMutability": "pure",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "sem",
    "outputs": [
      {
        "internalType": "contract IElectionSemaphore",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
      }
    ],
    "name": "transferOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

export const electionAbi = [
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [],
    "name": "InvalidCandidatesQuantity",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidInitialization",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidMerkleRoot",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidMessage",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "enum ElectionPhase",
        "name": "current",
        "type": "uint8"
      },
      {
        "internalType": "enum ElectionPhase",
        "name": "expected",
        "type": "uint8"
      }
    ],
    "name": "InvalidPhase",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "index",
        "type": "uint256"
      }
    ],
    "name": "InvalidReveal",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidScope",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidSemaphore",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidVotingDuration",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidVotingStart",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "LengthMismatch",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "MerkleRootMismatch",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NotInitializing",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint64",
        "name": "version",
        "type": "uint64"
      }
    ],
    "name": "Initialized",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "nullifier",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "index",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "bytes32",
        "name": "commitment",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "bytes",
        "name": "ciphertext",
        "type": "bytes"
      }
    ],
    "name": "VoteCast",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "index",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "option",
        "type": "uint256"
      }
    ],
    "name": "VoteRevealed",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "candidates",
    "outputs": [
      {
        "internalType": "string[]",
        "name": "",
        "type": "string[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "createdAtBlock",
    "outputs": [
      {
        "internalType": "uint64",
        "name": "",
        "type": "uint64"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "groupId",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "contract IElectionSemaphore",
        "name": "_sem",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "_groupId",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_merkleTreeRoot",
        "type": "uint256"
      },
      {
        "components": [
          {
            "internalType": "string",
            "name": "title",
            "type": "string"
          },
          {
            "internalType": "string[]",
            "name": "candidates",
            "type": "string[]"
          },
          {
            "internalType": "uint64",
            "name": "votingStart",
            "type": "uint64"
          },
          {
            "internalType": "uint64",
            "name": "votingEnd",
            "type": "uint64"
          }
        ],
        "internalType": "struct CreateElectionCommand",
        "name": "command",
        "type": "tuple"
      }
    ],
    "name": "initialize",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "index",
        "type": "uint256"
      }
    ],
    "name": "isRevealed",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "merkleTreeRoot",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "nullVotes",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "phase",
    "outputs": [
      {
        "internalType": "enum ElectionPhase",
        "name": "",
        "type": "uint8"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "results",
    "outputs": [
      {
        "internalType": "uint256[]",
        "name": "",
        "type": "uint256[]"
      },
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256[]",
        "name": "indexes",
        "type": "uint256[]"
      },
      {
        "internalType": "uint256[]",
        "name": "options",
        "type": "uint256[]"
      },
      {
        "internalType": "bytes32[]",
        "name": "salts",
        "type": "bytes32[]"
      }
    ],
    "name": "revealBatch",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "revealedCount",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "title",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "merkleTreeDepth",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "merkleTreeRoot",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "nullifier",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "message",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "scope",
            "type": "uint256"
          },
          {
            "internalType": "uint256[8]",
            "name": "points",
            "type": "uint256[8]"
          }
        ],
        "internalType": "struct ISemaphore.SemaphoreProof",
        "name": "proof",
        "type": "tuple"
      },
      {
        "internalType": "bytes32",
        "name": "commitment",
        "type": "bytes32"
      },
      {
        "internalType": "bytes",
        "name": "ciphertext",
        "type": "bytes"
      }
    ],
    "name": "vote",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "votingEnd",
    "outputs": [
      {
        "internalType": "uint64",
        "name": "",
        "type": "uint64"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "votingStart",
    "outputs": [
      {
        "internalType": "uint64",
        "name": "",
        "type": "uint64"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

export const semaphoreAbi = [
  {
    "inputs": [
      {
        "internalType": "contract ISemaphoreVerifier",
        "name": "_verifier",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [],
    "name": "LeafAlreadyExists",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "LeafCannotBeZero",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "LeafDoesNotExist",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "LeafGreaterThanSnarkScalarField",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "Semaphore__CallerIsNotTheGroupAdmin",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "Semaphore__CallerIsNotThePendingGroupAdmin",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "Semaphore__GroupDoesNotExist",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "Semaphore__GroupHasNoMembers",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "Semaphore__InvalidProof",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "Semaphore__MerkleTreeDepthIsNotSupported",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "Semaphore__MerkleTreeRootIsExpired",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "Semaphore__MerkleTreeRootIsNotPartOfTheGroup",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "Semaphore__YouAreUsingTheSameNullifierTwice",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "WrongSiblingNodes",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "groupId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "oldAdmin",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "newAdmin",
        "type": "address"
      }
    ],
    "name": "GroupAdminPending",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "groupId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "oldAdmin",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "newAdmin",
        "type": "address"
      }
    ],
    "name": "GroupAdminUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "groupId",
        "type": "uint256"
      }
    ],
    "name": "GroupCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "groupId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "oldMerkleTreeDuration",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "newMerkleTreeDuration",
        "type": "uint256"
      }
    ],
    "name": "GroupMerkleTreeDurationUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "groupId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "index",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "identityCommitment",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "merkleTreeRoot",
        "type": "uint256"
      }
    ],
    "name": "MemberAdded",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "groupId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "index",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "identityCommitment",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "merkleTreeRoot",
        "type": "uint256"
      }
    ],
    "name": "MemberRemoved",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "groupId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "index",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "identityCommitment",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "newIdentityCommitment",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "merkleTreeRoot",
        "type": "uint256"
      }
    ],
    "name": "MemberUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "groupId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "startIndex",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256[]",
        "name": "identityCommitments",
        "type": "uint256[]"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "merkleTreeRoot",
        "type": "uint256"
      }
    ],
    "name": "MembersAdded",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "groupId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "merkleTreeDepth",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "merkleTreeRoot",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "nullifier",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "message",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "scope",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256[8]",
        "name": "points",
        "type": "uint256[8]"
      }
    ],
    "name": "ProofValidated",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "groupId",
        "type": "uint256"
      }
    ],
    "name": "acceptGroupAdmin",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "groupId",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "identityCommitment",
        "type": "uint256"
      }
    ],
    "name": "addMember",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "groupId",
        "type": "uint256"
      },
      {
        "internalType": "uint256[]",
        "name": "identityCommitments",
        "type": "uint256[]"
      }
    ],
    "name": "addMembers",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "admin",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "merkleTreeDuration",
        "type": "uint256"
      }
    ],
    "name": "createGroup",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "groupId",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "createGroup",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "groupId",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "admin",
        "type": "address"
      }
    ],
    "name": "createGroup",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "groupId",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "groupId",
        "type": "uint256"
      }
    ],
    "name": "getGroupAdmin",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "groupId",
        "type": "uint256"
      }
    ],
    "name": "getMerkleTreeDepth",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "groupId",
        "type": "uint256"
      }
    ],
    "name": "getMerkleTreeRoot",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "groupId",
        "type": "uint256"
      }
    ],
    "name": "getMerkleTreeSize",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "groupCounter",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "groups",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "merkleTreeDuration",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "groupId",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "identityCommitment",
        "type": "uint256"
      }
    ],
    "name": "hasMember",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "groupId",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "identityCommitment",
        "type": "uint256"
      }
    ],
    "name": "indexOf",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "groupId",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "identityCommitment",
        "type": "uint256"
      },
      {
        "internalType": "uint256[]",
        "name": "merkleProofSiblings",
        "type": "uint256[]"
      }
    ],
    "name": "removeMember",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "groupId",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "newAdmin",
        "type": "address"
      }
    ],
    "name": "updateGroupAdmin",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "groupId",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "newMerkleTreeDuration",
        "type": "uint256"
      }
    ],
    "name": "updateGroupMerkleTreeDuration",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "groupId",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "identityCommitment",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "newIdentityCommitment",
        "type": "uint256"
      },
      {
        "internalType": "uint256[]",
        "name": "merkleProofSiblings",
        "type": "uint256[]"
      }
    ],
    "name": "updateMember",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "groupId",
        "type": "uint256"
      },
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "merkleTreeDepth",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "merkleTreeRoot",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "nullifier",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "message",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "scope",
            "type": "uint256"
          },
          {
            "internalType": "uint256[8]",
            "name": "points",
            "type": "uint256[8]"
          }
        ],
        "internalType": "struct ISemaphore.SemaphoreProof",
        "name": "proof",
        "type": "tuple"
      }
    ],
    "name": "validateProof",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "verifier",
    "outputs": [
      {
        "internalType": "contract ISemaphoreVerifier",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "groupId",
        "type": "uint256"
      },
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "merkleTreeDepth",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "merkleTreeRoot",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "nullifier",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "message",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "scope",
            "type": "uint256"
          },
          {
            "internalType": "uint256[8]",
            "name": "points",
            "type": "uint256[8]"
          }
        ],
        "internalType": "struct ISemaphore.SemaphoreProof",
        "name": "proof",
        "type": "tuple"
      }
    ],
    "name": "verifyProof",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;
