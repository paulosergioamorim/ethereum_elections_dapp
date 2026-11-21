// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import {Ownable, Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {IDonatable} from "./IDonatable.sol";

/// @dev O presidente é o `owner()`. O contrato não tem `receive` nem `fallback`,
/// então só `donate()` aceita ETH.
contract Party is IDonatable, Ownable2Step {
    string public name;
    mapping(address => uint256) public donatedBy;

    constructor(
        address president,
        string memory _name
    ) Ownable(president) {
        name = _name;
    }

    function donate() external payable {
        if (msg.value == 0) {
            revert ZeroDonation();
        }

        donatedBy[msg.sender] += msg.value;
        emit Donated(msg.sender, msg.value);
    }
}
