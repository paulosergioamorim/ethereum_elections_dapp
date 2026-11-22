import * as v from "valibot";

/** Texto digitado com algum conteúdo depois de aparado; vazio vira `message`. */
export function requiredText(message: string) {
  return v.pipe(v.string(), v.trim(), v.nonEmpty(message));
}

/**
 * Transforma o texto de um campo com uma função que devolve o valor ou o erro em uma frase
 * (`parseAddress`, `parseEthAmount`): a frase vira a mensagem do campo.
 */
export function parsedField<Output>(parse: (text: string) => { value: Output } | { error: string }) {
  return v.pipe(
    v.string(),
    v.rawTransform(({ dataset, addIssue, NEVER }) => {
      const parsed = parse(dataset.value);

      if ("error" in parsed) {
        addIssue({ message: parsed.error });

        return NEVER;
      }

      return parsed.value;
    }),
  );
}

export type FormErrors<Values> = Partial<Record<keyof Values, string>>;

/** Valida `values` com o schema: a primeira mensagem de cada campo, ou o valor tipado. */
export function parseForm<Schema extends v.GenericSchema>(
  schema: Schema,
  values: v.InferInput<Schema>,
): { errors: FormErrors<v.InferInput<Schema>>; input?: v.InferOutput<Schema> } {
  const result = v.safeParse(schema, values);

  if (result.success) {
    return { errors: {}, input: result.output };
  }

  const errors: Record<string, string> = {};

  for (const issue of result.issues) {
    const key = issue.path?.[0]?.key;

    if (typeof key === "string" && !(key in errors)) {
      errors[key] = issue.message;
    }
  }

  return { errors: errors as FormErrors<v.InferInput<Schema>> };
}
