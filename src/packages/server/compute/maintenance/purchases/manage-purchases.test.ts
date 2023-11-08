/*
Test managing purchases
*/

import getPool, { initEphemeralDatabase } from "@cocalc/database/pool";
import { uuid } from "@cocalc/util/misc";
import createAccount from "@cocalc/server/accounts/create-account";
import createProject from "@cocalc/server/projects/create";
import createServer from "@cocalc/server/compute/create-server";
import { getServer } from "@cocalc/server/compute/get-servers";
import managePurchases, {
  outstandingPurchases,
  MAX_NETWORK_USAGE_UPDATE_INTERVAL_MS,
  MIN_NETWORK_CLOSE_DELAY_MS,
  MAX_PURCHASE_LENGTH_MS,
} from "./manage-purchases";
import { setTestNetworkUsage } from "@cocalc/server/compute/control";
import { getPurchase } from "./util";
import createPurchase from "@cocalc/server/purchases/create-purchase";
import { delay } from "awaiting";

beforeAll(async () => {
  await initEphemeralDatabase();
}, 15000);

afterAll(async () => {
  setTimeout(process.exit, 1);
});

describe("confirm managing of purchases works", () => {
  const account_id = uuid();
  let project_id;
  let server_id;

  it("does one call to managePurchases to so there's no servers marked as needing updates", async () => {
    await managePurchases();
    await managePurchases();
    const pool = getPool();
    const { rows } = await pool.query(
      "SELECT count(*) AS count FROM compute_servers WHERE update_purchase=TRUE",
    );
    expect(rows[0].count).toBe("0");
    // if this test turns out to be flaky, just do a query to set all the update_purchase's
    // to false.  There's no telling what is in the database going into this.
    // Obviously this makes parallel testing of different files not possible, but
    // that is ok, usually.
  });

  it("creates account, project and compute server on test cloud", async () => {
    await createAccount({
      email: "",
      password: "xyz",
      firstName: "User",
      lastName: "One",
      account_id,
    });
    project_id = await createProject({
      account_id,
      title: "My First Project",
    });
    const s = {
      title: "myserver",
      idle_timeout: 15,
      cloud: "test",
    } as const;
    server_id = await createServer({
      account_id,
      project_id,
      ...s,
    });
    // give user $10.
    await createPurchase({
      account_id,
      service: "credit",
      description: {} as any,
      client: null,
      cost: -10,
    });
  });

  it("in deprovisioned state no purchase is created", async () => {
    const pool = getPool();
    await pool.query(
      "UPDATE compute_servers SET state='deprovisioned',update_purchase=TRUE WHERE id=$1",
      [server_id],
    );
    await managePurchases();
    const server = await getServer({ account_id, id: server_id });
    const purchases = await outstandingPurchases(server);
    expect(purchases.length).toBe(0);
  });

  // rule 1
  it("set server state to 'starting' (and update_purchase true), then see that a purchase in state 'running' is created by managePurchases", async () => {
    const pool = getPool();
    await pool.query(
      "UPDATE compute_servers SET state='starting',update_purchase=TRUE WHERE id=$1",
      [server_id],
    );
    await managePurchases();
    const server = await getServer({ account_id, id: server_id });
    const purchases = await outstandingPurchases(server);
    expect(purchases.length).toBe(1);
    expect(purchases[0].description.type).toBe("compute-server");
    if (purchases[0].description.type != "compute-server") {
      throw Error("bug");
    }
    expect(purchases[0].description.state).toBe("running");
    expect(purchases[0].service).toBe("compute-server");
  });

  // rule 2
  it("set server state to 'running' (and update_purchase true), then see that a purchase in state 'running' is created by managePurchases", async () => {
    const pool = getPool();
    await pool.query(
      "UPDATE compute_servers SET state='running',update_purchase=TRUE WHERE id=$1",
      [server_id],
    );
    await managePurchases();
    const server = await getServer({ account_id, id: server_id });
    const purchases = await outstandingPurchases(server);
    expect(purchases.length).toBe(2);
    const network = purchases.filter(
      (x) => x.service == "compute-server-network-usage",
    );
    expect(network.length).toBe(1);
    expect(network[0].description.type).toBe("compute-server-network-usage");
    if (network[0].description.type != "compute-server-network-usage") {
      throw Error("bug");
    }
    expect(network[0].service).toBe("compute-server-network-usage");
  });

  async function setPurchaseStart(start: Date) {
    const server = await getServer({ account_id, id: server_id });
    const purchases = await outstandingPurchases(server);
    expect(purchases.length).toBe(2);
    const normal = purchases.filter((x) => x.service == "compute-server");
    const network = purchases.filter(
      (x) => x.service == "compute-server-network-usage",
    );
    if (network[0].description.type != "compute-server-network-usage") {
      throw Error("bug");
    }
    network[0].description.last_updated = start.valueOf();
    const pool = getPool();
    await pool.query(
      "UPDATE purchases SET period_start=$1, description=$2 WHERE id=$3",
      [start, network[0].description, network[0].id],
    );
    await pool.query("UPDATE purchases SET period_start=$1 WHERE id=$2", [
      start,
      normal[0].id,
    ]);
    return { normal_id: normal[0].id, network_id: network[0].id };
  }

  // rule 4:
  it(" adjust times so purchase is more than MAX_NETWORK_USAGE_UPDATE_INTERVAL_MS+MIN_NETWORK_CLOSE_DELAY_MS back, and see that network usage is updated", async () => {
    const { network_id } = await setPurchaseStart(
      new Date(
        Date.now() -
          MAX_NETWORK_USAGE_UPDATE_INTERVAL_MS -
          MIN_NETWORK_CLOSE_DELAY_MS -
          30 * 1000,
      ),
    );
    const pool = getPool();
    await pool.query(
      "UPDATE compute_servers SET state='running', update_purchase=TRUE WHERE id=$1",
      [server_id],
    );
    setTestNetworkUsage({ id: server_id, amount: 389, cost: 3.89 });
    await managePurchases();
    const network = await getPurchase(network_id);
    if (network.description.type != "compute-server-network-usage") {
      throw Error("bug");
    }
    expect(network.description.cost).toBe(3.89);
    expect(network.description.amount).toBe(389);
  });

  // rule 5:
  it("adjust times so purchase is over MAX_PURCHASE_LENGTH_MS, and see that the network and normal purchase are both split and new ones created", async () => {
    const { normal_id, network_id } = await setPurchaseStart(
      new Date(
        Date.now() -
          MAX_PURCHASE_LENGTH_MS -
          MIN_NETWORK_CLOSE_DELAY_MS -
          30 * 1000,
      ),
    );
    const pool = getPool();
    await pool.query(
      "UPDATE compute_servers SET state='running', update_purchase=TRUE WHERE id=$1",
      [server_id],
    );
    await managePurchases();
    const network = await getPurchase(network_id);
    const normal = await getPurchase(normal_id);
    if (network.description.type != "compute-server-network-usage") {
      throw Error("bug");
    }
    expect(network.description.cost).toBe(3.89);
    expect(network.description.amount).toBe(389);

    expect(normal.cost).toBeGreaterThan(1);

    const server = await getServer({ account_id, id: server_id });
    const purchases = await outstandingPurchases(server);
    expect(purchases.length).toBe(2);
  });

  // rule 3
  it("change state to 'stopping' and no purchases change", async () => {
    const server = await getServer({ account_id, id: server_id });
    const purchases = await outstandingPurchases(server);
    expect(purchases.length).toBe(2);
    const pool = getPool();
    await pool.query(
      "UPDATE compute_servers SET state='stopping', update_purchase=TRUE WHERE id=$1",
      [server_id],
    );
    await managePurchases();
    const purchases2 = await outstandingPurchases(server);
    expect(purchases).toEqual(purchases2);
  });

  // rule 3
  it("change state to 'off' and current purchase ends and a new one is created", async () => {
    const server = await getServer({ account_id, id: server_id });
    const purchases = await outstandingPurchases(server);
    expect(purchases.length).toBe(2);
    const pool = getPool();
    await pool.query(
      "UPDATE compute_servers SET state='off', update_purchase=TRUE WHERE id=$1",
      [server_id],
    );
    await managePurchases();
    const purchases2 = await outstandingPurchases(server);
    expect(purchases2.length).toEqual(1);
    // have to call it again to get the new purchase.
    await managePurchases();
    const purchases3 = await outstandingPurchases(server);
    expect(purchases3.length).toEqual(2);
  });

  // rule 6
  it("make time really long so that balance is exceeded, and see that server gets stopped due to too low balance", async () => {
    await setPurchaseStart(new Date(Date.now() - 1000 * 60 * 60 * 24 * 500));
    const pool = getPool();
    await pool.query(
      "UPDATE compute_servers SET state='running', update_purchase=TRUE WHERE id=$1",
      [server_id],
    );
    await managePurchases();
    await delay(10);
    const server = await getServer({ account_id, id: server_id });
    expect(server.state == "off" || server.state == "stopping").toBe(true);
    expect(server.error).toContain("do not have enough");
  });

  it("shut off machine instead of starting purchase when user doesn't have enough money", async () => {
    const pool = getPool();
    // delete all purchases for this server
    let server = await getServer({ account_id, id: server_id });
    const purchases = await outstandingPurchases(server);
    for (const { id } of purchases) {
      await pool.query("DELETE FROM purchases WHERE id=$1", [id]);
    }
    // set server running
    await pool.query(
      "UPDATE compute_servers SET state='running', update_purchase=TRUE WHERE id=$1",
      [server_id],
    );
    // We have no money now due to above, so this *should*
    // stop server rather than making a purchase.
    // This is basically a double check on the frontend and rest of the system.
    await managePurchases();
    await delay(10);
    server = await getServer({ account_id, id: server_id });
    expect(server.state == "off" || server.state == "stopping").toBe(true);
  });
});