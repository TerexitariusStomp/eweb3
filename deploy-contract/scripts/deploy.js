const hre = require("hardhat");

async function main() {
  const TransactionRegistry = await hre.ethers.getContractFactory("TransactionRegistry");
  const transactionRegistry = await TransactionRegistry.deploy();

  await transactionRegistry.waitForDeployment();

  console.log("TransactionRegistry deployed to:", await transactionRegistry.getAddress());

  // Verify on Basescan
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("Waiting for block confirmations...");
    await transactionRegistry.deploymentTransaction().wait(6);

    await hre.run("verify:verify", {
      address: await transactionRegistry.getAddress(),
      constructorArguments: [],
    });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});