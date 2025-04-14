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
import { getAllBillsQueryOptions, loadingCreateBillQueryOptions, deleteBill } from "@/api/billApi";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Trash } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/bill")({
  component: Bills,
});

function Bills() {
  const { isPending, error, data } = useQuery(getAllBillsQueryOptions);
  const { data: loadingCreateBill } = useQuery(loadingCreateBillQueryOptions);

  if (error) return "An error has occurred: " + error.message;

  return (
    <div className="p-2 max-w-3xl m-auto">
      <Table>
        <TableCaption>A list of all your bills.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Id</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Delete</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loadingCreateBill?.bill && (
            <TableRow>
              <TableCell className="font-medium">
                <Skeleton className="h-4" />
              </TableCell>
              <TableCell>{loadingCreateBill?.bill.title}</TableCell>
              <TableCell>{loadingCreateBill?.bill.amount}</TableCell>
              <TableCell>
                <Skeleton className="h-4" />
              </TableCell>
            </TableRow>
          )}
          {isPending ? (
            Array(3)
              .fill(0)
              .map((_, i) => (
                <TableRow key={i}>
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
          ) : data?.bills?.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center">
                No bills available
              </TableCell>
            </TableRow>
          ) : (
            data?.bills.map((bill) => (
              <TableRow key={bill.id}>
                <TableCell className="font-medium">{bill.id}</TableCell>
                <TableCell>{bill.title}</TableCell>
                <TableCell>${bill.amount}</TableCell>
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

      queryClient.setQueryData(getAllBillsQueryOptions.queryKey, (existingBills) => ({
        ...existingBills,
        bills: existingBills!.bills.filter((b) => b.id !== id),
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
