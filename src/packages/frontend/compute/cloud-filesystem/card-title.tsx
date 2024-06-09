import MountButton from "./mount-button";
import Title from "../title";
import Menu from "./menu";
import { trunc_middle } from "@cocalc/util/misc";

interface Props {
  cloudFilesystem;
  setError;
  refresh?;
  setShowDelete;
  setShowMount;
}

export default function CloudFilesystemCardTitle({
  cloudFilesystem,
  setError,
  setShowDelete,
  setShowMount,
}: Props) {
  return (
    <div
      style={{
        display: "flex",
        color: "#666",
        borderBottom: `1px solid ${cloudFilesystem.color}`,
        paddingBottom: "5px",
      }}
    >
      <div style={{ flex: 1 }}>
        <MountButton
          cloudFilesystem={cloudFilesystem}
          setShowMount={setShowMount}
        />
      </div>
      <div
        style={{
          flex: 1,
          textOverflow: "ellipsis",
          overflow: "hidden",
          padding: "5px 5px 0 5px",
          fontWeight: 400,
        }}
      >
        <code>{trunc_middle(`~/${cloudFilesystem.mountpoint}`, 40)}</code>
      </div>
      <Title
        title={cloudFilesystem.title}
        editable={false}
        style={{
          textOverflow: "ellipsis",
          overflow: "hidden",
          flex: 1,
          padding: "5px 5px 0 5px",
        }}
      />
      <Menu
        cloudFilesystem={cloudFilesystem}
        setError={setError}
        setShowDelete={setShowDelete}
        setShowMount={setShowMount}
      />
    </div>
  );
}
