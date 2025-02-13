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
     
  // Create a new contract instance using the deployed address
  const rushAInstance = new ethers.Contract(rushAAddress, RushA.interface, deployer);

  // Get the initial balance of deployer.address
  let initialBalance = await ethers.provider.getBalance(deployer.address);
  console.log("Initial ETH balance:", ethers.formatUnits(initialBalance, "ether"));
  console.log("");

  // Log current hour and minting state
  console.log("--- Before the mining process ---");  
  
  const currentHour = Math.floor(Date.now() / 1000 / 3600);
  const hourlyMintCount = await rushAInstance.getHourlyMintCount(currentHour);
  const lastMintHour = await rushAInstance.getLastMintHour(deployer.address);
  const hourlyMintLimit = await rushAInstance.getHourlyMintLimit();
  const remainingMintLimit = await rushAInstance.getRemainingMintLimit();
  
  console.log("Current hour:", currentHour);
  console.log("Hourly mint count:", hourlyMintCount.toString());
  console.log("Last mint hour for deployer:", lastMintHour.toString());  
  console.log("Hourly mint limit:", hourlyMintLimit.toString());  
  console.log("Remaining mint limit:", remainingMintLimit.toString());  
  console.log("");

  // Estimate gas for canMint function
  //const canMintGasEstimate = await rushAInstance.estimateGas.canMint(deployer.address);
  //console.log("Estimated gas for canMint():", canMintGasEstimate.toString());
  const eth_balance_beforeCanMint = await ethers.provider.getBalance(deployer.address);
  console.log("ETH balance (before canMint):", ethers.formatUnits(eth_balance_beforeCanMint, "ether"));  

  // Check if minting is possible
  const canMint = await rushAInstance.canMint(deployer.address);

  const eth_balance_afterCanMint = await ethers.provider.getBalance(deployer.address);
  console.log("ETH balance (after canMint):", ethers.formatUnits(eth_balance_afterCanMint, "ether"));    
  console.log("ETH used for canMint():", eth_balance_beforeCanMint - eth_balance_afterCanMint);  
  console.log("");

  console.log("Can mint:", canMint);
  console.log("");

  if (canMint) {
    const eth_balance_beforeMint = await ethers.provider.getBalance(deployer.address);
    console.log("ETH balance (before Mint):", ethers.formatUnits(eth_balance_beforeMint, "ether"));  
    
    // Execute mint function and get gas used
    const mintTx = await rushAInstance.mint(deployer.address);
    const mintReceipt = await mintTx.wait();
    

    // Get the balance of deployer.address after minting
    //const rushA_balance_beforeMint = await rushAInstance.balanceOf(deployer.address);
    //console.log("The owner's RushA balance after minted:", ethers.formatUnits(rushA_balance_beforeMint, "ether"));

    const eth_balance_afterMint = await ethers.provider.getBalance(deployer.address);
    console.log("ETH balance (After Mint):", ethers.formatUnits(eth_balance_afterMint, "ether"));  
    console.log("Gas used for mint():", mintReceipt.gasUsed.toString());
    console.log("ETH used for mint():", eth_balance_beforeMint - eth_balance_afterMint);

  } else {
    console.log("Minting not allowed at this time.");
  }
  console.log("");

  // Log current hour and minting state
  console.log("--- After the mining process ---");  
  const currentHour_after = Math.floor(Date.now() / 1000 / 3600);
  const hourlyMintCount_after = await rushAInstance.getHourlyMintCount(currentHour);
  const lastMintHour_after = await rushAInstance.getLastMintHour(deployer.address);
  const hourlyMintLimit_after = await rushAInstance.getHourlyMintLimit();
  const remainingMintLimit_after = await rushAInstance.getRemainingMintLimit();
  console.log("Current hour:", currentHour_after);
  console.log("Hourly mint count:", hourlyMintCount_after.toString());
  console.log("Last mint hour for deployer:", lastMintHour_after.toString());  
  console.log("Hourly mint limit:", hourlyMintLimit_after.toString());  
  console.log("Remaining mint limit:", remainingMintLimit_after.toString());    
  console.log("");

  // Get the balance of deployer.address after minting
  const rushA_balance_afterMint = await rushAInstance.balanceOf(deployer.address);
  console.log("The owner's RushA balance after minted:", ethers.formatUnits(rushA_balance_afterMint, "ether"));

  // Get the final balance of deployer.address
  let finalBalance = await ethers.provider.getBalance(deployer.address);
  console.log("The owner's ETH balance after minted:", ethers.formatUnits(finalBalance, "ether"));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });