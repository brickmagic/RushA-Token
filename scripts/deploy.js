const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatUnits(balance, "ether"));
  
  // Deploy RushA Contract
  const RushA = await ethers.getContractFactory("RushA");
  const rushA = await RushA.deploy();
  await rushA.waitForDeployment();
  console.log("RushA Contract address:", await rushA.getAddress());

  const receipt = await rushA.deploymentTransaction().wait();
  console.log("Gas used:", receipt.gasUsed.toString());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });