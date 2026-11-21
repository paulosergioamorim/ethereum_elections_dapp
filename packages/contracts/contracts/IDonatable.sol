// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

interface IDonatable {
    event Donated(address indexed donor, uint256 amount);

    error ZeroDonation();

    function donate() external payable;
}
