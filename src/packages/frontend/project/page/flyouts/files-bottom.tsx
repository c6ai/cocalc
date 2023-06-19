/*
 *  This file is part of CoCalc: Copyright © 2023 Sagemath, Inc.
 *  License: AGPLv3 s.t. "Commons Clause" – see LICENSE.md for details
 */

import { CaretRightOutlined } from "@ant-design/icons";
import { Button, Collapse, Descriptions, Popover, Space } from "antd";
import immutable from "immutable";
import { debounce } from "lodash";

import { ButtonGroup } from "@cocalc/frontend/antd-bootstrap";
import {
  CSS,
  useActions,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useTypedRedux,
} from "@cocalc/frontend/app-framework";
import { ConnectionStatus } from "@cocalc/frontend/app/store";
import { Icon, TimeAgo } from "@cocalc/frontend/components";
import { file_options } from "@cocalc/frontend/editor-tmp";
import { ConnectionStatusIcon } from "@cocalc/frontend/frame-editors/frame-tree/title-bar";
import {
  ACTION_BUTTONS_DIR,
  ACTION_BUTTONS_FILE,
  ACTION_BUTTONS_MULTI,
} from "@cocalc/frontend/project/explorer/action-bar";
import { FILE_ACTIONS } from "@cocalc/frontend/project_actions";
import {
  human_readable_size,
  path_split,
  path_to_file,
  plural,
} from "@cocalc/util/misc";
import { COLORS } from "@cocalc/util/theme";
import { FIX_BORDER } from "../common";
import { TerminalFlyout } from "./files-terminal";

const PANEL_STYLE: CSS = {
  width: "100%",
  paddingLeft: "10px",
  paddingRight: "10px",
  paddingBottom: "5px",
};

interface FilesBottomProps {
  project_id: string;
  checked_files: immutable.Set<string>;
  directoryFiles: any;
  projectIsRunning: boolean;
  rootHeightPx: number;
  open: (
    e: React.MouseEvent | React.KeyboardEvent,
    index: number,
    skip?: boolean
  ) => void;
}

