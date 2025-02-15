const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  const blocksPerHour = 240;

  console.log("Deploying contracts with the account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatUnits(balance, "ether"));
  
  // Deploy RushA Contract
  const RushA = await ethers.getContractFactory("RushA");
  const rushA = await RushA.deploy(blocksPerHour);
  await rushA.waitForDeployment();
  const rushAAddress = await rushA.getAddress();
  console.log("RushA Contract address:", rushAAddress);

  const receipt = await rushA.deploymentTransaction().wait();
  console.log("Gas used for deployment:", receipt.gasUsed.toString());
  console.log("");

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

  // Log minting state before minting
  console.log("--- Before the mining process ---");  
  const blockNumber_beforeMint = await ethers.provider.getBlockNumber();
  const currentBlockHour_beforMint = blockNumber_beforeMint / blocksPerHour + 1;        
  const lastMintBlockHour_beforeMint = await rushAInstance.getLastMintBlockHour(deployer.address);
  const hourlyMintLimit_beforeMint = await rushAInstance.getHourlyMintLimit();
  const remainingMintLimit_beforeMint = await rushAInstance.getRemainingMintLimit();
  console.log("blockNumber_beforeMint:", blockNumber_beforeMint);
  console.log("currentBlockHour_beforMint:", currentBlockHour_beforMint);  
  console.log("lastMintBlockHour_beforeMint:", lastMintBlockHour_beforeMint.toString());  
  console.log("hourlyMintLimit:", hourlyMintLimit_beforeMint.toString());  
  console.log("remainingMintLimit:", remainingMintLimit_beforeMint.toString());  
  console.log("");

  // Estimate gas for canMint function
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
    const eth_balance_afterMint = await ethers.provider.getBalance(deployer.address);
    console.log("ETH balance (After Mint):", ethers.formatUnits(eth_balance_afterMint, "ether"));  
    console.log("Gas used for mint():", mintReceipt.gasUsed.toString());
    console.log("ETH used for mint():", eth_balance_beforeMint - eth_balance_afterMint);

  } else {
    console.log("Minting not allowed at this time.");
  }
  console.log("");

  // Log minting state after minting
  console.log("--- After the mining process ---");  
  const blockNumber_afterMint = await ethers.provider.getBlockNumber();
  const currentBlockHour_afterMint = blockNumber_beforeMint / blocksPerHour + 1;        
  const lastMintBlockHour_afterMint = await rushAInstance.getLastMintBlockHour(deployer.address);
  const hourlyMintLimit_afterMint = await rushAInstance.getHourlyMintLimit();
  const remainingMintLimit_afterMint = await rushAInstance.getRemainingMintLimit();

  console.log("blockNumber_beforeMint:", blockNumber_afterMint);
  console.log("currentBlockHour_beforMint:", currentBlockHour_afterMint);  
  console.log("lastMintBlockHour_beforeMint:", lastMintBlockHour_afterMint.toString());  
  console.log("hourlyMintLimit:", hourlyMintLimit_afterMint.toString());  
  console.log("remainingMintLimit:", remainingMintLimit_afterMint.toString());   
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