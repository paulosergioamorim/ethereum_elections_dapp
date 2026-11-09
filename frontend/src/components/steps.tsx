/** Lista numerada de passos (como votar, como se cadastrar). */
export function Steps({ steps }: { steps: { title: string; description: string }[] }) {
  return (
    <ol className="space-y-4">
      {steps.map((step, index) => (
        <li key={step.title} className="flex gap-3">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
            {index + 1}
          </span>

          <div className="space-y-0.5">
            <p className="text-sm font-medium">{step.title}</p>
            <p className="text-sm text-muted-foreground">{step.description}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
