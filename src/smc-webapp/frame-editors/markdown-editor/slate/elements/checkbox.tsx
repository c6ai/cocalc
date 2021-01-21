/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: AGPLv3 s.t. "Commons Clause" – see LICENSE.md for details
 */

import { React } from "../../../../app-framework";
import {
  RenderElementProps,
  useFocused,
  useSelected,
  useSlate,
} from "slate-react";
import { FOCUSED_COLOR } from "../util";
import { Transforms } from "slate";
import { SlateElement, register } from "./register";
import { Checkbox as AntdCheckbox } from "antd";

export interface Checkbox extends SlateElement {
  type: "checkbox";
  value?: boolean;  // important: using the field value results in more efficient diffs
}

const Element: React.FC<RenderElementProps> = ({
  attributes,
  children,
  element,
}) => {
  if (element.type != "checkbox") {
    throw Error("bug");
  }
  const focused = useFocused();
  const selected = useSelected();
  const editor = useSlate();

  const border =
    focused && selected ? `1px solid ${FOCUSED_COLOR}` : `1px solid white`;

  return (
    <span {...attributes}>
      <AntdCheckbox
        style={{
          border,
          padding: "0 0.2em",
          verticalAlign: "middle",
        }}
        checked={!!element.value}
        onChange={(e) => {
          Transforms.setNodes(editor, { value: e.target.checked } as any, {
            match: (node) => node["type"] == "checkbox",
          });
        }}
      />
      {children}
    </span>
  );
};

register({
  slateType: "checkbox",
  markdownType: "checkbox_input",

  toSlate: ({ token }) => {
    // NOTE: the checkbox markdown-it plugin that finds the checkboxes in the input
    // markdown is something I also wrote.  It is in smc-webapp/markdown/checkbox-plugin.ts.
    return {
      type: "checkbox",
      isVoid: true,
      isInline: true,
      value: token.checked,
      children: [{ text: "" }],
    };
  },

  Element,

  fromSlate: ({ node }) => `[${node.value ? "x" : " "}]`,
});
