import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { zodValidator } from "@tanstack/zod-form-adapter";
import { createUser, loadingCreateUserQueryOptions } from "@/lib/authApi";
import { createUserSchema } from "@server/sharedTypes";

export const Route = createFileRoute("/signup")({
  component: Signup,
});

function Signup() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const form = useForm({
    validatorAdapter: zodValidator(),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      role: "",
    },
    onSubmit: async ({ value }) => {
      queryClient.setQueryData(loadingCreateUserQueryOptions.queryKey, {
        user: value,
      });
      try {
        await createUser({ value });

        // Assuming result contains the user data or a success message
        toast("Account Created", {
          description: `Successfully created account for: ${value.email}`,
        });

        queryClient.invalidateQueries({ queryKey: ["get-current-user"] });

        navigate({ to: "/" }); // Redirect to home after successful signup
      } catch (error: unknown) {
        console.error("Error while creating user:", error);

        // Type guard to check if the error is an instance of Error
        if (error instanceof Error) {
          toast("Error", { description: error.message || "An error occurred" });
        } else {
          // In case error is of an unknown type
          toast("Error", { description: "An unexpected error occurred" });
        }
      } finally {
        // Clear loading state
        queryClient.setQueryData(loadingCreateUserQueryOptions.queryKey, {});
      }
    },
  });

  return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="w-full max-w-md p-6 border rounded-lg shadow-lg">
        <h2 className="text-2xl text-center mb-4">Create Account</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void form.handleSubmit();
          }}
          className="flex flex-col gap-y-4">
          <form.Field
            name="firstName"
            validators={{
              onChange: createUserSchema.shape.firstName,
            }}
            children={(field) => (
              <div>
                <Label htmlFor={field.name}>First Name</Label>
                <Input
                  id={field.name}
                  name={field.name}
                  type="name"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  required
                />
              </div>
            )}
          />
          <form.Field
            name="lastName"
            validators={{
              onChange: createUserSchema.shape.lastName,
            }}
            children={(field) => (
              <div>
                <Label htmlFor={field.name}>Last Name</Label>
                <Input
                  id={field.name}
                  name={field.name}
                  type="name"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  required
                />
              </div>
            )}
          />
          <form.Field
            name="email"
            validators={{
              onChange: createUserSchema.shape.email,
            }}
            children={(field) => (
              <div>
                <Label htmlFor={field.name}>Email</Label>
                <Input
                  id={field.name}
                  name={field.name}
                  type="email"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  required
                />
              </div>
            )}
          />

          <form.Field
            name="password"
            validators={{
              onChange: createUserSchema.shape.password,
            }}
            children={(field) => (
              <div>
                <Label htmlFor={field.name}>Password</Label>
                <Input
                  id={field.name}
                  name={field.name}
                  type="password"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  required
                />
              </div>
            )}
          />
          <form.Field
            name="role"
            validators={{
              onChange: createUserSchema.shape.role,
            }}
            children={(field) => (
              <div>
                <Label htmlFor={field.name}>Role</Label>
                <div className="relative">
                  <select
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    required
                    className="w-full p-3 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Select a role</option>
                    <option value="landlord">Landlord</option>
                    <option value="tenant">Tenant</option>
                  </select>
                </div>
              </div>
            )}
          />
          <form.Subscribe
            selector={(state) => [state.canSubmit, state.isSubmitting]}
            children={([canSubmit, isSubmitting]) => (
              <Button className="mt-4 w-full" type="submit" disabled={!canSubmit}>
                {isSubmitting ? "..." : "Sign Up"}
              </Button>
            )}
          />
        </form>
        <p className="text-sm text-gray-500 text-center mt-4">
          Already have an account?{" "}
          <Button variant="link" className="p-0" onClick={() => navigate({ to: "/login" })}>
            Log in
          </Button>
        </p>
      </div>
    </div>
  );
}
