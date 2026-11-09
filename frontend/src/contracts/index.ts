import { env } from "@/lib/env";

export { electionAbi, electionFactoryAbi, semaphoreAbi } from "./abis";

/** ElectionFactory implantada na rede do app (`VITE_FACTORY_ADDRESS`). */
export const factoryAddress = env.factoryAddress;
