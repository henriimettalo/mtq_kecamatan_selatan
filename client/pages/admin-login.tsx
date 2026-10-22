

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { login } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      disabled={pending}
      className="w-full bg-[#5e6ad2] hover:bg-[#828fff] text-white font-medium"
      style={{ fontWeight: 510 }}
    >
      {pending ? "Memproses..." : "Masuk"}
    </Button>
  );
}

export default function LoginPage() {
  const [state, formAction] = useActionState(login, null);

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-marketing px-4">
      <Card
        className="w-full max-w-md"
        style={{
          backgroundColor: "#ffffff",
          border: "1px solid #d0d6e0",
          borderRadius: "12px",
        }}
      >
        <CardHeader className="text-center pb-4">
          <CardTitle
            className="text-text-primary"
            style={{ fontWeight: 510, fontSize: "20px" }}
          >
            Admin Panel
          </CardTitle>
          <p
            className="text-text-tertiary mt-2"
            style={{ fontSize: "14px", fontWeight: 400 }}
          >
            Masukkan username dan password untuk mengakses panel admin
          </p>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            <div className="space-y-2">
              <Label
                htmlFor="username"
                className="text-text-secondary"
                style={{ fontSize: "14px", fontWeight: 510 }}
              >
                Username
              </Label>
              <Input
                id="username"
                name="username"
                type="text"
                required
                autoComplete="username"
                placeholder="Masukkan username (contoh: admin / user)"
                className="bg-white border-[#d0d6e0] text-text-primary placeholder:text-text-tertiary"
                style={{ borderRadius: "6px" }}
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="password"
                className="text-text-secondary"
                style={{ fontSize: "14px", fontWeight: 510 }}
              >
                Password
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="Masukkan password"
                className="bg-white border-[#d0d6e0] text-text-primary placeholder:text-text-tertiary"
                style={{ borderRadius: "6px" }}
              />
            </div>
            {state?.error && (
              <p
                className="text-red-600"
                style={{ fontSize: "14px", fontWeight: 400 }}
              >
                {state.error}
              </p>
            )}
            <SubmitButton />
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
