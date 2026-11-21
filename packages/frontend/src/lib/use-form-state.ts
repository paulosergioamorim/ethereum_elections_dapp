import { useState } from "react";

/** Valores e erros por campo de um formulário; editar um campo limpa o erro dele. */
export function useFormState<Values extends Record<string, string>>(initial: Values) {
  const [values, setValues] = useState<Values>(initial);
  const [errors, setErrors] = useState<Partial<Record<keyof Values, string>>>({});

  function update(field: keyof Values, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  return { values, errors, setErrors, update, reset: () => setValues(initial) };
}
