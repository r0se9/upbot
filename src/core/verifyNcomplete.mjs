//account creation
import dotenv from "dotenv";
import Browser, { request } from "../browser/index.mjs";
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
import { getRandomElement, imageToBase64, retry } from "../utils/lib.mjs";
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
    default: false,
  })
  .option("file", {
    alias: "f",
    description: "Enter your profile filename",
    type: "string",
    demandOption: true,
  })
  .option("number", {
    alias: "n",
    description: "Enter the number of accounts to complete",
    type: "string",
  })
  .help()
  .alias("help", "h").argv;
const VPN = (argv.vpn == false) ? false : true;
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
    authToken && { Authorization: "Bearer " + authToken }
  );
}

async function getAccounts(database, user, limit) {
	const query = { status: 'half', name: user,  '$or': [
    {
      isCompleted: {
        '$ne': true
      },
      isVerified: {
        '$ne': true
      },
    }
  ], isActive: {'$ne': false}};
	const accounts = await database.get('accounts', query, { limit});
	console.log(chalk.green(`Pushed ${accounts.length} accounts to the hell....`))
	return accounts;
}


async function getSkillIds(page, skills, AUTH) {
  const headers = generateAPIHeader(AUTH["oauth"], AUTH['token']);
  const ids = [];
  https://www.upwork.com/freelancers/api/v2/skills?q=React
  for (const skill of skills) {

    const result = await evaluate(page, `https://www.upwork.com/freelancers/api/v2/skills?q=${skill}`, headers, null);
    result &&
      ids.push({
        label: result[0]['prettyName'],
        name: result[0]['prettyName'],
        ontologySkill: {
          "uid": result[0]['uid'],
          "prefLabel": result[0]['prettyName']
        }
      });
  }
  return ids;
}
async function getServiceIds(page, services, AUTH) {
  const gqlHeader = generateGQLHeader(AUTH["fwToken"]);
  const ids = [];
  const gqlBody = {
    "query": "\n          query {\n            ontologyCategories {\n              id,\n              preferredLabel,\n              subcategories {\n                id,\n                preferredLabel\n              }\n            }\n          }\n        "
  }
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


async function verify(upwork, inboxType, email) {
  let inbox;
  if (inboxType === "nospammail") {
    inbox = new NoSpamMail(email);
  } else if (inboxType === "genmail") {
    inbox = new GenMail(email);
  } else if (inboxType === "tenmail") {
    inbox = new TenMail(email);
  } else if (inboxType === "fakemail") {
    inbox = new FakeMail(email);
  } else if (inboxType === "dispmail") {
    inbox = new DisposableMail(email);
  } else if (inboxType === "gmail") {
    inbox = new Gmail(email);
  } else if (inboxType === "emailfake") {
    inbox = new EmailFake(email);
  } else if (inboxType === "random") {
    const MAIL = getRandomElement([
      NoSpamMail,
      GenMail,
      TenMail,
      FakeMail,
      DisposableMail,
    ]);
    inbox = new MAIL(email);


  }
  let url;
  try{
     url = await inbox.verify(3);
  }catch(e){

  }
  

  if (!url) {
    await upwork.navigate('https://www.upwork.com/nx/signup/please-verify');
    await upwork.getAuth();
    const res = await request(
      upwork.page,
      "POST",
      "https://www.upwork.com/signup/api/emailphone/resend_email.json",
      generateAPIHeader(undefined, upwork.AUTH["token"]),
      null
    );
    await wait(1000 * 5)
    url = await inbox.verify();
  }
  console.log(chalk.green('We got verification url: ' + url))

  await upwork.navigate(url);
  
}

async function createAgent(email) {
  const upwork = new Browser(argv.debug);
  if (VPN) {
    await upwork.configVPN(path.resolve('static/extensions', '1clickvpn'), 'fcfhplploccackoneaefokcmbjfbkenj')
    await upwork.login_v2({ user: email, password: process.env.PASSWORD });
  } else {
    await upwork.initPage();
    await upwork.navigate('https://www.upwork.com/nx/find-work/best-matches', { waitUntil: 'networkidle0' })
    await retry(e => e, () => upwork.loginAPI({ user: email, password: process.env.PASSWORD }), 100, 10);

    // await upwork.login({ user: email, password: process.env.PASSWORD });
  }

  return upwork;
}
async function completeAccount(profile, inboxType, profileName, email, db) {
  let upwork;
  try{

     upwork = await createAgent(email);
  }catch(e){
    if(e.message == 'closed_account'){
			console.log(chalk.red('closed account'))
			await database.delete('accounts', { email: user });
		}
  }
  try {
    await upwork.getAuth();



    const info = await upwork.getMe();
    if (!info.jobCategories) {
      await upwork.getAuth();
      const categories = await getServiceIds(upwork.page, profile.services, upwork.AUTH);
      await upwork.getAuth();
      await evaluate_put(upwork.page, 'https://www.upwork.com/freelancers/api/v1/profile', generateAPIHeader(upwork.AUTH["oauth"], upwork.AUTH["token"]), {
        categories
      })

      console.log(chalk.green("Profile Categories"));
    }





    // Check weither not verified.
    const profileInfo = await upwork.getProfileInfo();


    const ctainer = await upwork.page.evaluate(() => {
      // Select the element based on its CSS selector
      const el = document.querySelector('#main .air3-smf-container .air3-alert-content a');
      // If the element exists, return its text content
      if (el) {
        return el.textContent;
      }
      // If the element doesn't exist, return a predefined message or null
      return null;
    });

    if (ctainer === 'verify your email address') {
      console.log(chalk.red('Verification needed'))
      await verify(upwork, argv.mail, email);
    }
    await db.update('accounts', { email }, { '$set': { isVerified: true } })




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

    if (profileInfo.pci.pciActual < 90) {
      await upwork.navigate(`https://upwork.com/freelancers/${info.identity.ciphertext}`)
      while (!rawToken) {
        await wait(300);
      }
      const token = await getAGToken(rawToken);
      // const AUTH = await getAuthData(upwork.page);
      await upwork.getAuth();
      let apiHeaders = generateAPIHeader(upwork.AUTH["oauth"], upwork.AUTH["token"]);


      // Add profile overview

      await evaluate(upwork.page, GQL_URL, generateGQLHeader(token), {
        "query": "mutation updateTalentProfileTitle($input: TalentProfileTitleInput!){ \n  updateTalentProfileTitle(input: $input){      \n    status\n  }}",
        "variables": {
          "input": {
            "title": profile.professional
          }
        }
      });
      console.log(chalk.green("1. Profile Title"));

      let res;
      await upwork.getAuth();
      res = await evaluate(
        upwork.page,
        "https://www.upwork.com/freelancers/api/v2/profile/me/rate",
        apiHeaders,
        {
          "chargedRate": profile.hourRate,
          "earnedRate": null
        }
      );

      console.log(chalk.green("2. Profile Hourly rate"));


      await upwork.getAuth();
      res = await evaluate(
        upwork.page,
        "https://www.upwork.com/freelancers/api/v1/profile/me/overview",
        apiHeaders,
        {
          overview: profile.overview
        }
      );



      console.log(chalk.green("3. Profile Overview"));
      
      await upwork.getAuth();
      const skillsObj = await getSkillIds(upwork.page, profile.skills, upwork.AUTH);
      await upwork.getAuth();

      await evaluate(upwork.page, 'https://www.upwork.com/freelancers/api/v2/profile/me/skills', generateAPIHeader(upwork.AUTH["oauth"], upwork.AUTH["token"]), {
        skills: skillsObj
      });


      console.log(chalk.green("2. Profile Skills"));

      for (let language of profile.languages) {
        await upwork.getAuth();
        await evaluate(upwork.page, 'https://www.upwork.com/freelancers/api/v1/profile/me/language/add', generateAPIHeader(upwork.AUTH["oauth"], upwork.AUTH["token"]), {
          "language": {
            "iso639Code": language.code
          },
          "proficiencyLevel": {
            "code": LANGUAGE_LEVEL[language.level]
          }
        });
      }


      console.log(chalk.green("2. Profile Languages"));

      if (profileInfo.detail.employment.currentCredit == 0) {
        for (let xp of profile.workXP) {
          await upwork.getAuth();
          await evaluate(upwork.page, 'https://www.upwork.com/freelancers/api/v1/profile/me/employment-history/add', generateAPIHeader(upwork.AUTH["oauth"], upwork.AUTH["token"]), {
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
      }



      for (let xp of profile.extra || []) {
        await upwork.getAuth();
        await evaluate(upwork.page, 'https://www.upwork.com/freelancers/api/v1/profile/me/other-experience/add', generateAPIHeader(upwork.AUTH["oauth"], upwork.AUTH["token"]), {
          "subject": xp.subject,
          "description": xp.description
        });
      }

      console.log(chalk.green("2. Profile Extra Experience"));


      if (profileInfo.detail.education.currentCredit == 0) {
        for (let ed of profile.education || []) {
          await upwork.getAuth();
          await evaluate(upwork.page, 'https://www.upwork.com/freelancers/api/v1/profile/me/education/add', generateAPIHeader(upwork.AUTH["oauth"], upwork.AUTH["token"]), {
            "uid": null,
            "personUid": null,
            "standardizedInstitutionUid": null,
            "institutionName": ed.university,
            "dateStarted": `${ed.start}-01-01`,
            "dateEnded": `${ed.end}-01-01`,
            "standardizedDegreeUid": "1156532285526163456",
            "degree": "Bachelor of Computer Science (BCompSc)",
            "standardizedAreaOfStudyUid": "482305184288899086",
            "areaOfStudy": "Computer science",
            "comment": ""
          })
        }

        console.log(chalk.green("2. Profile Education"));
      }

      await db.update("accounts", {
        email: email,
      }, {
        '$set': {
          isCompleted: true
        }
      });
      console.log(chalk.green("Premium Account is saved in database"));
    }
  } catch (e) {
    console.log(e);
  } finally {
    
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
  const emails = await getAccounts(database, argv.file, argv.number * 1)
  // console.log(argv.num,argv.mail, process.env.BOT)
  for (let email of emails.map(el=>el.email)) {
    try {
      console.log(chalk.green(email))
      await completeAccount(profile, 'genmail', argv.file, email, database)
    } catch (e) {
      console.log(chalk.red("Error"));
      console.log(e);
    }
  }
  await database.close();
}

await main();
