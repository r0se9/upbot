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
import { getRandomElement, imageToBase64 } from '../utils/lib.mjs';
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
  .option("bot", {
    alias: "b",
    description: "Enter your bot name",
    type: "string",
    demandOption: true,
  })
  .option("num", {
    alias: "n",
    description: "Enter the amount of accounts to create",
    type: "number",
    demandOption: true,
    default: 1,
  })
  .option("premium", {
    alias: "p",
    description: "Create Premium version",
    type: "boolean",
    default: false,
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
async function getAGToken(page) {
  // const subClientId = await page.evaluate(()=>{
  //   return window.NUXT_APP_CONFIG.subordinateClientId;
  // })
  // const token = await page.evaluate(async(url)=>{
  //   const response = await fetch(url, { credentials: 'include' });
  //   return response.text();
  // }, ['https://auth.upwork.com/api/v3/oauth2/token/subordinate/v3/' + subClientId])
  const tokenRegex = /token":\s*"([^"]+)"/;

  // Execute the regular expression to find the token
  const match = tokenRegex.exec(page);

  if (match && match[1]) {
    // Output the extracted token
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

    await upwork.navigate("https://www.upwork.com/nx/create-profile/", {
      waitUntil: "networkidle0",
    });
    const AUTH = await getAuthData(upwork.page);

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

    const imagePath = path.resolve(PROFILE_PATH, profile["avatar"]);
    const imageData = await imageToBase64(imagePath);

    const aa = await upwork.page.evaluate(
      async (imageData) => {
        const binaryData = atob(imageData);

        const uint8Array = new Uint8Array(binaryData.length);

        for (let i = 0; i < binaryData.length; i++) {
          uint8Array[i] = binaryData.charCodeAt(i);
        }
        const blob = new Blob([uint8Array], { type: "image/png" });

        const fileObject = new File([blob], "profile.jpg", {
          type: "image/png",
        });
        const cropCoord = { x: 0, y: 0, width: 250, height: 250 };
        const cropCoordString = cropCoord;

        const formData = new FormData();
        formData.append("file", fileObject); // Replace fileObject with your actual File object
        formData.append("cropCoord", JSON.stringify(cropCoordString));

        const postData = formData;

        const url = `https://www.upwork.com/ab/create-profile/api/v2/portrait-upload`;
        const cookie = document.cookie;
        var match = document.cookie.match(
          "(^|;)\\s*oauth2_global_js_token\\s*=\\s*([^;]+)"
        );
        var oauth2_global_js_token = match ? match.pop() : "";
        const authorization = `Bearer ${oauth2_global_js_token}`;

        var match = document.cookie.match(
          "(^|;)\\s*XSRF-TOKEN\\s*=\\s*([^;]+)"
        );
        const csrf_token = match ? match.pop() : "";

        const fetchOptions = {
          method: "POST",
          body: postData,
          headers: {
            authority: "www.upwork.com",
            method: "POST",
            path: "/ab/proposals/api/v2/application/new",
            scheme: "https",
            Accept: "application/json, text/plain, */*",
            "Accept-Encoding": "gzip, deflate, br, zstd",
            "Accept-Language": "en-US,en;q=0.9",
            Authorization: authorization,
            Cookie: cookie,
            "Content-Length": "458",
            // "Content-Type": "multipart/form-data",
            Origin: "https://www.upwork.com",
            Priority: "u=1, i",
            "Sec-Ch-Ua":
              '"Google Chrome";v="119", "Chromium";v="119", ";Not A Brand";v="99"',
            "Sec-Ch-Ua-Full-Version-List":
              '"Chromium";v="119.0.6045.105", "Not?A_Brand";v="24.0.0.0"',
            "Sec-Ch-Ua-Mobile": "?0",
            "Sec-Ch-Ua-Platform": "Windows",
            "Sec-Ch-Viewport-Width": "1034",
            "Sec-Fetch-Dest": "empty",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Site": "same-origin",
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
            "Vnd-Eo-Parent-Span-Id": "072cd505-4b49-4dbc-add9-ff38cb36647c",
            "Vnd-Eo-Span-Id": "0ddb3891-753b-4dd3-8817-e225d0891258",
            "Vnd-Eo-Trace-Id": "820db21aecc75098-HKG",
            "X-Odesk-Csrf-Token": csrf_token,
            "X-Odesk-User-Agent": "oDesk LM",
            "X-Requested-With": "XMLHttpRequest",
            "X-Upwork-Accept-Language": "en-US",
          },
          credentials: "include",
        };

        const response = await fetch(url, fetchOptions);
        const json = await response.json();

        return json;
      },
      [imageData]
    );

    console.log(chalk.green("15. Profile Image Upload"));
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
  } catch (e) {
    console.log(chalk.red("Error: while account creation..."));
    console.log(e);
    await upwork.close();
    return false;
  }
  if(!argv.premium){
    await db.create("accounts", {
      email: inbox.email,
      type: inboxType,
      botName: botName,
      status: "active",
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
        argv.bot,
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
