import { getUserQueryOptions } from "@/api/authApi";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: HomeComponent,
});

function HomeComponent() {
  const { isPending, data } = useQuery(getUserQueryOptions);

  if (isPending) return <h3>Loading...</h3>;

  return (
    <>
      <h3>Welcome {data?.firstName || "Guest"}!</h3>
    </>
  );
}
