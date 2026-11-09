import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * Implanta a ElectionFactory. O construtor dela já implanta a implementação base do Election
 * e cria o grupo Semaphore global (com a factory como admin). Quem implanta vira a autoridade (owner).
 *
 * Parâmetro obrigatório:
 * - `semaphore`: endereço do Semaphore v4 na rede. Na Sepolia, o oficial já implantado
 *   (ignition/parameters/sepolia.json).
 *
 * pnpm hardhat ignition deploy ignition/modules/ElectionFactory.ts --network sepolia \
 *   --parameters ignition/parameters/sepolia.json
 */
export default buildModule("ElectionFactoryModule", (m) => {
  const semaphore = m.getParameter<string>("semaphore");
  const factory = m.contract("ElectionFactory", [semaphore]);

  return { factory };
});
