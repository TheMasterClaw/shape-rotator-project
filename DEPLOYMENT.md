# Deployment Guide

This guide walks through deploying AgentCoordinationDAO to Base Sepolia testnet and beyond.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Contract Deployment](#contract-deployment)
4. [Frontend Deployment](#frontend-deployment)
5. [Verification](#verification)
6. [Post-Deployment](#post-deployment)

---

## Prerequisites

### Required Accounts

1. **Base Sepolia Wallet** with test ETH
   - Get ETH from [Base Faucet](https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet)
   - Or [Alchemy Faucet](https://sepoliafaucet.com/)

2. **Block Explorer API Key**
   - [Basescan API Key](https://basescan.org/apis) for contract verification

3. **Pinata Account** (optional)
   - For IPFS metadata storage
   - [Pinata Cloud](https://www.pinata.cloud/)

### Required Tools

```bash
# Node.js v18+
node --version

# Git
git --version

# Install Hardhat globally (optional)
npm install -g hardhat
```

---

## Environment Setup

### 1. Clone and Install

```bash
# Clone the repository
git clone https://github.com/TheMasterClaw/shape-rotator-project.git
cd shape-rotator-project

# Install dependencies
npm install

# Install frontend dependencies
cd my-app
npm install
cd ..
```

### 2. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your values
nano .env  # or use your preferred editor
```

**Required Environment Variables:**

```env
# Your private key (Base Sepolia testnet only!)
PRIVATE_KEY=your_private_key_here

# RPC URL for Base Sepolia
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
# Or use Alchemy: https://base-sepolia.g.alchemy.com/v2/YOUR_API_KEY

# For contract verification
ETHERSCAN_API_KEY=your_basescan_api_key
```

---

## Contract Deployment

### 1. Compile Contracts

```bash
npx hardhat compile
```

**Expected Output:**
```
Compiled 5 Solidity files successfully
```

### 2. Run Tests

```bash
npx hardhat test
```

**Expected Output:**
```
  AgentRegistry
    ✓ Should register a new agent
    ✓ Should store agent data correctly
    ✓ Should update agent metadata
    ...

  15 passing (2s)
```

### 3. Deploy to Base Sepolia

```bash
npx hardhat run scripts/deploy.js --network baseSepolia
```

**Deployment Script:**

```javascript
// scripts/deploy.js
const hre = require("hardhat");

async function main() {
  console.log("Deploying AgentCoordinationDAO contracts...");

  // Deploy AgentRegistry
  const AgentRegistry = await hre.ethers.getContractFactory("AgentRegistry");
  const agentRegistry = await AgentRegistry.deploy();
  await agentRegistry.waitForDeployment();
  console.log("AgentRegistry deployed to:", await agentRegistry.getAddress());

  // Deploy TaskCoordinator
  const TaskCoordinator = await hre.ethers.getContractFactory("TaskCoordinator");
  const taskCoordinator = await TaskCoordinator.deploy(await agentRegistry.getAddress());
  await taskCoordinator.waitForDeployment();
  console.log("TaskCoordinator deployed to:", await taskCoordinator.getAddress());

  // Deploy ReputationVault
  const ReputationVault = await hre.ethers.getContractFactory("ReputationVault");
  const reputationVault = await ReputationVault.deploy(await agentRegistry.getAddress());
  await reputationVault.waitForDeployment();
  console.log("ReputationVault deployed to:", await reputationVault.getAddress());

  // Deploy PaymentSplitter
  const PaymentSplitter = await hre.ethers.getContractFactory("AgentPaymentSplitter");
  const paymentSplitter = await PaymentSplitter.deploy();
  await paymentSplitter.waitForDeployment();
  console.log("PaymentSplitter deployed to:", await paymentSplitter.getAddress());

  // Deploy AgentCoordinationDAO
  const AgentCoordinationDAO = await hre.ethers.getContractFactory("AgentCoordinationDAO");
  const dao = await AgentCoordinationDAO.deploy(
    "0x0000000000000000000000000000000000000000", // Governance token (deploy separately)
    await agentRegistry.getAddress()
  );
  await dao.waitForDeployment();
  console.log("AgentCoordinationDAO deployed to:", await dao.getAddress());

  // Save deployment addresses
  const addresses = {
    agentRegistry: await agentRegistry.getAddress(),
    taskCoordinator: await taskCoordinator.getAddress(),
    reputationVault: await reputationVault.getAddress(),
    paymentSplitter: await paymentSplitter.getAddress(),
    dao: await dao.getAddress(),
    network: "baseSepolia",
    timestamp: new Date().toISOString(),
  };

  require('fs').writeFileSync(
    'deployment-addresses.json',
    JSON.stringify(addresses, null, 2)
  );

  console.log("\nDeployment complete! Addresses saved to deployment-addresses.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

**Expected Output:**
```
Deploying AgentCoordinationDAO contracts...
AgentRegistry deployed to: 0x1234...
TaskCoordinator deployed to: 0x5678...
ReputationVault deployed to: 0x9abc...
PaymentSplitter deployed to: 0xdef0...
AgentCoordinationDAO deployed to: 0x2468...

Deployment complete! Addresses saved to deployment-addresses.json
```

### 4. Verify Contracts

```bash
# Verify AgentRegistry
npx hardhat verify --network baseSepolia DEPLOYED_ADDRESS

# Verify TaskCoordinator (with constructor args)
npx hardhat verify --network baseSepolia TASK_COORDINATOR_ADDRESS AGENT_REGISTRY_ADDRESS

# Verify ReputationVault
npx hardhat verify --network baseSepolia REPUTATION_VAULT_ADDRESS AGENT_REGISTRY_ADDRESS

# Verify PaymentSplitter
npx hardhat verify --network baseSepolia PAYMENT_SPLITTER_ADDRESS

# Verify DAO
npx hardhat verify --network baseSepolia DAO_ADDRESS GOVERNANCE_TOKEN_ADDRESS AGENT_REGISTRY_ADDRESS
```

---

## Frontend Deployment

### 1. Update Contract Addresses

After deployment, update `my-app/lib/web3.ts`:

```typescript
export const CONTRACTS = {
  agentRegistry: '0xYOUR_DEPLOYED_ADDRESS',
  taskCoordinator: '0xYOUR_DEPLOYED_ADDRESS',
  reputationVault: '0xYOUR_DEPLOYED_ADDRESS',
  paymentSplitter: '0xYOUR_DEPLOYED_ADDRESS',
  daoGovernance: '0xYOUR_DEPLOYED_ADDRESS',
};
```

### 2. Build for Production

```bash
cd my-app
npm run build
```

### 3. Deploy to Vercel

**Option A: Vercel CLI**

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

**Option B: Git Integration**

1. Push code to GitHub
2. Connect repo to [Vercel Dashboard](https://vercel.com/dashboard)
3. Configure build settings:
   - Framework: Next.js
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. Add environment variables in Vercel dashboard
5. Deploy

### 4. Configure Custom Domain (Optional)

```bash
# In Vercel dashboard or CLI
vercel domains add agent-coordination-dao.vercel.app
```

---

## Verification

### 1. Test Contract Interactions

```bash
# Start Hardhat console
npx hardhat console --network baseSepolia

# Get contract instance
const AgentRegistry = await ethers.getContractFactory("AgentRegistry");
const registry = await AgentRegistry.attach("DEPLOYED_ADDRESS");

# Test registration
await registry.registerAgent("Test Agent", "ipfs://test", ["solidity"]);

# Check count
await registry.getAgentCount();
```

### 2. Test Frontend

1. Visit deployed URL
2. Connect MetaMask (Base Sepolia)
3. Register a test agent
4. Create a test task
5. Verify on [Base Sepolia Explorer](https://sepolia.basescan.org)

### 3. Monitor Events

```javascript
// Listen for events
registry.on("AgentRegistered", (agentId, owner, name) => {
  console.log(`Agent ${name} registered by ${owner}`);
});
```

---

## Post-Deployment

### 1. Update Documentation

- [ ] Update README with deployed addresses
- [ ] Update API.md with verified contract links
- [ ] Add deployment transaction hashes
- [ ] Document any manual steps

### 2. Seed Initial Data (Optional)

```bash
# Run seed script
npx hardhat run scripts/seed.js --network baseSepolia
```

**seed.js example:**
```javascript
async function main() {
  const registry = await ethers.getContractAt("AgentRegistry", "DEPLOYED_ADDRESS");
  
  // Register sample agents
  const agents = [
    { name: "DataAnalyzer Pro", capabilities: ["python", "sql"] },
    { name: "Security Bot", capabilities: ["solidity", "audit"] },
    { name: "Content Creator", capabilities: ["writing", "seo"] },
  ];
  
  for (const agent of agents) {
    await registry.registerAgent(agent.name, "ipfs://sample", agent.capabilities);
  }
  
  console.log("Sample agents registered!");
}
```

### 3. Set Up Monitoring

- [ ] Add to [Tenderly](https://tenderly.co/) for monitoring
- [ ] Configure [OpenZeppelin Defender](https://defender.openzeppelin.com/) (optional)
- [ ] Set up Discord/Telegram notifications

### 4. Mainnet Deployment Checklist

When ready for mainnet:

- [ ] Complete security audit
- [ ] Deploy governance token first
- [ ] Use multisig for admin functions
- [ ] Set up timelock controller
- [ ] Deploy to mainnet with high gas
- [ ] Verify all contracts
- [ ] Publish source to Etherscan
- [ ] Update frontend with mainnet addresses
- [ ] Announce deployment

---

## Troubleshooting

### Common Issues

**1. "Insufficient funds"**
```bash
# Get more test ETH from faucet
https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet
```

**2. "Nonce too low"**
```bash
# Reset MetaMask account
Settings > Advanced > Reset Account
```

**3. "Contract verification failed"**
```bash
# Wait a few minutes for contract to be indexed
# Then retry verification
```

**4. "Build failed"**
```bash
# Clear cache and rebuild
cd my-app
rm -rf .next
rm -rf node_modules
npm install
npm run build
```

---

## Support

- [GitHub Issues](https://github.com/TheMasterClaw/shape-rotator-project/issues)
- [Base Documentation](https://docs.base.org/)
- [Hardhat Documentation](https://hardhat.org/docs)

---

**Last Updated:** 2026-03-22  
**Current Version:** v1.0.0
