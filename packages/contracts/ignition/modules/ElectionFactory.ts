import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

// Semaphore v4 oficial já implantado na Sepolia.
const SEMAPHORE_SEPOLIA = "0x8A1fd199516489B0Fb7153EB5f075cDAC83c693D";

/**
 * Implanta a ElectionFactory. O construtor dela já implanta a implementação base do Election
 * e cria o grupo Semaphore global (com a factory como admin). Quem implanta vira a autoridade (owner).
 *
 * Para implantar:
 * pnpm hardhat ignition deploy ignition/modules/ElectionFactory.ts --network sepolia --deployment-id <id>
 * Depois, para atualizar as variáveis do GitHub: DEPLOYMENT_ID=<id> pnpm update-vars:sepolia
 */
export default buildModule("ElectionFactoryModule", (m) => {
  const semaphore = m.getParameter<string>("semaphore", SEMAPHORE_SEPOLIA);
  const factory = m.contract("ElectionFactory", [semaphore]);

  return { factory };
});
