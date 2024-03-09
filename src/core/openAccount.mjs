import dotenv from 'dotenv'
import path from 'path'
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';
import Browser from '../browser/index.mjs'
dotenv.config()
const argv = yargs(hideBin(process.argv))
 .option("email", {
    alias: "s",
    description: "Enter statues active|applied",
    type: "string",
    demandOption: true,
  })
  .help()
  .alias('help', 'h')
  .argv;
const upwork = new Browser(false);
await upwork.configVPN(path.resolve('static/extensions', '1clickvpn'), 'fcfhplploccackoneaefokcmbjfbkenj')
await upwork.login_v2({ user: argv.email, password: process.env.PASSWORD});
await upwork.getAuth();


