import { createFileRoute } from "@tanstack/react-router";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/apiClient";

export const Route = createFileRoute("/_authenticated/")({
  component: Index,
});

async function getTotalSpent() {
  const res = await api.expense["total-owed"].$get();
  if (!res.ok) {
    throw new Error("server error");
  }
  const data = await res.json();
  return data;
}

function Index() {
  const { isPending, error, data } = useQuery({
    queryKey: ["get-total-spent"],
    queryFn: getTotalSpent,
  });

  if (error) return "An error has occurred: " + error.message;

  return (
    <>
      <Card className="w-[350px] m-auto">
        <CardHeader>
          <CardTitle>Total Owed</CardTitle>
          <CardDescription>The total amount you owe</CardDescription>
        </CardHeader>
        <CardContent>{isPending ? "..." : data.total}</CardContent>
      </Card>
    </>
  );
}
