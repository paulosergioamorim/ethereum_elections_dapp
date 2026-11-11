import { useEffect, useState } from "react";

function read<T>(key: string): T | undefined {
  try {
    const raw = window.localStorage.getItem(key);
    return raw === null ? undefined : (JSON.parse(raw) as T);
  } catch {
    return undefined;
  }
}

function write<T>(key: string, value: T): void {
  try {
    if (value === null || value === undefined) {
      window.localStorage.removeItem(key);
    } else {
      window.localStorage.setItem(key, JSON.stringify(value));
    }
  } catch {
    // modo privado ou armazenamento bloqueado: o estado vale só para esta sessão
  }
}

/**
 * `useState` que sobrevive ao recarregamento da página (localStorage).
 * Só para conveniências deste navegador, como lembrar a carteira e a conta escolhidas.
 */
export function usePersistentState<T>(key: string, initial: T): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => read<T>(key) ?? initial);

  useEffect(() => {
    write(key, value);
  }, [key, value]);

  return [value, setValue];
}
