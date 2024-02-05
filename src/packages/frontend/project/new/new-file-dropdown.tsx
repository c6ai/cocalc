/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: AGPLv3 s.t. "Commons Clause" – see LICENSE.md for details
 */

import { Button } from "antd";
import { React } from "@cocalc/frontend/app-framework";
import { Icon } from "@cocalc/frontend/components/icon";
import {
  DropdownMenu,
  MenuItems,
} from "@cocalc/frontend/components/dropdown-menu";
import { file_associations } from "@cocalc/frontend/file-associations";
import { keys } from "@cocalc/util/misc";
import { COLORS } from "@cocalc/util/theme";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { file_options } = require("@cocalc/frontend/editor");

interface Props {
  create_file: (ext?: string) => void;
  mode: "project" | "flyout";
  title?: string;
  showDown?: boolean;
  button?: boolean;
  cacheKey?: string;
}

export function NewFileDropdown({
  create_file,
  mode = "project",
  title = "More file types...",
  showDown = true,
  button = true,
  cacheKey = ""
}: Props) {
  // TODO maybe filter by configuration.get("main", {disabled_ext: undefined}) ?
  const items = React.useMemo((): MenuItems => {
    const list = keys(file_associations).sort();
    const extensions: string[] = [];
    const file_types_so_far = {};
    for (const ext of list) {
      const data = file_associations[ext];
      if (data.exclude_from_menu) continue;
      if (data.name != undefined && !file_types_so_far[data.name]) {
        file_types_so_far[data.name] = true;
        extensions.push(ext);
      }
    }
    return extensions.map(dropdown_item);
  }, [...keys(file_associations), cacheKey]);

  function dropdown_item(ext: string) {
    const data = file_options("x." + ext);
    const text = (
      <>
        <span style={{ width: "25px", display: "inline-block" }}>
          {data.icon && <Icon name={data.icon} />}
        </span>
        <span style={{ textTransform: "capitalize" }}>
          {data.name ? data.name : "No Extension"}
        </span>{" "}
        {ext && <span style={{ color: COLORS.GRAY }}>(.{ext})</span>}
      </>
    );

    return {
      key: ext,
      onClick: () => create_file(ext),
      label: text,
    };
  }

  switch (mode) {
    case "project":
      return (
        <span
          className={"pull-right dropdown-splitbutton-left"}
          style={{ marginRight: "5px" }}
        >
          <Button.Group>
            <Button size="large" onClick={() => create_file()}>
              <span>
                <Icon name="file" /> {title}
              </span>
            </Button>

            <DropdownMenu size="large" button={button} items={items} />
          </Button.Group>
        </span>
      );
    case "flyout":
      return (
        <DropdownMenu
          title={title ? title : "No Extension"}
          size="medium"
          button={button}
          items={items}
          showDown={showDown}
          style={{ width: "100%" }}
        />
      );
  }
}
