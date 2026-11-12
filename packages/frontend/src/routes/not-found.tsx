import { Link } from "react-router";
import { Button } from "@/components/ui/button";

export function NotFound() {
  return (
    <div className="space-y-5 py-8">
      <h1 className="font-display text-4xl">Página não encontrada</h1>
      <Button asChild variant="outline">
        <Link to="/">Voltar para as eleições</Link>
      </Button>
    </div>
  );
}
