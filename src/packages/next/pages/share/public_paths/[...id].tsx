/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: AGPLv3 s.t. "Commons Clause" – see LICENSE.md for details
 */

import { join } from "path";
import NextHead from "next/head";

import basePath from "lib/base-path";
import getPublicPathInfo from "lib/share/get-public-path-info";
import shareURL from "lib/share/share-url";
import withCustomize from "lib/with-customize";
import { getPublicPathNames } from "lib/names/public-path";
import PublicPath, { PublicPathProps } from "components/path/path";

import ogShareLogo from "public/logo/og-share-logo.png";

export default (props: PublicPathProps) => (
  <>
    <PublicPath {...props} />
    <NextHead>
      <meta property="og:type" content="article"/>

      <meta property="og:title" content={props.path}/>
      <meta property="og:description" content={props.description}/>
      <meta property="og:url" content={props.ogUrl}/>
      <meta property="og:image" content={
        props.customize.logoSquareURL ||
        `${props.customize.siteURL}${ogShareLogo.src}`
      }/>

      <meta property="article:published_time" content={props.created}/>
      <meta property="article:modified_time" content={props.last_edited}/>
    </NextHead>
  </>
)

export async function getServerSideProps(context) {
  const id = context.params.id[0];
  const relativePath = context.params.id.slice(1).join("/");
  try {
    const names = await getPublicPathNames(id);
    if (names != null) {
      // redirect
      let location = join(
        basePath,
        names.owner,
        names.project,
        names.public_path,
      );
      if (context.params.id.length > 1) {
        location = join(
          location,
          "files",
          context.params.id.slice(1).join("/"),
        );
      }
      return { props: { redirect: location } };
    }
    const props: PublicPathProps = await getPublicPathInfo({
      id,
      relativePath,
      req: context.req,
    });

    const customize = await withCustomize({ context, props });

    // Add full URL for social media sharing
    //
    customize.props.ogUrl = `${customize.props.customize.siteURL}${shareURL(id, relativePath)}`;

    return customize;
  } catch (_err) {
    console.log(_err);
    return { notFound: true };
  }
}
