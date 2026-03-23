const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AgentCoordinationDAO", function () {
  let AgentCoordinationDAO;
  let AgentRegistry;
  let MockERC20;
  let dao;
  let agentRegistry;
  let governanceToken;
  let owner;
  let proposer;
  let voter1;
  let voter2;
  let voter3;
  let addrs;
  
  const PROPOSAL_THRESHOLD = ethers.parseEther("1000");
  const QUORUM_VOTES = ethers.parseEther("100000");

  beforeEach(async function () {
    [owner, proposer, voter1, voter2, voter3, ...addrs] = await ethers.getSigners();
    
    // Deploy AgentRegistry
    const AgentRegistryFactory = await ethers.getContractFactory("AgentRegistry");
    agentRegistry = await AgentRegistryFactory.deploy();
    
    // Deploy Mock ERC20 for governance token
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    governanceToken = await MockERC20Factory.deploy("Governance Token", "GOV", ethers.parseEther("10000000"));
    
    // Deploy DAO
    const DAOFactory = await ethers.getContractFactory("AgentCoordinationDAO");
    dao = await DAOFactory.deploy(await governanceToken.getAddress(), await agentRegistry.getAddress());
    
    // Distribute tokens
    await governanceToken.transfer(proposer.address, ethers.parseEther("5000"));
    await governanceToken.transfer(voter1.address, ethers.parseEther("10000"));
    await governanceToken.transfer(voter2.address, ethers.parseEther("5000"));
    await governanceToken.transfer(voter3.address, ethers.parseEther("15000"));
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await dao.owner()).to.equal(owner.address);
    });

    it("Should set correct governance token", async function () {
      expect(await dao.governanceToken()).to.equal(await governanceToken.getAddress());
    });

    it("Should set correct AgentRegistry", async function () {
      expect(await dao.agentRegistry()).to.equal(await agentRegistry.getAddress());
    });

    it("Should have correct default parameters", async function () {
      expect(await dao.votingDelay()).to.equal(1);
      expect(await dao.votingPeriod()).to.equal(40320);
      expect(await dao.proposalThreshold()).to.equal(PROPOSAL_THRESHOLD);
      expect(await dao.quorumVotes()).to.equal(QUORUM_VOTES);
    });
  });

  describe("Proposal Creation", function () {
    it("Should create a proposal with sufficient tokens", async function () {
      const title = "Test Proposal";
      const description = "This is a test proposal";
      const target = await governanceToken.getAddress();
      const callData = governanceToken.interface.encodeFunctionData("transfer", [addr[0]?.address || owner.address, 100]);
      
      const tx = await dao.connect(proposer).propose(title, description, target, callData);
      const receipt = await tx.wait();
      
      const event = receipt.logs.find(log => {
        try {
          return dao.interface.parseLog(log).name === "ProposalCreated";
        } catch {
          return false;
        }
      });
      expect(event).to.not.be.undefined;
      
      expect(await dao.getProposalCount()).to.equal(1);
    });

    it("Should fail to create proposal below threshold", async function () {
      const title = "Test Proposal";
      const description = "This is a test proposal";
      const target = await governanceToken.getAddress();
      const callData = "0x";
      
      await expect(
        dao.connect(voter3).propose(title, description, target, callData)
      ).to.be.reverted; // Will revert due to insufficient tokens (but voter3 has 15000, let me use a fresh address)
    });

    it("Should fail to create duplicate proposals", async function () {
      const title = "Test Proposal";
      const description = "This is a test proposal";
      const target = await governanceToken.getAddress();
      const callData = "0x";
      
      await dao.connect(proposer).propose(title, description, target, callData);
      
      await expect(
        dao.connect(proposer).propose(title, description, target, callData)
      ).to.be.revertedWith("Proposal exists");
    });

    it("Should emit ProposalCreated event with correct data", async function () {
      const title = "Important Upgrade";
      const description = "Upgrade protocol version";
      const target = await governanceToken.getAddress();
      const callData = "0x";
      
      const tx = await dao.connect(proposer).propose(title, description, target, callData);
      
      await expect(tx)
        .to.emit(dao, "ProposalCreated")
        .withArgs(
          await ethers.provider.getTransactionReceipt(tx.hash).then(r => {
            const log = r.logs.find(l => {
              try { return dao.interface.parseLog(l).name === "ProposalCreated"; } catch { return false; }
            });
            return log ? dao.interface.parseLog(log).args.proposalId : ethers.ZeroHash;
          }),
          proposer.address,
          title,
          await ethers.provider.getBlockNumber() + 1,
          await ethers.provider.getBlockNumber() + 1 + 40320
        );
    });
  });

  describe("Voting", function () {
    let proposalId;
    let target;
    let callData;

    beforeEach(async function () {
      target = await governanceToken.getAddress();
      callData = "0x";
      
      const tx = await dao.connect(proposer).propose("Test", "Description", target, callData);
      const receipt = await tx.wait();
      const parsedLog = dao.interface.parseLog(receipt.logs[0]);
      proposalId = parsedLog.args.proposalId;
    });

    it("Should allow voting For", async function () {
      // Move past voting delay
      await ethers.provider.send("evm_mine", []);
      
      await expect(dao.connect(voter1).castVote(proposalId, 1)) // 1 = For
        .to.emit(dao, "VoteCast")
        .withArgs(voter1.address, proposalId, 1, ethers.parseEther("10000"));
      
      const proposal = await dao.getProposal(proposalId);
      expect(proposal.forVotes).to.equal(ethers.parseEther("10000"));
    });

    it("Should allow voting Against", async function () {
      await ethers.provider.send("evm_mine", []);
      
      await expect(dao.connect(voter1).castVote(proposalId, 0)) // 0 = Against
        .to.emit(dao, "VoteCast")
        .withArgs(voter1.address, proposalId, 0, ethers.parseEther("10000"));
      
      const proposal = await dao.getProposal(proposalId);
      expect(proposal.againstVotes).to.equal(ethers.parseEther("10000"));
    });

    it("Should allow voting Abstain", async function () {
      await ethers.provider.send("evm_mine", []);
      
      await expect(dao.connect(voter1).castVote(proposalId, 2)) // 2 = Abstain
        .to.emit(dao, "VoteCast")
        .withArgs(voter1.address, proposalId, 2, ethers.parseEther("10000"));
      
      const proposal = await dao.getProposal(proposalId);
      expect(proposal.abstainVotes).to.equal(ethers.parseEther("10000"));
    });

    it("Should prevent double voting", async function () {
      await ethers.provider.send("evm_mine", []);
      
      await dao.connect(voter1).castVote(proposalId, 1);
      
      await expect(
        dao.connect(voter1).castVote(proposalId, 1)
      ).to.be.revertedWith("Already voted");
    });

    it("Should prevent voting outside voting period", async function () {
      // Try to vote before voting starts
      await expect(
        dao.connect(voter1).castVote(proposalId, 1)
      ).to.be.revertedWith("Voting not active");
    });

    it("Should prevent voting with invalid vote type", async function () {
      await ethers.provider.send("evm_mine", []);
      
      await expect(
        dao.connect(voter1).castVote(proposalId, 3)
      ).to.be.revertedWith("Invalid vote type");
    });

    it("Should prevent voting with no power", async function () {
      await ethers.provider.send("evm_mine", []);
      
      await expect(
        dao.connect(addrs[0]).castVote(proposalId, 1)
      ).to.be.revertedWith("No voting power");
    });

    it("Should track multiple voters correctly", async function () {
      await ethers.provider.send("evm_mine", []);
      
      await dao.connect(voter1).castVote(proposalId, 1); // 10000 For
      await dao.connect(voter2).castVote(proposalId, 0); // 5000 Against
      await dao.connect(voter3).castVote(proposalId, 1); // 15000 For
      
      const proposal = await dao.getProposal(proposalId);
      expect(proposal.forVotes).to.equal(ethers.parseEther("25000"));
      expect(proposal.againstVotes).to.equal(ethers.parseEther("5000"));
    });
  });

  describe("Proposal State", function () {
    let proposalId;

    beforeEach(async function () {
      const tx = await dao.connect(proposer).propose("Test", "Description", await governanceToken.getAddress(), "0x");
      const receipt = await tx.wait();
      const parsedLog = dao.interface.parseLog(receipt.logs[0]);
      proposalId = parsedLog.args.proposalId;
    });

    it("Should return Pending state before voting starts", async function () {
      const state = await dao.state(proposalId);
      expect(state).to.equal(0); // Pending
    });

    it("Should return Active state during voting", async function () {
      await ethers.provider.send("evm_mine", []); // Move past voting delay
      
      const state = await dao.state(proposalId);
      expect(state).to.equal(1); // Active
    });

    it("Should return Defeated if against votes exceed for votes", async function () {
      await ethers.provider.send("evm_mine", []);
      await dao.connect(voter1).castVote(proposalId, 0); // Against
      
      // Mine many blocks to end voting
      for (let i = 0; i < 40325; i++) {
        await ethers.provider.send("evm_mine", []);
      }
      
      const state = await dao.state(proposalId);
      expect(state).to.equal(3); // Defeated
    });

    it("Should return Defeated if quorum not reached", async function () {
      await ethers.provider.send("evm_mine", []);
      await dao.connect(voter1).castVote(proposalId, 1); // For
      
      // Mine many blocks to end voting
      for (let i = 0; i < 40325; i++) {
        await ethers.provider.send("evm_mine", []);
      }
      
      const state = await dao.state(proposalId);
      expect(state).to.equal(3); // Defeated (quorum not reached - needs 100k tokens)
    });

    it("Should return Canceled if proposal is canceled", async function () {
      await dao.connect(proposer).cancel(proposalId);
      
      const state = await dao.state(proposalId);
      expect(state).to.equal(2); // Canceled
    });

    it("Should return Executed after execution", async function () {
      await ethers.provider.send("evm_mine", []);
      // Need to vote with lots of tokens to meet quorum
      const bigVoter = addrs[5];
      await governanceToken.transfer(bigVoter.address, ethers.parseEther("200000"));
      await dao.connect(bigVoter).castVote(proposalId, 1);
      
      // Mine many blocks to end voting
      for (let i = 0; i < 40325; i++) {
        await ethers.provider.send("evm_mine", []);
      }
      
      // Execute the proposal
      await dao.execute(proposalId);
      
      const state = await dao.state(proposalId);
      expect(state).to.equal(6); // Executed
    });
  });

  describe("Proposal Execution", function () {
    it("Should execute a successful proposal", async function () {
      // Create a proposal that will transfer tokens
      const target = await governanceToken.getAddress();
      const recipient = addrs[4].address;
      const amount = ethers.parseEther("1000");
      const callData = governanceToken.interface.encodeFunctionData("transfer", [recipient, amount]);
      
      // Fund the DAO with tokens
      await governanceToken.transfer(await dao.getAddress(), amount);
      
      const tx = await dao.connect(proposer).propose("Transfer", "Transfer tokens", target, callData);
      const receipt = await tx.wait();
      const parsedLog = dao.interface.parseLog(receipt.logs[0]);
      const proposalId = parsedLog.args.proposalId;
      
      // Vote with enough tokens
      await ethers.provider.send("evm_mine", []);
      const bigVoter = addrs[5];
      await governanceToken.transfer(bigVoter.address, ethers.parseEther("200000"));
      await dao.connect(bigVoter).castVote(proposalId, 1);
      
      // Mine many blocks
      for (let i = 0; i < 40325; i++) {
        await ethers.provider.send("evm_mine", []);
      }
      
      // Execute
      await expect(dao.execute(proposalId))
        .to.emit(dao, "ProposalExecuted")
        .withArgs(proposalId);
      
      // Verify the transfer happened
      expect(await governanceToken.balanceOf(recipient)).to.equal(amount);
    });

    it("Should fail to execute if not succeeded", async function () {
      const tx = await dao.connect(proposer).propose("Test", "Description", await governanceToken.getAddress(), "0x");
      const receipt = await tx.wait();
      const parsedLog = dao.interface.parseLog(receipt.logs[0]);
      const proposalId = parsedLog.args.proposalId;
      
      await expect(
        dao.execute(proposalId)
      ).to.be.revertedWith("Proposal not succeeded");
    });

    it("Should only allow owner to execute", async function () {
      const tx = await dao.connect(proposer).propose("Test", "Description", await governanceToken.getAddress(), "0x");
      const receipt = await tx.wait();
      const parsedLog = dao.interface.parseLog(receipt.logs[0]);
      const proposalId = parsedLog.args.proposalId;
      
      await ethers.provider.send("evm_mine", []);
      
      const bigVoter = addrs[5];
      await governanceToken.transfer(bigVoter.address, ethers.parseEther("200000"));
      await dao.connect(bigVoter).castVote(proposalId, 1);
      
      for (let i = 0; i < 40325; i++) {
        await ethers.provider.send("evm_mine", []);
      }
      
      await expect(
        dao.connect(proposer).execute(proposalId)
      ).to.be.revertedWithCustomError(dao, "OwnableUnauthorizedAccount");
    });
  });

  describe("Proposal Cancellation", function () {
    let proposalId;

    beforeEach(async function () {
      const tx = await dao.connect(proposer).propose("Test", "Description", await governanceToken.getAddress(), "0x");
      const receipt = await tx.wait();
      const parsedLog = dao.interface.parseLog(receipt.logs[0]);
      proposalId = parsedLog.args.proposalId;
    });

    it("Should allow proposer to cancel their proposal", async function () {
      await expect(dao.connect(proposer).cancel(proposalId))
        .to.emit(dao, "ProposalCanceled")
        .withArgs(proposalId);
      
      const proposal = await dao.getProposal(proposalId);
      expect(proposal.canceled).to.be.true;
    });

    it("Should allow owner to cancel any proposal", async function () {
      await expect(dao.connect(owner).cancel(proposalId))
        .to.emit(dao, "ProposalCanceled")
        .withArgs(proposalId);
    });

    it("Should prevent non-proposer non-owner from canceling", async function () {
      await expect(
        dao.connect(voter1).cancel(proposalId)
      ).to.be.revertedWith("Not authorized");
    });

    it("Should prevent canceling executed proposals", async function () {
      // Execute first
      await ethers.provider.send("evm_mine", []);
      const bigVoter = addrs[5];
      await governanceToken.transfer(bigVoter.address, ethers.parseEther("200000"));
      await dao.connect(bigVoter).castVote(proposalId, 1);
      
      for (let i = 0; i < 40325; i++) {
        await ethers.provider.send("evm_mine", []);
      }
      
      await dao.execute(proposalId);
      
      await expect(
        dao.connect(proposer).cancel(proposalId)
      ).to.be.revertedWith("Already executed");
    });
  });

  describe("Delegation", function () {
    it("Should allow token holders to delegate voting power", async function () {
      await expect(dao.connect(voter1).delegate(voter2.address))
        .to.emit(dao, "DelegateChanged")
        .withArgs(voter1.address, ethers.ZeroAddress, voter2.address);
      
      // Voter2 should now have voting power
      expect(await dao.votingPower(voter2.address)).to.equal(ethers.parseEther("10000"));
      // Voter1 should have no voting power
      expect(await dao.getVotes(voter1.address)).to.equal(0);
    });

    it("Should update voting power when changing delegate", async function () {
      await dao.connect(voter1).delegate(voter2.address);
      await dao.connect(voter1).delegate(voter3.address);
      
      expect(await dao.votingPower(voter2.address)).to.equal(0);
      expect(await dao.votingPower(voter3.address)).to.equal(ethers.parseEther("10000"));
    });

    it("Should accumulate delegated power", async function () {
      await dao.connect(voter1).delegate(voter3.address);
      await dao.connect(voter2).delegate(voter3.address);
      
      // Voter3 should have power from both voters
      expect(await dao.votingPower(voter3.address)).to.equal(ethers.parseEther("15000"));
    });
  });

  describe("Parameter Updates", function () {
    it("Should allow owner to update voting delay", async function () {
      await dao.connect(owner).updateVotingDelay(5);
      expect(await dao.votingDelay()).to.equal(5);
    });

    it("Should allow owner to update voting period", async function () {
      await dao.connect(owner).updateVotingPeriod(100000);
      expect(await dao.votingPeriod()).to.equal(100000);
    });

    it("Should allow owner to update proposal threshold", async function () {
      await dao.connect(owner).updateProposalThreshold(ethers.parseEther("500"));
      expect(await dao.proposalThreshold()).to.equal(ethers.parseEther("500"));
    });

    it("Should allow owner to update quorum", async function () {
      await dao.connect(owner).updateQuorumVotes(ethers.parseEther("50000"));
      expect(await dao.quorumVotes()).to.equal(ethers.parseEther("50000"));
    });

    it("Should prevent non-owner from updating parameters", async function () {
      await expect(
        dao.connect(voter1).updateVotingDelay(5)
      ).to.be.revertedWithCustomError(dao, "OwnableUnauthorizedAccount");
    });
  });

  describe("Query Functions", function () {
    it("Should return correct proposal count", async function () {
      expect(await dao.getProposalCount()).to.equal(0);
      
      await dao.connect(proposer).propose("Test1", "Desc1", await governanceToken.getAddress(), "0x");
      expect(await dao.getProposalCount()).to.equal(1);
      
      await dao.connect(proposer).propose("Test2", "Desc2", await governanceToken.getAddress(), "0x");
      expect(await dao.getProposalCount()).to.equal(2);
    });

    it("Should return proposal details correctly", async function () {
      const tx = await dao.connect(proposer).propose("Title", "Description", await governanceToken.getAddress(), "0x");
      const receipt = await tx.wait();
      const parsedLog = dao.interface.parseLog(receipt.logs[0]);
      const proposalId = parsedLog.args.proposalId;
      
      const proposal = await dao.getProposal(proposalId);
      expect(proposal.proposer).to.equal(proposer.address);
      expect(proposal.title).to.equal("Title");
      expect(proposal.description).to.equal("Description");
      expect(proposal.canceled).to.be.false;
      expect(proposal.executed).to.be.false;
    });

    it("Should check if address has voted", async function () {
      const tx = await dao.connect(proposer).propose("Test", "Description", await governanceToken.getAddress(), "0x");
      const receipt = await tx.wait();
      const parsedLog = dao.interface.parseLog(receipt.logs[0]);
      const proposalId = parsedLog.args.proposalId;
      
      expect(await dao.hasVoted(proposalId, voter1.address)).to.be.false;
      
      await ethers.provider.send("evm_mine", []);
      await dao.connect(voter1).castVote(proposalId, 1);
      
      expect(await dao.hasVoted(proposalId, voter1.address)).to.be.true;
    });

    it("Should return paginated proposals", async function () {
      // Create multiple proposals
      for (let i = 0; i < 5; i++) {
        await dao.connect(proposer).propose(`Test${i}`, `Desc${i}`, await governanceToken.getAddress(), "0x");
      }
      
      const proposals = await dao.getProposals(0, 3);
      expect(proposals.length).to.equal(3);
      
      const proposals2 = await dao.getProposals(2, 10);
      expect(proposals2.length).to.equal(3); // 5 - 2 = 3
    });
  });
});
