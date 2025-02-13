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
    uint256 public constant MAX_RANDOM_AMOUNT = 500 * 1e18; // Maximum random mint amount per call
    uint256 public constant MAX_HOURLY_MINTERS = 10; // Maximum mints per hour

    // Date
    uint256 private constant DAY = 86400;
    uint256 private constant HOUR = 3600;    

    // Mappings
    mapping(address => bool) private blacklisted;
    mapping(address => bool) private bridgeContracts;
    mapping(address => uint256) private bridgeLocked;
    mapping(address => uint256) private lastMintDay; // Track last mint day per address
    mapping(uint256 => uint256) private hourlyMintCount; // Track mints per hour    

    // Events
    event BridgeBurned(address indexed from, uint256 amount);
    event BridgeMinted(address indexed to, uint256 amount);
    event BlacklistUpdated(address indexed account, bool status);
    event BridgeContractUpdated(address indexed bridge, bool allowed);
    event WhitelistUpdated(address indexed account, bool status);
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
     * - Ensures minting limits per hour and per day.
     * - Ensures total supply does not exceed the cap.
     */
    function mint(address to) external nonReentrant {
        require(to != address(0), "Mint to the zero address");
        require(!blacklisted[msg.sender], "Sender blacklisted");
       
        // 生成隨機數量 
        uint256 randomAmount = uint256(keccak256(abi.encodePacked(block.timestamp, block.prevrandao, msg.sender))) % (MAX_RANDOM_AMOUNT + 1);                        
        uint256 amount = randomAmount;

        require(totalSupply() + amount <= cap(), "Exceeds cap");

        // 自然日檢查
        uint256 currentDay = block.timestamp / DAY;
        require(lastMintDay[msg.sender] < currentDay, "Already minted today");        
        
        // 每小時挖礦限制
        uint256 currentHour = block.timestamp / HOUR;
        require(hourlyMintCount[currentHour] < MAX_HOURLY_MINTERS, "Hourly limit reached");        

        hourlyMintCount[currentHour] += 1;
        lastMintDay[msg.sender] = currentDay; // 更新最後挖礦日期        

        require(totalSupply() + amount <= TOTAL_SUPPLY, "Total supply exceeded");

        _mint(to, amount);
        emit Mined(msg.sender, amount);
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
    function bridgeMint(address to, uint256 amount) external onlyBridge nonReentrant {
        require(amount > 0, "Amount must be greater than 0");
        require(totalSupply() + amount <= cap(), "ERC20Capped: cap exceeded");                
        _mint(to, amount);
        emit BridgeMinted(to, amount);        
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

    function getLastMintDay(address account) external view returns (uint256) {
        return lastMintDay[account];
    }

    function getHourlyMintCount(uint256 hour) external view returns (uint256) {
        return hourlyMintCount[hour];
    }
}