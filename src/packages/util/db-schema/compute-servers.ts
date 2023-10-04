/*
 *  This file is part of CoCalc: Copyright © 2023 Sagemath, Inc.
 *  License: AGPLv3 s.t. "Commons Clause" – see LICENSE.md for details
 */

import { Table } from "./types";
import { ID } from "./crm";

export type State =
  | "off"
  | "starting"
  | "running"
  | "stopping"
  | "deprovisioned"
  | "suspending"
  | "suspended"
  | "unknown";

export type Action =
  | "start"
  | "resume"
  | "stop"
  | "suspend"
  | "deprovision"
  | "reboot";

export const ACTION_INFO: {
  [action: string]: {
    label: string;
    icon: string;
    tip: string;
    description: string;
    confirm?: boolean;
    danger?: boolean;
    target: State; // target stable state after doing this action.
    clouds?: Cloud[];
  };
} = {
  start: {
    label: "Start",
    icon: "play",
    tip: "Start",
    description: "Start the compute server running.",
    target: "running",
  },
  resume: {
    label: "Resume",
    icon: "play",
    clouds: ["google-cloud"],
    tip: "Resume",
    description: "Resume the compute server from suspend.",
    target: "running",
  },
  stop: {
    label: "Stop",
    icon: "stop",
    tip: "Turn off",
    description:
      "Turn the compute server off. No data on disk is lost, but any data and state in memory will be lost. This is like turning your laptop off.",
    confirm: true,
    target: "off",
  },
  reboot: {
    label: "Reboot",
    icon: "refresh",
    tip: "Hard reboot the virtual machine.",
    description:
      "Perform a HARD reset on the virtual machine, which wipes the memory contents and resets the virtual machine to its initial state. This can lead to filesystem corruption.",
    confirm: true,
    target: "running",
  },
  suspend: {
    label: "Suspend",
    icon: "pause",
    clouds: ["google-cloud"],
    tip: "Suspend disk and memory state",
    description:
      "Suspend the compute server.  No data on disk or memory is lost, and you are only charged for storing disk and memory. This is like closing your laptop screen.  You can leave a compute server suspended for up to 60 days before it automatically shuts off.",
    target: "suspended",
  },
  deprovision: {
    label: "Deprovision",
    icon: "trash",
    tip: "Deprovision the virtual machine",
    description:
      "Deprovisioning DELETES THE VIRTUAL MACHINE BOOT DISK, but keeps the compute server parameters.   There are no costs associated with a deprovisioned compute server, and you can move it to a different region or zone.  Any files in the home directory of your project are not affected.",
    confirm: true,
    danger: true,
    target: "deprovisioned",
  },
};

export const STATE_INFO: {
  [state: string]: {
    label: string;
    actions: Action[];
    icon: string;
    color?: string;
    stable?: boolean;
    target?: State; // if not stable, this is the target state it is heading to
  };
} = {
  off: {
    label: "Off",
    color: "#ff4b00",
    actions: ["start", "deprovision"],
    icon: "stop",
    stable: true,
  },
  suspended: {
    label: "Suspended",
    actions: ["resume", "deprovision", "stop"],
    icon: "pause",
    color: "#0097a7",
    stable: true,
  },
  suspending: {
    label: "Suspending",
    actions: [],
    icon: "pause",
    color: "#00bcd4",
    stable: false,
    target: "suspended",
  },
  starting: {
    label: "Starting",
    color: "#388e3c",
    actions: [],
    icon: "bolt",
    stable: false,
    target: "running",
  },
  running: {
    label: "Running",
    color: "#389e0d",
    actions: ["stop", "suspend", "reboot", "deprovision"],
    icon: "run",
    stable: true,
  },
  stopping: {
    label: "Stopping",
    color: "#ff9800",
    actions: [],
    icon: "hand",
    stable: false,
    target: "off",
  },
  unknown: {
    label: "Unknown",
    actions: [],
    icon: "question-circle",
    stable: true,
  },
  deprovisioned: {
    label: "Deprovisioned",
    actions: ["start"],
    color: "#888",
    icon: "global",
    stable: true,
  },
};

