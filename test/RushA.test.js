const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("RushA", function () {
    let RushA, rushA, owner, addr1, addr2, bridge;
    const blocksPerHour = 240;

    beforeEach(async function () {
        RushA = await ethers.getContractFactory("RushA");
        [owner, addr1, addr2, bridge] = await ethers.getSigners();
        rushA = await RushA.deploy(blocksPerHour);
        await rushA.waitForDeployment();
    });

    it("should perform normal transactions", async function () {
        await rushA.transfer(addr1.address, ethers.parseUnits("1", 18)); // 1 RSA
        expect(await rushA.balanceOf(addr1.address)).to.equal(ethers.parseUnits("1", 18));
    });

    it("should allow random minting and record minting history", async function () {

        console.log("*** should allow random minting and record minting history ***");
        console.log("");

        const blockNumberBeforeMint = await ethers.provider.getBlockNumber();
        const hourlyMintLimitBeforeMint = await rushA.getHourlyMintLimit();
        const remainingMintLimitBeforeMint = await rushA.getRemainingMintLimit();
        const lastMintBlockHourBeforeMint = await rushA.getLastMintBlockHour(addr1.address);
        const canMintBeforeMint = await rushA.canMint(addr1.address);
        const balanceBeforeMint = await rushA.balanceOf(addr1.address);
    
        console.log("--- Before Mint ---");
        console.log(`Block Number: ${blockNumberBeforeMint}`);
        console.log(`Hourly Mint Limit: ${hourlyMintLimitBeforeMint}`);
        console.log(`Remaining Mint Limit: ${remainingMintLimitBeforeMint}`);
        console.log(`Last Mint Block Hour: ${lastMintBlockHourBeforeMint}`);
        console.log(`Can Mint: ${canMintBeforeMint}`);
        console.log(`Balance: ${ethers.formatUnits(balanceBeforeMint, 18)} RSA`);
        console.log("");
    
        // Mint tokens
        await rushA.connect(addr1).mint(addr1.address);
    
        const blockNumberAfterMint = await ethers.provider.getBlockNumber();
        const hourlyMintLimitAfterMint = await rushA.getHourlyMintLimit();
        const remainingMintLimitAfterMint = await rushA.getRemainingMintLimit();
        const lastMintBlockHourAfterMint = await rushA.getLastMintBlockHour(addr1.address);
        const canMintAfterMint = await rushA.canMint(addr1.address);
        const balanceAfterMint = await rushA.balanceOf(addr1.address);
    
        console.log("--- After Mint ---");
        console.log(`Block Number: ${blockNumberAfterMint}`);
        console.log(`Hourly Mint Limit: ${hourlyMintLimitAfterMint}`);
        console.log(`Remaining Mint Limit: ${remainingMintLimitAfterMint}`);
        console.log(`Last Mint Block Hour: ${lastMintBlockHourAfterMint}`);
        console.log(`Can Mint: ${canMintAfterMint}`);
        console.log(`Balance: ${ethers.formatUnits(balanceAfterMint, 18)} RSA`);
        console.log("");
    
        // Check balance
        expect(balanceAfterMint).to.be.gt(0);
        expect(lastMintBlockHourAfterMint).to.be.gt(0);
    
        // Try next mint (addr2)
        await rushA.connect(addr2).mint(addr2.address);
        const balance2AfterMint = await rushA.balanceOf(addr2.address);
        expect(balance2AfterMint).to.be.gt(0);
    
        // Check hourly mint count
        const currentBlockHour = Math.floor(await ethers.provider.getBlockNumber() / blocksPerHour) + 1;
        const hourlyMintCount = await rushA.getBlockHourlyMintCount(currentBlockHour);
        console.log(`Hourly Mint Count for Current Hour: ${ethers.formatUnits(hourlyMintCount, 18)} RSA`);
        expect(hourlyMintCount).to.be.gt(0);
    
        // Simulate mining 'blocksPerHour' blocks
        for (let i = 0; i < blocksPerHour; i++) {
            await ethers.provider.send("evm_mine");
        }
    
        // Mint tokens again
        await rushA.connect(addr1).mint(addr1.address);
    
        // Check balance again
        const newBalance = await rushA.balanceOf(addr1.address);
        console.log(`Balance of addr1 after Second Minting: ${ethers.formatUnits(newBalance, 18)} RSA`);
        expect(newBalance).to.be.gt(balanceAfterMint);
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
    
                // Simulate mining 'blocksPerHour' blocks
                for (let i = 0; i < blocksPerHour; i++) {
                    await ethers.provider.send("evm_mine");
                }

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
        const [owner, miner1, miner2, miner3, miner4, miner5] = await ethers.getSigners();
    
        const miners = [
            { miner: miner1, name: "Miner1", schedule: [1] }, // miner1 mines once per hour
            { miner: miner2, name: "Miner2", schedule: [1, 1] }, // miner2 mines twice per hour
            { miner: miner3, name: "Miner3", schedule: [2] }, // miner3 mines once every two hours
            { miner: miner4, name: "Miner4", schedule: [2, 2] }, // miner4 mines twice every two hours
            { miner: miner5, name: "Miner5", schedule: [3, 3] } // miner5 mines twice every three hours
        ];
    
        for (let hour = 0; hour < 10; hour++) {
            for (const { miner, name, schedule } of miners) {
                for (const interval of schedule) {
                    if (hour % interval === 0) {
                        const canMint = await rushA.canMint(miner.address);
                        if (canMint) {
                            try {
                                await rushA.connect(miner).mint(miner.address);
                                const timestamp = await ethers.provider.getBlock('latest').then(block => block.timestamp);
                                const balanceAfterMint = await rushA.balanceOf(miner.address);
                                console.log(`${name} (${miner.address}) mined at ${new Date(timestamp * 1000).toISOString()} with amount ${ethers.formatUnits(balanceAfterMint, 18)} RSA`);
                            } catch (error) {
                                console.log(`${name} (${miner.address}) failed to mine at hour ${hour} due to: ${error.message}`);
                            }
                        } else {
                            console.log(`${name} (${miner.address}) cannot mint at hour ${hour}`);
                        }
                    }
                }
            }
    
            // Simulate mining 'blocksPerHour' blocks (24 hours)
            for (let i = 0; i < blocksPerHour; i++) {
                await ethers.provider.send("evm_mine");
            }
        }
    
        const balance1 = await rushA.balanceOf(miner1.address);
        const balance2 = await rushA.balanceOf(miner2.address);
        const balance3 = await rushA.balanceOf(miner3.address);
        const balance4 = await rushA.balanceOf(miner4.address);
        const balance5 = await rushA.balanceOf(miner5.address);
        console.log(`Balance of Miner1 after 10 hours: ${ethers.formatUnits(balance1, 18)} RSA`);
        console.log(`Balance of Miner2 after 10 hours: ${ethers.formatUnits(balance2, 18)} RSA`);
        console.log(`Balance of Miner3 after 10 hours: ${ethers.formatUnits(balance3, 18)} RSA`);
        console.log(`Balance of Miner4 after 10 hours: ${ethers.formatUnits(balance4, 18)} RSA`);
        console.log(`Balance of Miner5 after 10 hours: ${ethers.formatUnits(balance5, 18)} RSA`);
    
        expect(balance1).to.be.gt(0);
    });
});