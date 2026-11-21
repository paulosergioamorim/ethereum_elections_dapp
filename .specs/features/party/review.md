# Review: Party (clone + initialize)

Reviewed `git diff 1192c49..HEAD` (a3c91e6 spec, ec64778 implementation). No screens, so no capture comparison. I changed no code (mutations were reverted with `git checkout`).

Verdict: the request and the added instruction ("usar Clones e initialize") are implemented correctly. `pnpm test:contracts` passes: 117 (87 Solidity, 30 Node). Criteria 1-19 are covered; two are only partly covered by tests (below). No blocking problems.

## Request, sentence by sentence
- Party contract with a president (Ownable2Step): `Party is Initializable, IDonatable, Ownable2Step`; `initialize` calls `_transferOwnership(president)`. Done.
- Created by ElectionFactory: `createParty` is `onlyOwner`, runs `Clones.clone(_partyBase)` then `initialize`, records `_parties` and `isParty`, emits `PartyCreated`. Done.
- Donations by users: `donate()` payable, no `receive` or `fallback`. Done.
- President withdraws: `withdraw(to, amount)` is `onlyOwner`. Done.
- Donation method abstracted: `IDonatable`. Done.
- "Usar Clones e initialize, assim como packages/contracts usa": same shape as `Election` (immutable base built in the factory, constructor with `_disableInitializers()`, `initializer`). Done.

## Mutation results (each reverted)
- Remove `_disableInitializers()`: fails `test_shouldLockImplementation` (criterion 10).
- Remove `_transferOwnership(president)`: fails 9+ tests, including `test_shouldStorePresidentAndName` (criterion 1).
- Remove `name = _name`: fails `test_shouldStorePresidentAndName` (criterion 1).
- Remove `initializer` modifier: fails `test_shouldRevertWhenInitializedTwice` and `test_shouldLockImplementation` (criterion 9).

## Criteria vs tests
- 1: yes (owner, name, list, isParty, event; the event test reads the recorded log, so it is not tied to CREATE addresses).
- 2, 3, 4: yes. 5, 6, 7: yes. 8: weak, see problem 2.
- 9: yes (re-init on a factory clone reverts with `InvalidInitialization`). "owner and name unchanged" is implied by the revert, not asserted.
- 10: yes. It extracts the implementation from the EIP-1167 bytecode, so it checks the real `_partyBase`.
- 11: partial, see problem 1.
- 12-16 (withdraw), 17-19 (handover, renounce): yes. Their setups now use a clone plus `initialize`, so they exercise the clone path.

## Problems
1. Low. Criterion 11 is only partly tested. `test_shouldCreateDistinctParties` checks two different addresses and `parties().length == 2`, with the same president and name for both. It does not check different `owner()`/`name()` per party, balance isolation (donate to one, other stays 0), or that neither address equals the implementation. Suggested fix: create "Alfa"/A and "Partido Beta"/B, donate to one, assert owners, names, balances and `address != impl`.
2. Low (carried over from the old review). Criterion 8 (`Party` implements `IDonatable`) has no test that fails if `is IDonatable` is dropped; `test_shouldImplementIDonatable` only calls `donate()` by selector. The compiler enforces it through `is IDonatable`; accept it or add an interfaceId-style check.
3. Info. `initialize` does not reject `president == address(0)`; only the factory does. Safe in practice: the factory clones and initializes in one transaction and re-init is blocked.
4. Info. `constructor() Ownable(msg.sender)` gives the implementation an owner (the factory). Harmless: the implementation is locked and clone storage is separate. It matches the plan's stated choice.

## Checked and fine
- `pnpm export-abis` produces no diff against the committed `abis.ts`.
- No remaining `new Party(` calls in the repository.
