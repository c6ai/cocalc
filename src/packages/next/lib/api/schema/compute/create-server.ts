import { z } from "../../framework";

import { FailedAPIOperationSchema } from "../common";

import { ProjectIdSchema } from "../projects/common";

import {
  ComputeServerCloudSchema,
  ComputeServerColorSchema,
  ComputeServerIdBodySchema,
  ComputeServerTitleSchema,
  ServerConfigurationSchema
} from "./common";

// OpenAPI spec
//
export const CreateServerInputSchema = z
  .object({
    configuration: ServerConfigurationSchema,
    title: ComputeServerTitleSchema,
    color: ComputeServerColorSchema,
    cloud: ComputeServerCloudSchema,
    project_id: ProjectIdSchema
      .describe(
        "The project id that this compute server provides compute for."
      ),
    idle_timeout: z
      .number()
      .describe(
        `The idle timeout in seconds of this compute server. If set to 0, the server will
        never turn off automatically. The compute server idle timeouts if none of the tabs 
        it is providing are actively touched through the web UI. _Not yet implemented._`
      )
      .optional(),
    autorestart: z.boolean()
      .describe(
        `If true and the compute server stops for any reason, then it 
        will be automatically started again. This is primarily useful for 
        stopping instances.`
      )
      .optional(),
    notes: z.string()
      .describe("Open-ended text in markdown about this item.")
      .optional(),
  })
  .describe(
    "Create a new compute server with the provided configuration."
  );

export const CreateServerOutputSchema = z.union([
  FailedAPIOperationSchema,
  ComputeServerIdBodySchema.describe("The id of the created compute server."),
]);

export type CreateServerInput = z.infer<typeof CreateServerInputSchema>;
export type CreateServerOutput = z.infer<typeof CreateServerOutputSchema>;
