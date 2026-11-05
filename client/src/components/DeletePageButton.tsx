import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface DeletePageButtonProps {
  page: { id: string; title: string };
  creatorId: string;
  onDeleted?: () => void;
}

function getDeleteErrorMessage(error: unknown) {
  if (!(error instanceof Error)) return "Please try again.";
  const responseBody = error.message.match(/^\d+:\s*([\s\S]+)$/)?.[1];
  if (!responseBody) return "Please try again.";
  try {
    const payload = JSON.parse(responseBody);
    return typeof payload.error === "string" ? payload.error : "Please try again.";
  } catch {
    return "Please try again.";
  }
}

export function DeletePageButton({ page, creatorId, onDeleted }: DeletePageButtonProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const deletePageMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/pages/${encodeURIComponent(page.id)}`),
    onSuccess: () => {
      queryClient.setQueryData(["/api/pages", creatorId], (current: any) =>
        current
          ? { ...current, pages: current.pages.filter((currentPage: { id: string }) => currentPage.id !== page.id) }
          : current,
      );
      void queryClient.invalidateQueries({ queryKey: ["/api/pages", creatorId] });
      for (const queryKey of [
        "/api/offers",
        "/api/routing-rules",
        "/api/automations",
        "/api/experiments",
        "/api/analytics/offers",
        "/api/analytics/page",
      ]) {
        void queryClient.invalidateQueries({ queryKey: [queryKey] });
      }
      setOpen(false);
      toast({ title: "Page deleted", description: `"${page.title}" and its public link have been removed.` });
      onDeleted?.();
    },
    onError: (error) => {
      toast({
        title: "Could not delete page",
        description: getDeleteErrorMessage(error),
        variant: "destructive",
      });
    },
  });

  return (
    <AlertDialog open={open} onOpenChange={(nextOpen) => !deletePageMutation.isPending && setOpen(nextOpen)}>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-10 w-10 shrink-0 text-destructive hover:text-destructive"
          aria-label={`Delete ${page.title}`}
          title="Delete page"
          data-testid={`button-delete-page-${page.id}`}
          onClick={(event) => event.stopPropagation()}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete “{page.title}”?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently removes the public page link, its offers, routing rules, automations, experiments, and analytics. Anyone using this page’s URL will no longer be able to open it. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deletePageMutation.isPending}>Keep page</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={deletePageMutation.isPending}
            onClick={(event) => {
              event.preventDefault();
              deletePageMutation.mutate();
            }}
          >
            {deletePageMutation.isPending ? "Deleting…" : "Delete page"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
