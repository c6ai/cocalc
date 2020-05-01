/* 
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: AGPLv3 s.t. "Commons Clause" – see LICENSE.md for details
 */

#!/usr/bin/env node
// update the colorscheme definitions

const fs = require("fs");
const path = require("path");
const { COLORS } = require("smc-util/theme");

// write sass file
process.chdir(path.join(process.env["SMC_ROOT"], "smc-webapp"));

const isObject = (a) => !!a && a.constructor === Object;

let colors_sass =
  "/* DO NOT UPDATE THIS FILE -- autogenerated via scripts/update-color-scheme.js based on smc-util/theme.js */\n\n";
for (let c in COLORS) {
  // there are nested definitions
  const v = COLORS[c];
  if (isObject(v)) {
    for (let c2 in v) {
      const v2 = v[c2];
      colors_sass += `$COL_${c}_${c2}: ${v2}\n`;
    }
  } else {
    colors_sass += `$COL_${c}: ${v}\n`;
  }
}

fs.writeFileSync("_colors.sass", colors_sass);
