import { Checkbox, Tour } from "antd";
import type { TourProps } from "antd";
import { Icon } from "@cocalc/frontend/components/icon";
import { redux } from "@cocalc/frontend/app-framework";
import { A } from "@cocalc/frontend/components/A";
import actionsImage from "./actions.png";

export default function ExplorerTour({
  open,
  project_id,
  newFileRef,
  searchBarRef,
  fileListingRef,
  currentDirectoryRef,
  miscButtonsRef,
  miniterminalRef,
}) {
  const steps: TourProps["steps"] = [
    {
      title: (
        <>
          Tour of the File Explorer{" "}
          <A href="https://doc.cocalc.com/explorer.html">(docs)</A>
        </>
      ),
      description: (
        <>
          The file explorer provides an organized view of all the files in your
          project, simplifying navigation and management. You can click on a
          file to open it, or click the checkbox to the left for more options
          like renaming, copying, or deleting files. This tour highlights many
          of the features displayed here.
        </>
      ),
    },
    {
      title: (
        <>
          <Icon name="plus-circle-o" /> Create New Files
        </>
      ),
      description: (
        <>
          Click on the "New" button to create a new file in your project. You
          can choose from Jupyter notebooks, LaTeX files, Python scripts, and
          many other file formats to get started with your homework or projects.
        </>
      ),
      target: newFileRef.current,
    },
    {
      title: (
        <>
          <Icon name="search" /> Search or create file
        </>
      ),
      description: (
        <>
          Type here to show only files in the current directory whose name
          matches your search. If nothing matches, a big "Create" button appears
          and you can easily create a file with that name.
        </>
      ),
      target: searchBarRef.current,
    },
    {
      title: "File Listing",
      description: (
        <>
          The file tree shows your project's folder and file structure. Browse
          through the folders by clicking on them to easily navigate and find
          the files you need for your work. You can quickly find your files by
          sorting by type, name, date modified or size by clicking the column
          headings.
        </>
      ),
      target: fileListingRef.current,
    },
    {
      title: "Actions",
      cover: <img src={actionsImage} />,
      description: (
        <>
          Click the checkbox to the left of any file or folder to reveal
          additional contextual buttons that let you rename, copy, delete,
          compress, and downloading your files. You can also easily copy files
          to other projects or publish them.
        </>
      ),
    },
    {
      title: "Current Folder",
      description: (
        <>
          The current folder is displayed here. The directory listing below
          is of this directory. There are breadcrumbs, so you can easily click
          to visit recent folders further down the tree.
        </>
      ),
      target: currentDirectoryRef.current,
    },
    {
      title: "Library & Upload buttons",
      description: (
        <>
          Click the upload button to select files from your computer and upload
          them to your project. You an also just drag and drop files onto the
          listing. There's also a library of Jupyter notebooks and other
          content.
        </>
      ),
      target: miscButtonsRef.current,
    },
    {
      title: "Hidden files",
      description: (
        <>
          The show hidden files button toggles the visibility of hidden files
          and folders in the file explorer, enabling users to access and manage
          system and configuration files that start with a . as needed.
        </>
      ),
      target: miscButtonsRef.current,
    },
    {
      title: "Masked files",
      description: (
        <>
          The show masked files button toggles the visibility of non-hidden
          autogenerated temporary files in the file explorer, e.g., resulting
          from running LaTeX compilation.
        </>
      ),
      target: miscButtonsRef.current,
    },
    {
      title: "Backups",
      description: (
        <>
          CoCalc's backups are filesystem snapshots that provide a safety net to
          recover your work in case of accidental deletion, errors, or file
          corruption. They allow you to revert to a previous version of any file
          in your project, minimizing data loss.
        </>
      ),
      target: miscButtonsRef.current,
    },
    {
      title: "Mini Terminal",
      description: (
        <>
          Leverage your knowledge of Linux terminal commands to run any Linux
          command here to quickly use cp, mv, rm, git, etc., to work with files.
          If you use cd it will change the current directory.
        </>
      ),
      target: miniterminalRef.current,
    },
    {
      title: "Congratulations!",
      description: (
        <>
          You finished the file explorer tour! Click the checkbox below to hide
          the tour button.
          <br />
          <br />
          <Checkbox
            onChange={(e) => {
              const actions = redux.getActions("account");
              if (e.target.checked) {
                actions.setTourDone("explorer");
                redux
                  .getProjectActions(project_id)
                  .setState({ explorerTour: false });
              } else {
                actions.setTourNotDone("explorer");
              }
            }}
          >
            Hide tour
          </Checkbox>
        </>
      ),
    },
  ];
  return (
    <Tour
      open={!!open}
      steps={steps}
      onClose={() => {
        redux.getProjectActions(project_id).setState({ explorerTour: false });
      }}
    />
  );
}
