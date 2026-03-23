// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title AgentRegistry
 * @notice On-chain registry for AI agent discovery and coordination
 */
contract AgentRegistry is Ownable(msg.sender), ReentrancyGuard {
    
    struct Agent {
        address owner;
        string name;
        string metadataURI;
        string[] capabilities;
        uint256 reputation;
        bool active;
        uint256 registeredAt;
    }
    
    mapping(bytes32 => Agent) public agents;
    mapping(address => bytes32[]) public ownerAgents;
    bytes32[] public allAgentIds;
    
    event AgentRegistered(bytes32 indexed agentId, address indexed owner, string name);
    event AgentUpdated(bytes32 indexed agentId, string metadataURI);
    event AgentDeactivated(bytes32 indexed agentId);
    event AgentReactivated(bytes32 indexed agentId);
    event ReputationUpdated(bytes32 indexed agentId, uint256 newReputation);
    
    modifier onlyAgentOwner(bytes32 agentId) {
        require(agents[agentId].owner == msg.sender, "Not agent owner");
        _;
    }
    
    function registerAgent(
        string memory name,
        string memory metadataURI,
        string[] memory capabilities
    ) external returns (bytes32) {
        bytes32 agentId = keccak256(abi.encodePacked(msg.sender, name, block.timestamp));
        
        require(agents[agentId].owner == address(0), "Agent exists");
        
        agents[agentId] = Agent({
            owner: msg.sender,
            name: name,
            metadataURI: metadataURI,
            capabilities: capabilities,
            reputation: 0,
            active: true,
            registeredAt: block.timestamp
        });
        
        ownerAgents[msg.sender].push(agentId);
        allAgentIds.push(agentId);
        
        emit AgentRegistered(agentId, msg.sender, name);
        return agentId;
    }
    
    function updateAgentMetadata(
        bytes32 agentId,
        string memory metadataURI
    ) external onlyAgentOwner(agentId) {
        require(agents[agentId].active, "Agent inactive");
        agents[agentId].metadataURI = metadataURI;
        emit AgentUpdated(agentId, metadataURI);
    }
    
    function deactivateAgent(bytes32 agentId) external onlyAgentOwner(agentId) {
        agents[agentId].active = false;
        emit AgentDeactivated(agentId);
    }
    
    function reactivateAgent(bytes32 agentId) external onlyAgentOwner(agentId) {
        agents[agentId].active = true;
        emit AgentReactivated(agentId);
    }
    
    function addReputation(bytes32 agentId, uint256 amount) external onlyOwner {
        agents[agentId].reputation += amount;
        emit ReputationUpdated(agentId, agents[agentId].reputation);
    }
    
    function getAgent(bytes32 agentId) external view returns (Agent memory) {
        return agents[agentId];
    }
    
    function getAgentCount() external view returns (uint256) {
        return allAgentIds.length;
    }
    
    function getAgentsByOwner(address owner) external view returns (bytes32[] memory) {
        return ownerAgents[owner];
    }
}
