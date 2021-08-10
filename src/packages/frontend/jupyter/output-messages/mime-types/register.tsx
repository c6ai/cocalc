import React from "react";
import { STDERR_STYLE } from "../style";
import { Map } from "immutable";
import type { JupyterActions } from "../../browser-actions";

export interface DataProps {
  message: Map<string, any>;
  project_id?: string;
  directory?: string;
  // id?: string;
  actions?: JupyterActions;
  name?: string; // name of redux store...
  trust?: boolean;
}

export interface HandlerProps {
  value: any;
  type: string;
  data: Map<string, any>;
  message: Map<string, any>;
  project_id?: string;
  directory?: string;
  actions?: JupyterActions;
  name?: string;
  trust?: boolean;
}

type Handler = React.FC<HandlerProps>;

const HANDLERS: {
  [typeRegexp: string]: { handler: Handler; priority: number };
} = {};

export default function register(
  typeRegexp: string, // string or regexp that matches the MIME type
  priority: number, // priority used when there are multiple description of same object
  handler: Handler // react component that renders the message.
): void {
  if (priority < 0) {
    throw Error(`priority (=${priority}) must be nonnegative`);
  }
  HANDLERS[typeRegexp] = { handler, priority };
}

const FallbackHandler: React.FC<HandlerProps> = ({ type }) => {
  return <div style={STDERR_STYLE}>MIME type {type} not supported</div>;
};

export function getPriority(type: string): number {
  const h = HANDLERS[type];
  if (h != null) return h.priority;
  for (const typeRegexp in HANDLERS) {
    if (type.match("^" + typeRegexp + "$")) {
      return HANDLERS[typeRegexp].priority;
    }
  }
  return 0;
}

export function getHandler(type: string): Handler {
  const h = HANDLERS[type];
  if (h != null) return h.handler;
  for (const typeRegexp in HANDLERS) {
    if (type.match("^" + typeRegexp + "$")) {
      return HANDLERS[typeRegexp].handler;
    }
  }
  return FallbackHandler;
}

export function hasHandler(type: string): boolean {
  if (HANDLERS[type] != null) return true;
  for (const typeRegexp in HANDLERS) {
    if (type.match("^" + typeRegexp + "$")) return true;
  }
  return false;
}
