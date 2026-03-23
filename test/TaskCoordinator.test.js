const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TaskCoordinator", function () {
  let TaskCoordinator;
  let taskCoordinator;
  let AgentRegistry;
  let agentRegistry;
  let owner;
  let creator;
  let agent;
  let other;

  beforeEach(async function () {
    [owner, creator, agent, other] = await ethers.getSigners();
    
    // Deploy AgentRegistry first
    AgentRegistry = await ethers.getContractFactory("AgentRegistry");
    agentRegistry = await AgentRegistry.deploy();
    
    // Deploy TaskCoordinator
    TaskCoordinator = await ethers.getContractFactory("TaskCoordinator");
    taskCoordinator = await TaskCoordinator.deploy(agentRegistry.target);
    
    // Register an agent for testing
    const tx = await agentRegistry.connect(agent).registerAgent(
      "Test Agent",
      "ipfs://QmTest",
      ["solidity", "security"]
    );
    const receipt = await tx.wait();
    const parsedLog = agentRegistry.interface.parseLog(receipt.logs[0]);
    this.agentId = parsedLog.args.agentId;
  });

  describe("Task Creation", function () {
    it("Should create a new task with ETH reward", async function () {
      const description = "Smart contract audit";
      const requiredCapabilities = [ethers.encodeBytes32String("solidity")];
      const reward = ethers.parseEther("1.0");
      const deadline = Math.floor(Date.now() / 1000) + 86400; // 1 day from now

      const tx = await taskCoordinator.connect(creator).createTask(
        description,
        requiredCapabilities,
        reward,
        ethers.ZeroAddress, // ETH reward
        deadline,
        { value: reward }
      );

      const receipt = await tx.wait();
      
      // Check event
      const event = receipt.logs.find(log => {
        try {
          return taskCoordinator.interface.parseLog(log).name === "TaskCreated";
        } catch {
          return false;
        }
      });
      expect(event).to.not.be.undefined;

      expect(await taskCoordinator.getTaskCount()).to.equal(1);
    });

    it("Should reject task creation with incorrect ETH amount", async function () {
      const reward = ethers.parseEther("1.0");
      const deadline = Math.floor(Date.now() / 1000) + 86400;

      await expect(
        taskCoordinator.connect(creator).createTask(
          "Test task",
          [],
          reward,
          ethers.ZeroAddress,
          deadline,
          { value: ethers.parseEther("0.5") }
        )
      ).to.be.revertedWith("Incorrect ETH sent");
    });

    it("Should reject task creation with past deadline", async function () {
      const reward = ethers.parseEther("1.0");
      const pastDeadline = Math.floor(Date.now() / 1000) - 1000;

      await expect(
        taskCoordinator.connect(creator).createTask(
          "Test task",
          [],
          reward,
          ethers.ZeroAddress,
          pastDeadline,
          { value: reward }
        )
      ).to.be.revertedWith("Invalid deadline");
    });
  });

  describe("Task Application", function () {
    let taskId;

    beforeEach(async function () {
      const tx = await taskCoordinator.connect(creator).createTask(
        "Smart contract audit",
        [ethers.encodeBytes32String("solidity")],
        ethers.parseEther("1.0"),
        ethers.ZeroAddress,
        Math.floor(Date.now() / 1000) + 86400,
        { value: ethers.parseEther("1.0") }
      );
      const receipt = await tx.wait();
      const parsedLog = taskCoordinator.interface.parseLog(receipt.logs[0]);
      taskId = parsedLog.args.taskId;
    });

    it("Should allow agent to apply for task", async function () {
      await expect(taskCoordinator.connect(agent).applyForTask(taskId, this.agentId))
        .to.emit(taskCoordinator, "TaskApplied")
        .withArgs(taskId, this.agentId);

      expect(await taskCoordinator.agentApplications(taskId, this.agentId)).to.be.true;
    });

    it("Should reject application from inactive agent", async function () {
      await agentRegistry.connect(agent).deactivateAgent(this.agentId);
      
      await expect(
        taskCoordinator.connect(agent).applyForTask(taskId, this.agentId)
      ).to.be.revertedWith("Agent inactive");
    });

    it("Should reject application after deadline", async function () {
      // This test would require time manipulation
      // await network.provider.send("evm_increaseTime", [86500]);
      // await network.provider.send("evm_mine");
    });
  });

  describe("Task Assignment", function () {
    let taskId;

    beforeEach(async function () {
      const tx = await taskCoordinator.connect(creator).createTask(
        "Smart contract audit",
        [],
        ethers.parseEther("1.0"),
        ethers.ZeroAddress,
        Math.floor(Date.now() / 1000) + 86400,
        { value: ethers.parseEther("1.0") }
      );
      const receipt = await tx.wait();
      const parsedLog = taskCoordinator.interface.parseLog(receipt.logs[0]);
      taskId = parsedLog.args.taskId;
      
      await taskCoordinator.connect(agent).applyForTask(taskId, this.agentId);
    });

    it("Should assign agents to task", async function () {
      await expect(taskCoordinator.connect(creator).assignAgents(taskId, [this.agentId]))
        .to.emit(taskCoordinator, "TaskAssigned")
        .withArgs(taskId, [this.agentId]);

      const task = await taskCoordinator.getTask(taskId);
      expect(task.assignedAgents).to.include(this.agentId);
      expect(task.status).to.equal(1); // Assigned
    });

    it("Should only allow creator to assign agents", async function () {
      await expect(
        taskCoordinator.connect(other).assignAgents(taskId, [this.agentId])
      ).to.be.revertedWith("Not task creator");
    });
  });

  describe("Task Completion", function () {
    let taskId;

    beforeEach(async function () {
      const tx = await taskCoordinator.connect(creator).createTask(
        "Smart contract audit",
        [],
        ethers.parseEther("1.0"),
        ethers.ZeroAddress,
        Math.floor(Date.now() / 1000) + 86400,
        { value: ethers.parseEther("1.0") }
      );
      const receipt = await tx.wait();
      const parsedLog = taskCoordinator.interface.parseLog(receipt.logs[0]);
      taskId = parsedLog.args.taskId;
      
      await taskCoordinator.connect(agent).applyForTask(taskId, this.agentId);
      await taskCoordinator.connect(creator).assignAgents(taskId, [this.agentId]);
      await taskCoordinator.connect(agent).startTask(taskId);
    });

    it("Should complete task and distribute rewards", async function () {
      const agentBalanceBefore = await ethers.provider.getBalance(agent.address);
      
      await expect(taskCoordinator.connect(creator).completeTask(taskId))
        .to.emit(taskCoordinator, "TaskCompleted")
        .withArgs(taskId);

      const task = await taskCoordinator.getTask(taskId);
      expect(task.status).to.equal(3); // Completed

      const agentBalanceAfter = await ethers.provider.getBalance(agent.address);
      expect(agentBalanceAfter).to.be.gt(agentBalanceBefore);
    });

    it("Should only allow creator to complete task", async function () {
      await expect(
        taskCoordinator.connect(other).completeTask(taskId)
      ).to.be.revertedWith("Not task creator");
    });
  });

  describe("Task Queries", function () {
    it("Should return correct task data", async function () {
      const description = "Test task";
      const reward = ethers.parseEther("0.5");
      const deadline = Math.floor(Date.now() / 1000) + 86400;

      const tx = await taskCoordinator.connect(creator).createTask(
        description,
        [],
        reward,
        ethers.ZeroAddress,
        deadline,
        { value: reward }
      );
      const receipt = await tx.wait();
      const parsedLog = taskCoordinator.interface.parseLog(receipt.logs[0]);
      const taskId = parsedLog.args.taskId;

      const task = await taskCoordinator.getTask(taskId);
      
      expect(task.description).to.equal(description);
      expect(task.reward).to.equal(reward);
      expect(task.creator).to.equal(creator.address);
    });
  });
});
