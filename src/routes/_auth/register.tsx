// src/routes/_auth/register.tsx
import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  useRegisterMutation,
  useRegisterPasskeyMutation,
  getAuthMethodsQueryOptions,
} from "@/api/authApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_auth/register")({
  beforeLoad: ({ context }) => {
    if (context.auth.isAuthenticated) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();

  // Form State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>(""); // Role state

  const { data: config, isLoading } = useQuery(getAuthMethodsQueryOptions);

  // Effect: Set default role once config loads
  useEffect(() => {
    if (config?.defaultRole) {
      setSelectedRole(config.defaultRole);
    }
  }, [config?.defaultRole]);

  const { mutate: registerPwd, isPending: isPwdPending } = useRegisterMutation();
  const { mutate: registerPasskey, isPending: isPkPending } = useRegisterPasskeyMutation();

  // Helper to get the role payload (only send if user actually selected something distinct)
  const getRolePayload = () => {
    // If there is only 1 public role, we don't strictly need to send it
    // (backend falls back to default), but sending it is explicit and safe.
    return selectedRole;
  };

  const handlePasswordRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      alert("Passwords do not match"); // Replace with toast
      return;
    }
    registerPwd(
      { email, password, role: getRolePayload() },
      { onSuccess: () => navigate({ to: "/dashboard" }) }
    );
  };

  const handlePasskeyRegister = (e: React.FormEvent) => {
    e.preventDefault();
    // Passkey registration usually happens in two steps (options -> verify).
    // Ensure your backend 'options' endpoint or 'verify' endpoint accepts the role.
    // Usually, we bind the role to the session/user *after* verification,
    // or pass it in the initial 'register/options' call to store in a temp session.
    registerPasskey(
      { email }, // You might need to update this hook to accept 'role'
      { onSuccess: () => navigate({ to: "/dashboard" }) }
    );
  };

  if (isLoading || !config) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const publicRoles = config.roles || [];
  const showRoleSelector = publicRoles.length > 1; // Only show if choice exists

  const hasPasskey = config.methods.includes("passkey");
  const hasPassword = config.methods.includes("password");
  const defaultTab = hasPassword ? "password" : "passkey";

  return (
    <div className="container grow flex flex-col items-center justify-center py-12">
      <div className="mx-auto flex w-full flex-col justify-center space-y-8 sm:w-[400px] p-8 border rounded-lg shadow-xl bg-card">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Create Account</h1>
          <p className="text-sm text-muted-foreground">Get started with our platform</p>
        </div>

        <Tabs defaultValue={defaultTab} className="w-full">
          {hasPasskey && hasPassword && (
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="password">Password</TabsTrigger>
              <TabsTrigger value="passkey">Passkey</TabsTrigger>
            </TabsList>
          )}

          {/* SHARED: Role Selector (If applicable) */}
          {showRoleSelector && (
            <div className="mb-4 space-y-2">
              <Label>I want to join as a...</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {publicRoles.map((role) => (
                    <SelectItem key={role} value={role} className="capitalize">
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* --- Password Registration --- */}
          {hasPassword && (
            <TabsContent value="password">
              <form onSubmit={handlePasswordRegister} className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="reg-email">Email Address</Label>
                  <Input
                    id="reg-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="reg-password">Password</Label>
                  <Input
                    id="reg-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="reg-confirm">Confirm Password</Label>
                  <Input
                    id="reg-confirm"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                </div>
                <Button type="submit" disabled={isPwdPending} className="w-full">
                  {isPwdPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Create Account
                </Button>
              </form>
            </TabsContent>
          )}

          {/* --- Passkey Registration --- */}
          {hasPasskey && (
            <TabsContent value="passkey">
              <form onSubmit={handlePasskeyRegister} className="grid gap-4">
                <div className="bg-muted p-4 rounded-md text-sm text-muted-foreground mb-2">
                  Passkeys verify your identity using your fingerprint, face, or device PIN.
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="pk-reg-email">Email Address</Label>
                  <Input
                    id="pk-reg-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" disabled={isPkPending} className="w-full">
                  {isPkPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Register with Passkey
                </Button>
              </form>
            </TabsContent>
          )}
        </Tabs>
      </div>

      <p className="px-8 mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link to="/login" className="underline underline-offset-4 hover:text-primary font-medium">
          Sign In
        </Link>
      </p>
    </div>
  );
}