export function FilesBottom({
  project_id,
  checked_files,
  directoryFiles,
  projectIsRunning,
  rootHeightPx,
  open,
}: FilesBottomProps) {
  const current_path = useTypedRedux({ project_id }, "current_path");
  const actions = useActions({ project_id });
  const [activeKey, setActiveKey] = useState<string[]>([]);
  const [resize, setResize] = useState<number>(0);
  const [connectionStatus, setConectionStatus] = useState<
    ConnectionStatus | ""
  >("");

  const collapseRef = useRef<HTMLDivElement>(null);

  const triggerResize = debounce(() => setResize((r) => r + 1), 50, {
    leading: false,
    trailing: true,
  });

  // useEffect(() => {
  //   // if any selected, open "selectd" – otherwise close
  //   if (checked_files.size > 0) {
  //     setActiveKey(["selected", ...activeKey]);
  //   } else {
  //     setActiveKey(activeKey.filter((x) => x !== "selected"));
  //   }
  // }, [checked_files]);

  const singleFile = useMemo(() => {
    if (checked_files.size === 1) {
      const name = checked_files.first() ?? "";
      return directoryFiles.filter((f) => f.name === name).pop();
    }
  }, [checked_files, directoryFiles]);

  // if rootRef changes size, increase resize
  useLayoutEffect(() => {
    if (collapseRef.current == null) return;
    const observer = new ResizeObserver(triggerResize);
    observer.observe(collapseRef.current);
    return () => observer.disconnect();
  }, [collapseRef.current]);

  function renderTerminal() {
    if (!projectIsRunning) {
      return (
        <div>You have to start the project to be able to run a terminal.</div>
      );
    }
    const heightPx = `${0.33 * rootHeightPx}px`;
    return (
      <TerminalFlyout
        project_id={project_id}
        font_size={10}
        resize={resize}
        is_visible={activeKey.includes("terminal")}
        setConectionStatus={setConectionStatus}
        heightPx={heightPx}
      />
    );
  }

  function renderButtons(names) {
    return (
      <ButtonGroup
        style={{
          width: "100%",
        }}
      >
        {renderOpenFile()}
        {names.map((name) => {
          const disabled =
            [
              "move",
              "compress",
              "rename",
              "delete",
              "share",
              "duplicate",
            ].includes(name) &&
            (current_path?.startsWith(".snapshots") ?? false);

          const { name: actionName, icon, hideFlyout } = FILE_ACTIONS[name];
          if (hideFlyout) return;
          return (
            <Popover key={name} content={`${actionName}...`}>
              <Button
                size="small"
                key={name}
                disabled={disabled}
                onClick={() => {
                  actions?.set_file_action(
                    name,
                    () => path_split(checked_files.first()).tail
                  );
                }}
              >
                <Icon name={icon} />
              </Button>
            </Popover>
          );
        })}
      </ButtonGroup>
    );
  }

  async function openAllSelectedFiles(e: React.MouseEvent) {
    e.stopPropagation();
    const skipDirs = checked_files.size > 1;
    for (const file of checked_files) {
      const index = directoryFiles.findIndex((f) => f.name === file);
      // skipping directories, because it makes no sense to flip through them rapidly
      if (skipDirs && directoryFiles.find((f) => f.name === file)?.isdir) {
        open(e, index, true);
        continue;
      }
      open(e, index);
      // wait 10ms to avoid opening all files at once
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }

  function renderOpenFile() {
    if (checked_files.size === 0) return;
    return (
      <Popover content="Or double-click file in listing">
        <Button type="primary" size="small" onClick={openAllSelectedFiles}>
          <Icon name="external-link" /> Open
        </Button>
      </Popover>
    );
  }

  function renderFileInfo() {
    if (singleFile != null) {
      const { size, mtime, isdir } = singleFile;
      const age = typeof mtime === "number" ? 1000 * mtime : null;
      return (
        <Descriptions size="small" layout="horizontal" column={1}>
          {age ? (
            <Descriptions.Item label="Last modified" span={1}>
              <TimeAgo date={new Date(age)} />
            </Descriptions.Item>
          ) : undefined}
          {isdir ? (
            <Descriptions.Item label="Contains">
              {size} {plural(size, "item")}
            </Descriptions.Item>
          ) : (
            <Descriptions.Item label="Size">
              {human_readable_size(size)}
            </Descriptions.Item>
          )}
        </Descriptions>
      );
    }

    // summary of multiple selected files
    if (checked_files.size > 1) {
      let [totSize, startDT, endDT] = [0, new Date(0), new Date(0)];
      for (const f of checked_files) {
        const file = directoryFiles.find((x) => x.name === f);
        if (file == null) continue;
        const { size, mtime } = file;
        totSize += size;
        if (typeof mtime === "number") {
          const dt = new Date(1000 * mtime);
          if (startDT.getTime() === 0 || dt < startDT) startDT = dt;
          if (endDT.getTime() === 0 || dt > endDT) endDT = dt;
        }
      }

      return (
        <Descriptions size="small" layout="horizontal" column={1}>
          <Descriptions.Item label="Total size" span={1}>
            {human_readable_size(totSize)}
          </Descriptions.Item>
          {startDT.getTime() > 0 ? (
            <Descriptions.Item label="Modified" span={1}>
              <div>
                <TimeAgo date={startDT} /> to <TimeAgo date={endDT} />
              </div>
            </Descriptions.Item>
          ) : undefined}
        </Descriptions>
      );
    }
  }

  function renderSelectedControls() {
    return (
      <Space direction="vertical" size="small" style={PANEL_STYLE}>
        {singleFile
          ? singleFile.isdir
            ? renderButtons(ACTION_BUTTONS_DIR)
            : renderButtons(ACTION_BUTTONS_FILE)
          : checked_files.size > 1
          ? renderButtons(ACTION_BUTTONS_MULTI)
          : undefined}
        {renderFileInfo()}
      </Space>
    );
  }

  function renderSelected() {
    if (checked_files.size === 0) {
      let totSize = 0;
      for (const f of directoryFiles) {
        if (!f.isdir) totSize += f.size;
      }

      return (
        <div style={PANEL_STYLE}>
          No files selected. Total size {human_readable_size(totSize)}.
        </div>
      );
    } else {
      return renderSelectedControls();
    }
  }

  function renderSelectedHeader() {
    if (checked_files.size === 0) {
      let [nFiles, nDirs] = [0, 0];
      for (const f of directoryFiles) {
        if (f.isdir) {
          nDirs++;
        } else {
          nFiles++;
        }
      }

      return (
        <>
          <Icon name="files" /> {nFiles} {plural(nFiles, "file")}, {nDirs}{" "}
          {plural(nDirs, "folder")}
        </>
      );
    } else if (singleFile) {
      const name = singleFile.name;
      const iconName = singleFile.isdir
        ? "folder"
        : file_options(name)?.icon ?? "file";
      return (
        <>
          <Icon name={iconName} /> {name}
        </>
      );
    } else if (checked_files.size > 1) {
      return (
        <>
          <Icon name="files" /> {checked_files.size}{" "}
          {plural(checked_files.size, "file")} selected
        </>
      );
    }
  }

  function terminalHeader() {
    return (
      <>
        <Icon name="terminal" /> Terminal{" "}
        {connectionStatus !== "" ? (
          <span style={{ float: "right" }} title={connectionStatus}>
            <ConnectionStatusIcon status={connectionStatus} />
          </span>
        ) : undefined}
      </>
    );
  }

  function renderSelectDeselectButton() {
    if (checked_files.size === 0) {
      return (
        <Button
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            actions?.set_file_list_checked(
              directoryFiles.map((f) => path_to_file(current_path, f.name))
            );
          }}
        >
          Select all
        </Button>
      );
    } else {
      return (
        <Button
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            actions?.set_all_files_unchecked();
          }}
        >
          Deselect all
        </Button>
      );
    }
  }

  const style: CSS = {
    background: COLORS.GRAY_LL,
    borderRadius: 0,
    border: "none",
  };

  return (
    <Collapse
      ref={collapseRef}
      bordered={false}
      activeKey={activeKey}
      onChange={(key) => Array.isArray(key) && setActiveKey(key)}
      size="small"
      expandIcon={({ isActive }) => (
        <CaretRightOutlined rotate={isActive ? 90 : 0} />
      )}
      destroyInactivePanel={true}
      style={{
        ...style,
        flex: "0 0 auto",
        borderTop: FIX_BORDER,
      }}
    >
      <Collapse.Panel
        className="cc-project-flyout-files-panel"
        header={renderSelectedHeader()}
        key="selected"
        style={style}
        extra={renderSelectDeselectButton()}
      >
        {renderSelected()}
      </Collapse.Panel>
      <Collapse.Panel
        className="cc-project-flyout-files-panel"
        header={terminalHeader()}
        key="terminal"
        style={{ ...style, borderTop: FIX_BORDER }}
      >
        {renderTerminal()}
      </Collapse.Panel>
    </Collapse>
  );
}