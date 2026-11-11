import { MutationCache, QueryClient, type DefaultOptions } from "@tanstack/react-query";
import { toast } from "sonner";
import { errorMessage, isUserRejection } from "@/lib/errors";
import { NotifiedError } from "@/lib/transaction";

declare module "@tanstack/react-query" {
  interface Register {
    mutationMeta: {
      /** Título do toast quando a mutation falha. Sem ele, a falha não é notificada globalmente. */
      errorTitle?: string;
    };
  }
}

/**
 * Erros de mutation são notificados num lugar só: cada mutation declara `meta.errorTitle`,
 * e recusas na carteira viram um aviso neutro em vez de erro.
 */
export function createQueryClient(defaultOptions?: DefaultOptions): QueryClient {
  return new QueryClient({
    defaultOptions,
    mutationCache: new MutationCache({
      onError(error, _variables, _onMutateResult, mutation) {
        const title = mutation.meta?.errorTitle;

        // o toast da própria transação já mostrou este erro
        if (!title || error instanceof NotifiedError) {
          return;
        }

        if (isUserRejection(error)) {
          toast.info("Pedido cancelado na carteira");
        } else {
          toast.error(title, { description: errorMessage(error) });
        }
      },
    }),
  });
}
