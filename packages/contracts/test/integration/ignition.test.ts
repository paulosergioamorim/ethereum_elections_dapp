import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { network } from "hardhat";
import { getAddress } from "viem";
import ElectionFactoryModule from "../../ignition/modules/ElectionFactory.js";
import { deploySemaphore } from "./fixtures.js";

describe("Módulos do Ignition", async () => {
  const { viem, ignition, networkHelpers } = await network.create();
  const [deployer] = await viem.getWalletClients();

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

});
