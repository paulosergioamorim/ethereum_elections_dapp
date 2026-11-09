import { toast } from "sonner";
import type { Hash, TransactionReceipt } from "viem";
import { raiseBlockFloor } from "@/lib/block-floor";
import { explorerTxUrl, publicClient } from "@/lib/chain";
import { errorMessage, isUserRejection } from "@/lib/errors";

export type TransactionNotice = {
  /** Enquanto a carteira pede confirmação: "Confirme a autorização na carteira." */
  signing: string;
  /** Detalhe da etapa de assinatura, abaixo do título (ex.: qual carteira). */
  details?: string;
  /** Depois do recibo com sucesso: "Carteira autorizada." */
  success: string;
};

/** Erro que já apareceu no toast da transação: o aviso global das mutations não o repete. */
export class NotifiedError extends Error {
  constructor(readonly original: unknown) {
    super(errorMessage(original), { cause: original });
    this.name = "NotifiedError";
  }
}

/** "Transação: 0x…", com o hash levando ao explorador de blocos quando a rede tem um. */
function TransactionHash({ hash }: { hash: Hash }) {
  const url = explorerTxUrl(hash);

  return (
    <>
      Transação:{" "}
      {url ? (
        <a href={url} target="_blank" rel="noreferrer" className="hover:underline">
          {hash}
        </a>
      ) : (
        hash
      )}
    </>
  );
}

/** Troca o texto do toast enquanto `send` trabalha (ex.: "Gerando a prova…" antes do envio). */
export type TransactionProgress = (title: string, details?: string) => void;

/**
 * Executa uma transação com o aviso do Turing dApp: um único toast que vai de "confirme na carteira"
 * para "aguardando confirmação" e termina em sucesso ou erro, no mesmo lugar, sem empilhar avisos.
 *
 * `send` faz tudo o que pede algo à carteira (simulação, assinaturas, envio) e devolve o hash.
 * Etapas demoradas antes do envio podem atualizar o toast com `progress`.
 * Erros viram o mesmo toast (recusa na carteira é aviso neutro) e saem como `NotifiedError`.
 */
export async function runTransaction(
  notice: TransactionNotice,
  send: (progress: TransactionProgress) => Promise<Hash>,
): Promise<TransactionReceipt> {
  const toastId = toast.loading(notice.signing, {
    description: notice.details,
    duration: Infinity,
    dismissible: false,
  });
  const progress: TransactionProgress = (title, details) => {
    toast.loading(title, { id: toastId, description: details, duration: Infinity, dismissible: false });
  };
  let hash: Hash | undefined;

  try {
    hash = await send(progress);

    toast.loading("Transação enviada. Aguardando confirmação…", {
      id: toastId,
      description: <TransactionHash hash={hash} />,
      duration: Infinity,
      dismissible: false,
    });

    // o sucesso só é anunciado depois do recibo com status de sucesso
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    if (receipt.status !== "success") {
      throw new Error("A transação não foi confirmada com sucesso.");
    }

    // as próximas leituras precisam enxergar esta transação
    raiseBlockFloor(receipt.blockNumber);

    toast.success(notice.success, {
      id: toastId,
      description: <TransactionHash hash={hash} />,
      duration: 6_000,
      dismissible: true,
    });

    return receipt;
  } catch (error) {
    const description = hash ? <TransactionHash hash={hash} /> : undefined;

    if (isUserRejection(error)) {
      toast.info("Pedido cancelado na carteira.", {
        id: toastId,
        description,
        duration: 6_000,
        dismissible: true,
      });
    } else {
      toast.error(errorMessage(error), {
        id: toastId,
        description,
        duration: 8_000,
        dismissible: true,
      });
    }

    throw new NotifiedError(error);
  }
}
