import { ethers } from "hardhat";

async function main() {
  const MOCK_USDT_ADDRESS = "0xB7d8Cf702A9e2bAaA074225cF5b96B72F4a8ECF5";
  const RECIPIENT = "0x69dc755e27e92085810b36a39fBf61B1530Af3F5";
  const AMOUNT = "100000000"; // 100 USDT (6 decimals)

  console.log("Minting USDT...");
  console.log("To:", RECIPIENT);
  console.log("Amount:", AMOUNT, "(100 USDT)");

  const mockUSDT = await ethers.getContractAt("MockUSDT", MOCK_USDT_ADDRESS);
  
  const tx = await mockUSDT.mint(RECIPIENT, AMOUNT);
  console.log("Transaction hash:", tx.hash);
  
  await tx.wait();
  console.log("✅ Mint successful!");
  
  const balance = await mockUSDT.balanceOf(RECIPIENT);
  console.log("New balance:", balance.toString(), "=", Number(balance) / 1e6, "USDT");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
