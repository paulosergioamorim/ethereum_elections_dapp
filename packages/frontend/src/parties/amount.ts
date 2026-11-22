import * as v from "valibot";
import { parseEther } from "viem";
import { parsedField } from "@/lib/schema";

/**
 * Quantia em ETH digitada ("0.5" ou "1,5") para wei. Aceita de 1 wei (18 casas) em diante; vazio,
 * texto, negativo, zero ou mais de 18 casas viram o erro em uma frase.
 */
export function parseEthAmount(text: string): { wei: bigint } | { error: string } {
  const value = text.trim().replace(",", ".");

  if (!/^\d+(\.\d+)?$/.test(value)) {
    return { error: "Informe um valor em ETH, como 0,5." };
  }

  const [, fraction = ""] = value.split(".");

  if (fraction.length > 18) {
    return { error: "O ETH tem no máximo 18 casas decimais." };
  }

  const wei = parseEther(value);

  if (wei === 0n) {
    return { error: "O valor precisa ser maior que zero." };
  }

  return { wei };
}

/** Campo de quantia em ETH digitada, saindo em wei. */
export const ethAmountField = parsedField((text) => {
  const parsed = parseEthAmount(text);

  return "error" in parsed ? parsed : { value: parsed.wei };
});

/** O formulário de doação: só a quantia, em wei na saída. */
export const donateSchema = v.object({ amount: ethAmountField });
