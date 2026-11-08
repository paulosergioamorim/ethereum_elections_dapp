// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import {stdError} from "forge-std/StdError.sol";
import {Election} from "../contracts/Election.sol";
import {ElectionPhase} from "../contracts/Types.sol";
import {ElectionTestBase} from "./ElectionTestBase.sol";

/// @dev Preparação comum: `_castVote(option, salt)` e depois `vm.warp(election.votingEnd())`.
/// Os testes de revert de fase e de entrada não precisam de voto.
contract ElectionRevealBatchTest is ElectionTestBase {
    // arrays vazios, sem warp → InvalidPhase(Scheduled, Tally)
    function test_shouldRevertWithInvalidPhaseWhenScheduled()
        public
        initialized
    {
        vm.expectRevert(
            abi.encodeWithSelector(
                Election.InvalidPhase.selector,
                ElectionPhase.Scheduled,
                ElectionPhase.Tally
            )
        );
        election.revealBatch(new uint256[](0), new uint256[](0), new bytes32[](0));
    }

    // arrays vazios → InvalidPhase(Voting, Tally)
    function test_shouldRevertWithInvalidPhaseWhenVoting()
        public
        initialized
        inVoting
    {
        vm.expectRevert(
            abi.encodeWithSelector(
                Election.InvalidPhase.selector,
                ElectionPhase.Voting,
                ElectionPhase.Tally
            )
        );
        election.revealBatch(new uint256[](0), new uint256[](0), new bytes32[](0));
    }

    // vm.assume(options.length != indexes.length || salts.length != indexes.length) → LengthMismatch
    function test_shouldRevertWithLengthMismatch(
        uint256[] calldata indexes,
        uint256[] calldata options,
        bytes32[] calldata salts
    ) public initialized inTally {
        vm.assume(
            options.length != indexes.length || salts.length != indexes.length
        );
        vm.expectRevert(Election.LengthMismatch.selector);
        election.revealBatch(indexes, options, salts);
    }

    // sem votos, arrays de 1 elemento com qualquer índice → stdError.indexOOBError
    function test_shouldRevertWithIndexOutOfBounds(
        uint256 index,
        uint256 option,
        bytes32 salt
    ) public initialized inTally {
        (
            uint256[] memory indexes,
            uint256[] memory options,
            bytes32[] memory salts
        ) = _singleReveal(index, option, salt);
        vm.expectRevert(stdError.indexOOBError);
        election.revealBatch(indexes, options, salts);
    }

    // voto com (option, salt), reveal com (option, wrongSalt) → InvalidReveal(index)
    function test_shouldRevertWithInvalidRevealWhenSaltChanged(
        uint256 option,
        bytes32 salt,
        bytes32 wrongSalt
    ) public initialized {
        vm.assume(salt != wrongSalt);
        uint256 index = _castVote(option, salt);
        (
            uint256[] memory indexes,
            uint256[] memory options,
            bytes32[] memory salts
        ) = _singleReveal(index, option, wrongSalt);
        vm.warp(election.votingEnd());
        vm.expectRevert(
            abi.encodeWithSelector(Election.InvalidReveal.selector, index)
        );
        election.revealBatch(indexes, options, salts);
    }

    // voto com (option, salt), reveal com (wrongOption, salt) → InvalidReveal(index)
    function test_shouldRevertWithInvalidRevealWhenOptionChanged(
        uint256 option,
        uint256 wrongOption,
        bytes32 salt
    ) public initialized {
        vm.assume(option != wrongOption);
        uint256 index = _castVote(option, salt);
        (
            uint256[] memory indexes,
            uint256[] memory options,
            bytes32[] memory salts
        ) = _singleReveal(index, wrongOption, salt);
        vm.warp(election.votingEnd());
        vm.expectRevert(
            abi.encodeWithSelector(Election.InvalidReveal.selector, index)
        );
        election.revealBatch(indexes, options, salts);
    }

    // 2 votos; lote [válido, salt errado] → InvalidReveal(1); depois isRevealed(0) == false e revealedCount == 0
    function test_shouldRevertWholeBatchWithOneInvalidReveal(
        uint256 option,
        bytes32 salt,
        bytes32 wrongSalt
    ) public initialized {
        vm.assume(salt != wrongSalt);
        uint256 index0 = _castVote(option, salt);
        uint256 index1 = _castVote(option, salt);
        uint256[] memory indexes = new uint256[](2);
        uint256[] memory options = new uint256[](2);
        bytes32[] memory salts = new bytes32[](2);
        indexes[0] = index0;
        options[0] = option;
        salts[0] = salt;
        indexes[1] = index1;
        options[1] = option;
        salts[1] = wrongSalt;
        vm.warp(election.votingEnd());
        vm.expectRevert(
            abi.encodeWithSelector(Election.InvalidReveal.selector, index1)
        );
        election.revealBatch(indexes, options, salts);
        assertFalse(election.isRevealed(index0));
        assertEq(election.revealedCount(), 0);
    }

    // isRevealed(index) == true
    function test_shouldStoreIsRevealed(
        uint256 option,
        bytes32 salt
    ) public initialized {
        uint256 index = _castAndReveal(option, salt);
        assertTrue(election.isRevealed(index));
    }

    // revealedCount == 1 e results() com 0 não revelados
    function test_shouldStoreRevealedCount(
        uint256 option,
        bytes32 salt
    ) public initialized {
        _castAndReveal(option, salt);
        (, , uint256 unrevealed) = election.results();
        assertEq(election.revealedCount(), 1);
        assertEq(unrevealed, 0);
    }

    // bound(option, 0, candidates().length - 1) → tally[option] == 1 em results()
    function test_shouldIncrementTally(
        uint256 option,
        bytes32 salt
    ) public initialized {
        option = bound(option, 0, election.candidates().length - 1);
        _castAndReveal(option, salt);
        (uint256[] memory tally, , ) = election.results();
        assertEq(tally[option], 1);
    }

    // bound(option, candidates().length, type(uint256).max) → nullVotes == 1
    function test_shouldIncrementNullVotes(
        uint256 option,
        bytes32 salt
    ) public initialized {
        option = bound(option, election.candidates().length, type(uint256).max);
        _castAndReveal(option, salt);
        (, uint256 nullVotes, ) = election.results();
        assertEq(nullVotes, 1);
    }

    // revelar o mesmo índice duas vezes no lote não reverte e revealedCount continua 1
    function test_shouldSkipRevealedIndexes(
        uint256 option,
        bytes32 salt
    ) public initialized {
        uint256 index = _castVote(option, salt);
        uint256[] memory indexes = new uint256[](2);
        uint256[] memory options = new uint256[](2);
        bytes32[] memory salts = new bytes32[](2);
        indexes[0] = indexes[1] = index;
        options[0] = options[1] = option;
        salts[0] = salts[1] = salt;
        vm.warp(election.votingEnd());
        election.revealBatch(indexes, options, salts);
        (, , uint256 unrevealed) = election.results();
        assertEq(election.revealedCount(), 1);
        assertEq(unrevealed, 0);
    }

    /// @dev Lote de um único reveal.
    function _singleReveal(
        uint256 index,
        uint256 option,
        bytes32 salt
    )
        private
        pure
        returns (
            uint256[] memory indexes,
            uint256[] memory options,
            bytes32[] memory salts
        )
    {
        indexes = new uint256[](1);
        options = new uint256[](1);
        salts = new bytes32[](1);
        indexes[0] = index;
        options[0] = option;
        salts[0] = salt;
    }

    /// @dev Preparação e ação dos testes de efeito: vota, avança para a apuração e revela o voto.
    function _castAndReveal(
        uint256 option,
        bytes32 salt
    ) private returns (uint256 index) {
        index = _castVote(option, salt);
        (
            uint256[] memory indexes,
            uint256[] memory options,
            bytes32[] memory salts
        ) = _singleReveal(index, option, salt);
        vm.warp(election.votingEnd());
        election.revealBatch(indexes, options, salts);
    }
}
