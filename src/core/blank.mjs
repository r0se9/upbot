//account creation
import dotenv from "dotenv";
import Browser from "../browser/index.mjs";
import path from "path";
import Database from "../db/mongodb.mjs";
import chalk from "chalk";
import yargs from "yargs/yargs";
import _ from "lodash";
import { click } from "puppeteer-utilz";
import { hideBin } from "yargs/helpers";
import { decorate } from "../utils/decorator.mjs";
import NoSpamMail from "../inbox/nospammail.mjs";
import GenMail from "../inbox/genmail.mjs";
import DisposableMail from "../inbox/diposablemail.mjs";
import FakeMail from "../inbox/fakemail.mjs";
import TenMail from "../inbox/tenmail.mjs";
import { evaluate, readFileAsync } from "../browser/function.mjs";
import { wait } from "../utils/time.mjs";
import Gmail from "../inbox/gmail.mjs";
import { getRandomElement, imageToBase64 } from "../utils/lib.mjs";
decorate();
const PROFILE_PATH = "./static/profiles";
const AVAILABLE_INBOXes = [
  "nospammail",
  "genmail",
  "tenmail",
  "fakemail",
  "dispmail",
  "random",
  "gmail",
];
const GQL_URL = "https://www.upwork.com/api/graphql/v1";
dotenv.config();
const argv = yargs(hideBin(process.argv))
  .option("debug", {
    alias: "d",
    description: "Run this code in debug mode",
    type: "boolean",
    default: false,
  })
  .option("mail", {
    alias: "m",
    description: "Enter your inbox type",
    type: "string",
    demandOption: true,
    choices: AVAILABLE_INBOXes,
  })
  .option("num", {
    alias: "n",
    description: "Enter the amount of accounts to create",
    type: "number",
    demandOption: true,
    default: 1,
  })
  .option("file", {
    alias: "f",
    description: "Enter your profile filename",
    type: "string",
    demandOption: true,
  })
  .option("premium", {
    alias: "p",
    description: "Create Premium version",
    type: "boolean",
    default: false,
  })
  .help()
  .alias("help", "h").argv;
const LANGUAGE_LEVEL = ['basl', 'conl', 'flul', 'natl'];
function generatePhoneNumber(base) {
  return base.replace(/\*/g, () => Math.floor(Math.random() * 10));
}
async function getAuthData(page) {
  const data = { token: "", oauth: "" };
  const values = [];
  const cookies = await page.cookies();
  for (const cookie of cookies) {
    if (cookie["name"] === "XSRF-TOKEN") data["token"] = cookie["value"];
    cookie["name"]["endsWith"]("sb") &&
      cookie["value"]["startsWith"]("oauth2v2_") &&
      values["push"](cookie["value"]);
  }
  for (const value of values) {
    const headers = {
      Accept: "*/*",
      "Accept-Encoding": "gzip, deflate, br, zstd",
      "Accept-Language": "en-US,en;q=0.9",
      Authorization: "bearer " + value,
      "Content-Type": "application/json",
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-origin",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36",
      "X-Upwork-Accept-Language": "en-US",
    };
    const body = {
      query:
        "query ontologyElementsSearchByPrefLabel($filter: OntologyElementsSearchByPrefLabelFilter){ \x0a  ontologyElementsSearchByPrefLabel(filter: $filter){\x0a    id\x0a    ontologyId\x0a    preferredLabel\x0a    ...  on Skill {\x0a      legacySkillNid\x0a    }\x0a  }}",
      variables: {
        filter: {
          preferredLabel_any: "Angularjs",
          type: "SKILL",
          entityStatus_eq: "ACTIVE",
          sortOrder: "match-start",
          limit: 50,
          includeAttributeGroups: false,
        },
      },
    };
    const result = await evaluate(
      page,
      "https://www.upwork.com/api/graphql/v1",
      headers,
      body
    );
    if (result["data"]) {
      data["oauth"] = value;
      break;
    }
  }
  return data;
}



async function createAccount(profile, inboxType, profileName, botName, db) {
  const locations = await db.get("locations", { country: profile["country"] });
  const location = getRandomElement(locations);
  // console.log(location);
  let inbox;
  if (inboxType === "nospammail") {
    inbox = new NoSpamMail(await NoSpamMail.create());
  } else if (inboxType === "genmail") {
    inbox = new GenMail(await GenMail.create());
  } else if (inboxType === "tenmail") {
    inbox = new TenMail(await TenMail.create());
  } else if (inboxType === "fakemail") {
    inbox = new FakeMail(await FakeMail.create());
  } else if (inboxType === "dispmail") {
    inbox = new DisposableMail(await DisposableMail.create());
  } else if (inboxType === "gmail") {
    inbox = new Gmail(Gmail.create(process.env.GMAIL));
  } else if (inboxType === "random") {
    const MAIL = getRandomElement([
      NoSpamMail,
      GenMail,
      TenMail,
      FakeMail,
      DisposableMail,
    ]);
    inbox = new MAIL(await MAIL.create());
  }
  console.log(`===> ${inbox.email}`);
  const pathToExtension = path.resolve("./static/extensions/cookies");
  const upwork = new Browser(!argv.debug);
  try {
    await upwork.signUp(
      {
        user: inbox.email,
        password: process.env.PASSWORD,
      },
      { firstName: profile["firstName"], secondName: profile["lastName"] },
      inbox,
      [
        `--disable-extensions-except=${pathToExtension}`,
        `--load-extension=${pathToExtension}`,
      ]
    );
    console.log("Successfully Verified.");

    await db.create("accounts", {
      email: inbox.email,
      type: inboxType,
      botName: botName,
      status: "blank",
      name: profileName,
      isPremium: false,
    });
    await upwork.close();
    return true;

   

    console.log("Account has been created...");
  } catch (e) {
    console.log(chalk.red("Error: while account creation..."));
    console.log(e);
    await upwork.close();
    return false;
  }
}

// await createAccount(profile, inboxType, botName);
async function main() {
  const filePath = path.resolve(PROFILE_PATH, argv.file + ".json");
  const rawData = await readFileAsync(filePath);
  const profile = JSON.parse(rawData);
  const database = new Database(process.env.MONGODB_URI);
  await database.connect();
  // console.log(argv.num,argv.mail, process.env.BOT)
  for (let index = 0; index < argv.num; index++) {
    console.log(`~~~~~~ ${index + 1} ~~~~~~~`);
    try {
      await createAccount(
        profile,
        argv.mail,
        argv.file,
        process.env.BOT,
        database
      );
    } catch (e) {
      console.log(chalk.red("Error"));
      console.log(e);
    }
  }
  await database.close();
}

await main();
