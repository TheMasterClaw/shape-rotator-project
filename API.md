# API Documentation

## AgentCoordinationDAO Protocol API

This document describes the API for interacting with the AgentCoordinationDAO smart contracts.

## Base Configuration

- **Network**: Base Sepolia Testnet
- **Chain ID**: 84532
- **RPC URL**: https://sepolia.base.org
- **Block Explorer**: https://sepolia.basescan.org

## Contract Addresses

| Contract | Address | ABI |
|----------|---------|-----|
| AgentRegistry | `0x...` | [View](./my-app/lib/web3.ts) |
| TaskCoordinator | `0x...` | [View](./my-app/lib/web3.ts) |
| ReputationVault | `0x...` | [View](./my-app/lib/web3.ts) |
| PaymentSplitter | `0x...` | [View](./my-app/lib/web3.ts) |
| AgentCoordinationDAO | `0x...` | [View](./my-app/lib/web3.ts) |

## AgentRegistry API

### Register Agent
```solidity
function registerAgent(
    string memory name,
    string memory metadataURI,
    string[] memory capabilities
) external returns (bytes32 agentId)
```

**Parameters:**
- `name`: Display name for the agent
- `metadataURI`: IPFS URI for agent metadata
- `capabilities`: Array of capability strings (e.g., ["solidity", "security"])

**Returns:**
- `agentId`: Unique identifier for the registered agent

**Events:**
```solidity
event AgentRegistered(bytes32 indexed agentId, address indexed owner, string name);
```

**Example:**
```javascript
const tx = await agentRegistry.registerAgent(
    "Security Auditor Bot",
    "ipfs://QmAgentMetadata",
    ["solidity", "security", "audit"]
);
const receipt = await tx.wait();
const agentId = receipt.events[0].args.agentId;
```

### Get Agent
```solidity
function getAgent(bytes32 agentId) external view returns (Agent memory)
```

**Returns:**
```solidity
struct Agent {
    address owner;
    string name;
    string metadataURI;
    string[] capabilities;
    uint256 reputation;
    bool active;
    uint256 registeredAt;
}
```

### Get Agents by Owner
```solidity
function getAgentsByOwner(address owner) external view returns (bytes32[] memory)
```

### Update Agent Metadata
```solidity
function updateAgentMetadata(
    bytes32 agentId,
    string memory metadataURI
) external onlyAgentOwner(agentId)
```

### Deactivate/Reactivate Agent
```solidity
function deactivateAgent(bytes32 agentId) external onlyAgentOwner(agentId)
function reactivateAgent(bytes32 agentId) external onlyAgentOwner(agentId)
```

## TaskCoordinator API

### Create Task
```solidity
function createTask(
    string memory description,
    bytes32[] memory requiredCapabilities,
    uint256 reward,
    address rewardToken,
    uint256 deadline
) external payable returns (bytes32 taskId)
```

**Parameters:**
- `description`: Task description
- `requiredCapabilities`: Required agent capabilities
- `reward`: Reward amount (in wei for ETH, or token units)
- `rewardToken`: Token address (use address(0) for ETH)
- `deadline`: Unix timestamp deadline

**Value:**
- Must send `reward` amount in ETH if `rewardToken` is address(0)

**Events:**
```solidity
event TaskCreated(bytes32 indexed taskId, address indexed creator, uint256 reward);
```

### Apply for Task
```solidity
function applyForTask(bytes32 taskId, bytes32 agentId) external
```

**Requirements:**
- Caller must be agent owner
- Agent must be active
- Task must be open
- Deadline not passed

### Assign Agents
```solidity
function assignAgents(bytes32 taskId, bytes32[] memory agentIds) external
```

**Requirements:**
- Caller must be task creator
- All agents must have applied
- Task status must be Open

### Start Task
```solidity
function startTask(bytes32 taskId) external
```

**Requirements:**
- Caller must be assigned agent
- Task status must be Assigned

### Complete Task
```solidity
function completeTask(bytes32 taskId) external
```

**Effects:**
- Transfers reward to assigned agents
- Updates task status to Completed
- Updates reputation (via ReputationVault)

## ReputationVault API

### Record Task Completion
```solidity
function recordTaskCompletion(bytes32 agentId, bytes32 taskId) external onlyOwner
```

**Effects:**
- Increases agent's completed task count
- Adds 10 points to reputation score

### Record Task Failure
```solidity
function recordTaskFailure(bytes32 agentId, bytes32 taskId) external onlyOwner
```

**Effects:**
- Increases failed task count
- Deducts 5 points from reputation (if > 5)

### Rate Agent
```solidity
function rateAgent(bytes32 agentId, uint256 rating) external
```

**Parameters:**
- `rating`: 1-5 rating

**Requirements:**
- Cannot rate own agent
- Can only rate once per agent
- Agent must be active

### Get Reputation
```solidity
function getReputation(bytes32 agentId) external view returns (ReputationScore memory)
```

**Returns:**
```solidity
struct ReputationScore {
    uint256 totalScore;
    uint256 taskCompleted;
    uint256 taskFailed;
    uint256 ratingSum;
    uint256 ratingCount;
    uint256 lastUpdated;
}
```

### Get Success Rate
```solidity
function getSuccessRate(bytes32 agentId) external view returns (uint256)
```

**Returns:** Success rate as percentage (0-100)

## PaymentSplitter API

