import { Link } from "react-router";
import { Button } from "@/components/ui/button";

export function NotFound() {
  return (
    <div className="space-y-4 py-12 text-center">
      <h1 className="text-2xl font-semibold">Página não encontrada</h1>
      <Button asChild variant="outline">
        <Link to="/">Voltar para as eleições</Link>
      </Button>
    </div>
  );
}
