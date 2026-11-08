import hardhatToolboxViemPlugin from "@nomicfoundation/hardhat-toolbox-viem";
import { configVariable, defineConfig } from "hardhat/config";

// Para os testes de integração: o relógio da chain começa no passado, então `votingEnd`
// cai numa rodada do drand que já foi publicada e o tlock decifra sem esperar.
const INTEGRATION_CLOCK_OFFSET_MS = 2 * 60 * 60 * 1000;

export default defineConfig({
  plugins: [hardhatToolboxViemPlugin],
  solidity: {
    // Semaphore real, para os testes de integração (o contrato de produção usa o já implantado)
    npmFilesToBuild: [
      "@semaphore-protocol/contracts/Semaphore.sol",
      "@semaphore-protocol/contracts/base/SemaphoreVerifier.sol",
      "poseidon-solidity/PoseidonT3.sol",
    ],
    profiles: {
      default: {
        version: "0.8.34",
      },
      production: {
        version: "0.8.34",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    },
  },
  networks: {
    hardhatMainnet: {
      type: "edr-simulated",
      chainType: "l1",
    },
    integration: {
      type: "edr-simulated",
      chainType: "l1",
      initialDate: new Date(Date.now() - INTEGRATION_CLOCK_OFFSET_MS),
    },
    hardhatOp: {
      type: "edr-simulated",
      chainType: "op",
    },
    sepolia: {
      type: "http",
      chainType: "l1",
      url: configVariable("SEPOLIA_RPC_URL"),
      accounts: [configVariable("SEPOLIA_PRIVATE_KEY")],
    },
  },
});
