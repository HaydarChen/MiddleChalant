import { ethers, network } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("========================================");
  console.log("DEPLOYING ESCROW SYSTEM");
  console.log("========================================");
  console.log("Deployer:", deployer.address);
  console.log("Network:", network.name);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");
  console.log("========================================\n");

  // ============ Deploy MockUSDT ============
  console.log("1. Deploying MockUSDT...");
  const MockUSDT = await ethers.getContractFactory("contracts/mocks/MockUSDT.sol:MockUSDT");
  const usdt = await MockUSDT.deploy();
  await usdt.waitForDeployment();
  const usdtAddress = await usdt.getAddress();
  console.log("   ✅ MockUSDT deployed to:", usdtAddress);

  // Mint some USDT to deployer for testing
  console.log("   Minting 1,000,000 USDT to deployer...");
  await usdt.mint(deployer.address, ethers.parseUnits("1000000", 6));
  console.log("   ✅ Minted 1,000,000 USDT");

  // ============ Deploy MasterEscrow ============
  console.log("\n2. Deploying MasterEscrow...");
  const feeRecipient = process.env.FEE_RECIPIENT || deployer.address;
  const admin = deployer.address; // Deployer is the admin/bot

  const MasterEscrow = await ethers.getContractFactory("MasterEscrow");
  const escrow = await MasterEscrow.deploy(feeRecipient, admin);
  await escrow.waitForDeployment();
  const escrowAddress = await escrow.getAddress();
  console.log("   ✅ MasterEscrow deployed to:", escrowAddress);

  // ============ Verify Deployments ============
  console.log("\n3. Verifying deployments...");
  console.log("   MockUSDT decimals:", await usdt.decimals());
  console.log("   MockUSDT deployer balance:", ethers.formatUnits(await usdt.balanceOf(deployer.address), 6), "USDT");
  console.log("   MasterEscrow owner:", await escrow.owner());
  console.log("   MasterEscrow feeRecipient:", await escrow.feeRecipient());

  // ============ Output Summary ============
  console.log("\n========================================");
  console.log("DEPLOYMENT COMPLETE!");
  console.log("========================================");
  console.log(`Network:        ${network.name}`);
  console.log(`MockUSDT:       ${usdtAddress}`);
  console.log(`MasterEscrow:   ${escrowAddress}`);
  console.log(`Admin/Bot:      ${admin}`);
  console.log(`Fee Recipient:  ${feeRecipient}`);
  console.log("========================================");

  console.log("\n📋 Copy these to your backend .env:\n");
  console.log(`MASTER_ESCROW_SEPOLIA=${escrowAddress}`);
  console.log(`# Update chains.ts usdtAddress to: ${usdtAddress}`);

  // Verification commands
  if (network.name === "sepolia" || network.name === "bscTestnet") {
    console.log("\n📋 To verify contracts on explorer:\n");
    console.log(`npx hardhat verify --network ${network.name} ${usdtAddress}`);
    console.log(`npx hardhat verify --network ${network.name} ${escrowAddress} "${feeRecipient}" "${admin}"`);
  }

  return { usdtAddress, escrowAddress };
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
