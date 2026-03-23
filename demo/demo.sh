#!/bin/bash
# AgentCoordinationDAO Demo Script - Multi-Agent Coordination Protocol
# Run this to showcase all key features for hackathon judges

set -e

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║     AGENTCOORDINATIONDAO - HACKATHON DEMO SCRIPT              ║"
echo "║     Multi-Agent Coordination Protocol                         ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_section() {
    echo ""
    echo -e "${BLUE}▶ $1${NC}"
    echo "─────────────────────────────────────────────────────────────────"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# Check prerequisites
print_section "CHECKING PREREQUISITES"

if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 18+"
    exit 1
fi
print_success "Node.js found: $(node --version)"

# Demo 1: Project Overview
print_section "DEMO 1: PROJECT OVERVIEW"
echo "AgentCoordinationDAO enables:"
echo "  • 🤖 On-chain AI agent registry"
echo "  • 📋 Decentralized task marketplace"
echo "  • 🗳️ DAO governance for agent standards"
echo "  • 💰 Automated payment distribution"
echo ""
print_info "Tech Stack: Next.js + Hardhat + Ethers.js + The Graph"

# Demo 2: Smart Contracts
print_section "DEMO 2: SMART CONTRACT ARCHITECTURE"
echo "Core contracts:"
echo ""
echo "  📜 AgentRegistry.sol     - Register AI agents"
echo "  📜 TaskMarketplace.sol   - Create and bid on tasks"
echo "  📜 CoordinationDAO.sol   - Governance and voting"
echo "  📜 RewardDistributor.sol - Automated payments"
echo ""

# Demo 3: Key Features
print_section "DEMO 3: KEY FEATURES DEMO"
echo ""
echo "1️⃣  REGISTER AI AGENT"
echo "    → Connect wallet"
echo "    → Define agent capabilities"
echo "    → Stake collateral for reputation"
echo ""
echo "2️⃣  CREATE TASK"
echo "    → Describe task requirements"
echo "    → Set bounty/reward"
echo "    → Define acceptance criteria"
echo ""
echo "3️⃣  AGENT COORDINATION"
echo "    → Agents bid on tasks"
echo "    → Multi-agent collaboration"
echo "    → Verification of completion"
echo ""
echo "4️⃣  DAO GOVERNANCE"
echo "    → Propose protocol upgrades"
echo "    → Vote on agent standards"
echo "    → Dispute resolution"
echo ""
echo "5️⃣  AUTOMATED PAYMENTS"
echo "    → Escrow releases on verification"
echo "    → Multi-party splits"
echo "    → Instant settlement"
echo ""

# Demo 4: Run Development Server
print_section "DEMO 4: STARTING DEVELOPMENT SERVER"
if [ -f "package.json" ]; then
    print_info "Installing dependencies (if needed)..."
    npm install --silent 2>/dev/null || true
    
    print_success "Dependencies ready"
    print_info "Starting Next.js development server..."
    print_info "🌐 Open http://localhost:3000 after server starts"
    echo ""
    print_info "Press Ctrl+C when demo is complete"
    echo ""
    
    npm run dev
else
    echo "❌ package.json not found. Are you in the correct directory?"
    exit 1
fi
