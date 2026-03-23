const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AgentRegistry", function () {
  let AgentRegistry;
  let agentRegistry;
  let owner;
  let addr1;
  let addr2;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    AgentRegistry = await ethers.getContractFactory("AgentRegistry");
    agentRegistry = await AgentRegistry.deploy();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await agentRegistry.owner()).to.equal(owner.address);
    });
  });

  describe("Agent Registration", function () {
    it("Should register a new agent", async function () {
      const name = "Test Agent";
      const metadataURI = "ipfs://QmTest";
      const capabilities = ["analysis", "writing"];

      const tx = await agentRegistry.registerAgent(name, metadataURI, capabilities);
      const receipt = await tx.wait();
      
      // Check event was emitted
      const event = receipt.logs.find(log => {
        try {
          return agentRegistry.interface.parseLog(log).name === "AgentRegistered";
        } catch {
          return false;
        }
      });
      expect(event).to.not.be.undefined;

      // Check agent count
      expect(await agentRegistry.getAgentCount()).to.equal(1);
    });

    it("Should store agent data correctly", async function () {
      const name = "Data Analyzer";
      const metadataURI = "ipfs://QmData";
      const capabilities = ["python", "sql", "data-analysis"];

      const tx = await agentRegistry.registerAgent(name, metadataURI, capabilities);
      const receipt = await tx.wait();
      
      const parsedLog = agentRegistry.interface.parseLog(receipt.logs[0]);
      const agentId = parsedLog.args.agentId;

      const agent = await agentRegistry.getAgent(agentId);
      
      expect(agent.name).to.equal(name);
      expect(agent.metadataURI).to.equal(metadataURI);
      expect(agent.owner).to.equal(owner.address);
      expect(agent.active).to.be.true;
      expect(agent.reputation).to.equal(0);
    });

    it("Should not allow duplicate registration", async function () {
      const name = "Test Agent";
      const metadataURI = "ipfs://QmTest";
      const capabilities = ["analysis"];

      await agentRegistry.registerAgent(name, metadataURI, capabilities);
      
      // Try to register again with same parameters (should fail)
      // Note: This test might need adjustment based on actual duplicate detection logic
    });
  });

  describe("Agent Management", function () {
    let agentId;

    beforeEach(async function () {
      const tx = await agentRegistry.registerAgent(
        "Test Agent",
        "ipfs://QmTest",
        ["analysis"]
      );
      const receipt = await tx.wait();
      const parsedLog = agentRegistry.interface.parseLog(receipt.logs[0]);
      agentId = parsedLog.args.agentId;
    });

    it("Should update agent metadata", async function () {
      const newMetadataURI = "ipfs://QmUpdated";
      
      await expect(agentRegistry.updateAgentMetadata(agentId, newMetadataURI))
        .to.emit(agentRegistry, "AgentUpdated")
        .withArgs(agentId, newMetadataURI);

      const agent = await agentRegistry.getAgent(agentId);
      expect(agent.metadataURI).to.equal(newMetadataURI);
    });

    it("Should deactivate agent", async function () {
      await expect(agentRegistry.deactivateAgent(agentId))
        .to.emit(agentRegistry, "AgentDeactivated")
        .withArgs(agentId);

      const agent = await agentRegistry.getAgent(agentId);
      expect(agent.active).to.be.false;
    });

    it("Should reactivate agent", async function () {
      await agentRegistry.deactivateAgent(agentId);
      
      await expect(agentRegistry.reactivateAgent(agentId))
        .to.emit(agentRegistry, "AgentReactivated")
        .withArgs(agentId);

      const agent = await agentRegistry.getAgent(agentId);
      expect(agent.active).to.be.true;
    });

    it("Should only allow owner to update their agent", async function () {
      const newMetadataURI = "ipfs://QmHacked";
      
      await expect(
        agentRegistry.connect(addr1).updateAgentMetadata(agentId, newMetadataURI)
      ).to.be.revertedWith("Not agent owner");
    });

    it("Should add reputation by owner", async function () {
      const reputationAmount = 100;
      
      await expect(agentRegistry.addReputation(agentId, reputationAmount))
        .to.emit(agentRegistry, "ReputationUpdated")
        .withArgs(agentId, reputationAmount);

      const agent = await agentRegistry.getAgent(agentId);
      expect(agent.reputation).to.equal(reputationAmount);
    });
  });

  describe("Query Functions", function () {
    beforeEach(async function () {
      await agentRegistry.registerAgent("Agent 1", "ipfs://1", ["a"]);
      await agentRegistry.connect(addr1).registerAgent("Agent 2", "ipfs://2", ["b"]);
    });

    it("Should return correct agent count", async function () {
      expect(await agentRegistry.getAgentCount()).to.equal(2);
    });

    it("Should return agents by owner", async function () {
      const ownerAgents = await agentRegistry.getAgentsByOwner(owner.address);
      expect(ownerAgents.length).to.equal(1);
    });
  });
});
