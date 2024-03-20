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
}
async function createAccount(profile, inboxType, profileName, email, db) {

  const upwork = await createAgent(email);
  const AUTH = await getAuthData(upwork.page);
  const apiHeaders = generateAPIHeader(AUTH["oauth"], AUTH["token"]);
  // Check weither not verified.

  const ctainer = await upwork.page.$('#main .air3-smf-container .air3-alert-content a')
  if(ctainer.)





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


    // Experience
    await evaluate(upwork.page, GQL_URL, gqlHeaders, {
      query:
        "\x0amutation updateTalentQuestionChoices($input: UpdateTalentQuestionChoicesInput) {\x0a  updateTalentQuestionChoices(input: $input) {\x0a      status\x0a    }\x0a}",
      variables: {
        input: {
          questionId: "EXPERIENCE",
          choiceIds: "FREELANCED_BEFORE",
        },
      },
    });
    console.log(chalk.green("1. Experience"));

    // GOAL

    await evaluate(upwork.page, GQL_URL, gqlHeaders, {
      query:
        "\x0amutation updateTalentQuestionChoices($input: UpdateTalentQuestionChoicesInput) {\x0a  updateTalentQuestionChoices(input: $input) {\x0a      status\x0a    }\x0a}",
      variables: {
        input: {
          questionId: "FREELANCE_GOAL",
          choiceIds: ["GET_EXPERIENCE"],
        },
      },
    });
    console.log(chalk.green("2. Goal"));
    // Work Preference 1

    await evaluate(upwork.page, GQL_URL, gqlHeaders, {
      query:
        "\x0amutation updateTalentQuestionChoices($input: UpdateTalentQuestionChoicesInput) {\x0a  updateTalentQuestionChoices(input: $input) {\x0a      status\x0a    }\x0a}",
      variables: {
        input: {
          questionId: "DELIVERY_MODEL",
          choiceIds: ["MARKETPLACE"],
        },
      },
    });
    console.log(chalk.green("3. Work Preference One"));

    // Work Preference 2

    await evaluate(upwork.page, GQL_URL, gqlHeaders, {
      query:
        "\x0a    mutation updateFreelancerContractToHire($input: FreelancerContractToHireInput!) {\x0a        updateFreelancerContractToHire(input: $input) {\x0a            status\x0a        }\x0a    }",
      variables: { input: { contractToHire: true } },
    });
    console.log(chalk.green("4. Work Preference Two"));
    // Start Profile Process

    await evaluate(
      upwork.page,
      "https://www.upwork.com/ab/create-profile/api/min/v1/start-profile-process",
      apiHeaders,
      {}
    );
    console.log(chalk.yellow(" Profile Process Started"));
    // profile title

    await evaluate(upwork.page, GQL_URL, gqlHeaders, {
      query:
        "mutation updateTalentProfileTitle($input: TalentProfileTitleInput!){ \x0a    updateTalentProfileTitle(input: $input){      \x0a      status\x0a    }}",
      variables: { input: { title: profile["professional"] } },
    });
    console.log(chalk.green("5. Add Professional"));

    // employement

    await evaluate(upwork.page, GQL_URL, gqlHeaders, {
      query: `mutation updateTalentEmploymentRecords($records: [TalentEmploymentRecordInput!]){ 
        updateTalentEmploymentRecords( records: $records ){
           id
        }}`,
      variables: {
        records: profile["workXP"].map((el) => ({
          companyName: el["company"],
          jobTitle: el["role"],
          description: el["description"].join("\n"),
          city: null,
          country: "HKG",
          startDate: el["start"],
          endDate: el["end"],
        })),
      },
    });
    console.log(chalk.green("6. Add Employment History"));

    // education

    await evaluate(upwork.page, GQL_URL, gqlHeaders, {
      query:
        "mutation updateTalentEducationRecords($records: [TalentEducationRecordInput!]){ \x0a updateTalentEducationRecords( records: $records ){ id }}",
      variables: {
        records: profile["education"].map((el) => ({
          institutionName: el["university"],
          areaOfStudy: el["field"],
          degree: el["degree"],
          dateStarted: el["start"],
          dateEnded: el["end"],
        })),
      },
    });
    console.log(chalk.green("7. Add Education"));
    // Languages

    await evaluate(upwork.page, GQL_URL, gqlHeaders, {
      query:
        "mutation updateTalentLanguageRecords($records: [TalentLanguageInput!]){ \x0a  updateTalentLanguageRecords(records: $records){\x0a    id\x0a  }}",
      variables: {
        records: profile["languages"].map((el) => ({
          language: {
            iso639Code: el.code,
            active: true,
            englishName: el.name,
          },
          proficiencyLevel: {
            code: LANGUAGE_LEVEL[el.level],
          },
        })),
      },
    });
    console.log(chalk.green("8. Add Language"));

    // skills
    const skills = await getSkillIds(upwork.page, profile["skills"], AUTH);
    await evaluate(upwork.page, GQL_URL, gqlHeaders, {
      query:
        "mutation updateTalentProfileSkills($input: TalentProfileSkillsInput!){ \x0a  updateTalentProfileSkills(input: $input){\x0a    status\x0a  }}",
      variables: { input: { skills: skills } },
    });
    console.log(chalk.green("9. Add Skills"));
    // Overview

    await evaluate(upwork.page, GQL_URL, gqlHeaders, {
      query:
        "mutation updateTalentProfileDescription($input: TalentProfileDescriptionInput!){ \x0a  updateTalentProfileDescription(input: $input){\x0a    status\x0a  }}",
      variables: {
        input: { description: profile["overview"] },
      },
    });
    console.log(chalk.green("10. Add Overview"));

    // categories
    const categories = await getServiceIds(
      upwork.page,
      profile["services"],
      AUTH
    );
    await evaluate(upwork.page, GQL_URL, gqlHeaders, {
      query:
        "mutation updateTalentProfileSubCategories($input: TalentProfileSubCategoriesInput!){ \x0a  updateTalentProfileSubCategories(input: $input){\x0a    status\x0a  }}",
      variables: {
        input: {
          subCategoryIDs: categories,
        },
      },
    });
    console.log(chalk.green("11. Add Categories"));

    // Rate

    await evaluate(upwork.page, GQL_URL, gqlHeaders, {
      query:
        "mutation updateTalentProfileHourlyRate($input: TalentProfileHourlyRateInput!){ \x0a  updateTalentProfileHourlyRate(input: $input){      \x0a    status\x0a  }}",
      variables: {
        input: {
          hourlyRate: {
            amount: profile["hourRate"],
            currency: "USD",
          },
        },
      },
    });
    console.log(chalk.green("12. Add Hourly Rate"));














    console.log(chalk.green("17. General Setting"));
    // await evaluate(
    //   upwork.page,
    //   "https://www.upwork.com/freelancers/settings/api/v1/profile/me/profile-access",
    //   apiHeaders,
    //   {
    //     profileVisibility: 2
    //   }
    // );

    await evaluate(
      upwork.page,
      "https://www.upwork.com/freelancers/settings/api/v1/profile/me/contractor-tier",
      apiHeaders,
      {
        contractorTier: 1,
      }
    );

    console.log("Account has been created...");
    console.log(chalk.green("==== Check ====="));
    await upwork.getAuth();
    // await upwork.navigate('https://www.upwork.com/nx/find-work/most-recent', {waitUntil:'networkidle0'})
  } catch (e) {
    console.log(chalk.red("Error: while account creation..."));
    console.log(e);
    await upwork.close();
    return false;
  }
  const info = await upwork.getMe();
  if (!argv.premium) {
    await db.create("accounts", {
      email: inbox.email,
      type: inboxType,
      link: info.identity.ciphertext,
      botName: botName,
      status: "half",
      name: profileName,
      isPremium: false,
    });
    await upwork.close();
    return true;
  }
  try {
    console.log(chalk.yellow("Additional Configuration"));
    // await upwork.navigate('https://www.upwork.com/nx/find-work');
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
    await upwork.navigate("https://www.upwork.com/nx/agencies/create/");
    while (!rawToken) {
      await wait(100);
    }
    const token = await getAGToken(rawToken);
    const url = "https://www.upwork.com/api/graphql/v1";
    const headers = {
      Accept: "*/*",
      "Accept-Encoding": "gzip, deflate, br",
      "Accept-Language": "en-US,en;q=0.9",
      scheme: "https",
      "Accept-Encoding": "gzip, deflate, br, zstd",
      "Accept-Language": "en-US,en;q=0.9",
      "Content-Type": "application/json",
      Authorization: "bearer " + token,
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-origin",
      "x-odesk-user-agent": "oDesk LM",
      "x-requested-with": "XMLHttpRequest",
      "X-Upwork-Accept-Language": "en-US",
      Referer: "https://www.upwork.com/nx/agencies/create/",
    };
    const agCreatedata = {
      query:
        "mutation createAgency($name: String!) {\n  createAgency(name: $name) {\n    agencyId\n  }\n}",
      variables: {
        name: process.env.AGENCY_NAME,
      },
    };
    const resultAG = await evaluate(upwork.page, url, headers, agCreatedata);

    const agId = resultAG.data.createAgency.agencyId;
    const agCloseData = {
      query:
        "\n      mutation closeAgency($id: ID!) {\n        closeAgency(id: $id)\n      }\n    ",
      variables: {
        id: agId,
      },
    };
    await evaluate(upwork.page, GQL_URL, headers, agCloseData);

    // const input = await upwork.page.waitForSelector("#agency-name-input");
    // await upwork.page.type("#agency-name-input", process.env.AGENCY_NAME);
    // await wait(100);
    // const continueBtn = await upwork.page.$x(
    //   '//button[contains(text(), "Continue")]'
    // );
    // await continueBtn[0].click();
    // console.log("Continue is clicked");
    // await wait(100);
    // const confirmBtn = await upwork.page.$x(
    //   '//button[contains(text(), "Continue with Basic")]'
    // );
    // console.log("Continue with Basic is clicked");
    // await Promise.all([confirmBtn[0].click(), upwork.page.waitForNavigation()]);
    // await upwork.navigate("https://www.upwork.com/nx/ag/settings/", {
    //   waitUntil: "networkidle2",
    // });
    // const closeAgBtn = await upwork.page.waitForXPath(
    //   '//button[contains(text(), "Close my Agency")]',
    //   {
    //     visible: true,
    //     timeout: 10000, // waits for 10 seconds
    //   }
    // );
    // // const modelBtn = await upwork.page.$x('//button[contains(text(), "Confirm")]');
    // await closeAgBtn.click();
    // console.log(`Close AG is clicked`);
    // const modalBtn = await upwork.page.waitForXPath(
    //   '//button[contains(text(), "Confirm")]',
    //   {
    //     visible: true,
    //     timeout: 10000, // waits for 5 seconds
    //   }
    // );
    // await Promise.all([modalBtn.click(), upwork.page.waitForNavigation()]);
    console.log("Hurray!");
    await db.create("accounts", {
      email: inbox.email,
      type: inboxType,
      botName: botName,
      status: "active",
      name: profileName,
      isActive: true,
      isPremium: true,
    });
    console.log(chalk.green("Premium Account is saved in database"));
  } catch (e) {
    console.log(chalk.red("Error: additional configuration"));
    await db.create("accounts", {
      email: inbox.email,
      type: inboxType,
      botName: botName,
      status: "active",
      link: info.identity.ciphertext,
      name: profileName,
      isActive: true,
      isPremium: false,
    });
    console.log(e);
    console.log(chalk.green("Account is saved in database"));
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
  for (let index = 0; index < argv.num; index++) {
    console.log(`~~~~~~ ${index + 1} ~~~~~~~`);
    try {
      await createAccount(
        profile,
        argv.mail,
        argv.file,
        argv.bot || process.env.BOT,
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
