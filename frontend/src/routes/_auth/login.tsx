import { createFileRoute, useNavigate, useLocation } from "@tanstack/react-router";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useForm } from "@tanstack/react-form";
import { zodValidator } from "@tanstack/zod-form-adapter";
import { createUserSchema } from "@server/sharedTypes";
import { getUserQueryOptions, useLoginMutation, useLogoutMutation } from "@/api/authApi";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_auth/login")({
  component: Login,
});

function Login() {
  const loginMutation = useLoginMutation();
  const logoutMutation = useLogoutMutation();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const form = useForm({
    validatorAdapter: zodValidator(),
    defaultValues: {
      email: "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      try {
        const data = queryClient.getQueryData(getUserQueryOptions.queryKey);

        if (data) {
          await logoutMutation.mutateAsync();
        }

        await loginMutation.mutateAsync(value);

        // TODO: Update the cache with the latest user data using queryClient.setQueryData

        const redirectUrl = new URLSearchParams(location.search).get("redirect") || "/";
        navigate({ to: redirectUrl, replace: true });

        toast("Login Successful", {
          description: `Welcome back, ${value.email}!`,
        });
      } catch (error) {
        toast("Error", { description: "Invalid email or password" });
      }
    },
  });

  return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="w-full max-w-md p-6 border rounded-lg shadow-lg">
        <h2 className="text-2xl text-center mb-6">Login</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void form.handleSubmit();
          }}
          className="flex flex-col gap-y-4 max-w-xl m-auto">
          <form.Field
            name="email"
            validators={{ onChange: createUserSchema.shape.email }}
            children={(field) => (
              <div>
                <Label htmlFor={field.name}>Email</Label>
                <Input
                  id={field.name}
                  type="email"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                {field.state.meta.isTouched ? <em>{field.state.meta.isTouched}</em> : null}
              </div>
            )}
          />

          <form.Field
            name="password"
            validators={{ onChange: createUserSchema.shape.password }}
            children={(field) => (
              <div>
                <Label htmlFor={field.name}>Password</Label>
                <Input
                  id={field.name}
                  type="password"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                {field.state.meta.isTouched ? <em>{field.state.meta.isTouched}</em> : null}
              </div>
            )}
          />

          <form.Subscribe
            selector={(state) => [state.canSubmit, state.isSubmitting]}
            children={([canSubmit, isSubmitting]) => (
              <Button className="mt-4" type="submit" disabled={!canSubmit}>
                {isSubmitting ? "..." : "Login"}
              </Button>
            )}
          />
        </form>
        <p className="text-sm text-gray-500 text-center mt-4">
          <Button variant="link" className="p-0" onClick={() => navigate({ to: "/signup" })}>
            Create Account?
          </Button>
        </p>
        <p className="text-sm text-gray-500 text-center mt-4">
          <Button variant="link" className="p-0" onClick={() => navigate({ to: "/login" })}>
            Forgotten password?
          </Button>
        </p>
      </div>
    </div>
  );
}
