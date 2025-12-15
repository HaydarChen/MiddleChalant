// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract Escrow is ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum State {
        AWAITING_DEPOSIT,
        FUNDED,
        RELEASED,
        REFUNDED,
        CANCELED
    }

    address public immutable buyer;
    address public immutable seller;
    address public immutable feeRecipient;
    IERC20 public immutable token;
    uint256 public immutable amount;
    uint16 public immutable feeBps;

    State public state;

    event Deposited(address indexed from, uint256 amount);
    event Released(address indexed toSeller, uint256 sellerAmount, uint256 fee);
    event Refunded(address indexed toBuyer, uint256 amount);
    event Cancelled(address indexed by);

    error NotBuyer();
    error NotSeller();
    error InvalidState();

    constructor(
        address _buyer,
        address _seller,
        address _token,
        uint256 _amount,
        address _feeRecipient,
        uint16 _feeBps
    ) {
        buyer = _buyer;
        seller = _seller;
        token = IERC20(_token);
        amount = _amount;
        feeRecipient = _feeRecipient;
        feeBps = _feeBps;
        state = State.AWAITING_DEPOSIT;
    }

    modifier onlyBuyer() {
        if (msg.sender != buyer) revert NotBuyer();
        _;
    }

    modifier onlySeller() {
        if (msg.sender != seller) revert NotSeller();
        _;
    }

    modifier inState(State expected) {
        if (state != expected) revert InvalidState();
        _;
    }

    function deposit() external onlyBuyer inState(State.AWAITING_DEPOSIT) nonReentrant {
        token.safeTransferFrom(msg.sender, address(this), amount);
        state = State.FUNDED;
        emit Deposited(msg.sender, amount);
    }

    function release() external onlyBuyer inState(State.FUNDED) nonReentrant {
        uint256 fee = (amount * feeBps) / 10_000;
        uint256 sellerAmount = amount - fee;
        if (fee > 0) token.safeTransfer(feeRecipient, fee);
        token.safeTransfer(seller, sellerAmount);
        state = State.RELEASED;
        emit Released(seller, sellerAmount, fee);
    }

    function refund() external onlySeller inState(State.FUNDED) nonReentrant {
        token.safeTransfer(buyer, amount);
        state = State.REFUNDED;
        emit Refunded(buyer, amount);
    }

    function cancel() external inState(State.AWAITING_DEPOSIT) {
        if (msg.sender != buyer && msg.sender != seller) revert InvalidState();
        state = State.CANCELED;
        emit Cancelled(msg.sender);
    }
}

