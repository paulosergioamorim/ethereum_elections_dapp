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
 * Host único dos toasts, montado em AppProviders. O desenho é o de um comprovante: folha branca com a
 * borda fina das outras folhas, e a situação num bloco de cor à esquerda (regras em `index.css`,
 * seção "Toasts"). O tema segue o do sistema (claro ou escuro).
 */
const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      position="bottom-right"
      closeButton
      gap={12}
      // no celular, acima da navegação fixa no pé da tela
      mobileOffset={{ bottom: 80 }}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-5" />,
        info: <InfoIcon className="size-5" />,
        warning: <TriangleAlertIcon className="size-5" />,
        error: <OctagonXIcon className="size-5" />,
        loading: <LoaderCircleIcon className="size-5 animate-spin" />,
      }}
      // sem o estilo padrão do sonner: o desenho inteiro vem do `index.css`
      toastOptions={{ unstyled: true }}
      {...props}
    />
  )
}

export { Toaster }