export function getTargetState(x: State | Action): State {
  if (ACTION_INFO[x] != null) {
    return ACTION_INFO[x].target;
  }
  if (STATE_INFO[x] != null) {
    if (!STATE_INFO[x]?.stable) {
      return (STATE_INFO[x].target ?? x) as State;
    }
    return x as State;
  }
  throw Error(`x =${x} must be a state or action`);
}

export type Cloud =
  | "any"
  | "user"
  | "core-weave"
  | "lambda-cloud"
  | "google-cloud"
  | "aws"
  | "fluid-stack"
  | "test";

export function getMinDiskSizeGb(configuration) {
  // TODO: will have to do something based on actual image size, maybe, unless I come up with a clever trick involving
  // one PD mounted on many machines (?).
  if (configuration.acceleratorType) {
    return 50;
  } else {
    return 10;
  }
}

// The ones that are at all potentially worth exposing to users.
export const CLOUDS: {
  [short: string]: {
    name: Cloud;
    label: string;
    image?: string;
    defaultConfiguration: Configuration;
  };
} = {
  google: {
    name: "google-cloud",
    label: "Google Cloud Platform",
    image:
      "https://www.gstatic.com/devrel-devsite/prod/v0e0f589edd85502a40d78d7d0825db8ea5ef3b99ab4070381ee86977c9168730/cloud/images/cloud-logo.svg",
    defaultConfiguration: {
      cloud: "google-cloud",
      region: "us-east1",
      zone: "us-east1-d",
      machineType: "c2-standard-4",
      spot: true,
      diskSizeGb: getMinDiskSizeGb({}),
      diskType: "pd-standard",
    },
  },
  lambda: {
    name: "lambda-cloud",
    label: "Lambda Cloud",
    image: "https://cloud.lambdalabs.com/static/images/lambda-logo.svg",
    defaultConfiguration: {
      cloud: "lambda-cloud",
      instance_type_name: "gpu_1x_a10",
      region_name: "us-west-1",
    },
  },
};

export const CLOUDS_BY_NAME: {
  [name: string]: {
    name: Cloud;
    label: string;
    image?: string;
    defaultConfiguration: Configuration;
  };
} = {};
for (const short in CLOUDS) {
  CLOUDS_BY_NAME[CLOUDS[short].name] = CLOUDS[short];
}

interface BaseConfiguration {
  // If the string is set and the VM has an external ip address
  // and dns is configured, then point https://{dns}....
  // with ssl proxying to this compute server when it is running.
  dns?: string;
}

interface LambdaConfiguration extends BaseConfiguration {
  cloud: "lambda-cloud";
  instance_type_name: string;
  region_name: string;
}

const COREWEAVE_CPU_TYPES = [
  "amd-epyc-rome",
  "amd-epyc-milan",
  "intel-xeon-v1",
  "intel-xeon-v2",
  "intel-xeon-v3",
  "intel-xeon-v4",
  "intel-xeon-scalable",
] as const;

const COREWEAVE_GPU_TYPES = [
  "Quadro_RTX_4000",
  "Quadro_RTX_5000",
  "RTX_A4000",
  "RTX_A5000",
  "RTX_A6000",
  "A40",
  "Tesla_V100_PCIE",
  "Tesla_V100_NVLINK",
  "A100_PCIE_40GB",
  "A100_PCIE_80GB",
  "A100_NVLINK_40GB",
  "A100_NVLINK_80GB",
] as const;

interface CoreWeaveConfiguration extends BaseConfiguration {
  cloud: "core-weave";
  gpu: {
    type: (typeof COREWEAVE_GPU_TYPES)[number];
    count: number;
  };
  cpu: {
    count: number;
    type?: (typeof COREWEAVE_CPU_TYPES)[number];
  };
  memory: string; // e.g., "12Gi"
  storage?: {
    root: {
      size: string; // e.g., '40Gi'
    };
  };
}

interface FluidStackConfiguration extends BaseConfiguration {
  cloud: "fluid-stack";
  plan: string;
  region: string;
  os: string;
}

