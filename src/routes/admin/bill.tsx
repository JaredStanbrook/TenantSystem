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
import {
  getAllBillsQueryOptions,
  loadingCreateBillQueryOptions,
  deleteBill,
  getBillsForPropertyQueryOptions,
} from "@/api/billApi";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Trash } from "lucide-react";
import { toast } from "sonner";
import { SelectedPropertyContext } from "@/contexts/SelectedPropertyContext";
import { useContext } from "react";

export const Route = createFileRoute("/admin/bill")({
  component: Bills,
});

function Bills() {
  const context = useContext(SelectedPropertyContext);
  const { isPending, error, data } = useQuery(
    context?.selectedProperty
      ? getBillsForPropertyQueryOptions(context.selectedProperty)
      : { queryKey: ["no-bill"], queryFn: async () => ({ bills: [] }) }
  );

  if (error) return "An error has occurred: " + error.message;

  return (
    <div className="p-2 max-w-3xl m-auto">
      <Table>
        <TableCaption>A list of all your bills.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>dueDate</TableHead>
            <TableHead>createdAt</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Delete</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {context?.selectedProperty! === null ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center">
                No property selected.
              </TableCell>
            </TableRow>
          ) : isPending ? (
            Array(6)
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
          ) : data?.bills?.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center">
                No bills available
              </TableCell>
            </TableRow>
          ) : (
            data?.bills.map((bill) => (
              <TableRow key={bill.id}>
                <TableCell>{bill.title}</TableCell>
                <TableCell>${bill.amount}</TableCell>
                <TableCell>{bill.dueDate}</TableCell>
                <TableCell>{bill.createdAt}</TableCell>
                <TableCell>{bill.type}</TableCell>
                <TableCell>
                  <BillDeleteButton id={bill.id} />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      <div className="flex justify-end">
        <Link to="/admin/create-bill">
          <Button>Create Bill</Button>
        </Link>
      </div>
    </div>
  );
}

function BillDeleteButton({ id }: { id: number }) {
  const context = useContext(SelectedPropertyContext);
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: deleteBill,
    onError: () => {
      toast("Error", {
        description: `Failed to delete bill: ${id}`,
      });
    },
    onSuccess: () => {
      toast("Bill Deleted", {
        description: `Successfully deleted bill: ${id}`,
      });

      queryClient.setQueryData(
        getBillsForPropertyQueryOptions(context?.selectedProperty!).queryKey,
        (existingBills) => ({
          ...existingBills,
          bills: existingBills!.bills.filter((b) => b.id !== id),
        })
      );
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
