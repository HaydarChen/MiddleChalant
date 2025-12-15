import * as fs from "fs";
import * as path from "path";

function main() {
  const artifactsDir = path.join(__dirname, "../artifacts/contracts");
  const escrowAbi = JSON.parse(fs.readFileSync(path.join(artifactsDir, "Escrow.sol/Escrow.json"), "utf8")).abi;
  const factoryAbi = JSON.parse(fs.readFileSync(path.join(artifactsDir, "EscrowFactory.sol/EscrowFactory.json"), "utf8")).abi;
  const frontend = path.join(__dirname, "../../frontend/src/contracts");
  fs.mkdirSync(frontend, { recursive: true });
  fs.writeFileSync(path.join(frontend, "escrow.abi.json"), JSON.stringify(escrowAbi, null, 2));
  fs.writeFileSync(path.join(frontend, "factory.abi.json"), JSON.stringify(factoryAbi, null, 2));
  console.log("Exported ABI to frontend/src/contracts");
}

main();