const GOOGLE_CLOUD_ACCELERATOR_TYPES = [
  "nvidia-a100-80gb",
  "nvidia-tesla-a100",
  "nvidia-l4",
  "nvidia-tesla-t4",
  "nvidia-tesla-v100",
  "nvidia-tesla-p4",
  "nvidia-tesla-p100",
];

const GOOGLE_CLOUD_DISK_TYPES = ["pd-standard", "pd-balanced", "pd-ssd"];

export interface GoogleCloudConfiguration extends BaseConfiguration {
  cloud: "google-cloud";
  region: string;
  zone: string;
  machineType: string;
  // Ues a spot instance if spot is true.
  spot?: boolean;
  // The boot disk:
  // diskSizeGb is an integer >= 10.  It defaults to 10. It's the size of the boot disk.
  diskSizeGb?: number;
  diskType?: (typeof GOOGLE_CLOUD_DISK_TYPES)[number];
  acceleratorType?: (typeof GOOGLE_CLOUD_ACCELERATOR_TYPES)[number];
  // the allowed number depends on the accelerator; it defaults to 1.
  acceleratorCount?: number;
  // minCpuPlatform
  terminationTime?: Date;
  maxRunDurationSeconds?: number;
  // if true, use newest image, whether or not it is labeled with prod=true.
  test?: boolean;
  // an image name of the form "2023-09-13-063355-test", i.e., a timestamp in that format
  // followed by an optional string.  Whether or not to use cuda and and the arch are
  // determined by parameters above.  This is meant to be used for two purposes (1) testing
  // before deploying to production, and (2) stability, so a given compute server has the
  // exact same base image every time it is started, instead of being updated. Regarding (2),
  // this might not be needed, but we'll see.  If image is not set, we use the newest
  // image that is tagged prod:true, or its an error if no such image exists.
  image?: string;
  // If true, then we have an external ip address
  externalIp?: boolean;
}

export type Configuration =
  | LambdaConfiguration
  | CoreWeaveConfiguration
  | FluidStackConfiguration
  | GoogleCloudConfiguration;

interface BaseData {
  cloudflareId: string;
}

export interface LambdaCloudData extends BaseData {
  type: "lambda-cloud";
  instance_id: string;
}

export interface GoogleCloudData extends BaseData {
  type: "google-cloud";
  name?: string;
  state?: State;
  externalIp?: string;
  internalIp?: string;
  cpuPlatform?: string;
  creationTimestamp?: Date;
  lastStartTimestamp?: Date;
}

export type Data = GoogleCloudData | LambdaCloudData;

export interface ComputeServerUserInfo {
  id: number;
  account_id: string;
  project_id: string;
  title?: string;
  color?: string;
  cost_per_hour?: number;
  deleted?: boolean;
  state_changed?: Date;
  started_by?: string;
  error?: string;
  state?: State;
  idle_timeout?: number;
  // google-cloud has a new "Time limit" either by hour or by date, which seems like a great idea!
  // time_limit
  autorestart?: boolean;
  cloud: Cloud;
  configuration: Configuration;
  provisioned_configuration?: Configuration;
  data?: Data;
  purchase_id?: number;
  last_edited?: Date;
}

export interface ComputeServer extends ComputeServerUserInfo {
  api_key?: string; // project level api key for the project
  api_key_id?: number; // id of the api key (needed so we can delete it from database).
}

