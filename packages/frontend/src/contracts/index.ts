import { env } from "@/lib/env";

export { candidateAbi, electionAbi, electionFactoryAbi, partyAbi, semaphoreAbi } from "./abis";

/** ElectionFactory implantada na rede do app (`VITE_FACTORY_ADDRESS`). */
export const factoryAddress = env.factoryAddress;
