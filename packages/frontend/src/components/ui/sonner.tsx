import type { CSSProperties } from "react"
import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import {
  CircleCheckIcon,
  InfoIcon,
  LoaderCircleIcon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"

/**
 * Host único dos toasts, montado em AppProviders. Mesmo desenho do Turing dApp: cores ricas,
 * botão de fechar e as variáveis do tema shadcn. O tema segue o do sistema (claro ou escuro).
 */
const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      position="bottom-right"
      richColors
      closeButton
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <LoaderCircleIcon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as CSSProperties
      }
      toastOptions={{
        // o hash da transação quebra em qualquer ponto, sem estourar a largura do toast
        classNames: { toast: "font-sans", description: "break-all" },
      }}
      {...props}
    />
  )
}

export { Toaster }
