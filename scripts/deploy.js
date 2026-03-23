const hre = require('hardhat');

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log('Deploying contracts with account:', deployer.address);

  // Deploy AgentRegistry
  const AgentRegistry = await hre.ethers.getContractFactory('AgentRegistry');
  const agentRegistry = await AgentRegistry.deploy();
  await agentRegistry.waitForDeployment();
  console.log('AgentRegistry deployed to:', await agentRegistry.getAddress());

  // Deploy ReputationVault
  const ReputationVault = await hre.ethers.getContractFactory('ReputationVault');
  const reputationVault = await ReputationVault.deploy(await agentRegistry.getAddress());
  await reputationVault.waitForDeployment();
  console.log('ReputationVault deployed to:', await reputationVault.getAddress());

  // Deploy TaskCoordinator
  const TaskCoordinator = await hre.ethers.getContractFactory('TaskCoordinator');
  const taskCoordinator = await TaskCoordinator.deploy(await agentRegistry.getAddress());
  await taskCoordinator.waitForDeployment();
  console.log('TaskCoordinator deployed to:', await taskCoordinator.getAddress());

  // Deploy PaymentSplitter
  const AgentPaymentSplitter = await hre.ethers.getContractFactory('AgentPaymentSplitter');
  const paymentSplitter = await AgentPaymentSplitter.deploy();
  await paymentSplitter.waitForDeployment();
  console.log('PaymentSplitter deployed to:', await paymentSplitter.getAddress());

  console.log('\nDeployment Summary:');
  console.log('===================');
  console.log('AgentRegistry:', await agentRegistry.getAddress());
  console.log('ReputationVault:', await reputationVault.getAddress());
  console.log('TaskCoordinator:', await taskCoordinator.getAddress());
  console.log('PaymentSplitter:', await paymentSplitter.getAddress());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
