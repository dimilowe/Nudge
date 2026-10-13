import { useState } from "react";
import { UserProfile } from "@clerk/react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function ProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const updateName = useMutation({
    mutationFn: async () => apiRequest("PUT", "/api/profile/username", { username: name.trim() }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/creator"] }),
      ]);
      setName("");
      toast({ title: "Creator name updated" });
    },
    onError: (error: Error) => toast({ title: "Could not update name", description: error.message, variant: "destructive" }),
  });
  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gradient mb-2">Account settings</h1>
        <p className="text-muted-foreground">Manage your creator profile and sign-in security.</p>
      </div>
      <Card className="p-6 space-y-4">
        <Label htmlFor="creator-name">Creator display name</Label>
        <form onSubmit={(event) => { event.preventDefault(); updateName.mutate(); }} className="flex flex-col sm:flex-row gap-3">
          <Input id="creator-name" value={name} placeholder={user?.username || "Creator name"} maxLength={100} onChange={(e) => setName(e.target.value)} disabled={updateName.isPending} required data-testid="input-creator-name" />
          <Button type="submit" disabled={updateName.isPending || !name.trim()} data-testid="button-update-username">
            {updateName.isPending ? "Saving…" : "Save name"}
          </Button>
        </form>
      </Card>
      <section aria-label="Sign-in and security" className="overflow-x-auto">
        <UserProfile routing="hash" appearance={{ elements: {
          rootBox: { width: "100%", justifyContent: "stretch" },
          cardBox: { width: "100%", maxWidth: "100%" },
        } }} />
      </section>
    </div>
  );
}
