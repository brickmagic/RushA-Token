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

## Getting Started
1. **Clone the Repository**:
   ```bash
   git clone https://github.com/your-username/RushA-Token.git
   cd RushA-Token
   
2. **Install Dependencies**:
   ```bash
   npm install
   
3. **Compile the Contract**:
   ```bash
   npx hardhat compile

4. **Deploy the Contract**:
   ```bash
   npx hardhat run scripts/deploy.js --network your-network

5. **Run Tests**:
   ```bash
   npx hardhat test

## License
This project is licensed under the MIT License - see the LICENSE file for details.

## Contributing
We welcome contributions from the community! Please read our CONTRIBUTING guidelines before submitting a pull request.

## Contact
For any questions or inquiries, please open an issue or contact us at [brickmagic@gmail.com].
