import { z } from "../../framework";

import { FailedAPIOperationSchema, SuccessfulAPIOperationSchema } from "../common";

import { ComputeServerIdBodySchema } from "./common";
import { ComputeServerTemplateObjectSchema } from "./get-template";

// OpenAPI spec
//
export const SetComputeServerTemplateInputSchema = z
  .object({
    id: ComputeServerIdBodySchema
      .describe("Compute server template id."),
    template: ComputeServerTemplateObjectSchema,
  })
  .describe("**Administrators only**. Set a specific compute server template by `id`.");

export const SetComputeServerTemplateOutputSchema = z.union([
  FailedAPIOperationSchema,
  SuccessfulAPIOperationSchema,
]);

export type SetComputeServerTemplateInput = z.infer<typeof SetComputeServerTemplateInputSchema>;
export type SetComputeServerTemplateOutput = z.infer<typeof SetComputeServerTemplateOutputSchema>;