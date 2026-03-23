const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AgentPaymentSplitter", function () {
  let AgentPaymentSplitter;
  let MockERC20;
  let paymentSplitter;
  let mockToken;
  let owner;
  let addr1;
  let addr2;
  let addr3;
  let addrs;

  beforeEach(async function () {
    [owner, addr1, addr2, addr3, ...addrs] = await ethers.getSigners();
    
    // Deploy PaymentSplitter
    const PaymentSplitterFactory = await ethers.getContractFactory("AgentPaymentSplitter");
    paymentSplitter = await PaymentSplitterFactory.deploy();
    
    // Deploy Mock ERC20 token
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    mockToken = await MockERC20Factory.deploy("Mock Token", "MOCK", ethers.parseEther("10000"));
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await paymentSplitter.owner()).to.equal(owner.address);
    });
  });

  describe("ETH Payment Split Creation", function () {
    it("Should create an ETH payment split", async function () {
      const taskId = ethers.keccak256(ethers.toUtf8Bytes("task1"));
      const payees = [addr1.address, addr2.address];
      const shares = [50, 50];
      const totalAmount = ethers.parseEther("1.0");
      
      await expect(
        paymentSplitter.createSplit(taskId, payees, shares, false, ethers.ZeroAddress, { value: totalAmount })
      )
        .to.emit(paymentSplitter, "SplitCreated")
        .withArgs(taskId, payees, shares);
      
      const split = await paymentSplitter.getSplit(taskId);
      expect(split.taskId).to.equal(taskId);
      expect(split.totalShares).to.equal(100);
      expect(split.isERC20).to.be.false;
      expect(split.token).to.equal(ethers.ZeroAddress);
      // Verify payees count through pendingPayment
      expect(await paymentSplitter.pendingPayment(taskId, addr1.address)).to.equal(ethers.parseEther("0.5"));
      expect(await paymentSplitter.pendingPayment(taskId, addr2.address)).to.equal(ethers.parseEther("0.5"));
    });

    it("Should fail with mismatched payees and shares", async function () {
      const taskId = ethers.keccak256(ethers.toUtf8Bytes("task1"));
      const payees = [addr1.address];
      const shares = [50, 50];
      
      await expect(
        paymentSplitter.createSplit(taskId, payees, shares, false, ethers.ZeroAddress, { value: ethers.parseEther("1.0") })
      ).to.be.revertedWith("Payees and shares length mismatch");
    });

    it("Should fail with no payees", async function () {
      const taskId = ethers.keccak256(ethers.toUtf8Bytes("task1"));
      
      await expect(
        paymentSplitter.createSplit(taskId, [], [], false, ethers.ZeroAddress, { value: ethers.parseEther("1.0") })
      ).to.be.revertedWith("No payees");
    });

    it("Should fail with no ETH sent for ETH split", async function () {
      const taskId = ethers.keccak256(ethers.toUtf8Bytes("task1"));
      const payees = [addr1.address];
      const shares = [100];
      
      await expect(
        paymentSplitter.createSplit(taskId, payees, shares, false, ethers.ZeroAddress, { value: 0 })
      ).to.be.revertedWith("No ETH sent");
    });

    it("Should only allow owner to create splits", async function () {
      const taskId = ethers.keccak256(ethers.toUtf8Bytes("task1"));
      const payees = [addr1.address];
      const shares = [100];
      
      await expect(
        paymentSplitter.connect(addr1).createSplit(taskId, payees, shares, false, ethers.ZeroAddress, { value: ethers.parseEther("1.0") })
      ).to.be.revertedWithCustomError(paymentSplitter, "OwnableUnauthorizedAccount");
    });
  });

  describe("ERC20 Payment Split Creation", function () {
    it("Should create an ERC20 payment split", async function () {
      const taskId = ethers.keccak256(ethers.toUtf8Bytes("task1"));
      const payees = [addr1.address, addr2.address, addr3.address];
      const shares = [40, 35, 25];
      const totalAmount = ethers.parseEther("1000");
      
      // Transfer tokens to splitter first
      await mockToken.transfer(await paymentSplitter.getAddress(), totalAmount);
      
      await expect(
        paymentSplitter.createSplit(taskId, payees, shares, true, await mockToken.getAddress())
      )
        .to.emit(paymentSplitter, "SplitCreated")
        .withArgs(taskId, payees, shares);
      
      const split = await paymentSplitter.splits(taskId);
      expect(split.totalShares).to.equal(100);
      expect(split.isERC20).to.be.true;
      expect(split.token).to.equal(await mockToken.getAddress());
    });
  });

  describe("ETH Payment Release", function () {
    let taskId;
    const totalAmount = ethers.parseEther("1.0");

    beforeEach(async function () {
      taskId = ethers.keccak256(ethers.toUtf8Bytes("task1"));
      const payees = [addr1.address, addr2.address];
      const shares = [60, 40]; // 60% / 40% split
      
      await paymentSplitter.createSplit(taskId, payees, shares, false, ethers.ZeroAddress, { value: totalAmount });
    });

    it("Should release payment to payee", async function () {
      const beforeBalance = await ethers.provider.getBalance(addr1.address);
      
      await expect(paymentSplitter.release(taskId, addr1.address))
        .to.emit(paymentSplitter, "PaymentReleased")
        .withArgs(taskId, addr1.address, ethers.parseEther("0.6")); // 60% of 1 ETH
      
      const afterBalance = await ethers.provider.getBalance(addr1.address);
      expect(afterBalance - beforeBalance).to.equal(ethers.parseEther("0.6"));
    });

    it("Should release correct amounts to different payees", async function () {
      const balance1Before = await ethers.provider.getBalance(addr1.address);
      const balance2Before = await ethers.provider.getBalance(addr2.address);
      
      await paymentSplitter.release(taskId, addr1.address);
      await paymentSplitter.release(taskId, addr2.address);
      
      const balance1After = await ethers.provider.getBalance(addr1.address);
      const balance2After = await ethers.provider.getBalance(addr2.address);
      
      expect(balance1After - balance1Before).to.equal(ethers.parseEther("0.6"));
      expect(balance2After - balance2Before).to.equal(ethers.parseEther("0.4"));
    });

    it("Should fail to release to non-payee", async function () {
      await expect(
        paymentSplitter.release(taskId, addr3.address)
      ).to.be.revertedWith("Not a payee");
    });

    it("Should fail to release twice", async function () {
      await paymentSplitter.release(taskId, addr1.address);
      
      await expect(
        paymentSplitter.release(taskId, addr1.address)
      ).to.be.revertedWith("No payment due");
    });

    it("Should fail for non-existent split", async function () {
      const fakeTaskId = ethers.keccak256(ethers.toUtf8Bytes("fake"));
      
      await expect(
        paymentSplitter.release(fakeTaskId, addr1.address)
      ).to.be.revertedWith("Split does not exist");
    });

    it("Should track released amounts correctly", async function () {
      await paymentSplitter.release(taskId, addr1.address);
      
      const split = await paymentSplitter.splits(taskId);
      expect(split.totalReleased).to.equal(ethers.parseEther("0.6"));
    });
  });

  describe("ERC20 Payment Release", function () {
    let taskId;
    const totalAmount = ethers.parseEther("1000");

    beforeEach(async function () {
      taskId = ethers.keccak256(ethers.toUtf8Bytes("task1"));
      const payees = [addr1.address, addr2.address];
      const shares = [70, 30]; // 70% / 30% split
      
      // Transfer tokens to splitter
      await mockToken.transfer(await paymentSplitter.getAddress(), totalAmount);
      await paymentSplitter.createSplit(taskId, payees, shares, true, await mockToken.getAddress());
    });

    it("Should release ERC20 payment to payee", async function () {
      const beforeBalance = await mockToken.balanceOf(addr1.address);
      
      await expect(paymentSplitter.release(taskId, addr1.address))
        .to.emit(paymentSplitter, "ERC20PaymentReleased")
        .withArgs(taskId, addr1.address, await mockToken.getAddress(), ethers.parseEther("700")); // 70% of 1000
      
      const afterBalance = await mockToken.balanceOf(addr1.address);
      expect(afterBalance - beforeBalance).to.equal(ethers.parseEther("700"));
    });

    it("Should release correct ERC20 amounts to different payees", async function () {
      await paymentSplitter.release(taskId, addr1.address);
      await paymentSplitter.release(taskId, addr2.address);
      
      expect(await mockToken.balanceOf(addr1.address)).to.equal(ethers.parseEther("700"));
      expect(await mockToken.balanceOf(addr2.address)).to.equal(ethers.parseEther("300"));
    });
  });

  describe("Pending Payment Query", function () {
    it("Should return correct pending payment for ETH split", async function () {
      const taskId = ethers.keccak256(ethers.toUtf8Bytes("task1"));
      const payees = [addr1.address, addr2.address];
      const shares = [50, 50];
      const totalAmount = ethers.parseEther("1.0");
      
      await paymentSplitter.createSplit(taskId, payees, shares, false, ethers.ZeroAddress, { value: totalAmount });
      
      const pending = await paymentSplitter.pendingPayment(taskId, addr1.address);
      expect(pending).to.equal(ethers.parseEther("0.5"));
    });

    it("Should return zero after payment released", async function () {
      const taskId = ethers.keccak256(ethers.toUtf8Bytes("task1"));
      const payees = [addr1.address];
      const shares = [100];
      
      await paymentSplitter.createSplit(taskId, payees, shares, false, ethers.ZeroAddress, { value: ethers.parseEther("1.0") });
      await paymentSplitter.release(taskId, addr1.address);
      
      const pending = await paymentSplitter.pendingPayment(taskId, addr1.address);
      expect(pending).to.equal(0);
    });

    it("Should return zero for non-payee", async function () {
      const taskId = ethers.keccak256(ethers.toUtf8Bytes("task1"));
      const payees = [addr1.address];
      const shares = [100];
      
      await paymentSplitter.createSplit(taskId, payees, shares, false, ethers.ZeroAddress, { value: ethers.parseEther("1.0") });
      
      const pending = await paymentSplitter.pendingPayment(taskId, addr2.address);
      expect(pending).to.equal(0);
    });

    it("Should return zero for non-existent split", async function () {
      const fakeTaskId = ethers.keccak256(ethers.toUtf8Bytes("fake"));
      
      const pending = await paymentSplitter.pendingPayment(fakeTaskId, addr1.address);
      expect(pending).to.equal(0);
    });
  });

  describe("Split Query", function () {
    it("Should return split details correctly", async function () {
      const taskId = ethers.keccak256(ethers.toUtf8Bytes("task1"));
      const payees = [addr1.address, addr2.address];
      const shares = [60, 40];
      
      await paymentSplitter.createSplit(taskId, payees, shares, false, ethers.ZeroAddress, { value: ethers.parseEther("1.0") });
      
      const split = await paymentSplitter.getSplit(taskId);
      expect(split.taskId).to.equal(taskId);
      expect(split.payees).to.deep.equal(payees);
      expect(split.shares.map(s => Number(s))).to.deep.equal(shares);
      expect(split.totalShares).to.equal(100);
      expect(split.totalReleased).to.equal(0);
    });
  });

  describe("Complex Scenarios", function () {
    it("Should handle multiple splits independently", async function () {
      // Create first split
      const taskId1 = ethers.keccak256(ethers.toUtf8Bytes("task1"));
      await paymentSplitter.createSplit(
        taskId1, 
        [addr1.address], 
        [100], 
        false, 
        ethers.ZeroAddress, 
        { value: ethers.parseEther("1.0") }
      );
      
      // Create second split  
      const taskId2 = ethers.keccak256(ethers.toUtf8Bytes("task2"));
      await paymentSplitter.createSplit(
        taskId2, 
        [addr2.address], 
        [100], 
        false, 
        ethers.ZeroAddress, 
        { value: ethers.parseEther("2.0") }
      );
      
      // Verify both splits exist
      const split1 = await paymentSplitter.getSplit(taskId1);
      expect(split1.taskId).to.equal(taskId1);
      expect(split1.totalShares).to.equal(100);
      
      const split2 = await paymentSplitter.getSplit(taskId2);
      expect(split2.taskId).to.equal(taskId2);
      expect(split2.totalShares).to.equal(100);
      
      // Verify they're independent (different payees)
      expect(await paymentSplitter.pendingPayment(taskId1, addr1.address)).to.be.gt(0);
      expect(await paymentSplitter.pendingPayment(taskId2, addr2.address)).to.be.gt(0);
      expect(await paymentSplitter.pendingPayment(taskId1, addr2.address)).to.equal(0);
      expect(await paymentSplitter.pendingPayment(taskId2, addr1.address)).to.equal(0);
    });

    it("Should handle uneven share distributions", async function () {
      const taskId = ethers.keccak256(ethers.toUtf8Bytes("task1"));
      const payees = [addr1.address, addr2.address, addr3.address];
      const shares = [10, 30, 60]; // 10%, 30%, 60%
      const totalAmount = ethers.parseEther("1.0");
      
      await paymentSplitter.createSplit(taskId, payees, shares, false, ethers.ZeroAddress, { value: totalAmount });
      
      await paymentSplitter.release(taskId, addr1.address);
      await paymentSplitter.release(taskId, addr2.address);
      await paymentSplitter.release(taskId, addr3.address);
      
      expect(await paymentSplitter.pendingPayment(taskId, addr1.address)).to.equal(0);
      expect(await paymentSplitter.pendingPayment(taskId, addr2.address)).to.equal(0);
      expect(await paymentSplitter.pendingPayment(taskId, addr3.address)).to.equal(0);
    });
  });
});
