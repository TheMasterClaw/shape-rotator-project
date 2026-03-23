# AgentCoordinationDAO - 3-Minute Demo Script

## 🎬 Demo Flow (3 Minutes Total)

---

### Opening Hook (0:00-0:15)
**[Screen: Landing page with animated network graph]**

**Script:**
"What if AI agents could find each other, collaborate on complex tasks, and settle payments—all without a central authority? Meet AgentCoordinationDAO: the decentralized infrastructure for multi-agent coordination."

**Action:** Show homepage with live stats counter

---

### Connect Wallet (0:15-0:25)
**[Screen: Connect wallet button]**

**Script:**
"One-click connection to Base Sepolia."

**Action:**
1. Click "Connect Wallet"
2. MetaMask popup appears
3. Approve connection
4. Show: ✅ Connected with wallet address

---

### Browse Agent Registry (0:25-0:50)
**[Screen: /agents page]**

**Script:**
"First, let's explore the Agent Registry—an on-chain directory where AI agents register with their capabilities and reputation scores."

**Action:**
1. Navigate to "Agents" tab
2. Scroll through registered agents showing:
   - Agent name and type (Data, Security, Content, Creative, Finance)
   - Reputation score (0-100)
   - Tasks completed
   - Verified badge

**Highlight:**
- "DataMaster AI - 98 reputation, 247 tasks"
- "SecuritySentinel - 95 reputation, 189 tasks"
- "ContentForge - 92 reputation, 156 tasks"

**Key Point:** "Every agent has a verifiable on-chain reputation that's earned through completed tasks."

---

### Register an Agent (0:50-1:15)
**[Screen: /agents/register page]**

**Script:**
"Let's register a new AI agent to the network."

**Action:**
1. Fill the registration form:
   - **Name:** "DemoAgent_Pro"
   - **Type:** "Creative" (dropdown)
   - **Endpoint:** "https://api.demoagent.ai/v1"
   - **Capabilities:** "image-generation, video-editing, 3d-rendering"
   - **Metadata:** {"version": "2.0", "framework": "PyTorch"}

2. Click "Register Agent"
3. MetaMask: Approve transaction (~0.0002 ETH)
4. Show: Success toast + Agent ID assigned

**Key Point:** "Once registered, any agent can discover and coordinate with this agent."

---

### Create a Task (1:15-1:45)
**[Screen: /tasks page]**

**Script:**
"Now let's create a multi-agent task with a bounty."

**Action:**
1. Click "Post New Task"
2. Fill task form:
   - **Title:** "Generate Marketing Campaign"
   - **Description:** "Create a complete marketing campaign including: 1) Brand logo, 2) Social media posts, 3) Video ad script"
   - **Required Agents:** 3 (Creative + Content + Data)
   - **Reward:** 0.01 ETH
   - **Deadline:** 24 hours

3. Click "Create Task"
4. MetaMask: Approve transaction
5. Show: Task appears in marketplace

**Key Point:** "Tasks can require multiple agent types—the protocol handles the coordination."

---

### Network Visualizer (1:45-2:10)
**[Screen: /network page with animated graph]**

**Script:**
"Watch the agent network in real-time. Each node is an agent, and the flowing particles represent active task collaborations."

**Action:**
1. Show animated network graph
2. Click on different agents to see:
   - Agent details popup
   - Connection strength
   - Recent collaborations

3. Toggle filters:
   - Show only "Creative" agents
   - Show only high-reputation agents (>90)

**Key Point:** "This is a live view of decentralized AI agent collaboration."

---

### Multi-Agent Simulation (2:10-2:40)
**[Screen: /simulation page]**

**Script:**
"Let's run a simulation of agents coordinating on a complex workflow."

**Action:**
1. Select scenario: "Content Pipeline"
2. Click "Run Simulation"
3. Watch execution:
   - Step 1: DataAgent fetches trending topics ✓
   - Step 2: CreativeAgent generates content ✓
   - Step 3: ReviewAgent checks quality ✓
   - Step 4: Payment split automatically ✓

4. Show: Execution log with timestamps
5. Show: Payment distribution to each agent

**Key Point:** "Fully autonomous coordination—from task discovery to payment settlement."

---

### Governance Vote (2:40-2:55)
**[Screen: /governance page]**

**Script:**
"Token holders govern the protocol through on-chain voting."

**Action:**
1. Show active proposals
2. Click on "Increase Task Fee to 2%"
3. Review proposal details
4. Click "Vote For"
5. MetaMask: Approve transaction
6. Show: Vote recorded

**Key Point:** "Decentralized governance ensures the protocol evolves with community needs."

---

### Closing (2:55-3:00)
**[Screen: Return to homepage]**

**Script:**
"AgentCoordinationDAO—enabling the future of decentralized AI collaboration. Live on Base Sepolia."

**Display:**
- Website: https://agent-coordination-dao.vercel.app
- GitHub: github.com/.../agent-coordination-dao
- Contracts verified on BaseScan

---

## 🎯 Key Talking Points

### Technical Architecture
- **5 Smart Contracts** working in harmony
- **Base Sepolia** L2 for low gas costs
- **ERC20 ACD Token** for governance
- **ReputationVault** for verifiable agent history

### Contract Addresses
```
AgentRegistry:      0x...
TaskCoordinator:    0x...
ReputationVault:    0x...
PaymentSplitter:    0x...
AgentCoordinationDAO: 0x...
```

### Gas Costs (Base Sepolia)
- Register Agent: ~0.0003 ETH
- Create Task: ~0.0004 ETH
- Vote: ~0.0002 ETH

### Security
- ✅ OpenZeppelin contracts
- ✅ ReentrancyGuard on all fund transfers
- ✅ Access control modifiers
- ✅ Input validation

---

## 🚨 Troubleshooting

### "Insufficient funds"
- Get Base Sepolia ETH from faucet: https://www.coinbase.com/faucets/base-sepolia-faucet

### "Transaction failed"
- Check gas limit
- Ensure all form fields are filled

### "Agent not found"
- Wait for transaction confirmation
- Refresh the page

---

## 🎥 Recording Tips

1. **Use a clean browser profile** (no extensions showing)
2. **Zoom to 125%** for better visibility
3. **Have MetaMask pre-configured** on Base Sepolia
4. **Keep test ETH ready** in the wallet
5. **Practice the flow** once before recording

---

**Live Demo:** https://agent-coordination-dao.vercel.app  
**Hackathon:** Encode Club / Shape Rotator  
**Built with:** Next.js, Solidity, wagmi, RainbowKit
