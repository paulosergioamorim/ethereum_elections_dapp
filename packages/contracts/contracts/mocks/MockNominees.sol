// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import {Candidacy} from "../Candidacy.sol";
import {INominees} from "../Types.sol";

/// @notice Fonte de indicados falsa para testar `Election` sozinha. NÃO implantar fora dos testes.
contract MockNominees is INominees {
    Candidacy[] private _list;

    function set(Candidacy[] calldata list) external {
        _list = list;
    }

    function nomineesOf(address) external view returns (Candidacy[] memory) {
        return _list;
    }
}
