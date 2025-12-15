// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./Escrow.sol";

contract EscrowFactory {
    event EscrowCreated(address indexed escrow, address buyer, address seller, address token, uint256 amount);

    address public immutable feeRecipient;

    constructor(address _feeRecipient) {
        feeRecipient = _feeRecipient;
    }

    function createEscrow(
        address buyer,
        address seller,
        address token,
        uint256 amount,
        uint16 feeBps
    ) external returns (address) {
        Escrow escrow = new Escrow(buyer, seller, token, amount, feeRecipient, feeBps);
        emit EscrowCreated(address(escrow), buyer, seller, token, amount);
        return address(escrow);
    }
}

