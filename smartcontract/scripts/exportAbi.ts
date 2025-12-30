import * as fs from "fs";
import * as path from "path";

function main() {
  const artifactsDir = path.join(__dirname, "../artifacts/contracts");

  // Legacy contracts
  const escrowAbi = JSON.parse(fs.readFileSync(path.join(artifactsDir, "Escrow.sol/Escrow.json"), "utf8")).abi;
  const factoryAbi = JSON.parse(fs.readFileSync(path.join(artifactsDir, "EscrowFactory.sol/EscrowFactory.json"), "utf8")).abi;

  // New MasterEscrow contract
  const masterEscrowArtifact = JSON.parse(
    fs.readFileSync(path.join(artifactsDir, "MasterEscrow.sol/MasterEscrow.json"), "utf8")
  );
  const masterEscrowAbi = masterEscrowArtifact.abi;

  // Export to frontend
  const frontend = path.join(__dirname, "../../frontend/src/contracts");
  fs.mkdirSync(frontend, { recursive: true });
  fs.writeFileSync(path.join(frontend, "escrow.abi.json"), JSON.stringify(escrowAbi, null, 2));
  fs.writeFileSync(path.join(frontend, "factory.abi.json"), JSON.stringify(factoryAbi, null, 2));
  fs.writeFileSync(path.join(frontend, "masterEscrow.abi.json"), JSON.stringify(masterEscrowAbi, null, 2));
  console.log("Exported ABI to frontend/src/contracts");

  // Export to backend
  const backend = path.join(__dirname, "../../backend-hono/src/contracts");
  fs.mkdirSync(backend, { recursive: true });
  fs.writeFileSync(path.join(backend, "masterEscrow.abi.json"), JSON.stringify(masterEscrowAbi, null, 2));
  console.log("Exported ABI to backend-hono/src/contracts");

  // Also export full artifact (includes bytecode) for deployment from backend if needed
  fs.writeFileSync(
    path.join(backend, "masterEscrow.artifact.json"),
    JSON.stringify(
      {
        abi: masterEscrowAbi,
        bytecode: masterEscrowArtifact.bytecode,
      },
      null,
      2
    )
  );
  console.log("Exported full artifact to backend-hono/src/contracts");
}

main();

