/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: AGPLv3 s.t. "Commons Clause" – see LICENSE.md for details
 */

/*
This is simply a list of *all* publicly shared files/directories,
with a simple page.  It is mainly meant to be walked by crawlers
such as Google and for people to browse.
*/

import { useEffect, useState } from "react";
import { Radio, Space } from "antd";
import Link from "next/link";
import SiteName from "components/share/site-name";
import getPool, { timeInSeconds } from "@cocalc/database/pool";
import PublicPaths from "components/share/public-paths";
import { Layout } from "components/share/layout";
import withCustomize from "lib/with-customize";
import { Customize } from "lib/share/customize";
import GoogleSearch from "components/share/google-search";
import ChatGPTHelp from "components/openai/chatgpt-help";
import ProxyInput from "components/share/proxy-input";
import getAccountId from "lib/account/get-account";
import A from "components/misc/A";
import { useRouter } from "next/router";

const PAGE_SIZE = 100;

function getPage(obj): number {
  let { page } = obj ?? {};
  if (page == null) {
    return 1;
  }
  page = parseInt(page);
  if (isFinite(page)) {
    return Math.max(page, 1);
  }
  return 1;
}

function Pager({ page, publicPaths }) {
  return (
    <div>
      Page {page}
      &nbsp;&nbsp;
      {page > 1 ? (
        <Link href={`/share/public_paths/page/${page - 1}`}>Previous</Link>
      ) : (
        <span style={{ color: "#888" }}>Previous</span>
      )}
      &nbsp;&nbsp;
      {publicPaths != null && publicPaths.length >= PAGE_SIZE ? (
        <Link href={`/share/public_paths/page/${page + 1}`}>Next</Link>
      ) : (
        <span style={{ color: "#888" }}>Next</span>
      )}
    </div>
  );
}

export default function All({ page, publicPaths, customize }) {
  const pager = <Pager page={page} publicPaths={publicPaths} />;
  const router = useRouter();
  const [sort, setSort] = useState<string>("last_edited");

  // Set default value of `sort` from query parameter `sort`
  useEffect(() => {
    if (router.query.sort) {
      setSort(router.query.sort as string);
    }
  }, [router.query.sort]);

  function handleSortChange(e) {
    const sort = e.target.value;
    // Update the query parameter with new `sort` value
    router.push({
      pathname: router.pathname,
      query: { ...router.query, sort },
    });
  }

  return (
    <Customize value={customize}>
      <Layout title={`Page ${page} of public files`}>
        <div>
          <Space
            style={{
              float: "right",
              justifyContent: "flex-end",
              marginTop: "7.5px",
            }}
            direction="vertical"
          >
            <GoogleSearch style={{ width: "450px" }} />
            <ChatGPTHelp
              tag={"share"}
              style={{ width: "450px" }}
              prompt={"I am browsing all shared public files."}
            />
          </Space>
          <h2>
            Browse publicly shared documents on <SiteName />
          </h2>
          <ProxyInput />
          Star items to easily <A href="/stars">find them in your list</A>
          .
          <br />
          <br />
          <Radio.Group
            value={sort}
            onChange={handleSortChange}
            style={{ float: "right" }}
          >
            <Radio.Button value="last_edited">Newest</Radio.Button>
            <Radio.Button value="-last_edited">Oldest</Radio.Button>
            <Radio.Button value="stars">Stars</Radio.Button>
            <Radio.Button value="-stars">Least stars</Radio.Button>
            <Radio.Button value="views">Views</Radio.Button>
            <Radio.Button value="-views">Least views</Radio.Button>
          </Radio.Group>
          {pager}
          <br />
          <PublicPaths publicPaths={publicPaths} />
          <br />
          {pager}
        </div>
      </Layout>
    </Customize>
  );
}

export async function getServerSideProps(context) {
  const isAuthenticated = (await getAccountId(context.req)) != null;
  const page = getPage(context.params);
  const sort = getSort(context);
  const pool = getPool("medium");
  const { rows } = await pool.query(
    `SELECT public_paths.id, public_paths.path, public_paths.url, public_paths.description, ${timeInSeconds(
      "public_paths.last_edited",
      "last_edited"
    )}, projects.avatar_image_tiny,
    counter::INT,
     (SELECT COUNT(*)::INT FROM public_path_stars WHERE public_path_id=public_paths.id) AS stars
    FROM public_paths, projects
    WHERE public_paths.project_id = projects.project_id
    AND public_paths.vhost IS NULL AND public_paths.disabled IS NOT TRUE AND public_paths.unlisted IS NOT TRUE AND
    ((public_paths.authenticated IS TRUE AND $1 IS TRUE) OR (public_paths.authenticated IS NOT TRUE))
    ORDER BY ${sort} LIMIT $2 OFFSET $3`,
    [isAuthenticated, PAGE_SIZE, PAGE_SIZE * (page - 1)]
  );

  return await withCustomize({ context, props: { page, publicPaths: rows } });
}

function getSort(context) {
  switch (context.query?.sort) {
    case "stars":
      return "stars DESC, public_paths.last_edited DESC";
    case "-stars":
      return "stars ASC, public_paths.last_edited DESC";
    case "views":
      return "COALESCE(counter,0) DESC,  public_paths.last_edited DESC";
    case "-views":
      return "COALESCE(counter,0) ASC,  public_paths.last_edited DESC";
    case "-last_edited":
      return "public_paths.last_edited ASC";
    default:
      return "public_paths.last_edited DESC";
  }
}
