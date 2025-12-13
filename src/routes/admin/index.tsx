import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { createFileRoute } from "@tanstack/react-router";
import { getAllUserQueryOptions, deleteUser } from "@/api/authApi";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Trash } from "lucide-react";
import { toast } from "sonner";
import { getOverdueBills } from "@/api/billApi";

export const Route = createFileRoute("/admin/")({
  component: Index,
});

function Index() {
  const { isPending, error, data } = useQuery({
    queryKey: ["get-overdue-bills"],
    queryFn: getOverdueBills,
  });

  if (error) return "An error has occurred: " + error.message;

  return (
    <div className="p-2 max-w-3xl m-auto">
      <Table>
        <TableCaption>A list of all overdue bills.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Due</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Delete</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isPending
            ? Array(3)
                .fill(0)
                .map((_, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">
                      <Skeleton className="h-4" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4" />
                    </TableCell>
                  </TableRow>
                ))
            : data?.bills.map((bill) => (
                <TableRow key={bill.dateDue}>
                  <TableCell className="font-medium">{bill.dateDue}</TableCell>
                  <TableCell>{bill.title}</TableCell>
                  <TableCell>{bill.amount}</TableCell>
                  <TableCell>{bill.type}</TableCell>
                  <TableCell>{/*<UserDeleteButton id={bill.id} />*/}Delete</TableCell>
                </TableRow>
              ))}
        </TableBody>
      </Table>
    </div>
  );
}

/*
function UserDeleteButton({ id }: { id: string }) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: deleteUser,
    onError: () => {
      toast("Error", {
        description: `Failed to delete bill: ${id}`,
      });
    },
    onSuccess: () => {
      toast("User Deleted", {
        description: `Successfully deleted bill: ${id}`,
      });

      queryClient.setQueryData(getAllUserQueryOptions.queryKey, (existingUser) => ({
        ...existingUser,
        bill: existingUser!.bill.filter((e) => e.id !== id),
      }));
    },
  });
  

  return (
    <Button
      disabled={mutation.isPending}
      onClick={() => mutation.mutate({ id })}
      variant="outline"
      size="icon">
      {mutation.isPending ? "..." : <Trash className="h-4 w-4" />}
    </Button>
  );
}
*/
