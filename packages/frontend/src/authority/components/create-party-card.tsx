import { ArrowRightIcon, FlagIcon, Loader2Icon } from "lucide-react";
import { useState, type SubmitEvent } from "react";
import { Link } from "react-router";
import type { Address } from "viem";
import { Banner } from "@/components/banner";
import { SectionCard } from "@/components/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthority } from "@/factory";
import {
  useCreateParty,
  validateCreatePartyForm,
  type CreatePartyErrors,
  type CreatePartyValues,
} from "@/parties";

const emptyForm: CreatePartyValues = { president: "", name: "" };

function FieldError({ id, message }: { id: string; message: string | undefined }) {
  return message ? (
    <p id={id} className="text-xs text-destructive">
      {message}
    </p>
  ) : null;
}

/** Criar um partido: a autoridade indica o presidente, que passa a poder sacar as doações. */
export function CreatePartyCard() {
  const { reason } = useAuthority();
  const createParty = useCreateParty();
  const [values, setValues] = useState<CreatePartyValues>(emptyForm);
  const [errors, setErrors] = useState<CreatePartyErrors>({});
  const [created, setCreated] = useState<Address | undefined>();

  function update(field: keyof CreatePartyValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const { errors: found, input } = validateCreatePartyForm(values);
    setErrors(found);

    if (!input || reason) {
      return;
    }

    createParty.mutate(input, {
      onSuccess: (address) => {
        setCreated(address);
        setValues(emptyForm);
      },
    });
  }

  return (
    <SectionCard
      layout="stacked"
      icon={FlagIcon}
      title="Criar partido"
      description="Nome e presidente. Só o presidente saca as doações."
    >
      {created && (
        <div className="mb-5">
          <Banner
            action={
              <Button asChild variant="outline" size="sm" className="bg-card">
                <Link to={`/parties/${created}`}>
                  Abrir partido
                  <ArrowRightIcon />
                </Link>
              </Button>
            }
          >
            Partido criado.
          </Banner>
        </div>
      )}

      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="party-name">Nome do partido</Label>
          <Input
            id="party-name"
            value={values.name}
            onChange={(event) => update("name", event.target.value)}
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? "party-name-error" : undefined}
          />
          <FieldError id="party-name-error" message={errors.name} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="party-president">Endereço do presidente</Label>
          <Input
            id="party-president"
            value={values.president}
            onChange={(event) => update("president", event.target.value)}
            placeholder="0x…"
            className="font-mono"
            aria-invalid={!!errors.president}
            aria-describedby={errors.president ? "party-president-error" : undefined}
          />
          <FieldError id="party-president-error" message={errors.president} />
        </div>

        <Button type="submit" className="h-10 w-full" disabled={!!reason || createParty.isPending}>
          {createParty.isPending && <Loader2Icon className="animate-spin" />}
          Criar partido
        </Button>

        {reason && <p className="text-center text-xs text-muted-foreground">{reason}</p>}
      </form>
    </SectionCard>
  );
}
