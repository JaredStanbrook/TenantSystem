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
import {
  getAllExpenseQueryOptions,
  loadingCreateExpenseQueryOptions,
  deleteExpense,
} from "@/lib/expenseApi";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Trash } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/expense")({
  component: Expense,
});

function Expense() {
  const { isPending, error, data } = useQuery(getAllExpenseQueryOptions);
  const { data: loadingCreateExpense } = useQuery(loadingCreateExpenseQueryOptions);

  if (error) return "An error has occurred: " + error.message;

  return (
    <div className="p-2 max-w-3xl m-auto">
      <Table>
        <TableCaption>A list of all your expenses.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Id</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Person</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Delete</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loadingCreateExpense?.expense && (
            <TableRow>
              <TableCell className="font-medium">
                <Skeleton className="h-4" />
              </TableCell>
              <TableCell>{loadingCreateExpense?.expense.title}</TableCell>
              <TableCell>{loadingCreateExpense?.expense.amount}</TableCell>
              <TableCell>{loadingCreateExpense?.expense.date.split("T")[0]}</TableCell>
              <TableCell className="font-medium">
                <Skeleton className="h-4" />
              </TableCell>
            </TableRow>
          )}
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
                  <TableCell>
                    <Skeleton className="h-4" />
                  </TableCell>
                </TableRow>
              ))
          ) : data?.expense?.length === 0 ? ( // Check if there's no expense data
            <TableRow>
              <TableCell colSpan={5} className="text-center">
                No expenses available
              </TableCell>
            </TableRow>
          ) : (
            data?.expense.map((expense) => (
              <TableRow key={expense.id}>
                <TableCell className="font-medium">{expense.id}</TableCell>
                <TableCell>{expense.title}</TableCell>
                <TableCell>{expense.email}</TableCell>
                <TableCell>{expense.amount}</TableCell>
                <TableCell>{expense.date.split("T")[0]}</TableCell>
                <TableCell>
                  <ExpenseDeleteButton id={expense.id} />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function ExpenseDeleteButton({ id }: { id: number }) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: deleteExpense,
    onError: () => {
      toast("Error", {
        description: `Failed to delete expense: ${id}`,
      });
    },
    onSuccess: () => {
      toast("Expense Deleted", {
        description: `Successfully deleted expense: ${id}`,
      });

      queryClient.setQueryData(getAllExpenseQueryOptions.queryKey, (existingExpense) => ({
        ...existingExpense,
        expense: existingExpense!.expense.filter((e) => e.id !== id),
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
