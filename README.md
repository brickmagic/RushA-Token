# RushA Token

## Overview
RushA Token (RSA) is an ERC20-compliant cryptocurrency designed for efficient and secure transactions. Built on the Ethereum blockchain, RushA Token incorporates advanced features such as minting, burning, capping, and pausing functionalities to ensure a robust and flexible token management system.

## Features
- **Minting**: Authorized minters can mint new tokens with daily and hourly limits to prevent abuse.
- **Burning**: Tokens can be burned to reduce the total supply, supporting deflationary mechanisms.
- **Capped Supply**: The total supply of RushA Token is capped at 800,000,000 RSA to maintain scarcity.
- **Pausable**: The contract owner can pause all token transfers in case of emergencies.
- **Reentrancy Guard**: Protects against reentrancy attacks to ensure contract security.
- **Whitelist and Blacklist**: Manage addresses with whitelist and blacklist functionalities for enhanced control.

## Preparation
Install the latest stable version of node.js, npm and npx.

1. **Verify ther version of node.js**:
   ```bash
   node -v
   ```
   My results: v22.13.0

2. **Verify ther version of npm and npx**:
   ```bash
   npm -v
   ```  
   
   ```bash
   npx -v
   ```   
   My results: 11.0.0

## Getting Started
1. **Clone the Repository**:
   ```bash
   git clone https://github.com/your-username/RushA-Token.git
   cd RushA-Token
   
2. **Install hardhat**:
   ```bash
   npm install --save-dev hardhat

2. **Install @openzeppelin/contracts and chai**:
   ```bash
   npm install @openzeppelin/contracts chai 

2. **Install @nomicfoundation/hardhat-toolbox**:
   ```bash
   npm install @nomicfoundation/hardhat-toolbox

2. **If encounter dependence error, following these steps**:
   ```bash
   npm install @nomicfoundation/hardhat-toolbox --legacy-peer-deps   
   ```

   ```bash
   npm install --save-dev "@nomicfoundation/hardhat-chai-matchers@^2.0.0" "@nomicfoundation/hardhat-ethers@^3.0.0" "@nomicfoundation/hardhat-ignition-ethers@^0.15.0" "@nomicfoundation/hardhat-network-helpers@^1.0.0" "@nomicfoundation/hardhat-verify@^2.0.0" "@typechain/ethers-v6@^0.5.0" "@typechain/hardhat@^9.0.0" "@types/chai@^4.2.0" "@types/mocha@>=9.1.0" "ethers@^6.4.0" "hardhat-gas-reporter@^1.0.8" "solidity-coverage@^0.8.1" "ts-node@>=8.0.0" "typechain@^8.3.0" "typescript@>=4.5.0" --legacy-peer-deps
   ```

   ```bash
   npm install --save-dev "@nomicfoundation/ignition-core@^0.15.9" "@nomicfoundation/hardhat-ignition@^0.15.9" --legacy-peer-deps
   ```

2. **Install dovenv (optional)**:
   ```bash
   npm install dotenv --legacy-peer-deps
   ```

2. **Initial hardhat**:
   ```bash
   npm install dotenv --legacy-peer-deps
   ```
√ What do you want to do? · Create a JavaScript project
√ Hardhat project root: · E:\Hardhat Projects\RushA-Token
√ Do you want to add a .gitignore? (Y/n)

2. **Initial hardhat**:
Delete the hardhat default contract and testing file: contracts/Lock.sol and test/Lock.js
   
3. **Compile the Contract**:
   ```bash
   npx hardhat compile

5. **Run Tests**:
   ```bash
   npx hardhat test

4. **Deploy the Contract**:
   ```bash
   npx hardhat run scripts/deploy.js

4. **Deploy the Contract to you network**:
   ```bash
   npx hardhat run scripts/deploy.js --network your-network

4. **Example**:
   ```bash
   require("@nomicfoundation/hardhat-toolbox");
   require("dotenv").config();

   /** @type import('hardhat/config').HardhatUserConfig */
   module.exports = {
      solidity: "0.8.28",
      networks: {
         hardhat: {
            chainId: 1337,
            allowUnlimitedContractSize: true,
            mining: {
            auto: true,
            interval: 0
            },
         }, 
      }, 
   };
   ```
   
4. **Example**:
   ```bash
   npx hardhat run scripts/deploy.js --network hardhat  

## License
This project is licensed under the MIT License - see the LICENSE file for details.

## Contributing
We welcome contributions from the community! Please read our CONTRIBUTING guidelines before submitting a pull request.

## Contact
For any questions or inquiries, please open an issue or contact us at [brickmagic@gmail.com].
