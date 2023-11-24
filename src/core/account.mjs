//account creation
import dotenv from "dotenv";
import Browser from "../browser/index.mjs";
import Database from "../db/mongodb.mjs";
import chalk from "chalk";
import yargs from "yargs/yargs";
import _ from "lodash";
import { hideBin } from "yargs/helpers";
import { decorate } from "../utils/decorator.mjs";
import NoSpamMail from "../inbox/nospammail.mjs";
import { evaluate } from "./utils";
decorate();
const AVAILABLE_INBOXes = ["nospammail"];
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
  .help()
  .alias("help", "h").argv;

let inbox;
if (argv.mail === "nospammail") {
  inbox = new NoSpamMail(NoSpamMail.create());
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
  return {
    Accept: "application/json, text/plain, */*",
    "Accept-Encoding": "gzip, deflate, br",
    "Accept-Language": "en-US,en;q=0.9",
    Authorization: "bearer " + authToken,
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
  };
}

async function getSkillIds(page, skills) {
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
async function getServiceIds(page, services) {
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
async function getLocation(page, city, countryCode) {
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
async function createProfile(page, profile) {
  const { city, state } = await getLocation(
    page,
    profile["city"],
    profile["countryCode"]
  );
  const data = {
    first: [
      { type: "CREATE-PROFILE/EXPERIENCE", data: null },
      { type: "CREATE-PROFILE/GOAL", data: null },
      { type: "CREATE-PROFILE/WORK-PREFERENCE-1", data: null },
      { type: "CREATE-PROFILE/WORK-PREFERENCE-2", data: null },
      {
        type: "START-PROFILE-PROCESS",
        method: "api",
        url: "https://www.upwork.com/ab/create-profile/api/min/1/start-profile-process",
        data: null,
      },
      {
        type: "CREATE-PROFILE/TITLE",
        data: { title: profile["professional"] },
      },
      {
        type: "CREATE-PROFILE/EMPLOYMENT",
        data: { employment: profile["workXP"] },
      },
      {
        type: "CREATE-PROFILE/EDUCATION",
        data: { education: profile["education"] },
      },
      { type: "CREATE-PROFILE/LANGUAGES", data: null },
      {
        type: "CREATE-PROFILE/SKILLS",
        data: { skills: await getSkillIds(page, profile["skills"]) },
      },
      {
        type: "CREATE-PROFILE/OVERVIEW",
        data: { overview: profile["overview"] },
      },
      {
        type: "CREATE-PROFILE/CATEGORIES",
        data: { categories: await getServiceIds(page, profile["services"]) },
      },
      { type: "CREATE-PROFILE/RATE", data: { rate: profile["hourRate"] } },
      {
        type: "CREATE-PROFILE/BIRTHDAY",
        data: { birthday: profile["birthday"] },
      },
      {
        type: "CREATE-PROFILE/ADDR&PHONE",
        data: {
          street: profile["street"],
          state,
          city,
          zip: profile["zipcode"],
          country: profile["country"],
          phone: generatePhoneNumber(),
          phoneCode: profile["countryCode"],
        },
        method: "api",
        url: "https://www.upwork.com/ab/create-profile/api/min/v1/save-address-phone",
      },
    ],
    last: [
      { type: "COMPLETE-ONBOARDING", data: null },
      {
        type: "REVIEW",
        method: "api",
        url: "https://www.upwork.com/ab/create-profile/api/v1/review",
        data: null,
      },
      {
        type: "NOTIFICATION",
        method: "api",
        url: "https://www.upwork.com/ab/notification-settings/api/settings",
        data: null,
      },
    ],
  };

  return data;
}
async function handleRequest(page, datas) {
  for (const data of datas) {
    if (data["method"] === "api") {
      const header = generateAPIHeader(AUTH["oauth"], AUTH["token"]),
        body = generateBody(data["type"], data["data"]);
      await evaluate(page, data["url"], header, body);
    } else {
      const headers = generateGQLHeader(AUTH["oauth"]),
        body = generateBody(data["type"], data["data"]);
      await evaluate(page, GQL_URL, headers, body);
    }
    console.log("[PASS]", data["type"]);
  }
}

const upwork = new Browser(!argv.debug);
await upwork.signUp(
  {
    user: inbox.email,
    password: process.env.PASSWORD,
  },
  { firstName: "Nathan", secondName: "Johnson" },
  inbox
);

await upwork.navigate("https://www.upwork.com/nx/create-profile/", {
  waitUntil: "networkidle0",
});
await upwork.getAuth();
const profileData = await createProfile(upwork.page, profile);
let avatarUploaded = false;
upwork.page.on("requestfinished", (data) => {
  if (
    data.url() ===
    "https://www.upwork.com/ab/create-profile/api/v2/portrait-upload"
  ) {
    avatarUploaded = true;
    console.log("[INFO] Avatar is uploaded successfully");
  }
});
await handleRequest(upwork.page, profileData["first"]);
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

// Work Preference 2

await evaluate(upwork.page, GQL_URL, gqlHeaders, {
  query:
    "\x0a    mutation updateFreelancerContractToHire($input: FreelancerContractToHireInput!) {\x0a        updateFreelancerContractToHire(input: $input) {\x0a            status\x0a        }\x0a    }",
  variables: { input: { contractToHire: true } },
});

// Start Profile Process

await evaluate(
  upwork.page,
  "https://www.upwork.com/ab/create-profile/api/min/1/start-profile-process",
  apiHeaders,
  {}
);

// profile title

await evaluate(upwork.page, GQL_URL, gqlHeaders, {
  query:
    "mutation updateTalentProfileTitle($input: TalentProfileTitleInput!){ \x0a    updateTalentProfileTitle(input: $input){      \x0a      status\x0a    }}",
  variables: { input: { title: profile["professional"] } },
});

// employement

await evaluate(upwork.page, GQL_URL, gqlHeaders, {
  query:
    "mutation updateTalentProfileTitle($input: TalentProfileTitleInput!){ \x0a    updateTalentProfileTitle(input: $input){      \x0a      status\x0a    }}",
  variables: {
    records: profile["workXP"].map((el) => ({
      companyName: el["company"],
      jobTitle: el["role"],
      description: null,
      city: null,
      country: "HKG",
      startDate: el["start"],
      endDate: el["end"],
    })),
  },
});

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

// skills

const skills = await getSkillIds(upwork.page, profile["skills"]);
await evaluate(upwork.page, GQL_URL, gqlHeaders, {
  query:
    "mutation updateTalentProfileSkills($input: TalentProfileSkillsInput!){ \x0a  updateTalentProfileSkills(input: $input){\x0a    status\x0a  }}",
  variables: { input: { skills: skills } },
});

// Overview

await evaluate(upwork.page, GQL_URL, gqlHeaders, {
  query:
    "mutation updateTalentProfileDescription($input: TalentProfileDescriptionInput!){ \x0a  updateTalentProfileDescription(input: $input){\x0a    status\x0a  }}",
  variables: {
    input: { description: profile["overview"] },
  },
});

// categories
const categories = await getServiceIds(page, profile["services"]);
await evaluate(upwork.page, GQL_URL, gqlHeaders, {
  query:
    "mutation updateTalentProfileSubCategories($input: TalentProfileSubCategoriesInput!){ \x0a  updateTalentProfileSubCategories(input: $input){\x0a    status\x0a  }}",
  variables: {
    input: {
      subCategoryIDs: categories,
    },
  },
});

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

// Birthday

await evaluate(upwork.page, GQL_URL, gqlHeaders, {
  query:
    "mutation saveDateOfBirth($input: DateOfBirthInput!) {\x0a  saveDateOfBirth(input: $input)\x0a}",
  variables: {
    input: { dateOfBirth: profile["birthday"] },
  },
});

// Address and Phone

await evaluate(
  upwork.page,
  "https://www.upwork.com/ab/create-profile/api/min/v1/save-address-phone",
  apiHeaders,
  {
    street: profile["street"],
    state,
    city,
    zip: profile["zipcode"],
    country: profile["country"],
    phone: generatePhoneNumber(),
    phoneCode: profile["countryCode"],
  }
);

// Upload profile Image

await upwork.navigate("https://www.upwork.com/nx/create-profile/location");
await click({
  component: upwork.page,
  selector: 'button[data-qa="open-loader"]',
});
const imagePath = path.join(process["cwd"](), "profiles", profile["avatar"]);
await upwork.page.waitForSelector('input[type="file"]');
const [fileBox] = await Promise["all"]([
  upwork.page.waitForFileChooser(),
  upwork.page.click('input[type="file"]'),
]);
await fileBox.accept([imagePath]);
await wait(500);
const saveBtn = await upwork.page.waitForSelector('button[data-qa="btn-save"]');
await saveBtn.click();
while (!avatarUploaded) {
  await wait(800);
}
await handleRequest(upwork.page, profileData["last"]);

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
  null
);

//NOTIFICATION

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
console.log("EMAIL: ", inbox.email);
