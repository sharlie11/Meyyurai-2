import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/reset_password")({
  head: () => ({ meta: [{ title: "Reset password — Meyyurai" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Password updated");
      navigate({ to: "/" });
    }
  };

  return (
    <div className="min-h-dvh flex items-center justify-center px-6 bg-background">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4 animate-fade-up">
        <h1 className="text-2xl font-display text-foreground text-center">Set a new password</h1>
        <div>
          <Label htmlFor="np">New password</Label>
          <Input
            id="np"
            type="password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="mt-1 h-11 rounded-xl"
          />
        </div>
        <Button type="submit" disabled={loading} className="w-full h-11 rounded-full">
          Update password
        </Button>
      </form>
    </div>
  );
}
