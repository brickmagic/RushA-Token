const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("RushA", function () {
    let RushA, rushA, owner, addr1, addr2, bridge;

    beforeEach(async function () {
        RushA = await ethers.getContractFactory("RushA");
        [owner, addr1, addr2, bridge] = await ethers.getSigners();
        rushA = await RushA.deploy();
        await rushA.waitForDeployment();
    });

    it("should perform normal transactions", async function () {
        await rushA.transfer(addr1.address, ethers.parseUnits("1", 18)); // 1 RSA
        expect(await rushA.balanceOf(addr1.address)).to.equal(ethers.parseUnits("1", 18));
    });

    it("should allow random minting and record minting history", async function () {
        // Mint tokens
        await rushA.connect(addr1).mint(addr1.address);
    
        // Check balance
        const balance = await rushA.balanceOf(addr1.address);
        console.log(`Balance of addr1 after minting: ${ethers.formatUnits(balance, 18)} RSA`);
        expect(balance).to.be.gt(0);
    
        // Check last mint hour
        const lastMintHour = await rushA.getLastMintHour(addr1.address);
        console.log(`Last mint hour for addr1: ${lastMintHour}`);
        expect(lastMintHour).to.be.gt(0);
    
        // Check hourly mint count
        const currentHour = Math.floor(Date.now() / 1000 / 3600);
        const hourlyMintCount = await rushA.getHourlyMintCount(currentHour);
        console.log(`Hourly mint count for current hour: ${ethers.formatUnits(hourlyMintCount, 18)} RSA`);
        expect(hourlyMintCount).to.be.gt(0);
    });

    it("should perform bridge transactions", async function () {
        // Set bridge contract
        await rushA.setBridgeContract(bridge.address, true);
        const isBridge = await rushA.getBridgeContractStatus(bridge.address);
        expect(isBridge).to.be.true;
    
        // Transfer tokens to addr1
        await rushA.transfer(addr1.address, ethers.parseUnits("1", 18)); // 1 RSA
    
        // Burn tokens from addr1
        await rushA.connect(addr1).bridgeBurn(ethers.parseUnits("1", 18)); // Burn 1 RSA
        expect(await rushA.balanceOf(addr1.address)).to.equal(0);
    
        // Check locked amount for addr1
        const lockedAmount = await rushA.getBridgeLockedAmount(addr1.address);
        expect(lockedAmount).to.equal(ethers.parseUnits("1", 18));
    
        // Mint tokens to addr2 from addr1's locked amount
        await rushA.connect(bridge).bridgeMint(addr1.address, addr2.address, ethers.parseUnits("1", 18)); // Mint 1 RSA
        expect(await rushA.balanceOf(addr2.address)).to.equal(ethers.parseUnits("1", 18));
    
        // Check locked amount for addr1 after minting
        const lockedAmountAfterMint = await rushA.getBridgeLockedAmount(addr1.address);
        expect(lockedAmountAfterMint).to.equal(0);
    });

    it("should handle high volume of transactions", async function () {
        const numTransactions = 100;
        const amount = ethers.parseUnits("0.1", 18); // 0.1 RSA

        for (let i = 0; i < numTransactions; i++) {
            await rushA.transfer(addr1.address, amount);
            await rushA.connect(addr1).transfer(addr2.address, amount);
        }

        const balance1 = await rushA.balanceOf(addr1.address);
        const balance2 = await rushA.balanceOf(addr2.address);

        console.log(`Balance of addr1 after high volume transactions: ${ethers.formatUnits(balance1, 18)} RSA`);
        console.log(`Balance of addr2 after high volume transactions: ${ethers.formatUnits(balance2, 18)} RSA`);

        expect(balance1).to.equal(0);
        expect(balance2).to.equal(amount * BigInt(numTransactions));
    });

    it("should handle high volume of minting", async function () {
        const numMints = 50;
        let mintingFailed = false;
    
        for (let i = 0; i < numMints; i++) {
            try {
                const tx = await rushA.connect(addr1).mint(addr1.address);
                const receipt = await tx.wait();
                const block = await ethers.provider.getBlock(receipt.blockNumber);
                const mintAmount = await rushA.balanceOf(addr1.address);
    
                //console.log(`Mint ${i + 1} succeeded`);
                //console.log(`Mint amount: ${ethers.formatUnits(mintAmount, 18)} RSA`);
                //console.log(`Mint time: ${new Date(block.timestamp * 1000).toISOString()}`);
    
                // Simulate a delay to avoid "Already minted this hour" and "Hourly limit reached" errors
                await ethers.provider.send("evm_increaseTime", [3600]); // Increase time by 1 hour
                await ethers.provider.send("evm_mine"); // Mine a new block
            } catch (error) {
                console.log(`Mint ${i + 1} failed: ${error.message}`);
                if (error.message.includes("Already minted this hour") || error.message.includes("Hourly limit reached")) {
                    mintingFailed = true;
                    break;
                } else {
                    throw error;
                }
            }
        }
    
        expect(mintingFailed).to.be.false;
    });

    it("should handle multiple miners with different minting schedules", async function () {
        const [miner1, miner2, miner3, miner4, miner5] = await ethers.getSigners();
    
        const miners = [
            { miner: miner1, name: "Miner1", schedule: [1] }, // miner1 mines once per day
            { miner: miner2, name: "Miner2", schedule: [1, 1] }, // miner2 mines twice per day
            { miner: miner3, name: "Miner3", schedule: [2] }, // miner3 mines once every two days
            { miner: miner4, name: "Miner4", schedule: [2, 2] }, // miner4 mines twice every two days
            { miner: miner5, name: "Miner5", schedule: [3, 3] } // miner5 mines twice every three days
        ];
    
        for (let day = 0; day < 10; day++) {
            for (const { miner, name, schedule } of miners) {
                for (const interval of schedule) {
                    if (day % interval === 0) {
                        try {
                            await rushA.connect(miner).mint(miner.address);
                            const timestamp = await ethers.provider.getBlock('latest').then(block => block.timestamp);
                            const balanceAfterMint = await rushA.balanceOf(miner.address);
                            console.log(`${name} (${miner.address}) mined at ${new Date(timestamp * 1000).toISOString()} with amount ${ethers.formatUnits(balanceAfterMint, 18)} RSA`);
                        } catch (error) {
                            if (error.message.includes("Already minted this hour") || error.message.includes("Hourly limit reached")) {
                                console.log(`${name} (${miner.address}) failed to mine at day ${day} due to: ${error.message}`);
                            } else {
                                throw error;
                            }
                        }
                    }
                }
            }
            await ethers.provider.send("evm_increaseTime", [86400]); // Increase time by 1 day
            await ethers.provider.send("evm_mine"); // Mine a new block
        }
    
        const balance1 = await rushA.balanceOf(miner1.address);
        const balance2 = await rushA.balanceOf(miner2.address);
        const balance3 = await rushA.balanceOf(miner3.address);
        const balance4 = await rushA.balanceOf(miner4.address);
        const balance5 = await rushA.balanceOf(miner5.address);
        console.log(`Balance of Miner1 after 10 days: ${ethers.formatUnits(balance1, 18)} RSA`);
        console.log(`Balance of Miner2 after 10 days: ${ethers.formatUnits(balance2, 18)} RSA`);
        console.log(`Balance of Miner3 after 10 days: ${ethers.formatUnits(balance3, 18)} RSA`);
        console.log(`Balance of Miner4 after 10 days: ${ethers.formatUnits(balance4, 18)} RSA`);
        console.log(`Balance of Miner5 after 10 days: ${ethers.formatUnits(balance5, 18)} RSA`);
    
        expect(balance1).to.be.gt(0);
    });
});