Table({
  name: "compute_servers",
  rules: {
    primary_key: "id",
    user_query: {
      get: {
        pg_where: [{ "project_id = $::UUID": "project_id" }],
        throttle_changes: 0, // do not make this bigger; UI really feels off if throttled
        fields: {
          id: null,
          account_id: null,
          title: null,
          color: null,
          cost_per_hour: null,
          deleted: null,
          project_id: null,
          state_changed: null,
          error: null,
          state: null,
          idle_timeout: null,
          autorestart: null,
          cloud: null,
          configuration: null,
          data: null,
          provisioned_configuration: null,
          avatar_image_tiny: null,
          last_edited: null,
          purchase_id: null,
        },
      },
    },
  },
  fields: {
    id: ID,
    account_id: {
      type: "uuid",
      desc: "User that owns this compute server.",
      render: { type: "account" },
    },
    title: {
      type: "string",
      pg_type: "VARCHAR(254)",
      desc: "Title of this computer server.  Used purely to make it easier for the user to keep track of it.",
      render: { type: "text", maxLength: 254, editable: true },
    },
    color: {
      type: "string",
      desc: "A user configurable color, which is used for tags and UI to indicate where a tab is running.",
      pg_type: "VARCHAR(30)",
      render: { type: "color", editable: true },
    },
    cost_per_hour: {
      title: "Cost per Hour",
      desc: "The cost in US dollars per hour that this compute server cost us when it is provisioned. Any time the state is changed, this is set by the server to the proper cost.",
      type: "number",
      pg_type: "real",
    },
    deleted: {
      type: "boolean",
      desc: "True if the compute server has been deleted.",
    },
    project_id: {
      type: "uuid",
      desc: "The project id that this compute server provides compute for.",
    },
    api_key: {
      type: "string",
      pg_type: "VARCHAR(128)",
      desc: "api key to connect to the project.  This is created by the system right when we are going to create the VM, and gets deleted when we stop it.  It's not set by the user and should not be revealed to the user.",
    },
    api_key_id: {
      type: "number",
      desc: "id of the api key; needed so we can delete it from database",
    },
    state_changed: {
      type: "timestamp",
      desc: "When the state last changed.",
    },
    error: {
      type: "string",
      desc: "In case something went wrong, e.g., in starting this compute server, this field will get set with a string error message to show the user. It's also cleared right when we try to start server.",
    },
    state: {
      type: "string",
      desc: "One of - 'off', 'starting', 'running', 'stopping'",
      pg_type: "VARCHAR(16)",
    },
    idle_timeout: {
      type: "number",
      desc: "The idle timeout in seconds of this compute server. If set to 0, never turn it off automatically.  The compute server idle timeouts if none of the tabs it is providing are actively touched through the web UI.",
    },
    autorestart: {
      type: "boolean",
      desc: "If true and the compute server stops for any reason, then it will be automatically started again.  This is primarily useful for stop instances.",
    },
    cloud: {
      type: "string",
      pg_type: "varchar(30)",
      desc: "The cloud where this compute server runs: 'user', 'coreweave', 'lambda', 'google-cloud', 'aws', 'fluidstack'.",
    },
    configuration: {
      type: "map",
      pg_type: "jsonb",
      desc: "Cloud specific configuration of the computer at the cloud host. The format depends on the cloud",
    },
    provisioned_configuration: {
      type: "map",
      pg_type: "jsonb",
      desc: "Same as configuration, but this is the one we actually used last time we provisioned a VM in a cloud.",
    },
    data: {
      type: "map",
      pg_type: "jsonb",
      desc: "Arbitrary data about this server that is cloud provider specific.  Store data here to facilitate working with the virtual machine, e.g., the id of the server when it is running, etc.  This *IS* returned to the user.",
    },
    avatar_image_tiny: {
      title: "Image",
      type: "string",
      desc: "tiny (32x32) visual image associated with the compute server. Suitable to include as part of changefeed, since about 3kb. Derived from avatar_image_full.",
      render: { type: "image" },
    },
    avatar_image_full: {
      title: "Image",
      type: "string",
      desc: "User configurable visual image associated with the compute server.  Could be 150kb.  NOT include as part of changefeed of projects, since potentially big (e.g., 200kb x 1000 projects = 200MB!).",
      render: { type: "image" },
    },
    purchase_id: {
      type: "number",
      desc: "if there is a current active purchase related to this compute server, this is the id of that purchase in the purchases table",
    },
    last_edited: {
      type: "timestamp",
      desc: "Last time the configuration, state, etc., changed.",
    },
  },
});

// Table({
//   name: "compute_server_log",
//   rules: {
//     primary_key: ["compute_server_id", "event", "time"],
//   },
//   fields: {
//     compute_server_id: {
//       type: "number",
//       desc: "id of the compute server",
//     },
//     time: {
//       type: "timestamp",
//       desc: "When the event was logged",
//     },
//     type: {
//       type: "string",
//       desc: "The event type",
//     },
//     data: {
//       pg_type: "jsonb",
//       desc: "amount of egress during this interval in GiB",
//     },
//   },
// });
