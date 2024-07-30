import { Router } from "express";
import { database } from "../database";
import { is_valid_uuid_string } from "@cocalc/util/misc";
import { database_is_working } from "@cocalc/hub/hub_register";
import { callback2 } from "@cocalc/util/async-utils";
import { getLogger } from "@cocalc/hub/logger";

const logger = getLogger("hub:servers:app:blobs");
export default function init(router: Router) {
  // return uuid-indexed blobs (mainly used for graphics)
  router.get("/blobs/*", async (req, res) => {
    logger.debug(`${JSON.stringify(req.query)}, ${req.path}`);
    const uuid = `${req.query.uuid}`;
    if (!is_valid_uuid_string(uuid)) {
      res.status(404).send(`invalid uuid=${uuid}`);
      return;
    }
    if (!database_is_working()) {
      res.status(404).send("can't get blob -- not connected to database");
      return;
    }

    try {
      const data = await callback2(database.get_blob, { uuid });
      if (data == null) {
        res.status(404).send(`blob ${uuid} not found`);
      } else {
        const filename = req.path.slice(req.path.lastIndexOf("/") + 1);
        if (req.query.download != null) {
          // tell browser to download the link as a file instead
          // of displaying it in browser
          res.attachment(filename);
        } else {
          res.type(filename);
        }
        res.send(data);
      }
    } catch (err) {
      logger.error(`internal error ${err} getting blob ${uuid}`);
      res.status(500).send(`internal error: ${err}`);
    }
  });
}
