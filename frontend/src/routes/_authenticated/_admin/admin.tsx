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
import { loadingCreateUserQueryOptions, getAllUserQueryOptions, deleteUser } from "@/lib/authApi";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Trash } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/_admin/admin")({
  component: Admin,
});

function Admin() {
  const { isPending, error, data } = useQuery(getAllUserQueryOptions);
  const { data: loadingCreateUser } = useQuery(loadingCreateUserQueryOptions);

  if (error) return "An error has occurred: " + error.message;

  return (
    <div className="p-2 max-w-3xl m-auto">
      <Table>
        <TableCaption>A list of all your tenants.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Id</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Delete</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loadingCreateUser?.user && (
            <TableRow>
              <TableCell className="font-medium">
                <Skeleton className="h-4" />
              </TableCell>
              <TableCell>{loadingCreateUser?.user.firstName}</TableCell>
              <TableCell>{loadingCreateUser?.user.lastName}</TableCell>
              <TableCell className="font-medium">
                <Skeleton className="h-4" />
              </TableCell>
            </TableRow>
          )}
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
            : data?.user.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.id}</TableCell>
                  <TableCell>{user.firstName}</TableCell>
                  <TableCell>{user.lastName}</TableCell>
                  <TableCell>
                    <UserDeleteButton id={user.id} />
                  </TableCell>
                </TableRow>
              ))}
        </TableBody>
      </Table>
    </div>
  );
}

function UserDeleteButton({ id }: { id: string }) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: deleteUser,
    onError: () => {
      toast("Error", {
        description: `Failed to delete user: ${id}`,
      });
    },
    onSuccess: () => {
      toast("User Deleted", {
        description: `Successfully deleted user: ${id}`,
      });

      queryClient.setQueryData(getAllUserQueryOptions.queryKey, (existingUser) => ({
        ...existingUser,
        user: existingUser!.user.filter((e) => e.id !== id),
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
