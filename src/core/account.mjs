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
import GenMail from '../inbox/genmail.mjs';
import DisposableMail from '../inbox/diposablemail.mjs';
import FakeMail from '../inbox/fakemail.mjs';
import TenMail from '../inbox/tenmail.mjs';
import { evaluate, readFileAsync } from "../browser/function.mjs";
import { wait } from "../utils/time.mjs";
import { getRandomElement } from '../utils/lib.mjs';
decorate();
const PROFILE_PATH = "./static/profiles";
const AVAILABLE_INBOXes = ["nospammail", "genmail", "tenmail", "fakemail", "dispmail", "random"];
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
  .help()
  .alias("help", "h").argv;

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
  const headers = generateGQLHeader(AUTH["oauth"]);
  const ids = [];
  for (const skill of skills) {
    const data = {
      query:
        "query ontologyElementsSearchByPrefLabel($filter: OntologyElementsSearchByPrefLabelFilter){ \x0a  ontologyElementsSearchByPrefLabel(filter: $filter){\x0a    id\x0a    ontologyId\x0a    preferredLabel\x0a    ...  on Skill {\x0a      legacySkillNid\x0a    }\x0a  }}",
      variables: {
        filter: {
          preferredLabel_any: skill,
          type: "SKILL",
          entityStatus_eq: "ACTIVE",
          sortOrder: "match-start",
          limit: 50,
          includeAttributeGroups: false,
        },
      },
    };
    const result = await evaluate(page, GQL_URL, headers, data);
    result["data"] &&
      ids.push({
        skillID: result["data"]["ontologyElementsSearchByPrefLabel"][0]["id"],
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
async function getLocation(page, city, countryCode, AUTH) {
  const gqlHeader = generateGQLHeader(AUTH["oauth"]);
  const gqlBody = {
    query:
      "query getCity($countryCode: String!, $query: String!){\x0a  citySearchRecords(filter:{country_eq: $countryCode, query_eq: $query}, limit: 5){\x0a    city{\x0a      name,\x0a      state {\x0a        code,\x0a        name,\x0a        country {\x0a          twoLetterAbbreviation\x0a        }\x0a      },\x0a}}}",
    variables: {
      query: city,
      countryCode: countryCode,
    },
  };
  const result = await evaluate(page, GQL_URL, gqlHeader, gqlBody);
  if (result["data"])
    return {
      city: result["data"]["citySearchRecords"][0]["city"]["name"],
      state: result["data"]["citySearchRecords"][0]["city"]["state"]["code"],
    };
}

async function createAccount(profile, inboxType, profileName, botName, db) {
    const locations = await db.get('locations', { country: profile['country']});
    const location = getRandomElement(locations);
    console.log(location);
  let inbox;
  if (inboxType === "nospammail") {
    inbox = new NoSpamMail(await NoSpamMail.create());
  } else if(inboxType === "genmail"){
    inbox = new GenMail(await GenMail.create());
  } else if(inboxType === 'tenmail'){
    inbox = new TenMail(await TenMail.create());
  } else if(inboxType === 'fakemail'){
    inbox = new FakeMail(await FakeMail.create());
  } else if(inboxType === 'dispmail'){
    inbox = new DisposableMail(await DisposableMail.create());
  } else if(inboxType === 'random'){
    const MAIL = getRandomElement([
      NoSpamMail,
      GenMail,
      TenMail,
      FakeMail,
      DisposableMail
      ]);
    inbox = new MAIL(await MAIL.create());
  }
  console.log(`===> ${inbox.email}`)
  const pathToExtension = path.resolve("./static/extensions/cookies");
  const upwork = new Browser(!argv.debug);
  try{
    await upwork.signUp(
    {
      user: inbox.email,
      password: process.env.PASSWORD,
    },
    { firstName: profile["firstName"], secondName: profile["lastName"] },
    inbox,
    [`--disable-extensions-except=${pathToExtension}`,
      `--load-extension=${pathToExtension}`,]
  );
  console.log("Successfully Verified.");

  await upwork.navigate("https://www.upwork.com/nx/create-profile/", {
    waitUntil: "networkidle0",
  });
  const AUTH = await getAuthData(upwork.page);

  let avatarUploaded = false;
  upwork.page.on("requestfinished", (data) => {
    if (
      data.url() ===
      "https://www.upwork.com/ab/create-profile/api/v2/portrait-upload"
    ) {
      avatarUploaded = true;
      console.log("(:+) Avatar is uploaded successfully");
    }
  });

  const gqlHeaders = generateGQLHeader(AUTH["oauth"]);
  const apiHeaders = generateAPIHeader(AUTH["oauth"], AUTH["token"]);

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
        description: el['description'].join('\n'),
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
      records: [
        {
          language: {
            iso639Code: "en",
            active: true,
            englishName: "English",
          },
          proficiencyLevel: { code: "flul" },
        },
      ],
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

  // Complete Onboarding
  await evaluate(upwork.page, GQL_URL, gqlHeaders, {
    query: "mutation {\x0a  talentOnboardingComplete\x0a}",
    variables: null,
  });

  // Birthday

  await evaluate(upwork.page, GQL_URL, gqlHeaders, {
    query:
      "mutation saveDateOfBirth($input: DateOfBirthInput!) {\x0a  saveDateOfBirth(input: $input)\x0a}",
    variables: {
      input: { dateOfBirth: profile["birthday"] },
    },
  });
  console.log(chalk.green("13. Add Address and Phone number"));
  // Address and Phone
  const { city, state } = await getLocation(
    upwork.page,
    location.city,
    location.countryCode,
    AUTH
  );
  console.log(city, state)
  console.log(chalk.green("14. Add Location"));
  await evaluate(
    upwork.page,
    "https://www.upwork.com/ab/create-profile/api/min/v1/save-address-phone",
    apiHeaders,
    {
      address: {
        street: getRandomElement(location.streets),
        state,
        additionalInfo: null,
        address: null,
        city,
        zip: getRandomElement(location.zipCodes),
        country: location.country,
      },
      phoneNumber: generatePhoneNumber(location.phone),
      phoneCode: location.countryCode,
    }
  );

  console.log(chalk.green("15. Save Address and Phone"));

  // Upload profile Image

  await upwork.navigate("https://www.upwork.com/nx/create-profile/location");
  await click({
    component: upwork.page,
    selector: 'button[data-qa="open-loader"]',
  });
  const imagePath = path.resolve(PROFILE_PATH, profile["avatar"]);
  await upwork.page.waitForSelector('input[type="file"]');
  const [fileBox] = await Promise["all"]([
    upwork.page.waitForFileChooser(),
    upwork.page.click('input[type="file"]'),
  ]);
  await fileBox.accept([imagePath]);
  await wait(500);
  const saveBtn = await upwork.page.waitForSelector(
    'button[data-qa="btn-save"]'
  );
  await saveBtn.click();
  while (!avatarUploaded) {
    await wait(800);
  }
  await evaluate(
    upwork.page,
    "https://www.upwork.com/ab/create-profile/api/min/v1/update-pv",
    apiHeaders,
    {}
  );
  // Complete Onboarding
  await evaluate(upwork.page, GQL_URL, gqlHeaders, {
    query: "mutation {\x0a  talentOnboardingComplete\x0a}",
    variables: null,
  });
  // Review

  await evaluate(
    upwork.page,
    "https://www.upwork.com/ab/create-profile/api/v1/review",
    apiHeaders,
    {}
  );

  //NOTIFICATION
  console.log(chalk.green("16. Notification Setting"));
  await evaluate(
    upwork.page,
    "https://www.upwork.com/ab/notification-settings/api/settings",
    apiHeaders,
    {
      desktopCounter: "all",
      desktopNotify: "all",
      desktopSound: "false",
      mobileNotify: "all",
      mobileCounter: "all",
      mobileSound: "false",
      dashEmailFreq: "immediate",
      dashEmailWhen: "all",
      dashEmailPresence: "always",
      allContracts: "mine",
      allRecruiting: "mine",
      receive_documents_digitally: false,
      dash_desktop_all: true,
      dash_desktop_important: true,
      dash_desktop_never: true,
      dash_desktop_sound: true,
      dash_message_counter_all: true,
      dash_message_counter_important: true,
      dash_email_approximately: true,
      dash_email_all: true,
      dash_email_important: true,
      dash_email_presence: true,
      er_job_posted: true,
      er_japp_submitted: true,
      er_intv_acc: true,
      er_intv_declined: true,
      er_offer_updated: true,
      er_job_will_expire: true,
      er_job_expired: true,
      er_no_intv: true,
      pja_intv_accepted: true,
      pja_offer: true,
      pja_japp_declined: true,
      pja_japp_rejected: true,
      pja_job_change: true,
      pja_japp_withdrawn: true,
      cntr_hire: true,
      cntr_timelog_begins: true,
      cntr_terms: true,
      cntr_end: true,
      cntr_timelog: true,
      cntr_fb_change: true,
      cntr_offline_summary: true,
      cntr_bpa_wk_buyer: true,
      cntr_misc: true,
      cntr_bpa: true,
      grp_mem: true,
      ref_profile: true,
      ref_invite: true,
      cntr_revoke: true,
      subscription_event: true,
      on_board_msg: true,
      misc_local: true,
      who_viewed_job: true,
      connects_expiry: true,
      connects_purchase: true,
      job_recommendations: true,
      marketing_email: false,
      tc: [],
    }
  );

  console.log("Account has been created...");

  }catch(e){
    console.log(chalk.red('Error: while account creation...'))
    console.log(e)
   await upwork.close();
    return false;

  }
  
  try {
    console.log(chalk.yellow("Additional Configuration"));
    await upwork.navigate("https://www.upwork.com/nx/agencies/create/");
    const input = await upwork.page.waitForSelector("#agency-name-input");
    await upwork.page.type("#agency-name-input", process.env.AGENCY_NAME);
    await wait(100);
    const continueBtn = await upwork.page.$x(
      '//button[contains(text(), "Continue")]'
    );
    await continueBtn[0].click();
    console.log("Continue is clicked");
    await wait(100);
    const confirmBtn = await upwork.page.$x(
      '//button[contains(text(), "Continue with Basic")]'
    );
    console.log("Continue with Basic is clicked");
    await Promise.all([confirmBtn[0].click(), upwork.page.waitForNavigation()]);
    await upwork.navigate("https://www.upwork.com/nx/ag/settings/", {
      waitUntil: "networkidle2",
    });
    const closeAgBtn = await upwork.page.waitForXPath(
      '//button[contains(text(), "Close my Agency")]',
      {
        visible: true,
        timeout: 10000, // waits for 10 seconds
      }
    );
    // const modelBtn = await upwork.page.$x('//button[contains(text(), "Confirm")]');
    await closeAgBtn.click();
    console.log(`Close AG is clicked`);
    const modalBtn = await upwork.page.waitForXPath(
      '//button[contains(text(), "Confirm")]',
      {
        visible: true,
        timeout: 10000, // waits for 5 seconds
      }
    );
    await Promise.all([modalBtn.click(), upwork.page.waitForNavigation()]);
    console.log("Hurray!");
    await db.create("accounts", {
      email: inbox.email,
      type: inboxType,
      botName: botName,
      status: "active",
      name: profileName,
      isPremium: true,
    });
    console.log(chalk.green("Premium Account is saved in database"));
  } catch (e) {
    console.log(chalk.red("Error: additional configuration"));
    // await db.create("accounts", {
    //   email: inbox.email,
    //   type: inboxType,
    //   botName: botName,
    //   status: "active",
    //   name: profileName,
    //   isPremium: false,
    // });
    console.log(chalk.green("Account is saved in database"));
  }finally {
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
  const database = new Database(process.env.MONBO_URI);
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
      console.log(e)
    }
  }
  await database.close();
}

await main();
