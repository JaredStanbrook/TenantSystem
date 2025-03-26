import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { zodValidator } from "@tanstack/zod-form-adapter";
import { createUser, loadingCreateUserQueryOptions } from "@/api/authApi";
import { createUserSchema } from "@server/sharedTypes";
import { useRef, useState } from "react";
import { useCreateMutation } from "@/api/auth-mutation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { APIProvider } from "@vis.gl/react-google-maps";
import { PlacePicker } from "@googlemaps/extended-component-library/react";
import { PlacePicker as TPlacePicker } from "@googlemaps/extended-component-library/place_picker.js";

export const Route = createFileRoute("/_auth/signup")({
  component: Signup,
});

function Signup() {
  const userMutation = useCreateMutation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("admin-account");

  const pickerRef = useRef<TPlacePicker>(null);

  const form = useForm({
    validatorAdapter: zodValidator(),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      role: activeTab === "admin-account" ? "landlord" : "tenant",
      address: "",
    },
    onSubmit: async ({ value }) => {
      try {
        // Ensure role is set based on active tab
        const submissionValue = {
          ...value,
          role: activeTab === "admin-account" ? "landlord" : "tenant",
        };

        await userMutation.mutateAsync(submissionValue);

        toast("Account Created", {
          description: `Successfully created account for: ${submissionValue.email}`,
        });

        navigate({ to: "/" }); // Redirect to home after successful signup
      } catch (error: unknown) {
        console.error("Error while creating user:", error);

        if (error instanceof Error) {
          toast("Error", { description: error.message || "An error occurred" });
        } else {
          toast("Error", { description: "An unexpected error occurred" });
        }
      }
    },
  });

  return (
    <Tabs
      className="w-[400px] justify-center items-center min-h-screen"
      value={activeTab}
      onValueChange={(value) => {
        setActiveTab(value);
        // Reset the role when switching tabs
        form.setFieldValue("role", value === "admin-account" ? "landlord" : "tenant");
      }}>
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="admin-account">Admin</TabsTrigger>
        <TabsTrigger value="tenant-account">tenant</TabsTrigger>
      </TabsList>
      <TabsContent value="admin-account">
        <Card>
          <CardHeader className="text-2xl text-center mb-4">Create Account</CardHeader>
          <CardContent>
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
              <form.Subscribe
                selector={(state) => [state.canSubmit, state.isSubmitting]}
                children={([canSubmit, isSubmitting]) => (
                  <Button className="mt-4 w-full" type="submit" disabled={!canSubmit}>
                    {isSubmitting ? "..." : "Sign Up"}
                  </Button>
                )}
              />
            </form>
          </CardContent>
          <CardFooter className="text-sm text-gray-500 text-center mt-4">
            Already have an account?{" "}
            <Button variant="link" className="p-0" onClick={() => navigate({ to: "/login" })}>
              Log in
            </Button>
          </CardFooter>
        </Card>
      </TabsContent>
      <TabsContent value="tenant-account">
        <Card>
          <CardHeader className="text-2xl text-center mb-4">Create Account</CardHeader>
          <CardContent>
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
                name="address"
                validators={{
                  onChange: createUserSchema.shape.address,
                }}
                children={(field) => (
                  <div>
                    <Label htmlFor={field.name}>Address</Label>
                    <div className="relative">
                      <APIProvider
                        solution-channel="GMP_GE_placepicker_v2"
                        apiKey="AIzaSyBarZdC3dMBHljW24FAJkDMvDNWkCZ6Byo">
                        <PlacePicker
                          ref={pickerRef}
                          forMap="gmap"
                          country={["aus"]}
                          placeholder="Enter your Mojo Dojo Casa House!"
                          onPlaceChange={() => {
                            field.handleChange(pickerRef.current?.value?.formattedAddress!);
                          }}
                        />
                      </APIProvider>
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
          </CardContent>
          <CardFooter className="text-sm text-gray-500 text-center mt-4">
            Already have an account?{" "}
            <Button variant="link" className="p-0" onClick={() => navigate({ to: "/login" })}>
              Log in
            </Button>
          </CardFooter>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
