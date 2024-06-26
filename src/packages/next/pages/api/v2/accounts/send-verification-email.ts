/*
 *  This file is part of CoCalc: Copyright © 2022 Sagemath, Inc.
 *  License: AGPLv3 s.t. "Commons Clause" – see LICENSE.md for details
 */

/*
Send verification email
*/

import sendEmailVerification from "@cocalc/server/accounts/send-email-verification";
import getAccountId from "lib/account/get-account";
import getParams from "lib/api/get-params";

import { apiRoute, apiRouteOperation } from "lib/api";
import {
  SendAccountVerificationEmailInputSchema,
  SendAccountVerificationEmailOutputSchema,
} from "lib/api/schema/accounts/send-verification-email";

async function handle(req, res) {
  const account_id = await getAccountId(req);
  if (account_id == null) {
    res.json({ error: "must be signed in" });
    return;
  }
  const { email_address } = getParams(req);
  try {
    const msg = await sendEmailVerification(account_id, email_address);

    if (msg) {
      res.json({ error: msg });
    } else {
      res.json({ status: "success" });
    }
  } catch (err) {
    res.json({ error: err.message });
  }
}

export default apiRoute({
  sendVerificationEmail: apiRouteOperation({
    method: "POST",
    openApiOperation: {
      tags: ["Accounts"],
    },
  })
    .input({
      contentType: "application/json",
      body: SendAccountVerificationEmailInputSchema,
    })
    .outputs([
      {
        status: 200,
        contentType: "application/json",
        body: SendAccountVerificationEmailOutputSchema,
      },
    ])
    .handler(handle),
});
