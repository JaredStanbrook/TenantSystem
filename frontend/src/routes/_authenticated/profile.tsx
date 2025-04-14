import { createFileRoute } from "@tanstack/react-router";
import { getUserQueryOptions, logoutUser, useLogoutMutation } from "@/api/authApi";
//import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useSuspenseQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated/profile")({
  component: Profile,
});

function Profile() {
  const { isPending, error, data } = useSuspenseQuery(getUserQueryOptions);

  if (isPending) return "loading";
  if (error) return "not logged in";

  const logoutMutation = useLogoutMutation();

  const handleLogout = () => {
    logoutMutation.mutate();
  };

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
        <p>{data.role}</p>
        <p>{data.firstName}</p>
        <p>{data.lastName}</p>
        <p>{data.email}</p>
      </div>
      <button className="my-4" onClick={handleLogout} disabled={logoutMutation.isPending}>
        Log out
      </button>
    </div>
  );
}
