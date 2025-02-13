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
  const rushAAddress = await rushA.getAddress();
  console.log("RushA Contract address:", rushAAddress);

  const receipt = await rushA.deploymentTransaction().wait();
  console.log("Gas used for deployment:", receipt.gasUsed.toString());

  /* */
  /* Estimate gas for mint function */
  /* - Only for testing in Hardhat network */
  /* - Delete or comment out for production */
  /* */  
   
  /*
  // Create a new contract instance using the deployed address
  const rushAInstance = new ethers.Contract(rushAAddress, RushA.interface, deployer);

  // Add deployer as a minter
  const addMinterTx = await rushAInstance.addMinter(deployer.address);
  await addMinterTx.wait();
  console.log("Deployer added as minter");

  // Get the initial balance of deployer.address
  let initialBalance = await ethers.provider.getBalance(deployer.address);
  console.log("Initial ETH balance:", ethers.formatUnits(initialBalance, "ether"));

  // Execute mint function and get gas used
  const mintTx = await rushAInstance.mint(deployer.address);
  const mintReceipt = await mintTx.wait();
  console.log("Gas used for mint():", mintReceipt.gasUsed.toString());

  // Get the balance of deployer.address after minting
  const rushA_balance = await rushAInstance.balanceOf(deployer.address);
  console.log("The owner's RushA balance after minted:", ethers.formatUnits(rushA_balance, "ether"));

  // Get the final balance of deployer.address
  let finalBalance = await ethers.provider.getBalance(deployer.address);
  console.log("The owner's ETH balance after minted:", ethers.formatUnits(finalBalance, "ether"));

  */ 
 
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });