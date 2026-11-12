import { MutationObserver } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ContractFunctionRevertedError,
  encodeErrorResult,
  UserRejectedRequestError,
  type Hash,
} from "viem";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { electionAbi, electionFactoryAbi } from "@/contracts";
import { createQueryClient } from "@/lib/query-client";
import { NotifiedError, runTransaction } from "@/lib/transaction";

const hash: Hash = `0x${"ab".repeat(32)}`;
const notice = {
  signing: "Confirme a autorização na carteira.",
  details: "Carteira: 0x123",
  success: "Carteira autorizada.",
};

describe("runTransaction", () => {
  beforeEach(() => {
    vi.spyOn(toast, "loading").mockReturnValue("tx-toast");
    vi.spyOn(toast, "success").mockReturnValue("tx-toast");
    vi.spyOn(toast, "error").mockReturnValue("tx-toast");
    vi.spyOn(toast, "info").mockReturnValue("tx-toast");
  });

  it("should move a single toast from signing to mining to success", async () => {
    await runTransaction(notice, async () => hash);

    expect(toast.loading).toHaveBeenNthCalledWith(
      1,
      notice.signing,
      expect.objectContaining({ description: notice.details, duration: Infinity, dismissible: false }),
    );
    expect(toast.loading).toHaveBeenNthCalledWith(
      2,
      "Transação enviada. Aguardando confirmação…",
      expect.objectContaining({ id: "tx-toast", duration: Infinity }),
    );
    expect(toast.success).toHaveBeenCalledWith(
      notice.success,
      expect.objectContaining({ id: "tx-toast", duration: 6_000, dismissible: true }),
    );
  });

  it("should turn the same toast into the contract error, in Portuguese", async () => {
    const reverted = new ContractFunctionRevertedError({
      abi: electionFactoryAbi,
      data: encodeErrorResult({ abi: electionAbi, errorName: "InvalidVotingStart" }),
      functionName: "createElection",
    });

    await expect(
      runTransaction(notice, async () => {
        throw reverted;
      }),
    ).rejects.toBeInstanceOf(NotifiedError);

    expect(toast.error).toHaveBeenCalledWith(
      "O início da votação já passou. Escolha um horário no futuro.",
      expect.objectContaining({ id: "tx-toast", duration: 8_000, dismissible: true }),
    );
  });

  it("should treat a refusal in the wallet as a neutral notice", async () => {
    await expect(
      runTransaction(notice, async () => {
        throw new UserRejectedRequestError(new Error("User rejected the request."));
      }),
    ).rejects.toBeInstanceOf(NotifiedError);

    expect(toast.info).toHaveBeenCalledWith(
      "Pedido cancelado na carteira.",
      expect.objectContaining({ id: "tx-toast" }),
    );
    expect(toast.error).not.toHaveBeenCalled();
  });
});

describe("aviso global das mutations", () => {
  it("should not repeat an error the transaction toast already showed", async () => {
    const error = vi.spyOn(toast, "error");
    const observer = new MutationObserver(createQueryClient(), {
      meta: { errorTitle: "Não foi possível autorizar as carteiras" },
      mutationFn: async () => {
        throw new NotifiedError(new Error("já avisado"));
      },
    });

    await observer.mutate().catch(() => undefined);

    expect(error).not.toHaveBeenCalled();
  });

  it("should still report errors that happen outside a transaction", async () => {
    const error = vi.spyOn(toast, "error");
    const observer = new MutationObserver(createQueryClient(), {
      meta: { errorTitle: "Não foi possível fazer o registro" },
      mutationFn: async () => {
        throw new Error("Esta conta já está registrada.");
      },
    });

    await observer.mutate().catch(() => undefined);

    expect(error).toHaveBeenCalledWith("Não foi possível fazer o registro", {
      description: "Esta conta já está registrada.",
    });
  });
});
