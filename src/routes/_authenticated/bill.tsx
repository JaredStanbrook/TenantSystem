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
import { getBillsForTennantQueryOptions } from "@/api/billApi";
import { useQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated/bill")({
  component: Bills,
});

function Bills() {
  const { isPending, error, data } = useQuery(getBillsForTennantQueryOptions);

  if (error)
    return (
      <div className="p-8 max-w-4xl m-auto">
        <h2 className="text-2xl font-bold mb-4 text-red-600">Error Loading Bills</h2>
        <p className="text-sm">An error has occurred: {error.message}</p>
      </div>
    );

  // Helper function for consistent date formatting
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "-";
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  // Helper function for consistent currency formatting
  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined || amount === null) return "$0.00";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  return (
    // Adjust this container class for your specific layout style guide.
    // 'p-8' provides good padding. 'max-w-4xl m-auto' centers the content.
    // If you have a fixed sidebar, you might add 'md:pl-[240px]' here to push content over.
    <div className="p-8 max-w-4xl m-auto md:pt-24">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">My Bills</h1>
        <p className="text-muted-foreground">View and track all your outstanding and past bills.</p>
      </header>

      <Table>
        <TableCaption>A list of all your bills.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">Title</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="w-[150px]">Due Date</TableHead>
            <TableHead className="w-[150px]">Created</TableHead>
            <TableHead>Type</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isPending ? (
            Array(6)
              .fill(0)
              .map((_, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">
                    <Skeleton className="h-4 w-3/4" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-4 w-1/3 ml-auto" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-2/3" />
                  </TableCell>
                </TableRow>
              ))
          ) : data?.bills?.length === 0 ? (
            <TableRow>
              {/* colspan is 5 because we have 5 TableHead columns */}
              <TableCell colSpan={5} className="text-center py-8 text-lg text-muted-foreground">
                <p>🎉 No bills available at this time!</p>
                <p className="text-sm mt-1">
                  Check back later or contact your landlord if you believe this is an error.
                </p>
              </TableCell>
            </TableRow>
          ) : (
            data?.bills.map((bill) => (
              <TableRow key={bill.id}>
                <TableCell className="font-medium">{bill.title}</TableCell>
                <TableCell className="text-right">{formatCurrency(bill.amount)}</TableCell>
                <TableCell>{formatDate(bill.dueDate)}</TableCell>
                <TableCell>{formatDate(bill.createdAt)}</TableCell>
                <TableCell>
                  <span className="capitalize">{bill.type}</span>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
