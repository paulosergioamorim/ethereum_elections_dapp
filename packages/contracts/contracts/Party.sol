// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";
import {DonationHolder} from "./DonationHolder.sol";
import {Candidate} from "./Candidate.sol";

/// @dev O presidente é o `owner()`.
contract Party is DonationHolder {
    /// @dev `immutable` vive no bytecode, então os clones o enxergam.
    address private immutable _candidateBase = address(new Candidate());

    string public name;
    Candidate[] private _candidates;
    mapping(address => bool) public isCandidate;

    event CandidateCreated(address indexed candidate);

    error InvalidPresident();
    error EmptyPartyName();

    function initialize(
        address president,
        string calldata _name
    ) external initializer {
        if (president == address(0)) {
            revert InvalidPresident();
        }

        if (bytes(_name).length == 0) {
            revert EmptyPartyName();
        }

        name = _name;
        _transferOwnership(president);
    }

    function createCandidate(
        address candidate,
        string calldata _name
    ) external onlyOwner returns (Candidate created) {
        created = Candidate(Clones.clone(_candidateBase));
        created.initialize(candidate, _name, address(this));
        _candidates.push(created);
        isCandidate[address(created)] = true;
        emit CandidateCreated(address(created));
    }

    function candidates() external view returns (Candidate[] memory) {
        return _candidates;
    }
}
