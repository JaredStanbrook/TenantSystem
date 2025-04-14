import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import { useForm } from "@tanstack/react-form";
import {
  createExpense,
  getAllExpenseQueryOptions,
  loadingCreateExpenseQueryOptions,
} from "@/api/expenseApi";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { zodValidator } from "@tanstack/zod-form-adapter";

import { createExpenseSchema } from "@server/sharedTypes";
import { getUserQueryOptions } from "@/api/authApi";

export const Route = createFileRoute("/_authenticated/create-expense")({
  component: CreateExpense,
});

function CreateExpense() {
  const queryClient = useQueryClient();
  const { isPending, error, data } = useQuery(getUserQueryOptions);
  const navigate = useNavigate();

  const form = useForm({
    validatorAdapter: zodValidator(),
    defaultValues: {
      title: "",
      amount: "0",
      date: new Date().toISOString(),
      description: "Nothing to see here!",
    },
    onSubmit: async ({ value }) => {
      const existingExpense = await queryClient.ensureQueryData(getAllExpenseQueryOptions);

      navigate({ to: "/expense" });

      // loading state
      queryClient.setQueryData(loadingCreateExpenseQueryOptions.queryKey, {
        expense: value,
      });
      try {
        const newExpense = await createExpense({ value });

        queryClient.setQueryData(getAllExpenseQueryOptions.queryKey, {
          ...existingExpense,
          expense: [{ ...newExpense, email: data.email }, ...existingExpense.expense],
        });

        toast("Expense Created", {
          description: `Successfully created new expense: ${newExpense.id}`,
        });
        // success state
      } catch (error: unknown) {
        console.error("Error while creating expense:", error);
        if (error instanceof Error) {
          toast("Error", { description: error.message || "An error occurred" });
        } else {
          toast("Error", { description: "An unexpected error occurred" });
        }
      } finally {
        queryClient.setQueryData(loadingCreateExpenseQueryOptions.queryKey, {});
      }
    },
  });

  return (
    <div className="p-2">
      <h2>Create Expense</h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          void form.handleSubmit();
        }}
        className="flex flex-col gap-y-4 max-w-xl m-auto">
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
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
              {field.state.meta.isTouched ? <em>{field.state.meta.isTouched}</em> : null}
            </div>
          )}
        />
        <form.Field
          name="description"
          validators={{
            onChange: createExpenseSchema.shape.description,
          }}
          children={(field) => (
            <div>
              <Label htmlFor={field.name}>Description</Label>
              <Input
                id={field.name}
                name={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
              {field.state.meta.isTouched ? <em>{field.state.meta.isTouched}</em> : null}
            </div>
          )}
        />
        <form.Field
          name="amount"
          validators={{
            onChange: createExpenseSchema.shape.amount,
          }}
          children={(field) => (
            <div>
              <Label htmlFor={field.name}>Amount</Label>
              <Input
                id={field.name}
                name={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                type="number"
                onChange={(e) => field.handleChange(e.target.value)}
              />
              {field.state.meta.isTouched ? <em>{field.state.meta.isTouched}</em> : null}
            </div>
          )}
        />

        <form.Field
          name="date"
          validators={{
            onChange: createExpenseSchema.shape.date,
          }}
          children={(field) => (
            <div className="self-center">
              <Calendar
                mode="single"
                selected={new Date(field.state.value)}
                onSelect={(date) => field.handleChange((date ?? new Date()).toISOString())}
                className="rounded-md border"
              />
              {field.state.meta.isTouched ? <em>{field.state.meta.isTouched}</em> : null}
            </div>
          )}
        />

        <form.Subscribe
          selector={(state) => [state.canSubmit, state.isSubmitting]}
          children={([canSubmit, isSubmitting]) => (
            <Button className="mt-4" type="submit" disabled={!canSubmit}>
              {isSubmitting ? "..." : "Submit"}
            </Button>
          )}
        />
      </form>
    </div>
  );
}
