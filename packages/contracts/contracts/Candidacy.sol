// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import {DonationHolder} from "./DonationHolder.sol";
import {Candidate} from "./Candidate.sol";

interface ICandidacyStatus {
    function candidacyIsActive(address candidacy) external view returns (bool);
}

/// @dev Candidatura de um candidato a uma eleição: a associação n:n entre as duas. A carteira do
/// candidato é o `owner()` e saca o que foi doado. A factory diz se a indicação segue ativa:
/// indicação retirada ou substituída deixa de aceitar doações, mas o saldo continua sacável.
contract Candidacy is DonationHolder {
    address public election;
    Candidate public candidate;
    address public party;
    ICandidacyStatus private _factory;

    error NominationInactive();

    function initialize(
        address wallet,
        address _election,
        Candidate _candidate,
        address _party,
        ICandidacyStatus factory
    ) external initializer {
        election = _election;
        candidate = _candidate;
        party = _party;
        _factory = factory;
        _transferOwnership(wallet);
    }

    function donate() external payable override {
        if (!_factory.candidacyIsActive(address(this))) {
            revert NominationInactive();
        }

        _donate();
    }
}
