import * as v from "valibot";
import { parseForm } from "@/lib/schema";
import { ethAmountField } from "./amount";
import { addressField } from "./forms";

/**
 * As regras do `withdraw` que dá para conferir antes da carteira: destino válido e não zero, valor
 * positivo e no máximo o saldo (`balance`, em wei). Saque de zero não é oferecido. `holder` é quem
 * guarda o saldo, para a mensagem ("partido" ou "candidato"). O saldo muda, então o schema é montado
 * a cada validação.
 */
export function withdrawSchema(balance: bigint, holder: "partido" | "candidato" = "partido") {
  return v.object({
    to: addressField,
    amount: v.pipe(ethAmountField, v.maxValue(balance, `O valor é maior que o saldo do ${holder}.`)),
  });
}

export type WithdrawValues = v.InferInput<ReturnType<typeof withdrawSchema>>;
export type WithdrawInput = v.InferOutput<ReturnType<typeof withdrawSchema>>;

export function validateWithdrawForm(
  values: WithdrawValues,
  balance: bigint,
  holder: "partido" | "candidato" = "partido",
) {
  return parseForm(withdrawSchema(balance, holder), values);
}
