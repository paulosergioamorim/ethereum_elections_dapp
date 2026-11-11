// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import {CreateElectionCommand} from "../contracts/Types.sol";

/// @dev Auxiliares compartilhados pelos testes de ElectionFactory e Election.
/// Funções `internal` são copiadas para o contrato que as usa, então não é preciso implantar a library.
library ElectionTestLib {
    /// @dev Comando que passa em todas as validações do `initialize`, com datas relativas ao
    /// `block.timestamp` atual para continuar válido depois de qualquer `vm.warp`.
    function validCommand() internal view returns (CreateElectionCommand memory) {
        string[] memory candidates = new string[](2);
        candidates[0] = "Candidato A";
        candidates[1] = "Candidato B";

        return
            CreateElectionCommand(
                unicode"Eleição 2026",
                candidates,
                uint64(block.timestamp + 1),
                uint64(block.timestamp + 1 days)
            );
    }
}
