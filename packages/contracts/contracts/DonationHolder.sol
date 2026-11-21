// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import {Ownable, Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {IDonatable} from "./IDonatable.sol";

/// @dev Doações e saque compartilhados por `Party`, `Candidate` e `Candidacy`. O `owner()`
/// saca. Sem `receive` nem `fallback`: só `donate()` aceita ETH. Os três
/// contratos são clones EIP-1167 configurados por `initialize`.
abstract contract DonationHolder is Initializable, IDonatable, Ownable2Step {
    mapping(address => uint256) public donatedBy;

    event Withdrawn(address indexed to, uint256 amount);

    error InvalidRecipient();
    error InsufficientBalance(uint256 balance, uint256 amount);
    error WithdrawFailed();
    error RenounceDisabled();

    /// @dev Só trava a implementação; os clones não executam o construtor.
    constructor() Ownable(msg.sender) {
        _disableInitializers();
    }

    function donate() external payable virtual {
        _donate();
    }

    function _donate() internal {
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
