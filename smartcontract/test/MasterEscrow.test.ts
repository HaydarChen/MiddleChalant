import { expect } from "chai";
import { ethers } from "hardhat";
import { MasterEscrow, MockUSDT } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("MasterEscrow", function () {
  let escrow: MasterEscrow;
  let usdt: MockUSDT;
  let admin: HardhatEthersSigner;
  let feeRecipient: HardhatEthersSigner;
  let sender: HardhatEthersSigner;
  let receiver: HardhatEthersSigner;
  let other: HardhatEthersSigner;

  // Constants
  const DEAL_AMOUNT = ethers.parseUnits("100", 6); // 100 USDT
  const FEE_BPS = 100n; // 1%
  const FEE_AMOUNT = DEAL_AMOUNT / 100n; // 1 USDT

  // Fee payer enum values
  const FeePayer = {
    SENDER: 0,
    RECEIVER: 1,
    SPLIT: 2,
  };

  // Deal status enum values
  const DealStatus = {
    CREATED: 0,
    FUNDED: 1,
    RELEASED: 2,
    REFUNDED: 3,
    CANCELLED: 4,
  };

  beforeEach(async function () {
    [admin, feeRecipient, sender, receiver, other] = await ethers.getSigners();

    // Deploy MockUSDT
    const MockUSDT = await ethers.getContractFactory("MockUSDT");
    usdt = await MockUSDT.deploy();

    // Deploy MasterEscrow
    const MasterEscrow = await ethers.getContractFactory("MasterEscrow");
    escrow = await MasterEscrow.deploy(feeRecipient.address, admin.address);

    // Mint USDT to sender for testing
    await usdt.mint(sender.address, ethers.parseUnits("10000", 6));
  });

  // Helper to create a deal ID
  function createDealId(roomId: string): string {
    return ethers.keccak256(ethers.toUtf8Bytes(roomId));
  }

  function createRoomId(name: string): string {
    return ethers.encodeBytes32String(name);
  }

  describe("Deployment", function () {
    it("Should set the correct owner", async function () {
      expect(await escrow.owner()).to.equal(admin.address);
    });

    it("Should set the correct fee recipient", async function () {
      expect(await escrow.feeRecipient()).to.equal(feeRecipient.address);
    });

    it("Should have correct fee BPS", async function () {
      expect(await escrow.FEE_BPS()).to.equal(FEE_BPS);
    });

    it("Should revert with zero address fee recipient", async function () {
      const MasterEscrow = await ethers.getContractFactory("MasterEscrow");
      await expect(
        MasterEscrow.deploy(ethers.ZeroAddress, admin.address)
      ).to.be.revertedWithCustomError(escrow, "InvalidAddress");
    });
  });

  describe("createDeal", function () {
    it("Should create a deal with SENDER fee payer", async function () {
      const dealId = createDealId("room1");
      const roomId = createRoomId("room1");

      await expect(
        escrow.createDeal(dealId, roomId, usdt.target, DEAL_AMOUNT, FeePayer.SENDER)
      )
        .to.emit(escrow, "DealCreated")
        .withArgs(
          dealId,
          roomId,
          usdt.target,
          DEAL_AMOUNT,
          DEAL_AMOUNT + FEE_AMOUNT, // depositAmount
          FEE_AMOUNT,
          FeePayer.SENDER
        );

      const deal = await escrow.getDeal(dealId);
      expect(deal.status).to.equal(DealStatus.CREATED);
      expect(deal.dealAmount).to.equal(DEAL_AMOUNT);
      expect(deal.depositAmount).to.equal(DEAL_AMOUNT + FEE_AMOUNT);
      expect(deal.fee).to.equal(FEE_AMOUNT);
    });

    it("Should create a deal with RECEIVER fee payer", async function () {
      const dealId = createDealId("room2");
      const roomId = createRoomId("room2");

      await escrow.createDeal(dealId, roomId, usdt.target, DEAL_AMOUNT, FeePayer.RECEIVER);

      const deal = await escrow.getDeal(dealId);
      expect(deal.depositAmount).to.equal(DEAL_AMOUNT); // No extra fee on deposit
    });

    it("Should create a deal with SPLIT fee payer", async function () {
      const dealId = createDealId("room3");
      const roomId = createRoomId("room3");

      await escrow.createDeal(dealId, roomId, usdt.target, DEAL_AMOUNT, FeePayer.SPLIT);

      const deal = await escrow.getDeal(dealId);
      const halfFee = FEE_AMOUNT / 2n;
      expect(deal.depositAmount).to.equal(DEAL_AMOUNT + halfFee);
    });

    it("Should revert if deal already exists", async function () {
      const dealId = createDealId("room1");
      const roomId = createRoomId("room1");

      await escrow.createDeal(dealId, roomId, usdt.target, DEAL_AMOUNT, FeePayer.SENDER);

      await expect(
        escrow.createDeal(dealId, roomId, usdt.target, DEAL_AMOUNT, FeePayer.SENDER)
      ).to.be.revertedWithCustomError(escrow, "DealAlreadyExists");
    });

    it("Should revert if not admin", async function () {
      const dealId = createDealId("room1");
      const roomId = createRoomId("room1");

      await expect(
        escrow.connect(other).createDeal(dealId, roomId, usdt.target, DEAL_AMOUNT, FeePayer.SENDER)
      ).to.be.revertedWithCustomError(escrow, "OwnableUnauthorizedAccount");
    });

    it("Should revert with zero token address", async function () {
      const dealId = createDealId("room1");
      const roomId = createRoomId("room1");

      await expect(
        escrow.createDeal(dealId, roomId, ethers.ZeroAddress, DEAL_AMOUNT, FeePayer.SENDER)
      ).to.be.revertedWithCustomError(escrow, "InvalidAddress");
    });

    it("Should revert with zero amount", async function () {
      const dealId = createDealId("room1");
      const roomId = createRoomId("room1");

      await expect(
        escrow.createDeal(dealId, roomId, usdt.target, 0, FeePayer.SENDER)
      ).to.be.revertedWithCustomError(escrow, "InvalidAmount");
    });
  });

  describe("deposit", function () {
    let dealId: string;
    let roomId: string;

    beforeEach(async function () {
      dealId = createDealId("room1");
      roomId = createRoomId("room1");
      await escrow.createDeal(dealId, roomId, usdt.target, DEAL_AMOUNT, FeePayer.SENDER);
    });

    it("Should allow deposit with correct amount", async function () {
      const depositAmount = DEAL_AMOUNT + FEE_AMOUNT;
      await usdt.connect(sender).approve(escrow.target, depositAmount);

      await expect(escrow.connect(sender).deposit(dealId))
        .to.emit(escrow, "Deposited")
        .withArgs(dealId, sender.address, depositAmount);

      const deal = await escrow.getDeal(dealId);
      expect(deal.status).to.equal(DealStatus.FUNDED);
      expect(deal.depositedBy).to.equal(sender.address);
    });

    it("Should update deal fundedAt timestamp", async function () {
      const depositAmount = DEAL_AMOUNT + FEE_AMOUNT;
      await usdt.connect(sender).approve(escrow.target, depositAmount);

      const tx = await escrow.connect(sender).deposit(dealId);
      const block = await ethers.provider.getBlock(tx.blockNumber!);

      const deal = await escrow.getDeal(dealId);
      expect(deal.fundedAt).to.equal(block!.timestamp);
    });

    it("Should revert if deal not found", async function () {
      const fakeDealId = createDealId("fake");
      await expect(
        escrow.connect(sender).deposit(fakeDealId)
      ).to.be.revertedWithCustomError(escrow, "DealNotFound");
    });

    it("Should revert if already funded", async function () {
      const depositAmount = DEAL_AMOUNT + FEE_AMOUNT;
      await usdt.connect(sender).approve(escrow.target, depositAmount * 2n);
      await escrow.connect(sender).deposit(dealId);

      await expect(
        escrow.connect(sender).deposit(dealId)
      ).to.be.revertedWithCustomError(escrow, "InvalidDealStatus");
    });
  });

  describe("release", function () {
    let dealId: string;
    let roomId: string;

    beforeEach(async function () {
      dealId = createDealId("room1");
      roomId = createRoomId("room1");
    });

    it("Should release funds with SENDER fee payer", async function () {
      await escrow.createDeal(dealId, roomId, usdt.target, DEAL_AMOUNT, FeePayer.SENDER);
      const depositAmount = DEAL_AMOUNT + FEE_AMOUNT;
      await usdt.connect(sender).approve(escrow.target, depositAmount);
      await escrow.connect(sender).deposit(dealId);

      const receiverBalBefore = await usdt.balanceOf(receiver.address);
      const feeRecipientBalBefore = await usdt.balanceOf(feeRecipient.address);

      await expect(escrow.release(dealId, receiver.address))
        .to.emit(escrow, "Released")
        .withArgs(dealId, receiver.address, DEAL_AMOUNT, FEE_AMOUNT);

      const receiverBalAfter = await usdt.balanceOf(receiver.address);
      const feeRecipientBalAfter = await usdt.balanceOf(feeRecipient.address);

      expect(receiverBalAfter - receiverBalBefore).to.equal(DEAL_AMOUNT);
      expect(feeRecipientBalAfter - feeRecipientBalBefore).to.equal(FEE_AMOUNT);

      const deal = await escrow.getDeal(dealId);
      expect(deal.status).to.equal(DealStatus.RELEASED);
    });

    it("Should release funds with RECEIVER fee payer", async function () {
      await escrow.createDeal(dealId, roomId, usdt.target, DEAL_AMOUNT, FeePayer.RECEIVER);
      await usdt.connect(sender).approve(escrow.target, DEAL_AMOUNT);
      await escrow.connect(sender).deposit(dealId);

      const receiverBalBefore = await usdt.balanceOf(receiver.address);

      await escrow.release(dealId, receiver.address);

      const receiverBalAfter = await usdt.balanceOf(receiver.address);
      const expectedReceiverAmount = DEAL_AMOUNT - FEE_AMOUNT;

      expect(receiverBalAfter - receiverBalBefore).to.equal(expectedReceiverAmount);
    });

    it("Should release funds with SPLIT fee payer", async function () {
      await escrow.createDeal(dealId, roomId, usdt.target, DEAL_AMOUNT, FeePayer.SPLIT);
      const halfFee = FEE_AMOUNT / 2n;
      const depositAmount = DEAL_AMOUNT + halfFee;
      await usdt.connect(sender).approve(escrow.target, depositAmount);
      await escrow.connect(sender).deposit(dealId);

      const receiverBalBefore = await usdt.balanceOf(receiver.address);

      await escrow.release(dealId, receiver.address);

      const receiverBalAfter = await usdt.balanceOf(receiver.address);
      const expectedReceiverAmount = DEAL_AMOUNT - halfFee;

      expect(receiverBalAfter - receiverBalBefore).to.equal(expectedReceiverAmount);
    });

    it("Should revert if not admin", async function () {
      await escrow.createDeal(dealId, roomId, usdt.target, DEAL_AMOUNT, FeePayer.SENDER);
      const depositAmount = DEAL_AMOUNT + FEE_AMOUNT;
      await usdt.connect(sender).approve(escrow.target, depositAmount);
      await escrow.connect(sender).deposit(dealId);

      await expect(
        escrow.connect(other).release(dealId, receiver.address)
      ).to.be.revertedWithCustomError(escrow, "OwnableUnauthorizedAccount");
    });

    it("Should revert if deal not funded", async function () {
      await escrow.createDeal(dealId, roomId, usdt.target, DEAL_AMOUNT, FeePayer.SENDER);

      await expect(
        escrow.release(dealId, receiver.address)
      ).to.be.revertedWithCustomError(escrow, "InvalidDealStatus");
    });

    it("Should revert with zero receiver address", async function () {
      await escrow.createDeal(dealId, roomId, usdt.target, DEAL_AMOUNT, FeePayer.SENDER);
      const depositAmount = DEAL_AMOUNT + FEE_AMOUNT;
      await usdt.connect(sender).approve(escrow.target, depositAmount);
      await escrow.connect(sender).deposit(dealId);

      await expect(
        escrow.release(dealId, ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(escrow, "InvalidAddress");
    });
  });

  describe("refund", function () {
    let dealId: string;
    let roomId: string;

    beforeEach(async function () {
      dealId = createDealId("room1");
      roomId = createRoomId("room1");
      await escrow.createDeal(dealId, roomId, usdt.target, DEAL_AMOUNT, FeePayer.SENDER);
      const depositAmount = DEAL_AMOUNT + FEE_AMOUNT;
      await usdt.connect(sender).approve(escrow.target, depositAmount);
      await escrow.connect(sender).deposit(dealId);
    });

    it("Should refund full deposit amount (no fee taken)", async function () {
      const senderBalBefore = await usdt.balanceOf(sender.address);
      const depositAmount = DEAL_AMOUNT + FEE_AMOUNT;

      await expect(escrow.refund(dealId, sender.address))
        .to.emit(escrow, "Refunded")
        .withArgs(dealId, sender.address, depositAmount);

      const senderBalAfter = await usdt.balanceOf(sender.address);
      expect(senderBalAfter - senderBalBefore).to.equal(depositAmount);

      const deal = await escrow.getDeal(dealId);
      expect(deal.status).to.equal(DealStatus.REFUNDED);
    });

    it("Should revert if not admin", async function () {
      await expect(
        escrow.connect(other).refund(dealId, sender.address)
      ).to.be.revertedWithCustomError(escrow, "OwnableUnauthorizedAccount");
    });

    it("Should revert if deal not funded", async function () {
      const newDealId = createDealId("room2");
      const newRoomId = createRoomId("room2");
      await escrow.createDeal(newDealId, newRoomId, usdt.target, DEAL_AMOUNT, FeePayer.SENDER);

      await expect(
        escrow.refund(newDealId, sender.address)
      ).to.be.revertedWithCustomError(escrow, "InvalidDealStatus");
    });
  });

  describe("cancelDeal", function () {
    let dealId: string;
    let roomId: string;

    beforeEach(async function () {
      dealId = createDealId("room1");
      roomId = createRoomId("room1");
      await escrow.createDeal(dealId, roomId, usdt.target, DEAL_AMOUNT, FeePayer.SENDER);
    });

    it("Should cancel a deal before funding", async function () {
      await expect(escrow.cancelDeal(dealId))
        .to.emit(escrow, "DealCancelled")
        .withArgs(dealId);

      const deal = await escrow.getDeal(dealId);
      expect(deal.status).to.equal(DealStatus.CANCELLED);
    });

    it("Should revert if deal is funded", async function () {
      const depositAmount = DEAL_AMOUNT + FEE_AMOUNT;
      await usdt.connect(sender).approve(escrow.target, depositAmount);
      await escrow.connect(sender).deposit(dealId);

      await expect(escrow.cancelDeal(dealId)).to.be.revertedWithCustomError(
        escrow,
        "InvalidDealStatus"
      );
    });

    it("Should revert if not admin", async function () {
      await expect(
        escrow.connect(other).cancelDeal(dealId)
      ).to.be.revertedWithCustomError(escrow, "OwnableUnauthorizedAccount");
    });
  });

  describe("Admin functions", function () {
    it("Should update fee recipient", async function () {
      await expect(escrow.setFeeRecipient(other.address))
        .to.emit(escrow, "FeeRecipientUpdated")
        .withArgs(feeRecipient.address, other.address);

      expect(await escrow.feeRecipient()).to.equal(other.address);
    });

    it("Should revert setFeeRecipient with zero address", async function () {
      await expect(
        escrow.setFeeRecipient(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(escrow, "InvalidAddress");
    });

    it("Should pause and unpause", async function () {
      await escrow.pause();
      expect(await escrow.paused()).to.be.true;

      const dealId = createDealId("room1");
      const roomId = createRoomId("room1");
      await expect(
        escrow.createDeal(dealId, roomId, usdt.target, DEAL_AMOUNT, FeePayer.SENDER)
      ).to.be.revertedWithCustomError(escrow, "EnforcedPause");

      await escrow.unpause();
      expect(await escrow.paused()).to.be.false;

      await escrow.createDeal(dealId, roomId, usdt.target, DEAL_AMOUNT, FeePayer.SENDER);
      expect(await escrow.dealExists(dealId)).to.be.true;
    });

    it("Should transfer ownership", async function () {
      await escrow.transferOwnership(other.address);
      expect(await escrow.owner()).to.equal(other.address);
    });
  });

  describe("View functions", function () {
    it("Should return deal count", async function () {
      expect(await escrow.getDealCount()).to.equal(0);

      const dealId1 = createDealId("room1");
      const roomId1 = createRoomId("room1");
      await escrow.createDeal(dealId1, roomId1, usdt.target, DEAL_AMOUNT, FeePayer.SENDER);

      expect(await escrow.getDealCount()).to.equal(1);

      const dealId2 = createDealId("room2");
      const roomId2 = createRoomId("room2");
      await escrow.createDeal(dealId2, roomId2, usdt.target, DEAL_AMOUNT, FeePayer.RECEIVER);

      expect(await escrow.getDealCount()).to.equal(2);
    });

    it("Should return deal by index", async function () {
      const dealId = createDealId("room1");
      const roomId = createRoomId("room1");
      await escrow.createDeal(dealId, roomId, usdt.target, DEAL_AMOUNT, FeePayer.SENDER);

      expect(await escrow.getDealIdByIndex(0)).to.equal(dealId);
    });

    it("Should check deal exists", async function () {
      const dealId = createDealId("room1");
      const roomId = createRoomId("room1");

      expect(await escrow.dealExists(dealId)).to.be.false;

      await escrow.createDeal(dealId, roomId, usdt.target, DEAL_AMOUNT, FeePayer.SENDER);

      expect(await escrow.dealExists(dealId)).to.be.true;
    });

    it("Should calculate amounts correctly", async function () {
      // SENDER pays fee
      let [depositAmount, fee] = await escrow.calculateAmounts(DEAL_AMOUNT, FeePayer.SENDER);
      expect(depositAmount).to.equal(DEAL_AMOUNT + FEE_AMOUNT);
      expect(fee).to.equal(FEE_AMOUNT);

      // RECEIVER pays fee
      [depositAmount, fee] = await escrow.calculateAmounts(DEAL_AMOUNT, FeePayer.RECEIVER);
      expect(depositAmount).to.equal(DEAL_AMOUNT);
      expect(fee).to.equal(FEE_AMOUNT);

      // SPLIT fee
      [depositAmount, fee] = await escrow.calculateAmounts(DEAL_AMOUNT, FeePayer.SPLIT);
      expect(depositAmount).to.equal(DEAL_AMOUNT + FEE_AMOUNT / 2n);
      expect(fee).to.equal(FEE_AMOUNT);
    });

    it("Should generate deterministic deal ID", async function () {
      const roomId = createRoomId("room1");
      const chainId = 1n;

      const dealId1 = await escrow.generateDealId(roomId, chainId);
      const dealId2 = await escrow.generateDealId(roomId, chainId);

      expect(dealId1).to.equal(dealId2);

      const dealId3 = await escrow.generateDealId(roomId, 56n);
      expect(dealId1).to.not.equal(dealId3);
    });
  });

  describe("Edge cases", function () {
    it("Should handle very small amounts", async function () {
      const smallAmount = ethers.parseUnits("1", 6); // 1 USDT
      const dealId = createDealId("room1");
      const roomId = createRoomId("room1");

      await escrow.createDeal(dealId, roomId, usdt.target, smallAmount, FeePayer.SENDER);

      const deal = await escrow.getDeal(dealId);
      expect(deal.fee).to.equal(smallAmount / 100n); // 0.01 USDT
    });

    it("Should handle large amounts", async function () {
      const largeAmount = ethers.parseUnits("1000000", 6); // 1M USDT
      const dealId = createDealId("room1");
      const roomId = createRoomId("room1");

      await escrow.createDeal(dealId, roomId, usdt.target, largeAmount, FeePayer.SENDER);

      const deal = await escrow.getDeal(dealId);
      expect(deal.fee).to.equal(largeAmount / 100n); // 10,000 USDT fee
    });

    it("Should not allow double release", async function () {
      const dealId = createDealId("room1");
      const roomId = createRoomId("room1");
      await escrow.createDeal(dealId, roomId, usdt.target, DEAL_AMOUNT, FeePayer.SENDER);

      const depositAmount = DEAL_AMOUNT + FEE_AMOUNT;
      await usdt.connect(sender).approve(escrow.target, depositAmount);
      await escrow.connect(sender).deposit(dealId);

      await escrow.release(dealId, receiver.address);

      await expect(
        escrow.release(dealId, receiver.address)
      ).to.be.revertedWithCustomError(escrow, "InvalidDealStatus");
    });

    it("Should not allow release after refund", async function () {
      const dealId = createDealId("room1");
      const roomId = createRoomId("room1");
      await escrow.createDeal(dealId, roomId, usdt.target, DEAL_AMOUNT, FeePayer.SENDER);

      const depositAmount = DEAL_AMOUNT + FEE_AMOUNT;
      await usdt.connect(sender).approve(escrow.target, depositAmount);
      await escrow.connect(sender).deposit(dealId);

      await escrow.refund(dealId, sender.address);

      await expect(
        escrow.release(dealId, receiver.address)
      ).to.be.revertedWithCustomError(escrow, "InvalidDealStatus");
    });
  });
});
