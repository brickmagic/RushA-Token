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

    // Date
    uint256 private constant DAY = 86400;
    uint256 private constant HOUR = 3600;    

    // Mappings
    mapping(address => bool) private blacklisted;
    mapping(address => bool) private bridgeContracts;
    mapping(address => uint256) private bridgeLocked;
    mapping(address => uint256) private lastMintHour; // Track last mint hour per address
    mapping(uint256 => uint256) private hourlyMintCount; // Track mints per hour    

    // Events
    event BridgeBurned(address indexed from, uint256 amount);
    event BridgeMinted(address indexed from, address to, uint256 amount);
    event BlacklistUpdated(address indexed account, bool status);
    event BridgeContractUpdated(address indexed bridge, bool allowed);    
    event Mined(address indexed miner, uint256 amountWei);

    constructor()
        ERC20("Rush A", "RSA")
        ERC20Capped(TOTAL_SUPPLY)
        Ownable(msg.sender)
    {
        _mint(msg.sender, INITIAL_SUPPLY);        
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

        uint256 currentHour = block.timestamp / HOUR;        
        require(lastMintHour[msg.sender] < currentHour, "Already minted this hour");
        require(hourlyMintCount[currentHour] + amount <= hourlyMintLimit, "Hourly limit reached");

        hourlyMintCount[currentHour] += amount;
        lastMintHour[msg.sender] = currentHour;        

        _mint(to, amount);
        emit Mined(msg.sender, amount);
    }

    /**
    * @dev Checks if the current miner can mint tokens.
    * - Ensures the miner has not minted this hour.
    * - Ensures the hourly mint limit has not been reached.
    */
    function canMint(address miner) external view returns (bool) {
        uint256 currentHour = block.timestamp / HOUR;

        bool hasNotMintedThisHour = lastMintHour[miner] < currentHour;
        uint256 hourlyMintLimit = this.getHourlyMintLimit();
        bool hourlyLimitNotReached = hourlyMintCount[currentHour] < hourlyMintLimit;

        return hasNotMintedThisHour && hourlyLimitNotReached;
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

    function getLastMintHour(address account) external view returns (uint256) {
        return lastMintHour[account];
    }

    function getHourlyMintCount(uint256 hour) external view returns (uint256) {
        return hourlyMintCount[hour];
    }

    function getHourlyMintLimit() external view returns (uint256) { 
        uint256 calculatedHourlyMintLimit = (cap() - totalSupply()) / DIV_MINING_LIMIT_PER_HOUR;       
        return calculatedHourlyMintLimit < MAX_MINING_LIMIT_PER_HOUR ? calculatedHourlyMintLimit : MAX_MINING_LIMIT_PER_HOUR;
    }

    function getRemainingMintLimit() external view returns (uint256) {
        uint256 currentHour = block.timestamp / HOUR;
        uint256 calculatedHourlyMintLimit = (cap() - totalSupply()) / DIV_MINING_LIMIT_PER_HOUR;
        uint256 hourlyMintLimit = calculatedHourlyMintLimit < MAX_MINING_LIMIT_PER_HOUR ? calculatedHourlyMintLimit : MAX_MINING_LIMIT_PER_HOUR;
        uint256 remainingMintLimit = hourlyMintLimit > hourlyMintCount[currentHour] ? hourlyMintLimit - hourlyMintCount[currentHour] : 0;
        return remainingMintLimit;
    }        
}