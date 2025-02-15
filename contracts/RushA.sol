// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract RushA is
    ERC20,
    ERC20Burnable,
    ERC20Capped,
    Ownable,
    Pausable,
    ReentrancyGuard
{
    // Token distribution
    uint256 public constant TOTAL_SUPPLY = 800_000_000 * 1e18;
    uint256 public constant INITIAL_SUPPLY = 100_000_000 * 1e18;    
    uint256 public constant MAX_MINING_LIMIT_PER_HOUR = 2000 * 1e18; 
    uint256 public constant DIV_MINING_LIMIT_PER_HOUR = 10000; 
    uint256 public constant DIV_RANDOM_LIMIT_PER_ADDRESS = 20; 
    uint256 public constant MIN_MINING_AMOUNT = 1 * 1e18;

    // Block numbers per hour
    uint256 public blocksPerHour;   

    // Mappings
    mapping(address => bool) private blacklisted;
    mapping(address => bool) private bridgeContracts;
    mapping(address => uint256) private bridgeLocked;
    mapping(address => uint256) private lastMintBlockHour;
    mapping(uint256 => uint256) private blockHourlyMintCount;

    // Events
    event BridgeBurned(address indexed from, uint256 amount);
    event BridgeMinted(address indexed from, address to, uint256 amount);
    event BlacklistUpdated(address indexed account, bool status);
    event BridgeContractUpdated(address indexed bridge, bool allowed);    
    event Mined(address indexed miner, uint256 amountWei);
    event BlocksPerHourUpdated(uint256 oldBlocksPerHour, uint256 newBlocksPerHour);

    constructor(uint256 _blocksPerHour)
        ERC20("Rush A", "RSA")
        ERC20Capped(TOTAL_SUPPLY)
        Ownable(msg.sender)
    {
        require(_blocksPerHour > 0, "Invalid blocks per hour");
        _mint(msg.sender, INITIAL_SUPPLY);
        blocksPerHour = _blocksPerHour;
    }

    // Core functions
    function _update(address from, address to, uint256 amount)
        internal
        override(ERC20, ERC20Capped)
        whenNotPaused
    {
        if (from != address(0)) {
            require(!blacklisted[from], "Sender blacklisted");
        }
        if (to != address(0)) {
            require(!blacklisted[to], "Recipient blacklisted");
        }
        super._update(from, to, amount);
    }

    // Minting function
    /**
    * @dev Mints a random amount of tokens to the specified address.
    * - Ensures minting limits per hour.
    * - Ensures total supply does not exceed the cap.
    */
    function mint(address to) external nonReentrant {
        require(to != address(0), "Mint to the zero address");
        require(!blacklisted[msg.sender], "Sender blacklisted");
        
        uint256 hourlyMintLimit = this.getHourlyMintLimit();
        uint256 amount = (uint256(keccak256(abi.encodePacked(block.prevrandao, msg.sender))) % (hourlyMintLimit / DIV_RANDOM_LIMIT_PER_ADDRESS + 1));
        amount = amount < MIN_MINING_AMOUNT ? MIN_MINING_AMOUNT : amount; 

        uint256 remainingSupply = cap() - totalSupply();
        amount = amount > remainingSupply ? remainingSupply : amount;
        require(amount >= MIN_MINING_AMOUNT, "Amount below minimum");  

        uint256 currentBlockHour = block.number / blocksPerHour + 1;        
        require(lastMintBlockHour[msg.sender] < currentBlockHour, "Already minted this block hour");
        require(blockHourlyMintCount[currentBlockHour] + amount <= hourlyMintLimit, "Block hourly limit reached");

        blockHourlyMintCount[currentBlockHour] += amount;
        lastMintBlockHour[msg.sender] = currentBlockHour;        

        _mint(to, amount);
        emit Mined(msg.sender, amount);
    }

    /**
    * @dev Checks if the current miner can mint tokens.
    * - Ensures the miner has not minted this hour.
    * - Ensures the hourly mint limit has not been reached.
    */
    function canMint(address miner) external view returns (bool) {
        uint256 currentBlockHour = block.number / blocksPerHour + 1;

        bool hasNotMinted = lastMintBlockHour[miner] < currentBlockHour;
        uint256 hourlyMintLimit = this.getHourlyMintLimit();
        bool limitNotReached = blockHourlyMintCount[currentBlockHour] < hourlyMintLimit;

        return hasNotMinted && limitNotReached;
    }

    // Bridge functions
    /**
    * @dev Burns tokens for bridging to another chain.
    */
    function bridgeBurn(uint256 amount) external {        
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");
        _burn(msg.sender, amount);        
        emit BridgeBurned(msg.sender, amount);
        bridgeLocked[msg.sender] += amount;
    }

    /**
    * @dev Mints tokens received from another chain.
    */
    function bridgeMint(address from, address to, uint256 amount) external onlyBridge nonReentrant {
        require(bridgeLocked[from] >= amount, "Exceeds locked");
        bridgeLocked[from] -= amount;                

        require(amount > 0, "Amount must be greater than 0");        
        _mint(to, amount);
        emit BridgeMinted(from, to, amount);
    }

    // Management functions
    function updateBlacklist(address[] calldata addresses, bool status) external onlyOwner {
        for (uint256 i = 0; i < addresses.length; i++) {
            blacklisted[addresses[i]] = status;
            emit BlacklistUpdated(addresses[i], status);
        }
    }

    function setBridgeContract(address bridge, bool allowed) external onlyOwner {
        bridgeContracts[bridge] = allowed;
        emit BridgeContractUpdated(bridge, allowed);
    }

    function setBlocksPerHour(uint256 newBlocksPerHour) external onlyOwner {
        require(newBlocksPerHour > 0, "Invalid blocks per hour");
        emit BlocksPerHourUpdated(blocksPerHour, newBlocksPerHour);
        blocksPerHour = newBlocksPerHour;
    }    

    // Pause functions
    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    // Modifiers
    modifier onlyBridge() {
        require(bridgeContracts[msg.sender], "Not a bridge");
        _;
    }
    
    // Getter functions    
    function getBlacklistStatus(address account) external view returns (bool) {
        return blacklisted[account];
    }

    function getBridgeContractStatus(address bridge) external view returns (bool) {
        return bridgeContracts[bridge];
    }

    function getBridgeLockedAmount(address account) external view returns (uint256) {
        return bridgeLocked[account];
    }

    function getLastMintBlockHour(address account) external view returns (uint256) {
        return lastMintBlockHour[account];
    }

    function getBlockHourlyMintCount(uint256 blockHour) external view returns (uint256) {
        return blockHourlyMintCount[blockHour];
    }

    function getHourlyMintLimit() external view returns (uint256) { 
        uint256 calculatedLimit = (cap() - totalSupply()) / DIV_MINING_LIMIT_PER_HOUR;       
        return calculatedLimit < MAX_MINING_LIMIT_PER_HOUR ? calculatedLimit : MAX_MINING_LIMIT_PER_HOUR;
    }

    function getRemainingMintLimit() external view returns (uint256) {
        uint256 currentBlockHour = block.number / blocksPerHour + 1;
        uint256 hourlyLimit = this.getHourlyMintLimit();
        uint256 remaining = hourlyLimit > blockHourlyMintCount[currentBlockHour] ? 
            hourlyLimit - blockHourlyMintCount[currentBlockHour] : 0;
        return remaining;
    }               
}