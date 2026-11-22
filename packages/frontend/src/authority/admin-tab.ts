const adminTabs = ["eleitores", "eleicoes", "partidos"] as const;

export type AdminTab = (typeof adminTabs)[number];

/** A aba da URL (`?aba=`): ausente ou desconhecida abre "eleitores". */
export function parseAdminTab(param: string | null): AdminTab {
  return adminTabs.find((tab) => tab === param) ?? "eleitores";
}
