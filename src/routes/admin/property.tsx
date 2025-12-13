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
import { createFileRoute, Link } from "@tanstack/react-router";
import { getAllPropertiesQueryOptions, deleteProperty } from "@/api/propertyApi";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Trash } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/property")({
  component: Property,
});

function Property() {
  const { isPending, error, data } = useQuery(getAllPropertiesQueryOptions);

  if (error) return "An error has occurred: " + error.message;

  return (
    <div className="p-2 max-w-3xl m-auto">
      <Table>
        <TableCaption>A list of all your properties.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Id</TableHead>
            <TableHead>Address</TableHead>
            <TableHead>Delete</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isPending ? (
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
          ) : data?.properties?.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center">
                No properties available
              </TableCell>
            </TableRow>
          ) : (
            data?.properties.map((property) => (
              <TableRow key={property.id}>
                <TableCell className="font-medium">{property.id}</TableCell>
                <TableCell>{property.address}</TableCell>
                <TableCell>
                  <PropertyDeleteButton id={property.id} />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      <div className="flex justify-end">
        <Link to="/admin/create-property">
          <Button>Create Property</Button>
        </Link>
      </div>
    </div>
  );
}

function PropertyDeleteButton({ id }: { id: number }) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: deleteProperty,
    onError: () => {
      toast("Error", {
        description: `Failed to delete property: ${id}`,
      });
    },
    onSuccess: () => {
      toast("Property Deleted", {
        description: `Successfully deleted property: ${id}`,
      });

      queryClient.setQueryData(getAllPropertiesQueryOptions.queryKey, (existingProperties) => ({
        ...existingProperties,
        properties: existingProperties!.properties.filter((p) => p.id !== id),
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
