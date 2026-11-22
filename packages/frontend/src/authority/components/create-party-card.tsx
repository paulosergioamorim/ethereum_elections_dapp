import { valibotResolver } from "@hookform/resolvers/valibot";
import { ArrowRightIcon, FlagIcon, Loader2Icon } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router";
import type { Address } from "viem";
import { Banner } from "@/components/banner";
import { FieldError } from "@/components/field-error";
import { SectionCard } from "@/components/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthority } from "@/factory";
import { createPartySchema, useCreateParty, type CreatePartyValues } from "@/parties";

const emptyForm: CreatePartyValues = { president: "", name: "" };

/** Criar um partido: a autoridade indica o presidente, que passa a poder sacar as doações. */
export function CreatePartyCard() {
  // react-hook-form: o React Compiler memoizaria `register` e o `reset` não limparia os campos (AD-001)
  "use no memo";

  const { reason } = useAuthority();
  const createParty = useCreateParty();
  const { register, handleSubmit, reset, clearErrors, formState } = useForm({
    defaultValues: emptyForm,
    resolver: valibotResolver(createPartySchema),
    reValidateMode: "onSubmit",
  });
  const { errors } = formState;
  const [created, setCreated] = useState<Address | undefined>();

  const onSubmit = handleSubmit((input) => {
    if (reason) {
      return;
    }

    createParty.mutate(input, {
      onSuccess: (address) => {
        setCreated(address);
        reset();
      },
    });
  });

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
            {...register("name", { onChange: () => clearErrors("name") })}
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? "party-name-error" : undefined}
          />
          <FieldError id="party-name-error" message={errors.name?.message} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="party-president">Endereço do presidente</Label>
          <Input
            id="party-president"
            {...register("president", { onChange: () => clearErrors("president") })}
            placeholder="0x…"
            className="font-mono"
            aria-invalid={!!errors.president}
            aria-describedby={errors.president ? "party-president-error" : undefined}
          />
          <FieldError id="party-president-error" message={errors.president?.message} />
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
