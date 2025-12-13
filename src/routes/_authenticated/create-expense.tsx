import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { type DateRange } from "react-day-picker";
import * as React from "react";
import { toast } from "sonner";
import { useForm } from "@tanstack/react-form";
import { createExpense, getAllExpenseQueryOptions } from "@/api/expenseApi";
import { useQueryClient } from "@tanstack/react-query";
import { zodValidator } from "@tanstack/zod-form-adapter";
import { createExpenseSchema } from "@server/sharedTypes";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/create-expense")({
  component: CreateExpense,
});

function CreateExpense() {
  const queryClient = useQueryClient();
  // Removed unused useQuery(getUserQueryOptions)

  const navigate = useNavigate();
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>({
    from: new Date(2025, 5, 12),
    to: new Date(2025, 6, 15),
  });

  const form = useForm({
    validatorAdapter: zodValidator(),
    defaultValues: {
      title: "",
      amount: 0,
      expenseDate: new Date().toISOString(),
      description: "",
    },
    onSubmit: async ({ value }) => {
      try {
        const newExpense = await createExpense({ value });

        // Invalidate the query to fetch the new list of expenses
        await queryClient.invalidateQueries({
          queryKey: getAllExpenseQueryOptions.queryKey,
        });

        toast("Expense Created", {
          description: `Successfully created new expense: ${newExpense.title}`,
        });

        // Redirect the user to the expense list page
        navigate({ to: "/expense" });
      } catch (error: unknown) {
        console.error("Error while creating expense:", error);
        if (error instanceof Error) {
          toast("Error", { description: error.message || "An error occurred" });
        } else {
          toast("Error", { description: "An unexpected error occurred" });
        }
      }
    },
  });

  return (
    <div className="p-8 max-w-4xl m-auto pt-24 flex justify-center">
      <Card className="w-full max-w-2xl shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Create New Expense</CardTitle>
          <CardDescription>Enter the details for your new financial record below.</CardDescription>
        </CardHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void form.handleSubmit();
          }}>
          <CardContent className="space-y-6">
            {/* Title Field */}
            <form.Field
              name="title"
              validators={{
                onChange: createExpenseSchema.shape.title,
              }}
              children={(field) => (
                <div>
                  <Label htmlFor={field.name}>Title</Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    placeholder="e.g., Groceries, Rent, Utilities"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  {field.state.meta.isTouched && field.state.meta.errors.length > 0 ? (
                    <p className="text-sm text-red-500 mt-1">
                      {field.state.meta.errors.join(", ")}
                    </p>
                  ) : null}
                </div>
              )}
            />

            {/* Description Field */}
            <form.Field
              name="description"
              validators={{
                onChange: createExpenseSchema.shape.description,
              }}
              children={(field) => (
                <div>
                  <Label htmlFor={field.name}>Description (Optional)</Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    placeholder="Detailed description of the expense"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  {field.state.meta.isTouched && field.state.meta.errors.length > 0 ? (
                    <p className="text-sm text-red-500 mt-1">
                      {field.state.meta.errors.join(", ")}
                    </p>
                  ) : null}
                </div>
              )}
            />

            {/* Amount Field */}
            <form.Field
              name="amount"
              validators={{
                onChange: createExpenseSchema.shape.amount,
              }}
              children={(field) => (
                <div>
                  <Label htmlFor={field.name}>Amount ($)</Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    type="number"
                    step="0.01" // Allow decimal amounts
                    placeholder="0.00"
                    onChange={(e) => {
                      const value = e.target.value;
                      // Convert string back to number for the form state
                      field.handleChange(value === "" ? 0 : parseFloat(value));
                    }}
                  />
                  {field.state.meta.isTouched && field.state.meta.errors.length > 0 ? (
                    <p className="text-sm text-red-500 mt-1">
                      {field.state.meta.errors.join(", ")}
                    </p>
                  ) : null}
                </div>
              )}
            />

            {/* Expense Date Field */}
            <form.Field
              name="expenseDate"
              validators={{
                onChange: createExpenseSchema.shape.expenseDate,
              }}
              children={(field) => (
                <div className="self-center flex flex-col items-center">
                  <Label className="mb-2">Expense Date</Label>
                  <Calendar
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                    className="rounded-lg border"
                  />
                  {field.state.meta.isTouched && field.state.meta.errors.length > 0 ? (
                    <p className="text-sm text-red-500 mt-1">
                      {field.state.meta.errors.join(", ")}
                    </p>
                  ) : null}
                </div>
              )}
            />
          </CardContent>

          {/* Submit Button */}
          <CardFooter className="flex justify-between border-t p-6 rounded-b-lg">
            <Button type="button" variant="outline" onClick={() => navigate({ to: "/expense" })}>
              Cancel
            </Button>

            <form.Subscribe
              selector={(state) => [state.canSubmit, state.isSubmitting]}
              children={([canSubmit, isSubmitting]) => (
                <Button type="submit" disabled={!canSubmit || isSubmitting}>
                  {isSubmitting ? "Creating..." : "Create Expense"}
                </Button>
              )}
            />
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
