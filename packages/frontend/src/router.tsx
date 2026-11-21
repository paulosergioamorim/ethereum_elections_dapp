import { createBrowserRouter, type RouteObject } from "react-router";
import { About } from "@/routes/about";
import { Admin } from "@/routes/admin";
import { Election } from "@/routes/election";
import { Elections } from "@/routes/elections";
import { Parties } from "@/routes/parties";
import { NotFound } from "@/routes/not-found";
import { Register } from "@/routes/register";
import { RootLayout } from "@/routes/root-layout";
import { RouteError } from "@/routes/route-error";

/** Separadas do router para os testes montarem as mesmas rotas num `createMemoryRouter`. */
export const routes: RouteObject[] = [
  {
    path: "/",
    Component: RootLayout,
    ErrorBoundary: RouteError,
    children: [
      { index: true, Component: Elections },
      { path: "elections/:address", Component: Election },
      { path: "parties", Component: Parties },
      { path: "register", Component: Register },
      { path: "about", Component: About },
      { path: "admin", Component: Admin },
      { path: "*", Component: NotFound },
    ],
  },
];

/** SPA em modo data, sem SSR. No GitHub Pages, o `404.html` (cópia do `index.html`, feita no workflow) atende as rotas profundas. */
export const router = createBrowserRouter(routes, { basename: import.meta.env.BASE_URL });
