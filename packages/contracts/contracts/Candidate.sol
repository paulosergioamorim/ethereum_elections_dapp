// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import {DonationHolder} from "./DonationHolder.sol";

/// @dev A carteira do candidato é o `owner()`.
contract Candidate is DonationHolder {
    string public name;
    address public party;

    error InvalidCandidate();
    error EmptyCandidateName();

    function initialize(
        address candidate,
        string calldata _name,
        address _party
    ) external initializer {
        if (candidate == address(0)) {
            revert InvalidCandidate();
        }

        if (bytes(_name).length == 0) {
            revert EmptyCandidateName();
        }

        name = _name;
        party = _party;
        _transferOwnership(candidate);
    }
}
