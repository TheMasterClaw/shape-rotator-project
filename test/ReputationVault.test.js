const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ReputationVault", function () {
  let ReputationVault;
  let AgentRegistry;
  let reputationVault;
  let agentRegistry;
  let owner;
  let addr1;
  let addr2;
  let addr3;
  let agentId;

  beforeEach(async function () {
    [owner, addr1, addr2, addr3] = await ethers.getSigners();
    
    // Deploy AgentRegistry first
    const AgentRegistryFactory = await ethers.getContractFactory("AgentRegistry");
    agentRegistry = await AgentRegistryFactory.deploy();
    
    // Deploy ReputationVault
    const ReputationVaultFactory = await ethers.getContractFactory("ReputationVault");
    reputationVault = await ReputationVaultFactory.deploy(await agentRegistry.getAddress());
    
    // Register an agent for testing
    const tx = await agentRegistry.connect(addr1).registerAgent(
      "Test Agent",
      "ipfs://QmTest",
      ["analysis", "writing"]
    );
    const receipt = await tx.wait();
    const parsedLog = agentRegistry.interface.parseLog(receipt.logs[0]);
    agentId = parsedLog.args.agentId;
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await reputationVault.owner()).to.equal(owner.address);
    });

    it("Should set the correct AgentRegistry address", async function () {
      expect(await reputationVault.agentRegistry()).to.equal(await agentRegistry.getAddress());
    });

    it("Should have correct constants", async function () {
      expect(await reputationVault.MAX_RATING()).to.equal(5);
      expect(await reputationVault.REPUTATION_DECAY_DAYS()).to.equal(90);
    });
  });

  describe("Task Completion", function () {
    it("Should record task completion and increase reputation", async function () {
      const taskId = ethers.keccak256(ethers.toUtf8Bytes("task1"));
      
      await expect(reputationVault.recordTaskCompletion(agentId, taskId))
        .to.emit(reputationVault, "TaskCompleted")
        .withArgs(agentId, taskId)
        .to.emit(reputationVault, "ReputationUpdated")
        .withArgs(agentId, 10, "Task completed");
      
      const rep = await reputationVault.getReputation(agentId);
      expect(rep.taskCompleted).to.equal(1);
      expect(rep.taskFailed).to.equal(0);
      expect(rep.totalScore).to.equal(10);
    });

    it("Should only allow owner to record task completion", async function () {
      const taskId = ethers.keccak256(ethers.toUtf8Bytes("task1"));
      
      await expect(
        reputationVault.connect(addr1).recordTaskCompletion(agentId, taskId)
      ).to.be.revertedWithCustomError(reputationVault, "OwnableUnauthorizedAccount");
    });

    it("Should accumulate reputation from multiple completions", async function () {
      const taskId1 = ethers.keccak256(ethers.toUtf8Bytes("task1"));
      const taskId2 = ethers.keccak256(ethers.toUtf8Bytes("task2"));
      
      await reputationVault.recordTaskCompletion(agentId, taskId1);
      await reputationVault.recordTaskCompletion(agentId, taskId2);
      
      const rep = await reputationVault.getReputation(agentId);
      expect(rep.taskCompleted).to.equal(2);
      expect(rep.totalScore).to.equal(20);
    });
  });

  describe("Task Failure", function () {
    it("Should record task failure and decrease reputation", async function () {
      const taskId = ethers.keccak256(ethers.toUtf8Bytes("task1"));
      
      // First add some reputation
      await reputationVault.recordTaskCompletion(agentId, taskId);
      
      const taskId2 = ethers.keccak256(ethers.toUtf8Bytes("task2"));
      await expect(reputationVault.recordTaskFailure(agentId, taskId2))
        .to.emit(reputationVault, "TaskFailed")
        .withArgs(agentId, taskId2)
        .to.emit(reputationVault, "ReputationUpdated")
        .withArgs(agentId, 5, "Task failed");
      
      const rep = await reputationVault.getReputation(agentId);
      expect(rep.taskFailed).to.equal(1);
      expect(rep.totalScore).to.equal(5);
    });

    it("Should not let reputation go below zero", async function () {
      const taskId = ethers.keccak256(ethers.toUtf8Bytes("task1"));
      
      await reputationVault.recordTaskFailure(agentId, taskId);
      
      const rep = await reputationVault.getReputation(agentId);
      expect(rep.totalScore).to.equal(0);
    });

    it("Should only allow owner to record task failure", async function () {
      const taskId = ethers.keccak256(ethers.toUtf8Bytes("task1"));
      
      await expect(
        reputationVault.connect(addr1).recordTaskFailure(agentId, taskId)
      ).to.be.revertedWithCustomError(reputationVault, "OwnableUnauthorizedAccount");
    });
  });

  describe("Rating System", function () {
    it("Should allow users to rate an agent", async function () {
      const rating = 5;
      
      await expect(reputationVault.connect(addr2).rateAgent(agentId, rating))
        .to.emit(reputationVault, "Rated")
        .withArgs(agentId, addr2.address, rating)
        .to.emit(reputationVault, "ReputationUpdated")
        .withArgs(agentId, 10, "New rating"); // 5 * 2 = 10 points
      
      const rep = await reputationVault.getReputation(agentId);
      expect(rep.ratingCount).to.equal(1);
      expect(rep.ratingSum).to.equal(5);
      expect(rep.totalScore).to.equal(10);
    });

    it("Should prevent duplicate ratings from same user", async function () {
      await reputationVault.connect(addr2).rateAgent(agentId, 5);
      
      await expect(
        reputationVault.connect(addr2).rateAgent(agentId, 3)
      ).to.be.revertedWith("Already rated");
    });

    it("Should prevent rating outside valid range", async function () {
      await expect(
        reputationVault.connect(addr2).rateAgent(agentId, 0)
      ).to.be.revertedWith("Invalid rating");
      
      await expect(
        reputationVault.connect(addr2).rateAgent(agentId, 6)
      ).to.be.revertedWith("Invalid rating");
    });

    it("Should prevent agent owner from rating themselves", async function () {
      await expect(
        reputationVault.connect(addr1).rateAgent(agentId, 5)
      ).to.be.revertedWith("Cannot rate own agent");
    });

    it("Should prevent rating inactive agents", async function () {
      await agentRegistry.connect(addr1).deactivateAgent(agentId);
      
      await expect(
        reputationVault.connect(addr2).rateAgent(agentId, 5)
      ).to.be.revertedWith("Agent inactive");
    });

    it("Should calculate average rating correctly", async function () {
      await reputationVault.connect(addr2).rateAgent(agentId, 5);
      await reputationVault.connect(addr3).rateAgent(agentId, 3);
      
      expect(await reputationVault.getAverageRating(agentId)).to.equal(4);
    });

    it("Should return zero for agents with no ratings", async function () {
      expect(await reputationVault.getAverageRating(agentId)).to.equal(0);
    });
  });

  describe("Success Rate Calculation", function () {
    it("Should calculate success rate correctly", async function () {
      const taskId1 = ethers.keccak256(ethers.toUtf8Bytes("task1"));
      const taskId2 = ethers.keccak256(ethers.toUtf8Bytes("task2"));
      const taskId3 = ethers.keccak256(ethers.toUtf8Bytes("task3"));
      
      await reputationVault.recordTaskCompletion(agentId, taskId1);
      await reputationVault.recordTaskCompletion(agentId, taskId2);
      await reputationVault.recordTaskFailure(agentId, taskId3);
      
      expect(await reputationVault.getSuccessRate(agentId)).to.equal(66); // 66.67% rounded down
    });

    it("Should return zero for agents with no tasks", async function () {
      expect(await reputationVault.getSuccessRate(agentId)).to.equal(0);
    });
  });

  describe("Reputation Data", function () {
    it("Should track last updated timestamp", async function () {
      const taskId = ethers.keccak256(ethers.toUtf8Bytes("task1"));
      
      const beforeBlock = await ethers.provider.getBlock("latest");
      await reputationVault.recordTaskCompletion(agentId, taskId);
      
      const rep = await reputationVault.getReputation(agentId);
      expect(rep.lastUpdated).to.be.at.least(beforeBlock.timestamp);
    });

    it("Should return default reputation for new agents", async function () {
      const rep = await reputationVault.getReputation(agentId);
      expect(rep.totalScore).to.equal(0);
      expect(rep.taskCompleted).to.equal(0);
      expect(rep.taskFailed).to.equal(0);
      expect(rep.ratingSum).to.equal(0);
      expect(rep.ratingCount).to.equal(0);
    });
  });
});
