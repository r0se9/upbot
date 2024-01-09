// check emails
import dotenv from "dotenv";
import Browser from "../browser/index.mjs";
import path from "path";
import Database from "../db/mongodb.mjs";
import chalk from "chalk";
import yargs from "yargs/yargs";
import { hideBin } from 'yargs/helpers';
import _ from "lodash";
dotenv.config();
const argv = yargs(hideBin(process.argv))
.option("debug", {
    alias: "d",
    description: "Run this code in debug mode",
    type: "boolean",
    default: false,
  })
  .option("all", {
    alias: "d",
    description: "Check all bots",
    type: "boolean",
    default: false,
  })
  .help()
  .alias("help", "h").argv;

const ALL =  argv.all ? true : false;
const DEBUG = argv.debug ? true : false;

 async function checkRestrict(agent) {
  const result = await agent.getMe();
  const restResult = await agent.isRestricted(result.personUid);
  return restResult.data.data.developerSuspended.suspendedStatus;
}

async function checkOne(user, database){
	const agent = new Browser(!DEBUG);
	await agent.login({ user, password: process.env.PASSWORD });
  	await agent.getAuth();
  	console.log(`New Agent is created in ${moment().diff(first) / 1000}s`);
  	const isRestricted = await checkRestrict(agent);
  	
}