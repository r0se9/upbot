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
import { evaluate, evaluate_put, readFileAsync } from "../browser/function.mjs";
import { wait } from "../utils/time.mjs";
import Gmail from "../inbox/gmail.mjs";
import { getRandomElement, imageToBase64 } from "../utils/lib.mjs";
import EmailFake from "../inbox/emailfake.mjs";
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
  "emailfake",
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
  .option("vpn", {
    alias: "v",
    description: "Shall we use the VPN?",
    type: "boolean",
    demandOption: true,
    default: false,
  })
  .option("file", {
    alias: "f",
    description: "Enter your profile filename",
    type: "string",
    demandOption: true,
  })
  .option("bot", {
    alias: "b",
    description: "Enter your bot name",
    type: "string",
  })
  .option("premium", {
    alias: "p",
    description: "Create Premium version",
    type: "boolean",
    default: false,
  })
  .help()
  .alias("help", "h").argv;

process.env.VPN = argv.vpn;

const LANGUAGE_LEVEL = ["basl", "conl", "flul", "natl"];
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
async function getAGToken(page) {
  const tokenRegex = /token":\s*"([^"]+)"/;
  // Execute the regular expression to find the token
  const match = tokenRegex.exec(page);

  if (match && match[1]) {
    console.log("Extracted Token:", match[1]);
  } else {
    console.log("No token found!");
  }
  return match[1];
}
function generateGQLHeader(token) {
  return {
    Accept: "*/*",
    "Accept-Encoding": "gzip, deflate, br",
    "Accept-Language": "en-US,en;q=0.9",
    Authorization: "bearer " + token,
    "Content-Type": "application/json",
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-origin",
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36",
    "X-Upwork-Accept-Language": "en-US",
  };
}
function generateAPIHeader(authToken, csrfToken) {
  return Object.assign(
    {
      Accept: "application/json, text/plain, */*",
      "Accept-Encoding": "gzip, deflate, br",
      "Accept-Language": "en-US,en;q=0.9",
      "Content-Type": "application/json",
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-origin",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36",
      "x-odesk-csrf-token": "" + csrfToken,
      "x-odesk-user-agent": "oDesk LM",
      "x-requested-with": "XMLHttpRequest",
      "X-Upwork-Accept-Language": "en-US",
    },
    authToken && { Authorization: "bearer " + authToken }
  );
}

async function getSkillIds(page, skills, AUTH) {
  const headers = generateAPIHeader(AUTH["oauth"], AUTH['token']);
  const ids = [];
  https://www.upwork.com/freelancers/api/v2/skills?q=React
  for (const skill of skills) {

    const result = await evaluate(page, 'https://www.upwork.com/freelancers/api/v2/skills?q=React', headers, {});
    result["data"] &&
      ids.push({
        label: result['data'][0]['prettyName'],
        name: result['data'][0]['prettyName'],
        ontologySkill: {
          "uid": result['data'][0]['uid'],
          "prefLabel": result['data'][0]['prettyName']
        }
      });
  }
  return ids;
}
async function getServiceIds(page, services, AUTH) {
  const gqlHeader = generateGQLHeader(AUTH["oauth"]);
  const ids = [];
  const gqlBody = {
    query:
      "query {\x0a  ontologyCategories{\x0a    id\x0a    preferredLabel\x0a    subcategories {\x0a      id\x0a      preferredLabel\x0a    }\x0a}}",
    variables: null,
  };
  const result = await evaluate(page, GQL_URL, gqlHeader, gqlBody);
  if (result["data"]) {
    const intResults = [];
    result["data"]["ontologyCategories"]["forEach"]((category) => {
      category["subcategories"]["forEach"]((subCat) => {
        intResults.push(subCat);
      });
    });
    for (const service of services) {
      for (const intResult of intResults) {
        if (intResult["preferredLabel"] === service) {
          ids.push(intResult["id"]);
          continue;
        }
      }
    }
  }
  return ids;
}
async function addLanguage(page, languages, AUTH) {

}

async function verify(page, inboxType, email, AUTH) {
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
  } else if (inboxType === "emailfake") {
    inbox = new EmailFake(await EmailFake.create());
  } else if (inboxType === "random") {
    const MAIL = getRandomElement([
      NoSpamMail,
      GenMail,
      TenMail,
      FakeMail,
      DisposableMail,
    ]);
    inbox = new MAIL(await MAIL.create());
    await evaluate(
      upwork.page,
      "https://www.upwork.com/signup/api/emailphone/resend_email.json",
      generateAPIHeader(AUTH["oauth"], AUTH["token"]),
      {
        "chargedRate": profile.hourlyRate,
        "earnedRate": null
      }
    );

  }
}

async function createAgent(email) {
  const upwork = new Browser(false);
  if (process.env.VPN) {
    await upwork.configVPN(path.resolve('static/extensions', '1clickvpn'), 'fcfhplploccackoneaefokcmbjfbkenj')
    await upwork.login_v2({ user: email, password: process.env.PASSWORD });
  } else {
    await upwork.login({ user: email, password: process.env.PASSWORD });
  }
  await upwork.getAuth();
  return upwork;
}
async function completeAccount(profile, inboxType, profileName, email, db) {

  const upwork = await createAgent(email);
  const AUTH = await getAuthData(upwork.page);
  const apiHeaders = generateAPIHeader(AUTH["oauth"], AUTH["token"]);
  // Check weither not verified.

  const ctainer = await upwork.page.$eval('#main .air3-smf-container .air3-alert-content a', e=>e.textContent);
  if(ctainer === 'verify your email address'){
    console.log(chalk.red('Verification needed'))
  }





  let rawToken;
  upwork.page.on("response", async (response) => {
    const responseUrl = response.url();

    // Check if the response URL matches your specific URL
    if (
      responseUrl.includes(
        "https://auth.upwork.com/api/v3/oauth2/token/subordinate/v3/"
      )
    ) {
      // Process the response here

      // Optionally, you can work with the response body
      rawToken = await response.text();
    }
  });
  while (!rawToken) {
    await wait(100);
  }
  const token = await getAGToken(rawToken);

  // Add profile overview
  try {
    await evaluate(upwork.page, GQL_URL, generateGQLHeader(token), {
      "query": "mutation updateTalentProfileTitle($input: TalentProfileTitleInput!){ \n  updateTalentProfileTitle(input: $input){      \n    status\n  }}",
      "variables": {
        "input": {
          "title": profile.professional
        }
      }
    });
    console.log(chalk.green("1. Profile Title"));


    await evaluate(
      upwork.page,
      "https://www.upwork.com/freelancers/api/v2/profile/me/rate",
      generateAPIHeader(AUTH["oauth"], AUTH["token"]),
      {
        "chargedRate": profile.hourlyRate,
        "earnedRate": null
      }
    );

    console.log(chalk.green("2. Profile Hourly rate"));



    await evaluate(
      upwork.page,
      "https://www.upwork.com/freelancers/api/v1/profile/me/overview",
      generateAPIHeader(AUTH["oauth"], AUTH["token"]),
      {
        overview: profile.professional
      }
    );

    console.log(chalk.green("2. Profile Overview"));

    const skillsObj = await getSkillIds(upwork.page, profile.skills, AUTH);
    console.log(skillsObj);
    await evaluate(upwork.page, 'https://www.upwork.com/freelancers/api/v2/profile/me/skills', apiHeaders, {
      skills: skillsObj
    });

    console.log(chalk.green("2. Profile Skills"));

    for (let language of profiles.languages) {
      await evaluate(upwork.page, 'https://www.upwork.com/freelancers/api/v1/profile/me/language/add', apiHeaders, {
        "language": {
          "iso639Code": language.code
        },
        "proficiencyLevel": {
          "code": LANGUAGE_LEVEL[language.leve]
        }
      });
    }

    console.log(chalk.green("2. Profile Languages"));

    for (let xp of profiles.workXP) {
      await evaluate(upwork.page, 'https://www.upwork.com/freelancers/api/v1/profile/me/language/add', apiHeaders, {
        "uid": null,
        "personUid": null,
        "standardizedCompanyUid": null,
        "companyName": xp.company,
        "city": xp.city,
        "country": xp.country,
        "standardizedJobTitleUid": null,
        "jobTitle": xp.role,
        "startDate": xp.start,
        "endDate": xp.end,
        "description": xp.description.join('\n'),
        "role": null
      });
    }

    console.log(chalk.green("2. Profile Employment history"));


    for (let xp of profiles.extra || []) {
      await evaluate(upwork.page, 'https://www.upwork.com/freelancers/api/v1/profile/me/other-experience/add', apiHeaders, {
        "subject": xp.subject,
        "description": xp.description
      });
    }

    console.log(chalk.green("2. Profile Extra Experience"));



    for (let ed of profiles.education || []) {
      await evaluate(upwork.page, 'https://www.upwork.com/freelancers/api/v1/profile/me/education/add', apiHeaders, {
        "uid": null,
        "personUid": null,
        "standardizedInstitutionUid": null,
        "institutionName": ed.university,
        "dateStarted": ed.start,
        "dateEnded": ed.end,
        "standardizedDegreeUid": "1156532285526163456",
        "degree": "Bachelor of Computer Science (BCompSc)",
        "standardizedAreaOfStudyUid": null,
        "areaOfStudy": "Computer Science",
        "comment": ""
      })
    }

    console.log(chalk.green("2. Profile Degree"));

    const gqlHeaders = generateGQLHeader(AUTH["oauth"]);

    const categories = await getServiceIds(profile.services);
    console.log(categories);
    await evaluate_put(upwork.page, 'https://www.upwork.com/freelancers/api/v1/profile', apiHeaders, {
      categories
    })

    console.log(chalk.green("2. Profile Categories"));
  
    await db.update("accounts", {
      email: inbox.email,
    });
    console.log(chalk.green("Premium Account is saved in database"));
  } catch (e) {
    console.log(e);
  } finally {
    // await page.close();
    await upwork.close();
    return true;
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
  // for (let index = 0; index < argv.num; index++) {
  //   console.log(`~~~~~~ ${index + 1} ~~~~~~~`);
  //   try {
  //     await createAccount(
  //       profile,
  //       argv.mail,
  //       argv.file,
  //       argv.bot || process.env.BOT,
  //       database
  //     );
  //   } catch (e) {
  //     console.log(chalk.red("Error"));
  //     console.log(e);
  //   }
  // }
  await completeAccount(profile, 'genmail', 'ken', 'w029e3fb33c9ae049bdda8ee8@ismetsteakhouse.com')
  await database.close();
}

await main();
