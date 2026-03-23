// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./AgentRegistry.sol";

/**
 * @title ReputationVault
 * @notice On-chain reputation system for AI agents
 */
contract ReputationVault is Ownable(msg.sender) {
    
    struct ReputationScore {
        uint256 totalScore;
        uint256 taskCompleted;
        uint256 taskFailed;
        uint256 ratingSum;
        uint256 ratingCount;
        uint256 lastUpdated;
    }
    
    mapping(bytes32 => ReputationScore) public reputations;
    mapping(bytes32 => mapping(address => bool)) public hasRated;
    
    AgentRegistry public agentRegistry;
    
    uint256 public constant MAX_RATING = 5;
    uint256 public constant REPUTATION_DECAY_DAYS = 90;
    
    event ReputationUpdated(bytes32 indexed agentId, uint256 newScore, string reason);
    event TaskCompleted(bytes32 indexed agentId, bytes32 indexed taskId);
    event TaskFailed(bytes32 indexed agentId, bytes32 indexed taskId);
    event Rated(bytes32 indexed agentId, address indexed rater, uint256 rating);
    
    constructor(address _agentRegistry) {
        agentRegistry = AgentRegistry(_agentRegistry);
    }
    
    function recordTaskCompletion(bytes32 agentId, bytes32 taskId) external onlyOwner {
        ReputationScore storage rep = reputations[agentId];
        rep.taskCompleted++;
        rep.totalScore += 10;
        rep.lastUpdated = block.timestamp;
        
        emit TaskCompleted(agentId, taskId);
        emit ReputationUpdated(agentId, rep.totalScore, "Task completed");
    }
    
    function recordTaskFailure(bytes32 agentId, bytes32 taskId) external onlyOwner {
        ReputationScore storage rep = reputations[agentId];
        rep.taskFailed++;
        if (rep.totalScore >= 5) {
            rep.totalScore -= 5;
        }
        rep.lastUpdated = block.timestamp;
        
        emit TaskFailed(agentId, taskId);
        emit ReputationUpdated(agentId, rep.totalScore, "Task failed");
    }
    
    function rateAgent(bytes32 agentId, uint256 rating) external {
        require(rating > 0 && rating <= MAX_RATING, "Invalid rating");
        require(!hasRated[agentId][msg.sender], "Already rated");
        
        AgentRegistry.Agent memory agent = agentRegistry.getAgent(agentId);
        require(agent.owner != msg.sender, "Cannot rate own agent");
        require(agent.active, "Agent inactive");
        
        ReputationScore storage rep = reputations[agentId];
        rep.ratingSum += rating;
        rep.ratingCount++;
        rep.totalScore += rating * 2;
        rep.lastUpdated = block.timestamp;
        hasRated[agentId][msg.sender] = true;
        
        emit Rated(agentId, msg.sender, rating);
        emit ReputationUpdated(agentId, rep.totalScore, "New rating");
    }
    
    function getReputation(bytes32 agentId) external view returns (ReputationScore memory) {
        return reputations[agentId];
    }
    
    function getAverageRating(bytes32 agentId) external view returns (uint256) {
        ReputationScore memory rep = reputations[agentId];
        if (rep.ratingCount == 0) return 0;
        return rep.ratingSum / rep.ratingCount;
    }
    
    function getSuccessRate(bytes32 agentId) external view returns (uint256) {
        ReputationScore memory rep = reputations[agentId];
        uint256 total = rep.taskCompleted + rep.taskFailed;
        if (total == 0) return 0;
        return (rep.taskCompleted * 100) / total;
    }
}
