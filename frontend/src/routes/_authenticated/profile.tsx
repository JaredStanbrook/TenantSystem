import { createFileRoute } from "@tanstack/react-router";
import { logoutUser } from "@/api/authApi";
//import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/profile")({
  component: Profile,
});

function Profile() {
  const auth = useAuth();

  return (
    <div className="p-2">
      <div className="flex items-center gap-2">
        {/*
                <Avatar>
                    {data.user.picture && (
                        <AvatarImage src={data.user.picture} alt={data.user.given_name} />
                    )}
                    <AvatarFallback>{data.user.given_name}</AvatarFallback>
                </Avatar>
                */}
        <p>{auth.user?.role}</p>
        <p>{auth.user?.firstName}</p>
        <p>{auth.user?.lastName}</p>
        <p>{auth.user?.email}</p>
      </div>
      <Button
        onClick={async () => {
          try {
            await logoutUser();
            window.location.href = "/"; // Redirect after logout
          } catch (error) {
            console.error("Logout failed:", error);
          }
        }}
        className="my-4">
        Logout!
      </Button>
    </div>
  );
}
