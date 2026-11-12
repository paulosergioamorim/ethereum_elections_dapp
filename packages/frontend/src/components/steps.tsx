/** Passos em ordem (como votar, como se registrar), com o número em algarismo estreito. */
export function Steps({ steps }: { steps: { title: string; description: string }[] }) {
  return (
    <ol className="space-y-5">
      {steps.map((step, index) => (
        <li key={step.title} className="flex gap-4">
          <span aria-hidden className="w-5 shrink-0 font-numeral text-4xl leading-[0.85] text-primary">
            {index + 1}
          </span>

          <div className="space-y-0.5">
            <p className="text-sm font-semibold">{step.title}</p>
            <p className="text-sm text-muted-foreground">{step.description}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
