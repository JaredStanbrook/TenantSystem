// src/routes/_auth/login.tsx
import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  useLoginMutation,
  useLoginPasskeyMutation,
  getAuthMethodsQueryOptions,
} from "@/api/authApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // Assuming you have shadcn tabs
import { Loader2, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/_auth/login")({
  beforeLoad: ({ context }) => {
    if (context.auth.isAuthenticated) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");

  const [requiresTotp, setRequiresTotp] = useState(false);

  const { data: config, isLoading } = useQuery(getAuthMethodsQueryOptions);
  const { mutate: login, isPending: isPwdPending } = useLoginMutation();
  const { mutate: loginPasskey, isPending: isPkPending } = useLoginPasskeyMutation();

  const handlePasswordLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = requiresTotp ? { email, password, totpCode } : { email, password };
    login(payload, {
      onSuccess: (data) => {
        if (data?.requireTotp) {
          setRequiresTotp(true);
        } else {
          navigate({ to: "/dashboard" });
        }
      },
    });
  };

  const handlePasskeyLogin = (e: React.FormEvent) => {
    e.preventDefault();
    loginPasskey({ email }, { onSuccess: () => navigate({ to: "/dashboard" }) });
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  //const hasPasskey = config?.methods.includes("passkey");
  //const hasPassword = config?.methods.includes("password");

  //const defaultTab = hasPassword ? "password" : "passkey";

  if (requiresTotp) {
    return (
      <div className="container grow flex flex-col items-center justify-center py-12">
        <div className="mx-auto flex w-full flex-col justify-center space-y-8 sm:w-[400px] p-8 border rounded-lg shadow-xl bg-card">
          <div className="flex flex-col space-y-2 text-center items-center">
            <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
              <ShieldCheck className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">Two-Factor Auth</h1>
            <p className="text-sm text-muted-foreground">
              Enter the 6-digit code from your authenticator app.
            </p>
          </div>

          <form onSubmit={handlePasswordLogin} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="totp">Authentication Code</Label>
              <Input
                id="totp"
                type="text"
                maxLength={6}
                placeholder="000000"
                className="text-center text-lg tracking-widest"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
                autoFocus
                required
              />
            </div>
            <Button type="submit" disabled={isPwdPending} className="w-full">
              {isPwdPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Verify
            </Button>
            <Button
              variant="ghost"
              type="button"
              onClick={() => {
                setRequiresTotp(false);
                setTotpCode("");
              }}>
              Back to Login
            </Button>
          </form>
        </div>
      </div>
    );
  }
  return (
    <div className="container grow flex flex-col items-center justify-center py-12">
      <div className="mx-auto flex w-full flex-col justify-center space-y-8 sm:w-[400px] p-8 border rounded-lg shadow-xl bg-card">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Sign In</h1>
          <p className="text-sm text-muted-foreground">Welcome back to the platform</p>
        </div>

        <Tabs defaultValue={defaultTab} className="w-full">
          {hasPasskey && hasPassword && (
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="password">Password</TabsTrigger>
              <TabsTrigger value="passkey">Passkey</TabsTrigger>
            </TabsList>
          )}

          {/* --- Passkey Form --- */}
          {hasPasskey && (
            <TabsContent value="passkey">
              <form onSubmit={handlePasskeyLogin} className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="pk-email">Email Address</Label>
                  <Input
                    id="pk-email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" disabled={isPkPending} className="w-full">
                  {isPkPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {isPkPending ? "Authenticating..." : "Sign In with Passkey"}
                </Button>
              </form>
            </TabsContent>
          )}

          {/* --- Password Form --- */}
          {hasPassword && (
            <TabsContent value="password">
              <form onSubmit={handlePasswordLogin} className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="pwd-email">Email Address</Label>
                  <Input
                    id="pwd-email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" disabled={isPwdPending} className="w-full">
                  {isPwdPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Sign In
                </Button>
              </form>
            </TabsContent>
          )}
        </Tabs>

        {!hasPasskey && !hasPassword && (
          <div className="text-center text-destructive">No login methods configured.</div>
        )}
      </div>

      <p className="px-8 mt-6 text-center text-sm text-muted-foreground">
        Don't have an account?{" "}
        <Link
          to="/register"
          className="underline underline-offset-4 hover:text-primary font-medium">
          Create Account
        </Link>
      </p>
    </div>
  );
}