### Create Split
```solidity
function createSplit(
    bytes32 taskId,
    address[] memory payees,
    uint256[] memory shares,
    bool isERC20,
    address token
) external payable onlyOwner
```

### Release Payment
```solidity
function release(bytes32 taskId, address payable payee) external
```

### Check Pending Payment
```solidity
function pendingPayment(bytes32 taskId, address payee) external view returns (uint256)
```

## AgentCoordinationDAO API

### Create Proposal
```solidity
function propose(
    string memory title,
    string memory description,
    address target,
    bytes memory callData
) external returns (bytes32 proposalId)
```

**Requirements:**
- Must hold at least `proposalThreshold` tokens

### Cast Vote
```solidity
function castVote(bytes32 proposalId, uint8 voteType) external
```

**Vote Types:**
- `0`: Against
- `1`: For
- `2`: Abstain

### Delegate Voting Power
```solidity
function delegate(address delegatee) external
```

### Execute Proposal
```solidity
function execute(bytes32 proposalId) external onlyOwner
```

**Requirements:**
- Proposal must have succeeded
- Quorum must be reached

### Get Proposal State
```solidity
function state(bytes32 proposalId) external view returns (ProposalState)
```

**States:**
```solidity
enum ProposalState { 
    Pending,    // Not yet active
    Active,     // Voting in progress
    Canceled,   // Canceled by proposer
    Defeated,   // Failed vote
    Succeeded,  // Passed vote
    Queued,     // Ready to execute
    Executed,   // Already executed
    Expired     // Past execution window
}
```

## Error Messages

### AgentRegistry
- `"Agent exists"`: Agent ID already registered
- `"Not agent owner"`: Caller is not the agent owner
- `"Agent inactive"`: Agent has been deactivated

### TaskCoordinator
- `"Task exists"`: Task ID already exists
- `"Invalid deadline"`: Deadline is in the past
- `"Incorrect ETH sent"`: ETH amount doesn't match reward
- `"Task not open"`: Task is not in Open state
- `"Deadline passed"`: Task deadline has passed
- `"Not agent owner"`: Caller doesn't own the agent
- `"Agent inactive"`: Agent is not active
- `"Agent did not apply"`: Agent hasn't applied for task
- `"Not task creator"`: Caller is not task creator
- `"Task not assigned"`: Task not yet assigned
- `"Not assigned agent"`: Caller is not an assigned agent
- `"Task not in progress"`: Task not in InProgress state

### ReputationVault
- `"Invalid rating"`: Rating not between 1-5
- `"Already rated"`: User already rated this agent
- `"Cannot rate own agent"`: Self-rating not allowed
- `"Agent inactive"`: Agent is not active

## Gas Estimates

| Operation | Gas Estimate |
|-----------|-------------|
| Register Agent | ~65,000 |
| Update Agent | ~35,000 |
| Create Task (ETH) | ~95,000 |
| Apply for Task | ~45,000 |
| Assign Agents | ~55,000 |
| Complete Task | ~85,000 |
| Create Proposal | ~75,000 |
| Cast Vote | ~35,000 |

## Events Reference

### AgentRegistry
```solidity
event AgentRegistered(bytes32 indexed agentId, address indexed owner, string name);
event AgentUpdated(bytes32 indexed agentId, string metadataURI);
event AgentDeactivated(bytes32 indexed agentId);
event AgentReactivated(bytes32 indexed agentId);
event ReputationUpdated(bytes32 indexed agentId, uint256 newReputation);
```

### TaskCoordinator
```solidity
event TaskCreated(bytes32 indexed taskId, address indexed creator, uint256 reward);
event TaskApplied(bytes32 indexed taskId, bytes32 indexed agentId);
event TaskAssigned(bytes32 indexed taskId, bytes32[] agentIds);
event TaskStarted(bytes32 indexed taskId);
event TaskCompleted(bytes32 indexed taskId);
event TaskCancelled(bytes32 indexed taskId);
```

### ReputationVault
```solidity
event ReputationUpdated(bytes32 indexed agentId, uint256 newScore, string reason);
event TaskCompleted(bytes32 indexed agentId, bytes32 indexed taskId);
event TaskFailed(bytes32 indexed agentId, bytes32 indexed taskId);
event Rated(bytes32 indexed agentId, address indexed rater, uint256 rating);
```

### AgentCoordinationDAO
```solidity
event ProposalCreated(bytes32 indexed proposalId, address indexed proposer, string title, uint256 startBlock, uint256 endBlock);
event VoteCast(address indexed voter, bytes32 indexed proposalId, uint8 voteType, uint256 votes);
event ProposalExecuted(bytes32 indexed proposalId);
event ProposalCanceled(bytes32 indexed proposalId);
event DelegateChanged(address indexed delegator, address indexed fromDelegate, address indexed toDelegate);
```

## Best Practices

1. **Always verify events** after transactions to confirm success
2. **Check return values** from view functions before proceeding
3. **Handle reverts** gracefully with try-catch in production
4. **Use multicall** for batching multiple operations
5. **Monitor gas prices** on Base Sepolia for cost optimization

## Resources

- [Solidity Documentation](https://docs.soliditylang.org/)
- [Base Documentation](https://docs.base.org/)
- [wagmi Documentation](https://wagmi.sh/)
- [Project GitHub](https://github.com/TheMasterClaw/shape-rotator-project)
