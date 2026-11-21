// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import {Ownable, Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {IDonatable} from "./IDonatable.sol";

/// @dev O presidente é o `owner()`. O contrato não tem `receive` nem `fallback`,
/// então só `donate()` aceita ETH.
contract Party is IDonatable, Ownable2Step {
    string public name;
    mapping(address => uint256) public donatedBy;

    event Withdrawn(address indexed to, uint256 amount);

    error InvalidRecipient();
    error InsufficientBalance(uint256 balance, uint256 amount);
    error WithdrawFailed();
    error RenounceDisabled();

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

    function withdraw(address to, uint256 amount) external onlyOwner {
        if (to == address(0)) {
            revert InvalidRecipient();
        }

        uint256 balance = address(this).balance;

        if (amount > balance) {
            revert InsufficientBalance(balance, amount);
        }

        (bool ok, ) = to.call{value: amount}("");

        if (!ok) {
            revert WithdrawFailed();
        }

        emit Withdrawn(to, amount);
    }

    function renounceOwnership() public pure override {
        revert RenounceDisabled();
    }
}
