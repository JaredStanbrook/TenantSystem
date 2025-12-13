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
import { deleteUser } from "@/api/authApi";
import {
  getTenantsForLandlordQueryOptions,
  getTenantsForPropertyQueryOptions,
} from "@/api/tenantApi";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Trash } from "lucide-react";
import { toast } from "sonner";
import { useContext } from "react";
import { SelectedPropertyContext } from "@/contexts/SelectedPropertyContext";

export const Route = createFileRoute("/admin/tenant")({
  component: Index,
});

function Index() {
  const context = useContext(SelectedPropertyContext);
  const { isPending, error, data } = useQuery(
    context?.selectedProperty
      ? getTenantsForPropertyQueryOptions(context.selectedProperty)
      : { queryKey: ["no-property"], queryFn: async () => ({ tenants: [] }) }
  );

  if (error) return "An error has occurred: " + error.message;

  return (
    <div className="p-2 max-w-3xl m-auto">
      <Table>
        <TableCaption>A list of all your tenants.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>

            <TableHead>Delete</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {context?.selectedProperty! === null ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center">
                No property selected.
              </TableCell>
            </TableRow>
          ) : isPending ? (
            Array(3)
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
                </TableRow>
              ))
          ) : data?.tenants?.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center">
                No tenants found for this property.
              </TableCell>
            </TableRow>
          ) : (
            data?.tenants.map((user) => (
              <TableRow key={user.firstName}>
                <TableCell>{`${user.firstName} ${user.lastName}`}</TableCell>
                <TableCell>{user.email}</TableCell>

                <TableCell>
                  <UserDeleteButton id={user.id} />
                </TableCell>
              </TableRow>
            ))
          )}
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

      queryClient.setQueryData(getTenantsForLandlordQueryOptions.queryKey, (existingUser) => ({
        ...existingUser,
        tenants: existingUser!.tenants.filter((e) => e.id !== id),
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
