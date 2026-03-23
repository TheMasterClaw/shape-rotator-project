// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./AgentRegistry.sol";

/**
 * @title AgentCoordinationDAO
 * @notice Governance contract for decentralized protocol decisions
 */
contract AgentCoordinationDAO is Ownable(msg.sender), ReentrancyGuard {
    
    enum ProposalState { Pending, Active, Canceled, Defeated, Succeeded, Queued, Executed, Expired }
    enum VoteType { Against, For, Abstain }
    
    struct Proposal {
        bytes32 proposalId;
        address proposer;
        string title;
        string description;
        bytes callData;
        address target;
        uint256 forVotes;
        uint256 againstVotes;
        uint256 abstainVotes;
        uint256 startBlock;
        uint256 endBlock;
        bool executed;
        bool canceled;
        mapping(address => bool) hasVoted;
        mapping(address => VoteType) voteChoice;
    }
    
    struct ProposalView {
        bytes32 proposalId;
        address proposer;
        string title;
        string description;
        uint256 forVotes;
        uint256 againstVotes;
        uint256 abstainVotes;
        uint256 startBlock;
        uint256 endBlock;
        bool executed;
        bool canceled;
        ProposalState state;
    }
    
    mapping(bytes32 => Proposal) public proposals;
    bytes32[] public proposalIds;
    
    // Governance parameters
    uint256 public votingDelay = 1; // blocks
    uint256 public votingPeriod = 40320; // ~7 days @ 15s blocks
    uint256 public proposalThreshold = 1000e18; // 1000 tokens
    uint256 public quorumVotes = 100000e18; // 100k tokens
    
    IERC20 public governanceToken;
    AgentRegistry public agentRegistry;
    
    mapping(address => address) public delegates;
    mapping(address => uint256) public votingPower;
    
    event ProposalCreated(
        bytes32 indexed proposalId,
        address indexed proposer,
        string title,
        uint256 startBlock,
        uint256 endBlock
    );
    
    event VoteCast(
        address indexed voter,
        bytes32 indexed proposalId,
        uint8 voteType,
        uint256 votes
    );
    
    event ProposalExecuted(bytes32 indexed proposalId);
    event ProposalCanceled(bytes32 indexed proposalId);
    event DelegateChanged(address indexed delegator, address indexed fromDelegate, address indexed toDelegate);
    
    modifier onlyTokenHolders() {
        require(governanceToken.balanceOf(msg.sender) >= proposalThreshold, "Below proposal threshold");
        _;
    }
    
    constructor(address _governanceToken, address _agentRegistry) {
        governanceToken = IERC20(_governanceToken);
        agentRegistry = AgentRegistry(_agentRegistry);
    }
    
    function propose(
        string memory title,
        string memory description,
        address target,
        bytes memory callData
    ) external onlyTokenHolders returns (bytes32) {
        bytes32 proposalId = keccak256(abi.encodePacked(msg.sender, title, block.timestamp));
        
        require(proposals[proposalId].proposer == address(0), "Proposal exists");
        
        uint256 startBlock = block.number + votingDelay;
        uint256 endBlock = startBlock + votingPeriod;
        
        Proposal storage newProposal = proposals[proposalId];
        newProposal.proposalId = proposalId;
        newProposal.proposer = msg.sender;
        newProposal.title = title;
        newProposal.description = description;
        newProposal.callData = callData;
        newProposal.target = target;
        newProposal.startBlock = startBlock;
        newProposal.endBlock = endBlock;
        
        proposalIds.push(proposalId);
        
        emit ProposalCreated(proposalId, msg.sender, title, startBlock, endBlock);
        return proposalId;
    }
    
    function castVote(bytes32 proposalId, uint8 voteType) external {
        require(voteType <= 2, "Invalid vote type");
        require(state(proposalId) == ProposalState.Active, "Voting not active");
        
        Proposal storage proposal = proposals[proposalId];
        require(!proposal.hasVoted[msg.sender], "Already voted");
        
        uint256 votes = getVotes(msg.sender);
        require(votes > 0, "No voting power");
        
        proposal.hasVoted[msg.sender] = true;
        proposal.voteChoice[msg.sender] = VoteType(voteType);
        
        if (voteType == 0) {
            proposal.againstVotes += votes;
        } else if (voteType == 1) {
            proposal.forVotes += votes;
        } else {
            proposal.abstainVotes += votes;
        }
        
        emit VoteCast(msg.sender, proposalId, voteType, votes);
    }
    
    function execute(bytes32 proposalId) external onlyOwner nonReentrant {
        require(state(proposalId) == ProposalState.Succeeded, "Proposal not succeeded");
        
        Proposal storage proposal = proposals[proposalId];
        proposal.executed = true;
        
        (bool success, ) = proposal.target.call(proposal.callData);
        require(success, "Execution failed");
        
        emit ProposalExecuted(proposalId);
    }
    
    function cancel(bytes32 proposalId) external {
        Proposal storage proposal = proposals[proposalId];
        require(msg.sender == proposal.proposer || msg.sender == owner(), "Not authorized");
        require(state(proposalId) != ProposalState.Executed, "Already executed");
        
        proposal.canceled = true;
        emit ProposalCanceled(proposalId);
    }
    
    function delegate(address delegatee) external {
        address currentDelegate = delegates[msg.sender];
        uint256 delegatorBalance = governanceToken.balanceOf(msg.sender);
        
        delegates[msg.sender] = delegatee;
        
        if (currentDelegate != address(0)) {
            votingPower[currentDelegate] -= delegatorBalance;
        }
        
        if (delegatee != address(0)) {
            votingPower[delegatee] += delegatorBalance;
        }
        
        emit DelegateChanged(msg.sender, currentDelegate, delegatee);
    }
    
    function state(bytes32 proposalId) public view returns (ProposalState) {
        Proposal storage proposal = proposals[proposalId];
        
        if (proposal.canceled) return ProposalState.Canceled;
        if (proposal.executed) return ProposalState.Executed;
        if (block.number <= proposal.startBlock) return ProposalState.Pending;
        if (block.number <= proposal.endBlock) return ProposalState.Active;
        if (proposal.forVotes <= proposal.againstVotes) return ProposalState.Defeated;
        if (proposal.forVotes + proposal.againstVotes + proposal.abstainVotes < quorumVotes) return ProposalState.Defeated;
        
        return ProposalState.Succeeded;
    }
    
    function getVotes(address account) public view returns (uint256) {
        if (delegates[account] != address(0)) {
            return 0; // Delegated voting power
        }
        return governanceToken.balanceOf(account) + votingPower[account];
    }
    
    function getProposal(bytes32 proposalId) external view returns (ProposalView memory) {
        Proposal storage p = proposals[proposalId];
        return ProposalView({
            proposalId: p.proposalId,
            proposer: p.proposer,
            title: p.title,
            description: p.description,
            forVotes: p.forVotes,
            againstVotes: p.againstVotes,
            abstainVotes: p.abstainVotes,
            startBlock: p.startBlock,
            endBlock: p.endBlock,
            executed: p.executed,
            canceled: p.canceled,
            state: state(proposalId)
        });
    }
    
    function getProposalCount() external view returns (uint256) {
        return proposalIds.length;
    }
    
    function getProposals(uint256 offset, uint256 limit) external view returns (ProposalView[] memory) {
        uint256 end = offset + limit;
        if (end > proposalIds.length) end = proposalIds.length;
        
        ProposalView[] memory result = new ProposalView[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            result[i - offset] = this.getProposal(proposalIds[i]);
        }
        return result;
    }
    
    function hasVoted(bytes32 proposalId, address account) external view returns (bool) {
        return proposals[proposalId].hasVoted[account];
    }
    
    function updateVotingDelay(uint256 newVotingDelay) external onlyOwner {
        votingDelay = newVotingDelay;
    }
    
    function updateVotingPeriod(uint256 newVotingPeriod) external onlyOwner {
        votingPeriod = newVotingPeriod;
    }
    
    function updateProposalThreshold(uint256 newThreshold) external onlyOwner {
        proposalThreshold = newThreshold;
    }
    
    function updateQuorumVotes(uint256 newQuorum) external onlyOwner {
        quorumVotes = newQuorum;
    }
}
