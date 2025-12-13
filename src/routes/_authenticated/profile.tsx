import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { getUserQueryOptions, useLogoutMutation } from "@/api/authApi";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { LogOut, User } from "lucide-react";

export const Route = createFileRoute("/_authenticated/profile")({
  component: Profile,
});

function Profile() {
  const { data } = useSuspenseQuery(getUserQueryOptions);
  const logoutMutation = useLogoutMutation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        // Redirect or handle post-logout logic
        navigate({ to: "/" });
      },
    });
  };

  // Helper to get initials for avatar fallback
  const getInitials = (first: string, last: string) => {
    return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
  };

  return (
    <div className="p-8 max-w-4xl m-auto pt-16 flex flex-col items-center">
      <div className="w-full max-w-md">
        <header className="mb-8 text-center sm:text-left">
          <h1 className="text-3xl font-bold tracking-tight">👤 My Profile</h1>
          <p className="text-muted-foreground">Manage your account settings and preferences.</p>
        </header>

        <Card className="shadow-md">
          <CardHeader className="flex flex-col items-center sm:flex-row sm:gap-6 pb-2">
            <Avatar className="h-20 w-20 sm:h-24 sm:w-24 border-4 border-white shadow-sm">
              {/* Note: data.user.picture is commonly null in some Auth0/Kinde setups 
                  unless explicitly set. The fallback is crucial.
               */}
              {/* {data.user.picture && (
                <AvatarImage src={data.user.picture} alt={data.user.given_name} />
              )} */}
              <AvatarFallback className="text-xl bg-primary/10 text-primary">
                {getInitials(data.firstName || "U", data.lastName || "N")}
              </AvatarFallback>
            </Avatar>
            <div className="text-center sm:text-left mt-4 sm:mt-0">
              <CardTitle className="text-2xl">
                {data.firstName} {data.lastName}
              </CardTitle>
              <CardDescription className="text-base font-medium text-primary mt-1 capitalize">
                {data.role}
              </CardDescription>
              <p className="text-sm text-muted-foreground break-all mt-1">{data.email}</p>
            </div>
          </CardHeader>

          <Separator className="my-2" />

          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-1 gap-1">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Account Details
              </h3>
              <div className="bg-gray-50 p-3 rounded-md border flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {data.firstName} {data.lastName}
                </span>
              </div>
              {/* You can expand this section with Phone, Address, etc. later */}
            </div>
          </CardContent>

          <CardFooter className="flex justify-between bg-gray-50/50 p-6 border-t">
            <p className="text-xs text-muted-foreground">
              Account ID: <span className="font-mono">{data.id}</span>
            </p>
            <Button
              variant="destructive"
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
              className="gap-2">
              <LogOut className="h-4 w-4" />
              {logoutMutation.isPending ? "Logging out..." : "Log out"}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
