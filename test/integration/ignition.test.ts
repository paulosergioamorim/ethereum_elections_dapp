import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { network } from "hardhat";
import { getAddress } from "viem";
import ElectionModule from "../../ignition/modules/Election.js";
import ElectionFactoryModule from "../../ignition/modules/ElectionFactory.js";
import { deploySemaphore, registerVoters } from "./fixtures.js";

describe("Módulos do Ignition", async () => {
  const { viem, ignition, networkHelpers } = await network.create();
  const [deployer, alice] = await viem.getWalletClients();

  // como na Sepolia: o Semaphore já existe e a factory recebe o endereço por parâmetro
  async function deployedFactory() {
    const semaphore = await deploySemaphore(viem);
    const { factory } = await ignition.deploy(ElectionFactoryModule, {
      parameters: { ElectionFactoryModule: { semaphore: semaphore.address } },
    });

    return { semaphore, factory };
  }

  it("should deploy the factory against the given Semaphore", async () => {
    const { semaphore, factory } = await networkHelpers.loadFixture(deployedFactory);

    assert.equal(await factory.read.sem(), getAddress(semaphore.address));
    assert.equal(await factory.read.owner(), getAddress(deployer.account.address));
  });

  it("should create an election in the existing factory", async () => {
    const { factory } = await networkHelpers.loadFixture(deployedFactory);
    await registerVoters(viem, factory, [alice]);
    const now = BigInt(await networkHelpers.time.latest());

    const { election } = await ignition.deploy(ElectionModule, {
      parameters: {
        ElectionModule: {
          factory: factory.address,
          title: "Eleição para representante",
          candidates: ["Candidato A", "Candidato B"],
          votingStart: now + 60n,
          votingEnd: now + 3600n,
        },
      },
    });

    assert.equal(await factory.read.isElection([election.address]), true);
    assert.equal(await election.read.title(), "Eleição para representante");
    assert.deepEqual(await election.read.candidates(), ["Candidato A", "Candidato B"]);
    assert.equal(await election.read.votingEnd(), now + 3600n);
  });
});
