const debuglog = require('util').debuglog('cc-api');
const puppeteer = require('puppeteer');
import chalk from 'chalk';
import { Creds, Opts, PassFail, ApiGetString } from './types';
import { time_log } from './time_log';
import { expect } from 'chai';
import get_account_id from './get_account_id';
import get_auth_token from './get_auth_token';
import get_project_id from './get_project_id';

const LONG_TIMEOUT = 70000; // msec

const api_session = async function (creds: Creds, opts: Opts): Promise<PassFail> {
  let browser;
  let pfcounts: PassFail = new PassFail();
  try {
    const tm_launch_browser = process.hrtime.bigint()
    browser = await puppeteer.launch({
      ignoreHTTPSErrors:true,
      headless: opts.headless,
      executablePath: opts.path,
      slowMo:50 // without this sometimes the wrong project is selected
      })

    const page = (await browser.pages())[0];
    const version: string = await page.browser().version();
    debuglog('browser', version);

    time_log("launch browser for api key", tm_launch_browser);
    const tm_login = process.hrtime.bigint()
    await page.setDefaultTimeout(LONG_TIMEOUT);

    const url: string = creds.url + '?get_api_key=docs';
    await page.goto(url);
    debuglog('got url', url);

    let sel = '*[cocalc-test="sign-in-email"]';
    await page.click(sel);
    await page.keyboard.type(creds.email);
    debuglog('entered email', creds.email);

    sel = '*[cocalc-test="sign-in-password"]';
    await page.click(sel);
    await page.keyboard.type(creds.passw);
    debuglog('entered password');

    await page.setRequestInterception(true);

    sel = '*[cocalc-test="sign-in-submit"]';
    await page.click(sel);
    debuglog('clicked submit');
    time_log("login", tm_login);

    // intercepted url looks like https://authenticated/?api_key=sk_hJKSJax....
    const api_key:string = await new Promise<string>(function(resolve) {
      page.on('request', async function(request: any) {
        const regex: RegExp = /.*=/;
        const u: string = await request.url();
        if (/authenticated/.test(u)) {
          request.continue();
          const result: string = u.replace(regex, '');
          resolve(result);
        }
      });
    });
    debuglog('api_key', api_key.substr(0,5)+"...");
    expect(api_key.substr(0,3)).to.equal("sk_");
    await page.setRequestInterception(false);
    pfcounts.pass += 1;

    let ags: ApiGetString = await get_account_id(creds, api_key);
    const account_id: string = ags.result;
    pfcounts.add(ags);

    ags = await get_auth_token(creds, api_key, account_id);
    const auth_token: string = ags.result;
    expect(auth_token.length-1).to.equal(23); // delete this line when auth_token is used below
    pfcounts.add(ags);

    ags = await get_project_id(creds, api_key);
    const project_id: string = ags.result;
    expect(project_id.length-1).to.equal(35); // delete this line when auth_token is used below
    pfcounts.add(ags);

    time_log("api session total", tm_launch_browser);

  } catch (e) {
    pfcounts.fail += 1;
    console.log(chalk.red(`ERROR: ${e.message}`));
  }
  debuglog('api tests done - closing browser');
  browser.close();
  return pfcounts;
}

module.exports = {api_session}