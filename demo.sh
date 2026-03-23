#!/bin/bash
# AgentCoordinationDAO Demo Script
# Usage: ./demo.sh [scenario]

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                                                              ║"
echo "║   🤖 AgentCoordinationDAO — Multi-Agent Web3 Infrastructure  ║"
echo "║                                                              ║"
echo "║   Hackathon Demo Script                                      ║"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

show_help() {
    echo ""
    echo "Usage: ./demo.sh [command]"
    echo ""
    echo "Commands:"
    echo "  info          Show project info and contract addresses"
    echo "  test          Run all contract tests"
    echo "  frontend      Start the frontend development server"
    echo "  build         Build the frontend for production"
    echo "  agents        Demo: Browse agent registry"
    echo "  tasks         Demo: Task marketplace walkthrough"
    echo "  dashboard     Demo: User dashboard features"
    echo "  deploy        Deploy contracts to Base Sepolia"
    echo "  help          Show this help message"
    echo ""
    echo "Live Demo: https://agent-coordination-dao.vercel.app"
    echo ""
}

show_info() {
    echo -e "${GREEN}Project Overview:${NC}"
    echo ""
    echo "AgentCoordinationDAO is a decentralized protocol for AI agents"
    echo "to discover, coordinate, and collaborate on complex tasks."
    echo ""
    echo -e "${CYAN}Smart Contracts:${NC}"
    echo "  • AgentRegistry.sol      - On-chain agent discovery"
    echo "  • TaskCoordinator.sol    - Task lifecycle management"
    echo "  • ReputationVault.sol    - Reputation tracking"
    echo "  • PaymentSplitter.sol    - Payment distribution"
    echo ""
    echo -e "${CYAN}Tech Stack:${NC}"
    echo "  • Frontend: Next.js 14 + TypeScript + Tailwind"
    echo "  • Web3: wagmi + RainbowKit"
    echo "  • Contracts: Solidity + Hardhat"
    echo "  • Network: Base Sepolia"
    echo ""
}

run_tests() {
    echo -e "${BLUE}Running Contract Tests...${NC}"
    echo ""
    npx hardhat test
    echo ""
    echo -e "${GREEN}✅ All tests passed!${NC}"
    echo ""
}

start_frontend() {
    echo -e "${BLUE}Starting Frontend Development Server...${NC}"
    echo ""
    cd my-app
    npm run dev
}

build_frontend() {
    echo -e "${BLUE}Building Frontend for Production...${NC}"
    echo ""
    cd my-app
    npm run build
    echo ""
    echo -e "${GREEN}✅ Build complete!${NC}"
    echo ""
}

deploy_contracts() {
    echo -e "${BLUE}Deploying Contracts to Base Sepolia...${NC}"
    echo ""
    npx hardhat run scripts/deploy.js --network baseSepolia
    echo ""
    echo -e "${GREEN}✅ Contracts deployed!${NC}"
    echo ""
}

demo_agents() {
    echo -e "${BLUE}Demo: Agent Registry${NC}"
    echo ""
    echo "The Agent Registry is where AI agents register their capabilities"
    echo "and build reputation on-chain."
    echo ""
    
    echo -e "${YELLOW}Step 1: Browse Agents${NC}"
    echo "  • User visits /agents page"
    echo "  • Sees grid of registered AI agents"
    echo "  • Can filter by capabilities (Python, Solidity, etc.)"
    echo "  • Can search by name"
    sleep 1
    echo ""
    
    echo -e "${YELLOW}Step 2: Agent Details${NC}"
    echo "  • Click on an agent card"
    echo "  • View full capabilities list"
    echo "  • See reputation score (0-5 stars)"
    echo "  • View completed task history"
    sleep 1
    echo ""
    
    echo -e "${YELLOW}Step 3: Register Your Agent${NC}"
    echo "  • Click 'Register Agent' button"
    echo "  • Fill in agent name"
    echo "  • Add capabilities (skills)"
    echo "  • Optionally add metadata URI (IPFS)"
    echo "  • Submit transaction"
    sleep 1
    echo ""
    
    echo -e "${GREEN}✅ Agent registered on-chain!${NC}"
    echo ""
}

demo_tasks() {
    echo -e "${BLUE}Demo: Task Marketplace${NC}"
    echo ""
    echo "The Task Marketplace connects task creators with AI agents."
    echo ""
    
    echo -e "${YELLOW}Step 1: Browse Available Tasks${NC}"
    echo "  • User visits /tasks page"
    echo "  • Sees list of open tasks with rewards"
    echo "  • Can filter by status (Open, In Progress, Completed)"
    echo "  • Can search by keywords"
    sleep 1
    echo ""
    
    echo -e "${YELLOW}Step 2: Post a New Task${NC}"
    echo "  • Click 'Post Task' button"
    echo "  • Enter task description"
    echo "  • Set required capabilities"
    echo "  • Set reward amount (ETH or USDC)"
    echo "  • Set deadline"
    echo "  • Submit transaction"
    sleep 1
    echo ""
    
    echo -e "${YELLOW}Step 3: Agent Applies${NC}"
    echo "  • Agent owner sees matching task"
    echo "  • Clicks 'Apply' button"
    echo "  • Submits application with agent ID"
    sleep 1
    echo ""
    
    echo -e "${YELLOW}Step 4: Task Assignment${NC}"
    echo "  • Task creator reviews applicants"
    echo "  • Assigns best agent(s) to task"
    echo "  • Task status changes to 'Assigned'"
    sleep 1
    echo ""
    
    echo -e "${YELLOW}Step 5: Work & Completion${NC}"
    echo "  • Assigned agent starts work"
    echo "  • Task status: 'In Progress'"
    echo "  • Upon completion, task creator marks complete"
    echo "  • Payment automatically distributed"
    sleep 1
    echo ""
    
    echo -e "${GREEN}✅ Task completed and paid!${NC}"
    echo ""
}

demo_dashboard() {
    echo -e "${BLUE}Demo: User Dashboard${NC}"
    echo ""
    echo "The Dashboard provides analytics and management tools."
    echo ""
    
    echo -e "${YELLOW}Stats Overview${NC}"
    echo "  • Total agents owned"
    echo "  • Active tasks"
    echo "  • Total earnings (ETH)"
    echo "  • Average reputation score"
    echo ""
    
    echo -e "${YELLOW}My Agents Section${NC}"
    echo "  • List of all owned agents"
    echo "  • Status (Active/Inactive)"
    echo "  • Tasks completed count"
    echo "  • Reputation per agent"
    echo ""
    
    echo -e "${YELLOW}Recent Tasks Section${NC}"
    echo "  • Tasks created or assigned to"
    echo "  • Progress bars for in-progress tasks"
    echo "  • Quick status indicators"
    echo ""
    
    echo -e "${YELLOW}Activity Chart${NC}"
    echo "  • Monthly activity visualization"
    echo "  • Track growth over time"
    echo "  • Percentage change indicators"
    echo ""
    
    echo -e "${GREEN}✅ Full dashboard overview complete!${NC}"
    echo ""
}

# Main script
case "${1:-help}" in
    info)
        show_info
        ;;
    test)
        run_tests
        ;;
    frontend)
        start_frontend
        ;;
    build)
        build_frontend
        ;;
    deploy)
        deploy_contracts
        ;;
    agents)
        demo_agents
        ;;
    tasks)
        demo_tasks
        ;;
    dashboard)
        demo_dashboard
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        echo -e "${RED}Unknown command: $1${NC}"
        show_help
        exit 1
        ;;
esac
