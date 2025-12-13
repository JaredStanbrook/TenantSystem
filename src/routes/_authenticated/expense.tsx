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
import { getAllExpenseQueryOptions, deleteExpense } from "@/api/expenseApi";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Trash, Plus, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/expense")({
  component: Expense,
});

function Expense() {
  const { isPending, error, data } = useQuery(getAllExpenseQueryOptions);

  if (error)
    return (
      <div className="p-8 max-w-4xl m-auto pt-16 flex flex-col items-center justify-center text-red-500">
        <AlertCircle className="w-8 h-8 mb-2" />
        <p>Error loading expenses: {error.message}</p>
      </div>
    );

  return (
    <div className="p-8 max-w-4xl m-auto pt-24">
      {/* Header Section with Action Button */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Expenses</h1>
          <p className="text-muted-foreground mt-1">
            Manage and track all property-related expenses.
          </p>
        </div>
        <Link to="/create-expense">
          <Button className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add New Expense
          </Button>
        </Link>
      </div>

      <div className="border rounded-lg shadow-sm overflow-hidden">
        <Table>
          <TableCaption>A list of all recorded expenses.</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Id</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending ? (
              Array(5)
                .fill(0)
                .map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-4 w-8" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-8 w-8 ml-auto" />
                    </TableCell>
                  </TableRow>
                ))
            ) : data?.expense?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                  No expenses recorded yet. Create one to get started!
                </TableCell>
              </TableRow>
            ) : (
              data?.expense.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    #{expense.id}
                  </TableCell>
                  <TableCell className="font-medium">
                    {expense.title}
                    {/* Optional: Show person email as tooltip or subtext if needed */}
                    {/* <div className="text-xs text-muted-foreground font-normal">{expense.email}</div> */}
                  </TableCell>
                  <TableCell>
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "USD",
                    }).format(expense.amount)}
                  </TableCell>
                  <TableCell>{new Date(expense.expenseDate).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <ExpenseDeleteButton id={expense.id} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function ExpenseDeleteButton({ id }: { id: number }) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: deleteExpense,
    onError: () => {
      toast("Error", {
        description: `Failed to delete expense #${id}`,
      });
    },
    onSuccess: () => {
      toast("Expense Deleted", {
        description: `Successfully deleted expense #${id}`,
      });

      queryClient.setQueryData(
        getAllExpenseQueryOptions.queryKey,
        (existingExpense: { expense: any[] } | undefined) => ({
          ...existingExpense,
          expense: existingExpense?.expense.filter((e) => e.id !== id) ?? [],
        })
      );
    },
  });

  return (
    <Button
      disabled={mutation.isPending}
      onClick={() => mutation.mutate({ id })}
      variant="ghost"
      size="icon"
      className="text-muted-foreground hover:text-red-600 hover:bg-red-50">
      {mutation.isPending ? (
        <span className="loading-spinner h-4 w-4 border-2 border-current border-r-transparent rounded-full animate-spin" />
      ) : (
        <Trash className="h-4 w-4" />
      )}
    </Button>
  );
}
