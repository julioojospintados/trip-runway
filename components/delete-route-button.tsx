"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteSavedRoute } from "@/app/actions/routes";
import { Button } from "@/components/ui/button";

interface DeleteRouteButtonProps {
  savedRouteId: string;
  /** Nome della destinazione: rende l'etichetta accessibile distinguibile tra più card. */
  label: string;
}

export function DeleteRouteButton({
  savedRouteId,
  label,
}: DeleteRouteButtonProps) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      disabled={isPending}
      onClick={() => startTransition(() => void deleteSavedRoute(savedRouteId))}
      // L'icona da sola non basta per uno screen reader: serve il nome della rotta.
      aria-label={`Rimuovi la rotta verso ${label}`}
    >
      <Trash2 aria-hidden="true" className="size-4" />
    </Button>
  );
}
