/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: AGPLv3 s.t. "Commons Clause" – see LICENSE.md for details
 */

import { Map } from "immutable";
import { TypedMap } from "../../app-framework";
import { IconName } from "@cocalc/frontend/components/icon";

export type ElementType =
  | "text"
  | "note"
  | "code"
  | "icon"
  | "pen"
  | "chat"
  | "terminal"
  | "stopwatch"
  | "timer"
  | "frame"
  | "edge"
  | "selection";

export type Point = { x: number; y: number };

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Data {
  fontSize?: number;
  radius?: number;
  fontFamily?: string;
  color?: string;
  path?: number[]; // right now is encoded as [x,y,x2,y2,x3,y3] to be simpler to JSON.
  from?: string; // id of from node
  to?: string; // id of to node
  dir?: number[]; // dir path part of edge
  icon?: IconName; // icon
  hideInput?: boolean; // used for code cells
  hideOutput?: boolean; // used for code cells
  output?: { [index: number]: object }; // code
}

/*
It will be better but more work to make all the following
instead of the big union above.

interface TextData {
  fontSize?: number;
  fontFamily?: string;
  color?: string;
}

interface NoteData {
  fontSize?: number;
  fontFamily?: string;
  color?: string;
}

interface PathData {
  radius?: number;
  color?: string;
  path?: number[]; // right now is encoded as [x,y,x2,y2,x3,y3] to be simpler to JSON.
}

interface IconData {
  color?: string;
  fontSize?: number;
  name?: string;
}

interface EdgeData extends PathData {
  from?: string; // id of from node
  to?: string; // id of to node
  dir?: number[]; // dir path part of edge
}
*/

export interface Element extends Rect {
  id: string;
  type: ElementType;
  z: number; // zIndex
  data?: Data; // optional json-able object - patch/merge atomic
  str?: string; // optional str data patch/merge via diff string
  group?: string; // group id if object is part of a group
  rotate?: number; // angle in *radians*
}

export type ElementMap = TypedMap<Element>;

// Tasks is an immutable map from id to Element as a map.
export type Elements = Map<string, ElementMap>;
