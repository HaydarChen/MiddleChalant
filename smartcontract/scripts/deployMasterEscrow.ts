import { ethers, network } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying MasterEscrow with account:", deployer.address);
  console.log("Network:", network.name);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

  // Configuration
  // In production, these should come from environment variables
  const feeRecipient = process.env.FEE_RECIPIENT || deployer.address;
  const admin = process.env.ADMIN_ADDRESS || deployer.address;

  console.log("\nDeployment Parameters:");
  console.log("- Fee Recipient:", feeRecipient);
  console.log("- Admin (Bot Wallet):", admin);

  // Deploy MasterEscrow
  const MasterEscrow = await ethers.getContractFactory("MasterEscrow");
  const escrow = await MasterEscrow.deploy(feeRecipient, admin);

  await escrow.waitForDeployment();

  const address = await escrow.getAddress();
  console.log("\n✅ MasterEscrow deployed to:", address);

  // Verify deployment
  console.log("\nVerifying deployment...");
  console.log("- Owner:", await escrow.owner());
  console.log("- Fee Recipient:", await escrow.feeRecipient());
  console.log("- Fee BPS:", await escrow.FEE_BPS());
  console.log("- Paused:", await escrow.paused());

  // Output for easy copy-paste
  console.log("\n========================================");
  console.log("DEPLOYMENT COMPLETE");
  console.log("========================================");
  console.log(`Network: ${network.name}`);
  console.log(`MasterEscrow: ${address}`);
  console.log(`Admin: ${admin}`);
  console.log(`Fee Recipient: ${feeRecipient}`);
  console.log("========================================");

  // If on testnet, output verification command
  if (network.name === "sepolia" || network.name === "bscTestnet") {
    console.log("\nTo verify on explorer, run:");
    console.log(`npx hardhat verify --network ${network.name} ${address} "${feeRecipient}" "${admin}"`);
  }

  return address;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
