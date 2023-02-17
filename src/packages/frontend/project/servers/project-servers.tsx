/*
 *  This file is part of CoCalc: Copyright © 2023 Sagemath, Inc.
 *  License: AGPLv3 s.t. "Commons Clause" – see LICENSE.md for details
 */

import { Col, Modal, Row } from "antd";
import { Gutter } from "antd/es/grid/row";

import { CSS, useState } from "@cocalc/frontend/app-framework";
import { Paragraph, Text, Title } from "@cocalc/frontend/components";
import { NamedServerName } from "@cocalc/util/types/servers";
import { NamedServerPanel } from "../named-server-panel";
import { NewFileButton } from "../new/new-file-button";
import { useAvailableFeatures } from "../use-available-features";
import { HelpEmailLink } from "../../customize";
import { SagewsControl } from "../settings/sagews-control";

const ROOT_STYLE: CSS = {
  marginLeft: "20px",
  marginRight: "20px",
  maxWidth: "1000px",
} as const;

// Antd's 24 grid system
const md = 6;
const sm = 12;
const y: Gutter = 30;
const gutter: [Gutter, Gutter] = [20, y / 2];
const newRowStyle = { marginTop: `${y}px` };

interface Props {
  project_id: string;
}

export function ProjectServers(props: Props) {
  const { project_id } = props;

  const available = useAvailableFeatures(project_id);

  const [showNamedServer, setShowNamedServer] = useState<"" | NamedServerName>(
    ""
  );

  function toggleShowNamedServer(name: NamedServerName): void {
    showNamedServer == name ? setShowNamedServer("") : setShowNamedServer(name);
  }

  const noServers: boolean =
    !available.jupyter_notebook &&
    !available.jupyter_lab &&
    !available.vscode &&
    !available.julia;

  function renderNamedServers(): JSX.Element {
    return (
      <>
        <Row gutter={gutter} style={newRowStyle}>
          {available.jupyter_notebook && (
            <Col sm={sm} md={md}>
              <NewFileButton
                name={"Jupyter Classic..."}
                icon={"ipynb"}
                active={showNamedServer === "jupyter"}
                on_click={() => toggleShowNamedServer("jupyter")}
              />
            </Col>
          )}
          {available.jupyter_lab && (
            <Col sm={sm} md={md}>
              <NewFileButton
                name={"JupyterLab..."}
                icon={"ipynb"}
                active={showNamedServer === "jupyterlab"}
                on_click={() => toggleShowNamedServer("jupyterlab")}
              />
            </Col>
          )}
          {available.vscode && (
            <Col sm={sm} md={md}>
              <NewFileButton
                name={"VS Code..."}
                icon={"vscode"}
                active={showNamedServer === "code"}
                on_click={() => toggleShowNamedServer("code")}
              />
            </Col>
          )}
          {available.julia && (
            <Col sm={sm} md={md}>
              <NewFileButton
                name={"Pluto..."}
                icon={"julia"}
                active={showNamedServer === "pluto"}
                on_click={() => toggleShowNamedServer("pluto")}
              />
            </Col>
          )}
          {noServers && (
            <Col sm={sm} md={md}>
              <NewFileButton
                name={"No servers available"}
                icon={"exclamation-circle"}
                on_click={() =>
                  Modal.info({
                    title: "No servers available",
                    content: (
                      <>
                        No available server has been detected in this project
                        environment. You can{" "}
                        <HelpEmailLink text="ask an administrator" /> to install
                        e.g. JupyterLab by running <br />
                        <Text code>pip install jupyterlab</Text>
                        <br />
                        globally.
                      </>
                    ),
                  })
                }
              />
            </Col>
          )}
        </Row>

        <Row gutter={gutter} style={newRowStyle}>
          <Col sm={16} push={4}>
            {showNamedServer && (
              <NamedServerPanel
                project_id={project_id}
                name={showNamedServer}
              />
            )}
          </Col>
        </Row>
      </>
    );
  }

  function renderSageServerControl(): JSX.Element {
    return (
      <Row gutter={gutter} style={newRowStyle}>
        <Col sm={24} md={12}>
          <Title level={3}>Sage Worksheet Server</Title>
          <SagewsControl key="worksheet" project_id={project_id} />
        </Col>
      </Row>
    );
  }

  return (
    <div style={ROOT_STYLE}>
      <Title level={2}>Servers</Title>
      <Paragraph>
        You can run various servers inside this project. They run in the same
        environment, have access to the same files, and stop, when the project
        stops.
      </Paragraph>
      {renderNamedServers()}
      {renderSageServerControl()}
    </div>
  );
}