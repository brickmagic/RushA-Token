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
    uint256 public constant MAX_RANDOM_AMOUNT = 500 * 1e18; // Maximum random mint amount
    uint256 public constant MAX_HOURLY_MINTERS = 10; // Maximum hourly minters

    // Date
    uint256 private constant DAY = 86400;

    // Mappings
    mapping(address => bool) private blacklisted;
    mapping(address => bool) private bridgeContracts;
    mapping(address => uint256) private bridgeLocked;
    mapping(address => bool) private isWhitelisted;
    mapping(address => bool) private minters;
    mapping(address => uint256) private lastMintTimestamp;
    mapping(address => uint256) private dailyMintedAmount;
    mapping(uint256 => uint256) private hourlyMintCount;

    // Events
    event BridgeBurned(address indexed from, uint256 amount);
    event BridgeMinted(address indexed to, uint256 amount);
    event BlacklistUpdated(address indexed account, bool status);
    event BridgeContractUpdated(address indexed bridge, bool allowed);
    event WhitelistUpdated(address indexed account, bool status);
    event Mined(address indexed miner, uint256 amountWei);
    event MinterUpdated(address indexed minter, bool status);

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
            if (!isWhitelisted[from]) {
                require(!blacklisted[from], "Sender blacklisted");
            }
        }
        if (to != address(0)) {
            if (!isWhitelisted[to]) {
                require(!blacklisted[to], "Recipient blacklisted");
            }
        }
        super._update(from, to, amount);
    }

    // Minting function
    /**
     * @dev Mints a random amount of tokens to the specified address.
     * - Ensures minting limits per hour and per day.
     * - Ensures total supply does not exceed the cap.
     */
    function mint(address to) external onlyMinter nonReentrant {
        require(to != address(0), "Mint to the zero address");
        
        uint256 randomAmount = uint256(keccak256(abi.encodePacked(block.timestamp, block.prevrandao, msg.sender))) % (MAX_RANDOM_AMOUNT + 1);                
        uint256 amount = randomAmount;

        require(totalSupply() + amount <= cap(), "ERC20Capped: cap exceeded");
        require(block.timestamp - lastMintTimestamp[msg.sender] >= 1 days, "Minting too frequently");

        uint256 currentHour = block.timestamp / 1 hours;
        require(hourlyMintCount[currentHour] < MAX_HOURLY_MINTERS, "Minting limit reached for this hour");

        hourlyMintCount[currentHour] += 1;

        if (getCurrentDay() > lastMintTimestamp[msg.sender]) {
            dailyMintedAmount[msg.sender] = 0;
        }

        require(dailyMintedAmount[msg.sender] + amount <= MAX_RANDOM_AMOUNT, "Daily minting limit exceeded");

        dailyMintedAmount[msg.sender] += amount;
        lastMintTimestamp[msg.sender] = block.timestamp;

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

    function addMinter(address _minter) external onlyOwner {
        minters[_minter] = true;
        emit MinterUpdated(_minter, true);
    }

    function removeMinter(address _minter) external onlyOwner {
        delete minters[_minter];
        emit MinterUpdated(_minter, false);
    }

    function setWhitelist(address account, bool status) external onlyOwner {
        isWhitelisted[account] = status;
        emit WhitelistUpdated(account, status);
    }

    // Pause functions
    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // Modifiers
    modifier onlyBridge() {
        require(bridgeContracts[msg.sender], "Not authorized bridge contract");
        _;
    }

    modifier onlyMinter() {
        require(minters[msg.sender], "Not authorized minter");
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

    function getWhitelistStatus(address account) external view returns (bool) {
        return isWhitelisted[account];
    }

    function getMinterStatus(address account) external view returns (bool) {
        return minters[account];
    }

    function getLastMintTimestamp(address account) external view returns (uint256) {
        return lastMintTimestamp[account];
    }

    function getDailyMintedAmount(address account) external view returns (uint256) {
        return dailyMintedAmount[account];
    }

    function getHourlyMintCount(uint256 hour) external view returns (uint256) {
        return hourlyMintCount[hour];
    }

    // Date functions
    function getCurrentDay() internal view returns (uint256) {
        return block.timestamp / DAY;
    }    
}