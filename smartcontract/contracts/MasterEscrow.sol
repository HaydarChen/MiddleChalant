// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MasterEscrow
 * @notice A single escrow contract that handles multiple deals with admin (bot) control
 * @dev Designed for bot-driven workflow where users send USDT and admin executes release/refund
 */
contract MasterEscrow is ReentrancyGuard, Pausable, Ownable {
    using SafeERC20 for IERC20;

    // ============ Enums ============

    enum DealStatus {
        CREATED,    // Deal created, awaiting deposit
        FUNDED,     // Deposit received
        RELEASED,   // Funds sent to receiver
        REFUNDED,   // Funds returned to sender
        CANCELLED   // Cancelled before deposit
    }

    enum FeePayer {
        SENDER,     // Sender pays full fee (deposits amount + fee)
        RECEIVER,   // Receiver pays full fee (receives amount - fee)
        SPLIT       // 50/50 split (sender deposits amount + halfFee, receiver gets amount - halfFee)
    }

    // ============ Structs ============

    struct Deal {
        bytes32 roomId;         // Backend room ID for reference
        address token;          // ERC20 token address (USDT)
        uint256 dealAmount;     // The agreed deal amount
        uint256 depositAmount;  // Amount sender needs to deposit (varies by feePayer)
        uint256 fee;            // Total fee amount (1%)
        FeePayer feePayer;
        DealStatus status;
        uint256 createdAt;
        uint256 fundedAt;
        uint256 completedAt;
        address depositedBy;    // Who actually deposited (for verification)
    }

    // ============ State Variables ============

    /// @notice Fee percentage in basis points (100 = 1%)
    uint16 public constant FEE_BPS = 100;

    /// @notice Address that receives platform fees
    address public feeRecipient;

    /// @notice Mapping of deal ID to Deal struct
    mapping(bytes32 => Deal) public deals;

    /// @notice Array of all deal IDs for enumeration
    bytes32[] public dealIds;

    // ============ Events ============

    event DealCreated(
        bytes32 indexed dealId,
        bytes32 indexed roomId,
        address indexed token,
        uint256 dealAmount,
        uint256 depositAmount,
        uint256 fee,
        FeePayer feePayer
    );

    event Deposited(
        bytes32 indexed dealId,
        address indexed depositor,
        uint256 amount
    );

    event Released(
        bytes32 indexed dealId,
        address indexed receiver,
        uint256 receiverAmount,
        uint256 fee
    );

    event Refunded(
        bytes32 indexed dealId,
        address indexed sender,
        uint256 amount
    );

    event DealCancelled(bytes32 indexed dealId);

    event FeeRecipientUpdated(address indexed oldRecipient, address indexed newRecipient);

    // ============ Errors ============

    error DealAlreadyExists();
    error DealNotFound();
    error InvalidDealStatus();
    error InvalidAmount();
    error InvalidAddress();
    error TransferFailed();

    // ============ Constructor ============

    /**
     * @notice Initialize the MasterEscrow contract
     * @param _feeRecipient Address that receives platform fees
     * @param _admin Initial admin/owner address (bot wallet)
     */
    constructor(address _feeRecipient, address _admin) Ownable(_admin) {
        if (_feeRecipient == address(0)) revert InvalidAddress();
        feeRecipient = _feeRecipient;
    }

    // ============ Admin Functions ============

    /**
     * @notice Create a new deal (admin only)
     * @param dealId Unique identifier for the deal (typically hash of room data)
     * @param roomId Backend room ID for reference
     * @param token ERC20 token address (USDT)
     * @param dealAmount The agreed deal amount
     * @param feePayer Who pays the platform fee
     */
    function createDeal(
        bytes32 dealId,
        bytes32 roomId,
        address token,
        uint256 dealAmount,
        FeePayer feePayer
    ) external onlyOwner whenNotPaused {
        if (deals[dealId].createdAt != 0) revert DealAlreadyExists();
        if (token == address(0)) revert InvalidAddress();
        if (dealAmount == 0) revert InvalidAmount();

        // Calculate fee (1% of deal amount)
        uint256 fee = (dealAmount * FEE_BPS) / 10_000;

        // Calculate deposit amount based on fee payer
        uint256 depositAmount;
        if (feePayer == FeePayer.SENDER) {
            // Sender pays full fee: deposit = amount + fee
            depositAmount = dealAmount + fee;
        } else if (feePayer == FeePayer.RECEIVER) {
            // Receiver pays full fee: deposit = amount
            depositAmount = dealAmount;
        } else {
            // Split: deposit = amount + halfFee
            depositAmount = dealAmount + (fee / 2);
        }

        deals[dealId] = Deal({
            roomId: roomId,
            token: token,
            dealAmount: dealAmount,
            depositAmount: depositAmount,
            fee: fee,
            feePayer: feePayer,
            status: DealStatus.CREATED,
            createdAt: block.timestamp,
            fundedAt: 0,
            completedAt: 0,
            depositedBy: address(0)
        });

        dealIds.push(dealId);

        emit DealCreated(
            dealId,
            roomId,
            token,
            dealAmount,
            depositAmount,
            fee,
            feePayer
        );
    }

    /**
     * @notice Release funds to receiver (admin only)
     * @param dealId The deal to release
     * @param receiver Address to receive the funds
     */
    function release(
        bytes32 dealId,
        address receiver
    ) external onlyOwner whenNotPaused nonReentrant {
        Deal storage deal = deals[dealId];

        if (deal.createdAt == 0) revert DealNotFound();
        if (deal.status != DealStatus.FUNDED) revert InvalidDealStatus();
        if (receiver == address(0)) revert InvalidAddress();

        deal.status = DealStatus.RELEASED;
        deal.completedAt = block.timestamp;

        IERC20 token = IERC20(deal.token);

        // Calculate receiver amount based on fee payer
        uint256 receiverAmount;
        if (deal.feePayer == FeePayer.SENDER) {
            // Sender paid fee: receiver gets full deal amount
            receiverAmount = deal.dealAmount;
        } else if (deal.feePayer == FeePayer.RECEIVER) {
            // Receiver pays fee: receiver gets amount - fee
            receiverAmount = deal.dealAmount - deal.fee;
        } else {
            // Split: receiver gets amount - halfFee
            receiverAmount = deal.dealAmount - (deal.fee / 2);
        }

        // Transfer fee to platform
        if (deal.fee > 0) {
            token.safeTransfer(feeRecipient, deal.fee);
        }

        // Transfer funds to receiver
        token.safeTransfer(receiver, receiverAmount);

        emit Released(dealId, receiver, receiverAmount, deal.fee);
    }

    /**
     * @notice Refund funds to sender (admin only)
     * @param dealId The deal to refund
     * @param sender Address to receive the refund
     */
    function refund(
        bytes32 dealId,
        address sender
    ) external onlyOwner whenNotPaused nonReentrant {
        Deal storage deal = deals[dealId];

        if (deal.createdAt == 0) revert DealNotFound();
        if (deal.status != DealStatus.FUNDED) revert InvalidDealStatus();
        if (sender == address(0)) revert InvalidAddress();

        deal.status = DealStatus.REFUNDED;
        deal.completedAt = block.timestamp;

        // Refund the full deposit amount (no fee taken on refunds)
        IERC20(deal.token).safeTransfer(sender, deal.depositAmount);

        emit Refunded(dealId, sender, deal.depositAmount);
    }

    /**
     * @notice Cancel a deal before it's funded (admin only)
     * @param dealId The deal to cancel
     */
    function cancelDeal(bytes32 dealId) external onlyOwner {
        Deal storage deal = deals[dealId];

        if (deal.createdAt == 0) revert DealNotFound();
        if (deal.status != DealStatus.CREATED) revert InvalidDealStatus();

        deal.status = DealStatus.CANCELLED;
        deal.completedAt = block.timestamp;

        emit DealCancelled(dealId);
    }

    /**
     * @notice Update the fee recipient address
     * @param newFeeRecipient New address for fee collection
     */
    function setFeeRecipient(address newFeeRecipient) external onlyOwner {
        if (newFeeRecipient == address(0)) revert InvalidAddress();

        address oldRecipient = feeRecipient;
        feeRecipient = newFeeRecipient;

        emit FeeRecipientUpdated(oldRecipient, newFeeRecipient);
    }

    /**
     * @notice Pause the contract (emergency stop)
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause the contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    // ============ Public Functions ============

    /**
     * @notice Deposit funds for a deal using approve + transferFrom
     * @dev Anyone can deposit, but amount must match exactly
     * @param dealId The deal to fund
     */
    function deposit(bytes32 dealId) external whenNotPaused nonReentrant {
        Deal storage deal = deals[dealId];

        if (deal.createdAt == 0) revert DealNotFound();
        if (deal.status != DealStatus.CREATED) revert InvalidDealStatus();

        deal.status = DealStatus.FUNDED;
        deal.fundedAt = block.timestamp;
        deal.depositedBy = msg.sender;

        // Transfer the exact deposit amount from sender
        IERC20(deal.token).safeTransferFrom(
            msg.sender,
            address(this),
            deal.depositAmount
        );

        emit Deposited(dealId, msg.sender, deal.depositAmount);
    }

    /**
     * @notice Record a direct transfer deposit (admin only)
     * @dev Use this when user sends tokens directly to the contract
     * @param dealId The deal to fund
     * @param depositor Address that sent the tokens (for record keeping)
     */
    function recordDeposit(
        bytes32 dealId,
        address depositor
    ) external onlyOwner whenNotPaused {
        Deal storage deal = deals[dealId];

        if (deal.createdAt == 0) revert DealNotFound();
        if (deal.status != DealStatus.CREATED) revert InvalidDealStatus();

        // Verify contract has sufficient balance of the token
        uint256 balance = IERC20(deal.token).balanceOf(address(this));
        if (balance < deal.depositAmount) revert InvalidAmount();

        deal.status = DealStatus.FUNDED;
        deal.fundedAt = block.timestamp;
        deal.depositedBy = depositor;

        emit Deposited(dealId, depositor, deal.depositAmount);
    }

    // ============ View Functions ============

    /**
     * @notice Get deal details
     * @param dealId The deal ID to query
     * @return The Deal struct
     */
    function getDeal(bytes32 dealId) external view returns (Deal memory) {
        if (deals[dealId].createdAt == 0) revert DealNotFound();
        return deals[dealId];
    }

    /**
     * @notice Get total number of deals
     * @return Number of deals created
     */
    function getDealCount() external view returns (uint256) {
        return dealIds.length;
    }

    /**
     * @notice Get deal ID by index
     * @param index The index in the dealIds array
     * @return The deal ID at that index
     */
    function getDealIdByIndex(uint256 index) external view returns (bytes32) {
        return dealIds[index];
    }

    /**
     * @notice Check if a deal exists
     * @param dealId The deal ID to check
     * @return True if the deal exists
     */
    function dealExists(bytes32 dealId) external view returns (bool) {
        return deals[dealId].createdAt != 0;
    }

    /**
     * @notice Calculate deposit amount for a given deal amount and fee payer
     * @param dealAmount The agreed deal amount
     * @param feePayer Who pays the fee
     * @return depositAmount The amount that needs to be deposited
     * @return fee The platform fee
     */
    function calculateAmounts(
        uint256 dealAmount,
        FeePayer feePayer
    ) external pure returns (uint256 depositAmount, uint256 fee) {
        fee = (dealAmount * FEE_BPS) / 10_000;

        if (feePayer == FeePayer.SENDER) {
            depositAmount = dealAmount + fee;
        } else if (feePayer == FeePayer.RECEIVER) {
            depositAmount = dealAmount;
        } else {
            depositAmount = dealAmount + (fee / 2);
        }
    }

    /**
     * @notice Generate a deal ID from room ID and chain ID
     * @dev Convenience function to generate deterministic deal IDs
     * @param roomId The backend room ID
     * @param chainId The chain ID
     * @return The generated deal ID
     */
    function generateDealId(
        bytes32 roomId,
        uint256 chainId
    ) external pure returns (bytes32) {
        return keccak256(abi.encodePacked(roomId, chainId));
    }
}
