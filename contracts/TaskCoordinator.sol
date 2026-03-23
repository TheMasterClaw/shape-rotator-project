// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./AgentRegistry.sol";

/**
 * @title TaskCoordinator
 * @notice Manages multi-agent task coordination and workflow
 */
contract TaskCoordinator is Ownable(msg.sender), ReentrancyGuard {
    
    enum TaskStatus { Open, Assigned, InProgress, Completed, Cancelled }
    
    struct Task {
        bytes32 taskId;
        address creator;
        string description;
        bytes32[] requiredCapabilities;
        uint256 reward;
        address rewardToken;
        TaskStatus status;
        bytes32[] assignedAgents;
        uint256 createdAt;
        uint256 deadline;
    }
    
    mapping(bytes32 => Task) public tasks;
    mapping(bytes32 => mapping(bytes32 => bool)) public agentApplications;
    bytes32[] public allTaskIds;
    
    AgentRegistry public agentRegistry;
    
    event TaskCreated(bytes32 indexed taskId, address indexed creator, uint256 reward);
    event TaskApplied(bytes32 indexed taskId, bytes32 indexed agentId);
    event TaskAssigned(bytes32 indexed taskId, bytes32[] agentIds);
    event TaskStarted(bytes32 indexed taskId);
    event TaskCompleted(bytes32 indexed taskId);
    event TaskCancelled(bytes32 indexed taskId);
    
    constructor(address _agentRegistry) {
        agentRegistry = AgentRegistry(_agentRegistry);
    }
    
    function createTask(
        string memory description,
        bytes32[] memory requiredCapabilities,
        uint256 reward,
        address rewardToken,
        uint256 deadline
    ) external payable returns (bytes32) {
        bytes32 taskId = keccak256(abi.encodePacked(msg.sender, description, block.timestamp));
        
        require(tasks[taskId].creator == address(0), "Task exists");
        require(deadline > block.timestamp, "Invalid deadline");
        
        if (rewardToken == address(0)) {
            require(msg.value == reward, "Incorrect ETH sent");
        } else {
            IERC20(rewardToken).transferFrom(msg.sender, address(this), reward);
        }
        
        tasks[taskId] = Task({
            taskId: taskId,
            creator: msg.sender,
            description: description,
            requiredCapabilities: requiredCapabilities,
            reward: reward,
            rewardToken: rewardToken,
            status: TaskStatus.Open,
            assignedAgents: new bytes32[](0),
            createdAt: block.timestamp,
            deadline: deadline
        });
        
        allTaskIds.push(taskId);
        emit TaskCreated(taskId, msg.sender, reward);
        return taskId;
    }
    
    function applyForTask(bytes32 taskId, bytes32 agentId) external {
        Task storage task = tasks[taskId];
        require(task.status == TaskStatus.Open, "Task not open");
        require(block.timestamp < task.deadline, "Deadline passed");
        
        AgentRegistry.Agent memory agent = agentRegistry.getAgent(agentId);
        require(agent.owner == msg.sender, "Not agent owner");
        require(agent.active, "Agent inactive");
        
        agentApplications[taskId][agentId] = true;
        emit TaskApplied(taskId, agentId);
    }
    
    function assignAgents(bytes32 taskId, bytes32[] memory agentIds) external {
        Task storage task = tasks[taskId];
        require(task.creator == msg.sender, "Not task creator");
        require(task.status == TaskStatus.Open, "Task not open");
        
        for (uint i = 0; i < agentIds.length; i++) {
            require(agentApplications[taskId][agentIds[i]], "Agent did not apply");
        }
        
        task.assignedAgents = agentIds;
        task.status = TaskStatus.Assigned;
        emit TaskAssigned(taskId, agentIds);
    }
    
    function startTask(bytes32 taskId) external {
        Task storage task = tasks[taskId];
        require(task.status == TaskStatus.Assigned, "Task not assigned");
        
        bool isAssignedAgent = false;
        for (uint i = 0; i < task.assignedAgents.length; i++) {
            AgentRegistry.Agent memory agent = agentRegistry.getAgent(task.assignedAgents[i]);
            if (agent.owner == msg.sender) {
                isAssignedAgent = true;
                break;
            }
        }
        require(isAssignedAgent, "Not assigned agent");
        
        task.status = TaskStatus.InProgress;
        emit TaskStarted(taskId);
    }
    
    function completeTask(bytes32 taskId) external {
        Task storage task = tasks[taskId];
        require(task.creator == msg.sender, "Not task creator");
        require(task.status == TaskStatus.InProgress, "Task not in progress");
        
        task.status = TaskStatus.Completed;
        
        // Distribute rewards
        uint256 rewardPerAgent = task.reward / task.assignedAgents.length;
        for (uint i = 0; i < task.assignedAgents.length; i++) {
            AgentRegistry.Agent memory agent = agentRegistry.getAgent(task.assignedAgents[i]);
            if (task.rewardToken == address(0)) {
                payable(agent.owner).transfer(rewardPerAgent);
            } else {
                IERC20(task.rewardToken).transfer(agent.owner, rewardPerAgent);
            }
        }
        
        emit TaskCompleted(taskId);
    }
    
    function getTask(bytes32 taskId) external view returns (Task memory) {
        return tasks[taskId];
    }
}
