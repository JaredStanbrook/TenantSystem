import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useForm } from "@tanstack/react-form";
import { createProperty, getAllPropertiesQueryOptions } from "@/api/propertyApi";
import { useQueryClient } from "@tanstack/react-query";
import { zodValidator } from "@tanstack/zod-form-adapter";
import { createPropertySchema } from "@server/sharedTypes";

import { useRef } from "react";
import { APIProvider } from "@vis.gl/react-google-maps";
import { PlacePicker } from "@googlemaps/extended-component-library/react";
import { PlacePicker as TPlacePicker } from "@googlemaps/extended-component-library/place_picker.js";

export const Route = createFileRoute("/admin/create-property")({
  component: CreateProperty,
});

function CreateProperty() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const pickerRef = useRef<TPlacePicker>(null);

  const form = useForm({
    validatorAdapter: zodValidator(),
    defaultValues: {
      address: "",
    },
    onSubmit: async ({ value }) => {
      const existingProperties = await queryClient.ensureQueryData(getAllPropertiesQueryOptions);

      navigate({ to: "/admin/property" });
      try {
        // Create the property using the API
        const newProperty = await createProperty({ value });

        // Update the local cache with the new property
        queryClient.setQueryData(getAllPropertiesQueryOptions.queryKey, {
          ...existingProperties,
          properties: [newProperty, ...existingProperties.properties],
        });

        toast("Property Created", {
          description: `Successfully created new property: ${newProperty.address}`,
        });
      } catch (error) {
        console.error("Error while creating property:", error);
        toast("Error", { description: "An unexpected error occurred" });
      }
    },
  });

  return (
    <div className="p-2">
      <h2>Create Property</h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          void form.handleSubmit();
        }}
        className="flex flex-col gap-y-4 max-w-xl m-auto">
        <form.Field
          name="address"
          validators={{
            onChange: createPropertySchema.shape.address,
          }}
          children={(field) => (
            <div>
              <Label htmlFor={field.name}>Address</Label>
              <div className="relative">
                <APIProvider
                  solution-channel="GMP_GE_placepicker_v2"
                  apiKey="AIzaSyBarZdC3dMBHljW24FAJkDMvDNWkCZ6Byo">
                  <PlacePicker
                    ref={pickerRef} //pickerRef.current?.value
                    forMap="gmap"
                    country={["aus"]}
                    placeholder="Enter your Mojo Dojo Casa House!"
                    onPlaceChange={() => {
                      field.handleChange(pickerRef.current?.value?.formattedAddress!);
                    }}
                  />
                </APIProvider>
              </div>
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
