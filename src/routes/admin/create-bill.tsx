import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MultiSelect } from "@/components/ui/multi-select";
import { toast } from "sonner";
import { useForm } from "@tanstack/react-form";
import {
  createBill,
  getAllBillsQueryOptions,
  getBillsForPropertyQueryOptions,
} from "@/api/billApi";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { zodValidator } from "@tanstack/zod-form-adapter";
import { createBillSchema } from "@server/sharedTypes";
import { getTenantsForLandlordQueryOptions } from "@/api/tenantApi";
import { DateRange } from "react-day-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useContext, useState } from "react";
import { property } from "@server/db.example/schema/property";
import { SelectedPropertyContext } from "@/contexts/SelectedPropertyContext";

export const Route = createFileRoute("/admin/create-bill")({
  component: CreateBill,
});

function CreateBill() {
  const queryClient = useQueryClient();
  const context = useContext(SelectedPropertyContext);
  const { isPending, error, data } = useQuery(getTenantsForLandlordQueryOptions);
  const navigate = useNavigate();
  const [billType, setBillType] = useState<"rent" | "utility">("rent");
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(),
    to: undefined,
  });

  const form = useForm({
    validatorAdapter: zodValidator(),
    defaultValues: {
      landlordId: "",
      title: "",
      amount: "0",
      dueDate: new Date().toISOString(),
      dateFrom: new Date().toISOString(),
      dateTo: new Date().toISOString(),
      tenantIds: [],
      type: "rent",
      description: "",
    },
    onSubmit: async ({ value }) => {
      try {
        const billData = {
          ...value,
          type: billType,
          propertyId: context?.selectedProperty!,
        };

        if (billType === "rent" && dateRange?.from) {
          billData.dateFrom = dateRange.from.toISOString();
          billData.dateTo = dateRange.to
            ? dateRange.to.toISOString()
            : dateRange.from.toISOString();
        }

        const newBill = await createBill({ value: billData });

        await queryClient.invalidateQueries({
          queryKey: ["property-bills"],
        });

        toast("Bill Created", {
          description: `Successfully created new ${billType} bill: ${newBill.title}`,
        });
        navigate({ to: "/admin/bill" });
      } catch (error) {
        console.error("Error while creating bill:", error);
        toast("Error", { description: "An unexpected error occurred" });
      }
    },
  });

  return (
    <div className="flex justify-center items-center py-8">
      <div className="w-full max-w-3xl p-6 border rounded-lg shadow-lg">
        <h2 className="text-2xl text-center mb-6">Create Bill</h2>

        <Tabs
          defaultValue="rent"
          className="w-full mb-6"
          onValueChange={(value) => setBillType(value as "rent" | "utility")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="rent">Rent Bill</TabsTrigger>
            <TabsTrigger value="utility">Utility Bill</TabsTrigger>
          </TabsList>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              void form.handleSubmit();
            }}
            className="flex flex-col gap-y-6 mt-6">
            <TabsContent value="rent" className="space-y-6">
              <form.Field
                name="title"
                validators={{
                  onChange: createBillSchema.shape.title,
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
                      placeholder="Monthly Rent"
                      className="mt-1"
                    />
                    {field.state.meta.isTouched && field.state.meta.errors ? (
                      <p className="text-sm text-red-500 mt-1">
                        {field.state.meta.errors.join(", ")}
                      </p>
                    ) : null}
                  </div>
                )}
              />

              <form.Field
                name="amount"
                validators={{
                  onChange: createBillSchema.shape.amount,
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
                      placeholder="0.00"
                      className="mt-1"
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                    {field.state.meta.isTouched && field.state.meta.errors ? (
                      <p className="text-sm text-red-500 mt-1">
                        {field.state.meta.errors.join(", ")}
                      </p>
                    ) : null}
                  </div>
                )}
              />

              <div>
                <Label>Rent Period</Label>
                <div className="mt-1">
                  <DateRangePicker value={dateRange} onChange={setDateRange} />
                </div>
              </div>

              <form.Field
                name="tenantIds"
                validators={{ onChange: createBillSchema.shape.tenantIds }}
                children={(field) => (
                  <div>
                    <Label>Tenants</Label>
                    <MultiSelect
                      options={(data?.tenants ?? []).map((t) => ({
                        label: t.firstName,
                        value: t.id,
                      }))}
                      value={field.state.value}
                      onValueChange={field.handleChange}
                      className="mt-1"
                    />
                    {field.state.meta.isTouched && field.state.meta.errors ? (
                      <p className="text-sm text-red-500 mt-1">
                        {field.state.meta.errors.join(", ")}
                      </p>
                    ) : null}
                  </div>
                )}
              />

              <form.Field
                name="description"
                validators={{
                  onChange: createBillSchema.shape.description,
                }}
                children={(field) => (
                  <div>
                    <Label htmlFor={field.name}>Description</Label>
                    <Input
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      placeholder="Monthly rent for apartment 101"
                      className="mt-1"
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                    {field.state.meta.isTouched && field.state.meta.errors ? (
                      <p className="text-sm text-red-500 mt-1">
                        {field.state.meta.errors.join(", ")}
                      </p>
                    ) : null}
                  </div>
                )}
              />
            </TabsContent>

            <TabsContent value="utility" className="space-y-6">
              <form.Field
                name="title"
                validators={{
                  onChange: createBillSchema.shape.title,
                }}
                children={(field) => (
                  <div>
                    <Label htmlFor={field.name}>Title</Label>
                    <Input
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      placeholder="Electricity Bill"
                      className="mt-1"
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                    {field.state.meta.isTouched && field.state.meta.errors ? (
                      <p className="text-sm text-red-500 mt-1">
                        {field.state.meta.errors.join(", ")}
                      </p>
                    ) : null}
                  </div>
                )}
              />

              <form.Field
                name="amount"
                validators={{
                  onChange: createBillSchema.shape.amount,
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
                      placeholder="0.00"
                      className="mt-1"
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                    {field.state.meta.isTouched && field.state.meta.errors ? (
                      <p className="text-sm text-red-500 mt-1">
                        {field.state.meta.errors.join(", ")}
                      </p>
                    ) : null}
                  </div>
                )}
              />

              <form.Field
                name="dueDate"
                validators={{ onChange: createBillSchema.shape.dueDate }}
                children={(field) => (
                  <div>
                    <Label>Due Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full mt-1 justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.state.value ? (
                            format(new Date(field.state.value), "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={new Date(field.state.value)}
                          onSelect={(date) =>
                            field.handleChange((date ?? new Date()).toISOString())
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    {field.state.meta.isTouched && field.state.meta.errors ? (
                      <p className="text-sm text-red-500 mt-1">
                        {field.state.meta.errors.join(", ")}
                      </p>
                    ) : null}
                  </div>
                )}
              />

              <form.Field
                name="tenantIds"
                validators={{ onChange: createBillSchema.shape.tenantIds }}
                children={(field) => (
                  <div>
                    <Label>Tenants</Label>
                    <MultiSelect
                      options={(data?.tenants ?? []).map((t) => ({
                        label: t.firstName,
                        value: t.id,
                      }))}
                      value={field.state.value}
                      onValueChange={field.handleChange}
                      className="mt-1"
                    />
                    {field.state.meta.isTouched && field.state.meta.errors ? (
                      <p className="text-sm text-red-500 mt-1">
                        {field.state.meta.errors.join(", ")}
                      </p>
                    ) : null}
                  </div>
                )}
              />

              <form.Field
                name="description"
                validators={{
                  onChange: createBillSchema.shape.description,
                }}
                children={(field) => (
                  <div>
                    <Label htmlFor={field.name}>Description</Label>
                    <Input
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      placeholder="Monthly electricity charges"
                      className="mt-1"
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                    {field.state.meta.isTouched && field.state.meta.errors ? (
                      <p className="text-sm text-red-500 mt-1">
                        {field.state.meta.errors.join(", ")}
                      </p>
                    ) : null}
                  </div>
                )}
              />
            </TabsContent>

            <form.Subscribe
              selector={(state) => [state.canSubmit, state.isSubmitting]}
              children={([canSubmit, isSubmitting]) => (
                <Button className="mt-6" type="submit" disabled={!canSubmit}>
                  {isSubmitting ? "Creating bill..." : "Create Bill"}
                </Button>
              )}
            />
          </form>
        </Tabs>
      </div>
    </div>
  );
}
