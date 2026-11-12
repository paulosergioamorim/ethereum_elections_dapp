import { isRouteErrorResponse, Link, useRouteError } from "react-router";
import { Button } from "@/components/ui/button";
import { errorMessage } from "@/lib/errors";

/** Erros não tratados de qualquer rota. Fica fora do layout, então não depende do cabeçalho funcionar. */
export function RouteError() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : errorMessage(error);

  return (
    <div className="mx-auto max-w-xl space-y-4 px-5 py-16">
      <h1 className="font-display text-4xl">Algo deu errado</h1>
      <p className="text-sm break-words text-muted-foreground">{message}</p>
      <Button asChild variant="outline">
        <Link to="/">Voltar para o início</Link>
      </Button>
    </div>
  );
}
