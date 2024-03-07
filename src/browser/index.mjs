// browser
import dotenv from "dotenv";
import os from "os";
import path from "path";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { click } from "puppeteer-utilz";
import { input } from './function.mjs'
import { wait } from './../utils/time.mjs'
const stealth = StealthPlugin();
puppeteer.use(stealth);
stealth.enabledEvasions.delete("iframe.contentWindow");

async function request(page, method, url, headers, data) {
  const config = {method, headers, credentials: 'include'};
  if(method==='POST')config.body = JSON.stringify(data || {});
  return await page.evaluate(
        async (e, c) => {
          try{
            const response = await fetch(e, c);
            if(response.ok){
              const d = await response.json()
              return ({
                status: 'success',
                data: d
              })
            }              
            else{
            const d = await response.json();
            return ({
                status: 'error',
                data: d
                })}
          }catch(err){
            return ({
              status: 'error',
              data: err
            })

          }
        },
        url,
        config
      );
}
async function graphql(page, url, headers, data){
  const config = {method: 'POST', headers, credentials: 'include', body: JSON.stringify(data)};
  return await page.evaluate(
        async (e, c) => {
          try{
            const response = await fetch(e, c);
            if(response.ok){
              const d = await response.json()
              return ({
                status: 'success',
                data: d
              })
            }              
            else{
            const d = await response.json();
            return ({
                status: 'error',
                data: d
                })}
          }catch(err){
            return ({
              status: 'error',
              data: err
            })

          }
        },
        url,
        config
      );
}
export default class Browser{
  AUTH_URL = 'https://www.upwork.com/ab/account-security/login?redir=%2Fnx%2Ffind-work%2Fmost-recent'
  constructor(headless=false){
    this.headless = headless;
  }
  async connectRemote(port){
    const browserURL = `http://127.0.0.1:${port}`;
    this.browser = await puppeteer.connect({browserURL})
      const pages = await this.browser.pages();
      this.page = pages[0];

  }
  async disconnect(){
    this.browser.disconnect();
  }
  async getPage(index){
    const pages = await this.browser.pages();
    return pages[index]
  }
  async initPage(){
    const options = {
        defaultViewport: null,
        args: [
         "--start-maximized"
         ],
        headless: this.headless? 'new': false,
        devtools: false
      };

      if (process.platform == "linux") options.args.push("--no-sandbox");
      this.browser = await puppeteer.launch(options);
      this.browser.on("disconnected", async () => {
        console.log("BROWSER CRASH");
        if (this.browser && this.browser.process() != null) this.browser.process().kill("SIGINT");
      });
      // const pages = await this.browser.pages();
      // this.page = pages[0];
      this.page = await this.browser.newPage();
      // // await this.page.goto("chrome://settings/");
      // await this.page.evaluate(() => {
      //     chrome.settingsPrivate.setDefaultZoom(0.5);
      // });
      await this.page.setRequestInterception(true);
      this.page.on('request', (request) => {
        // Use the resourceType method to determine the type of the request
        if (request.resourceType() === 'image' || request.resourceType() === 'stylesheet') {
          // Abort requests for images or stylesheets
          request.abort();
        } else {
          // Continue with all other requests
          request.continue();
      }
    });
      await this.page.setDefaultNavigationTimeout(100000);
  }
  async loginAPI({user, password}, startUrl = this.AUTH_URL){
    const apiUrl = 'https://www.upwork.com/ab/account-security/login';
    
    // await this.page.goto(startUrl, { waitUntil: 'networkidle0' });
      // If the title includes "Access Denied", refresh the page
      const title = await this.page.title();
      if (title.includes('Access denied')) {
        console.log('Access Denied detected in the title, refreshing the page...');
        await this.page.reload();
      }
      
      const cookies = await this.page.cookies();
  var authorization = undefined;
  var csrf_token = undefined;
  const cookie = cookies
    .map((cookie) => {
      if (cookie.name == "visitor_topnav_gql_token") {
        // console.log(`${cookie.name}=${cookie.value}`);
        authorization = `Bearer ${cookie.value}`;
      }
      if (cookie.name == "XSRF-TOKEN") {
        // console.log(`${cookie.name}=${cookie.value}`);
        csrf_token = cookie.value;
      }
      return `${cookie.name}=${cookie.value}`;
    })
    .join("; ");
      const headers = {
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
      "Content-Type": "application/json",
      Origin: "https://www.upwork.com",
      Priority: "u=1, i",
      Referer:
        "https://www.upwork.com/ab/proposals/job/~01e442402128fe5029/apply/",
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
    }
      const res = await request(this.page, "POST", apiUrl, headers, {
        login: {
          mode: "password",
          username: user,
          password: password,
        },
      });
     
      if(res.status === 'success' && res.data.userNid && res.data.reactivateAccount!==true ){
        console.log('Success Logged in')
        await this.page.reload();
        return true;
      } else if(res.status == 'success' && res.data.reactivateAccount){
        throw new Error('closed_account');        
      }
      else if(res.status === 'success' && res.data && res.data.alerts && res.data.alerts.top.length){

        throw new Error('closed_account');
      }
      else{
        // console.log(res.data)
        return false;
        // throw new Error('Login Error')
      }


  }
  async login({user, password}, startUrl = this.AUTH_URL){
    console.log('Login...')
      const options = {
        defaultViewport: null,
        args: [
         "--start-maximized"
         ],
        headless: this.headless? 'new': false,
        devtools: false
      };

      if (process.platform == "linux") options.args.push("--no-sandbox");
      this.browser = await puppeteer.launch(options);
      this.browser.on("disconnected", async () => {
        console.log("BROWSER CRASH");
        if (this.browser && this.browser.process() != null) this.browser.process().kill("SIGINT");
      });
      // const pages = await this.browser.pages();
      // this.page = pages[0];
      this.page = await this.browser.newPage();
      await this.page.goto("chrome://settings/");
      await this.page.evaluate(() => {
          chrome.settingsPrivate.setDefaultZoom(0.5);
      });
      await this.page.setRequestInterception(true);
      this.page.on('request', (request) => {
        // Use the resourceType method to determine the type of the request
        if (request.resourceType() === 'image' || request.resourceType() === 'stylesheet') {
          // Abort requests for images or stylesheets
          request.abort();
        } else {
          // Continue with all other requests
          request.continue();
      }
    });
      await this.page.setDefaultNavigationTimeout(100000);
      await this.page.goto(startUrl, { waitUntil: 'networkidle0' });
      const title = await this.page.title();
      

      // If the title includes "Access Denied", refresh the page
      if (title.includes('Access denied')) {
        console.log('Access Denied detected in the title, refreshing the page...');
        await this.page.reload();
      }
      console.log('========= Rendered Page ==========')
      // TIMER
      await input(this.page, '#login_username', user);
      await wait(1500);
      await click({
        component: this.page,
        selector: '#login_password_continue'
      });
      await wait(1500);
      await input(this.page, '#login_password', password);
      await Promise.all([this.page.waitForNavigation(),
        click({
          component: this.page,
          selector: '#login_control_continue'
        })])
      console.log('========= Got In ==========')

      }
  async signUp({user, password}, { firstName, secondName }, inbox, args){
    const options = {
        defaultViewport: null,
        args: [
         "--start-maximized",
         ...args
         ],
        headless: this.headless? 'new': false,
        devtools: false
      };
      if(process.env.HEADLESS==='ON') options.headless = 'new'
      if (process.platform == "linux") options.args.push("--no-sandbox");
      this.browser = await puppeteer.launch(options);
      this.browser.on("disconnected", async () => {
        console.log("BROWSER CRASH");
        if (this.browser && this.browser.process() != null) this.browser.process().kill("SIGINT");
      });
     
      // const pages = await this.browser.pages(); 
      // this.page = pages[0];
      this.page = await this.browser.newPage();

    await this.page.goto("chrome://settings/");
      await this.page.evaluate(() => {
          chrome.settingsPrivate.setDefaultZoom(0.5);
      });
      
      await this.page.setRequestInterception(true);
      this.page.on('request', (request) => {
        // Use the resourceType method to determine the type of the request
        if (request.resourceType() === 'image' || request.resourceType() === 'stylesheet') {
          // Abort requests for images or stylesheets
          request.abort();
        } else {
          // Continue with all other requests
          request.continue();
      }
    });
      await this.page.setDefaultNavigationTimeout(100000);
      await this.page.goto('https://www.upwork.com/nx/signup/?dest=home');
      console.log('========= Rendered Page ==========')
      await click({
        component: this.page,
        selector: 'input[name="radio-group-2"]',
      }),
      await click({
      component: this.page,
      selector: 'button[data-qa="btn-apply"]',
    });

    await input(this.page, "#first-name-input", firstName);
    await input(this.page, "#last-name-input", secondName);
    await input(this.page, "#redesigned-input-email", user);
    await input(this.page, "#password-input", password);

    let value = false;
    let trying = 0;
    
    while (!value) {
      // if (trying == 5) return false;
      trying = trying + 1;
      await click({
        component: this.page,
        selector: "#checkbox-terms input",
      });

      value = await this.page.$eval("#checkbox-terms input", (el) => {
        return el.value;
      });

    }

    await Promise.all([
      this.page.waitForNavigation({ timeout: 60000 }),
      click({
        component: this.page,
        selector: "#button-submit-form",
      }),
    ]);

    let href;

    await wait(1000*10)
    console.log("[Info] Verifying ...");
    
    const url = await inbox.verify();
    await this.page.goto(url, { timeout: 45000 });
    await wait(5000);
  }
  async close(){
    await Promise.race([
      this.browser.close(),
      wait(2000)
      ]);
    if (this.browser && this.browser.process() != null) {
      console.log('xxxx Close Browser Forcefully!!! xxxxx')
      this.browser.process().kill('SIGINT');
    }
  }
  async getAuth(){
      const result = { token: "", oauth: "", uid: "", oDeskUserID: "" };
      const cookies = await this.page.cookies();
      for (const cookie of cookies) {
        if (cookie["name"] === "XSRF-TOKEN") result["token"] = cookie["value"];
        if (cookie["name"] === "visitor_topnav_gql_token") result["applyToken"] = cookie["value"];
        if (cookie["name"] === "oauth2_global_js_token") result["oauth"] = cookie["value"];
        if (cookie["name"] === "user_uid") result["uid"] = cookie["value"];
        if (cookie["name"] === "console_user") result["oDeskUserID"] = cookie["value"];
        if (cookie["name"] === "master_access_token") result["master"] = cookie["value"];
        if (cookie['path'] === '/nx/find-work/') result['fwToken'] = cookie['value'];
        if (cookie['path'] === '/nx/') result['nxToken'] = cookie['value'];
      }
      this.AUTH = result;
  }
  async getConnects(){
    const url ='https://www.upwork.com/api/graphql/v1';
    const data = {
    "query": `
        query {
            organization {
                subscriptionPlan(filter: {
                    includeNextPayment: false
                    checkVat: false
                    includePromo: false
                }) {
                    connectsBalance
                }
            }
        }
    `,
    };
    const headers = {
          "Accept": "*/*",
          "scheme": "https",
          "Content-Type": "application/json",
          "Accept-Encoding": "gzip, deflate, br, zstd",
          "Accept-Language": "en-US,en;q=0.9",
          "Authorization": "bearer " + this.AUTH["fwToken"],
          "Sec-Fetch-Dest": "empty",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": "same-origin",
          "x-odesk-user-agent": "oDesk LM",
          "x-requested-with": "XMLHttpRequest",
          "X-Upwork-Accept-Language": "en-US"
        };
        const response = await graphql(this.page, url, headers, data);
        return response?.data?.data?.organization?.subscriptionPlan?.connectsBalance;
  }
  async refresh(){
    await this.page.reload();
  }
  async navigate(link, option={}){
    await this.page.goto(link, option);
  }
  async getJobDetail({link}){
    const headers = {
          Accept: "application/json, text/plain, */*",
          "Accept-Encoding": "gzip, deflate, br",
          "Accept-Language": "en-US,en;q=0.9",
          Authorization: "Bearer " + this.AUTH["oauth"],
          "Sec-Fetch-Dest": "empty",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": "same-origin",
          "x-odesk-user-agent": "oDesk LM",
          "x-requested-with": "XMLHttpRequest",
          "X-Upwork-Accept-Language": "en-US",
      };
      const res = await request(this.page, "GET", "https://www.upwork.com/ab/proposals/api/v4/job/details/" + link, headers);
      return res?.data;
  }
  async getJobConnects(link){
    const headers = {
          Accept: "application/json, text/plain, */*",
          "Accept-Encoding": "gzip, deflate, br",
          "Accept-Language": "en-US,en;q=0.9",
          Authorization: "Bearer " + this.AUTH["oauth"],
          "Sec-Fetch-Dest": "empty",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": "same-origin",
          "x-odesk-user-agent": "oDesk LM",
          "x-requested-with": "XMLHttpRequest",
          "X-Upwork-Accept-Language": "en-US",
      };
      const res = await request(this.page, "GET", ` https://www.upwork.com/job-details/jobdetails/api/job/${link}/connects`, headers);
      return res?.data?.requiredConnects;    
  }
  async getJobBids(id){
    const headers = {
          Accept: "application/json, text/plain, */*",
          "Accept-Encoding": "gzip, deflate, br",
          "Accept-Language": "en-US,en;q=0.9",
          Authorization: "Bearer " + this.AUTH["oauth"],
          "Sec-Fetch-Dest": "empty",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": "same-origin",
          "x-odesk-user-agent": "oDesk LM",
          "x-requested-with": "XMLHttpRequest",
          "X-Upwork-Accept-Language": "en-US",
      };
      const res = await request(this.page, "GET", `https://www.upwork.com/ab/proposals/api/v4/application/bids?jobUid=` + id, headers);
      return res?.data?.bids || [];
  }
  async getJobs(){
    const data = {
      query: "query($limit: Int, $toTime: String) {\n        mostRecentJobsFeed(limit: $limit, toTime: $toTime) {\n          results {\n            id,\n            uid:id\n            title,\n            ciphertext,\n            description,\n            type,\n            recno,\n            freelancersToHire,\n            duration,\n            engagement,\n            amount {\n              amount,\n            },\n            createdOn:createdDateTime,\n            publishedOn:publishedDateTime,\n            prefFreelancerLocationMandatory,\n            connectPrice,\n            client {\n              totalHires\n              totalSpent\n              paymentVerificationStatus,\n              location {\n                country,\n              },\n              totalReviews\n              totalFeedback,\n              hasFinancialPrivacy\n            },\n            tierText\n            tier\n            tierLabel\n            proposalsTier\n            enterpriseJob\n            premium,\n            jobTs:jobTime,\n            attrs:skills {\n              id,\n              uid:id,\n              prettyName:prefLabel\n              prefLabel\n            }\n            hourlyBudget {\n              type\n              min\n              max\n            }\n          },\n          paging {\n            total,\n            count,\n            resultSetTs:minTime,\n            maxTime\n          }\n        }\n      }",
      variables: {limit: 10}
    }
    const url ='https://www.upwork.com/api/graphql/v1';
    const headers = {
          "Accept": "*/*",
          "scheme": "https",
          "Content-Type": "application/json",
          "Accept-Encoding": "gzip, deflate, br, zstd",
          "Accept-Language": "en-US,en;q=0.9",
          "Authorization": "bearer " + this.AUTH["fwToken"],
          "Sec-Fetch-Dest": "empty",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": "same-origin",
          "x-odesk-user-agent": "oDesk LM",
          "x-requested-with": "XMLHttpRequest",
          "X-Upwork-Accept-Language": "en-US"
        };
        const response = await graphql(this.page, url, headers, data);
        return response?.data?.data?.mostRecentJobsFeed?.results || [];
  }
  async getBestJobs(){
    const data = {
    "query": "\n  query bestMatches {\n    bestMatchJobsFeed(limit: 30) {\n      results {\n        uid:id\n        title\n        ciphertext\n        description\n        type\n        recno\n        freelancersToHire\n        duration\n        durationLabel\n        engagement\n        amount {\n          amount\n          currencyCode\n        }\n        createdOn:createdDateTime\n        publishedOn:publishedDateTime\n        renewedOn:renewedDateTime\n        prefFreelancerLocation\n        prefFreelancerLocationMandatory\n        connectPrice\n        client {\n          totalHires\n          totalSpent\n          paymentVerificationStatus\n          location {\n            country\n            city\n            state\n            countryTimezone\n            worldRegion\n          }\n          totalReviews\n          totalFeedback\n          hasFinancialPrivacy\n        }\n        enterpriseJob\n        premium\n        jobTime\n        skills {\n          id\n          prefLabel\n        }\n        tierText\n        tier\n        tierLabel\n        proposalsTier\n        isApplied\n        hourlyBudget {\n          type\n          min\n          max\n        }\n        weeklyBudget {\n          amount\n        }\n        clientRelation {\n          companyName\n          lastContractRid\n          lastContractTitle\n        }\n        relevanceEncoded\n        attrs {\n          uid:id\n          prettyName\n          freeText\n          skillType\n        }\n      }\n      paging {\n        total\n        count\n        minTime\n        maxTime\n      }\n    }\n  }"
    }
    const url ='https://www.upwork.com/api/graphql/v1';
    const headers = {
          "Accept": "*/*",
          "scheme": "https",
          "Content-Type": "application/json",
          "Accept-Encoding": "gzip, deflate, br, zstd",
          "Accept-Language": "en-US,en;q=0.9",
          "Authorization": "bearer " + this.AUTH["fwToken"],
          "Sec-Fetch-Dest": "empty",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": "same-origin",
          "x-odesk-user-agent": "oDesk LM",
          "x-requested-with": "XMLHttpRequest",
          "X-Upwork-Accept-Language": "en-US"
        };
        const response = await graphql(this.page, url, headers, data);
        return response?.data?.data?.bestMatchJobsFeed?.results || [];
  }
  async addPortfolio(portfolio){
    const changeProjectProperties = function (obj) {
            Object.keys(obj).forEach(function (key) {
                if (key === "attachments" && obj[key] != null && obj[key][key] != null) {
                    obj[key] = obj[key][key];
                }
                else if (key === 'projectUid') {
                    obj[key] = null;
                }
                else if (key === 'ontologySkill') {
                    obj[key] = null;
                }
                else if (obj[key] != null && typeof obj[key] === 'object') {
                    changeProjectProperties(obj[key]);
                }
            });
        }
    portfolio.uid = null;
    await changeProjectProperties(portfolio);
    const data = {
        project: portfolio,
    };
    var authorization = undefined;
    var csrf_token = undefined;
    const cookies = await this.page.cookies();
    const cookie = cookies.map((cookie) => {
        if (cookie.name == 'visitor_topnav_gql_token') {
            // console.log(`${cookie.name}=${cookie.value}`);
            authorization = `Bearer ${cookie.value}`;
        }
        if (cookie.name == 'XSRF-TOKEN') {
            // console.log(`${cookie.name}=${cookie.value}`);
            csrf_token = cookie.value;
        }
        return `${cookie.name}=${cookie.value}`;
    }).join('; ');
    const headers = {
            "authority": "www.upwork.com",
            "method": "POST",
            "path": "/freelancers/api/v1/profile/me/project",
            "scheme": "https",
            "Accept": "application/json, text/plain, */*",
            "Accept-Encoding": "gzip, deflate, br",
            "Accept-Language": "en-US,en;q=0.9",
            "Authorization": authorization,
            "Content-Length": "952",
            "Content-Type": "application/json",
            "Origin": "https://www.upwork.com",
            "Referer": "https://www.upwork.com/ab/portfolios/new/preview/",
            "Sec-Ch-Ua": "\"Google Chrome\";v=\"119\", \"Chromium\";v=\"119\", \";Not A Brand\";v=\"99\"",
            "Sec-Ch-Ua-Full-Version-List": "\"Chromium\";v=\"119.0.6045.105\", \"Not?A_Brand\";v=\"24.0.0.0\"",
            "Sec-Ch-Ua-Mobile": "?0",
            "Sec-Ch-Ua-Platform": "Windows",
            "Sec-Ch-Viewport-Width": "967",
            "Sec-Fetch-Dest": "empty",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Site": "same-origin",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
            "Vnd-Eo-Parent-Span-Id": "52ad7d85-1ca2-4861-b596-946bbf2cedda",
            "Vnd-Eo-Span-Id": "045ceab3-fdd6-435f-8e72-fba32caa2f72",
            "Vnd-Eo-Trace-Id": "8305c64a889107a7-HKG",
            "X-Odesk-Csrf-Token": csrf_token,
            "X-Odesk-User-Agent": "oDesk LM",
            "X-Requested-With": "XMLHttpRequest",
            "X-Upwork-Accept-Language": "en-US"
        };
        const result = await request(this.page, "POST", "https://www.upwork.com/freelancers/api/v1/profile/me/project", headers, data);
        console.log(result);
  }
  async searchJobs(){
    const headers = {
          "Accept": "application/json, text/plain, */*",
          "Accept-Encoding": "gzip, deflate, br",
          "Accept-Language": "en-US,en;q=0.9",
          "Authorization": "Bearer " + this.AUTH["oauth"],
          "Sec-Fetch-Dest": "empty",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": "same-origin",
          "x-odesk-user-agent": "oDesk LM",
          "x-requested-with": "XMLHttpRequest",
          "X-Upwork-Accept-Language": "en-US",
        };
        const response = await request(this.page, "GET", process.env.SEARCH_URL, headers);
        return response.data.searchResults.jobs;

  }
  
  async getUSJobs(){
    const headers = {
          "Accept": "application/json, text/plain, */*",
          "Accept-Encoding": "gzip, deflate, br",
          "Accept-Language": "en-US,en;q=0.9",
          "Authorization": "Bearer " + this.AUTH["oauth"],
          "Sec-Fetch-Dest": "empty",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": "same-origin",
          "x-odesk-user-agent": "oDesk LM",
          "x-requested-with": "XMLHttpRequest",
          "X-Upwork-Accept-Language": "en-US",
        };
        const response = await request(this.page, "GET", 'https://www.upwork.com/ab/find-work/api/feeds/search?user_location_match=1', headers);
        return response.data.results;
  }
  async searchUSJobs(url){
    const headers = {
          "Accept": "application/json, text/plain, */*",
          "Accept-Encoding": "gzip, deflate, br",
          "Accept-Language": "en-US,en;q=0.9",
          "Authorization": "Bearer " + this.AUTH["oauth"],
          "Sec-Fetch-Dest": "empty",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": "same-origin",
          "x-odesk-user-agent": "oDesk LM",
          "x-requested-with": "XMLHttpRequest",
          "X-Upwork-Accept-Language": "en-US",
        };
        const response = await request(this.page, "GET", url, headers);
        return response?.data?.searchResults?.jobs || [];
  }
  async getJobOpening(id){
    const headers = {
          Accept: "application/json, text/plain, */*",
          "Accept-Encoding": "gzip, deflate, br",
          "Accept-Language": "en-US,en;q=0.9",
          Authorization: "Bearer " + this.AUTH["oauth"],
          "Sec-Fetch-Dest": "empty",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": "same-origin",
          "x-odesk-user-agent": "oDesk LM",
          "x-requested-with": "XMLHttpRequest",
          "X-Upwork-Accept-Language": "en-US",
      };
      const response = await request(this.page, "GET", "https://www.upwork.com/ab/proposals/api/openings/" + id, headers)
      return response.data;
  }
  async applyJob(uid, {link, coverLetter, amount, estimatedDuration, isFixed, connects }){
    const data = {
          version: 3,
          jobReference: uid,
          agency: null,
          chargedAmount: amount,
          coverLetter: coverLetter,
          earnedAmount: null,
          estimatedDuration: estimatedDuration,
          occupationUID: null,
          portfolioItemUids: [],
          attachments: [],
          questions: [],
          milestones: [],
          readyToStartDate: null,
          selectedContractor: {
            uid: this.AUTH["uid"],
            oDeskUserID: this.AUTH["oDeskUserID"],
          },
          profileRateToSet: false,
          boostBidAmount: connects,
          rateGuidance: null,
          agencyOrgUid: null,
      };
      if(!isFixed){ 
        data['sri'] = { percent: 0, frequency: 0 };
      }
      const cookies = await this.page.cookies();
      let authorization = undefined;
      var crsfToken = undefined;
  const cookie = cookies
    .map((cookie) => {
      if (cookie.name == "visitor_topnav_gql_token") {
        // console.log(`${cookie.name}=${cookie.value}`);
        authorization = `Bearer ${cookie.value}`;
      }
      if (cookie.name == "XSRF-TOKEN") {
        // console.log(`${cookie.name}=${cookie.value}`);
        crsfToken = cookie.value;
      }
      return `${cookie.name}=${cookie.value}`;
    })
    .join("; ");
      const headers =  {
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
      "Content-Type": "application/json",
      Origin: "https://www.upwork.com",
      Priority: "u=1, i",
      Referer:
        "https://www.upwork.com/ab/proposals/job/~011c5bc41941ff8ed5/apply/",
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
      // "User-Agent": 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
      "Vnd-Eo-Parent-Span-Id": "072cd505-4b49-4dbc-add9-ff38cb36647c",
      "Vnd-Eo-Span-Id": "0ddb3891-753b-4dd3-8817-e225d0891258",
      "Vnd-Eo-Trace-Id": "820db21aecc75098-HKG",
      "X-Odesk-Csrf-Token": crsfToken,
      "X-Odesk-User-Agent": "oDesk LM",
      "X-Requested-With": "XMLHttpRequest",
      "X-Upwork-Accept-Language": "en-US",
    };
      const result = await request(this.page, "POST", "https://www.upwork.com/ab/proposals/api/v2/application/new", headers, data)
      // console.log(result)
      return result;
  }
  async boost(connects, total, endDate){
    const url = 'https://www.upwork.com/api/graphql/v1';
    const headers = {
        Accept: "application/json, text/plain, */*",
          "Accept-Encoding": "gzip, deflate, br",
          "Accept-Language": "en-US,en;q=0.9",
          Authorization: "bearer " + this.AUTH["nxToken"],
          "Sec-Fetch-Dest": "empty",
          "Content-Type": 'application/json',
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": "same-origin",
          "x-odesk-user-agent": "oDesk LM",
          "x-requested-with": "XMLHttpRequest",
          "X-Upwork-Accept-Language": "en-US",
    };
    const data = {
    query: "mutation createAd($l1CategoryId: ID, $l3CategoryId: ID, $bidConnects: Int, $dailyBudget: Int, $endDate: String, $totalBudget: Int) {\n  createAd: createAdUnified(\n    input: {targeting: {l1CategoryId: $l1CategoryId, l3CategoryId: $l3CategoryId}, ad: {bidConnects: $bidConnects, dailyBudget: $dailyBudget, endDate: $endDate, name: \"frontend\", placement: MERCHANDISED_FL_SEARCH, targetingId: null, totalBudget: $totalBudget, type: BOOSTED_PROFILE}}\n  ) {\n    ad {\n      id\n    }\n  }\n}",
    variables: {
        l1CategoryId: "531770282580668420",
        l3CategoryId: "1110580752293548032",
        bidConnects: connects||2,
        dailyBudget: null,
        endDate: endDate || "2024-01-01",
        totalBudget: total || 2
    }

    } 
    const result = await request(this.page, "POST", url, headers, data);
    return result;
  }
  async getMe(){
    const headers = {
          Accept: "application/json, text/plain, */*",
          "Accept-Encoding": "gzip, deflate, br",
          "Accept-Language": "en-US,en;q=0.9",
          Authorization: "Bearer " + this.AUTH["oauth"],
          "Sec-Fetch-Dest": "empty",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": "same-origin",
          "x-odesk-user-agent": "oDesk LM",
          "x-requested-with": "XMLHttpRequest",
          "X-Upwork-Accept-Language": "en-US",
      };
      const response = await request(this.page, "GET", "https://www.upwork.com/freelancers/api/v1/profile/me/fwh", headers)
      return response.data;
  }
  async isRestricted(id){
    const url = 'https://www.upwork.com/api/graphql/v1';
    const headers = {
        Accept: "application/json, text/plain, */*",
          "Accept-Encoding": "gzip, deflate, br",
          "Accept-Language": "en-US,en;q=0.9",
          Authorization: "bearer " + this.AUTH["fwToken"],
          "Sec-Fetch-Dest": "empty",
          "Content-Type": 'application/json',
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": "same-origin",
          "x-odesk-user-agent": "oDesk LM",
          "x-requested-with": "XMLHttpRequest",
          "X-Upwork-Accept-Language": "en-US",
          "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
    };
    const data = {
    query: `\n          query {\n            developerSuspended(id: \"${id}\") {\n              suspendedStatus\n            }\n          }\n        `,
    } 
    const result = await request(this.page, "POST", url, headers, data);
    return result;
  }
  async closeAccount(){
    const headers = {
          Accept: "application/json, text/plain, */*",
          "Accept-Encoding": "gzip, deflate, br",
          "Accept-Language": "en-US,en;q=0.9",
          Authorization: "Bearer " + this.AUTH["oauth"],
          "Sec-Fetch-Dest": "empty",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": "same-origin",
          "x-odesk-csrf-token": this.AUTH["token"],
          "x-odesk-user-agent": "oDesk LM",
          "x-requested-with": "XMLHttpRequest",
          "X-Upwork-Accept-Language": "en-US",
      };
      const res = await request(this.page, "POST", "https://www.upwork.com/freelancers/settings/api/v1/deactivate-account" , headers, {"reason": "191"});
      return res;
  }
  async visitPlan(){
    const headers = {
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
          "Accept-Encoding": "gzip, deflate, br",
          "Accept-Language": "en-US,en;q=0.9",
          "Referer": "https://www.upwork.com/nx/plans/membership/index",
          "Sec-Fetch-Dest": "document",
          "Sec-Fetch-Mode": "navigate",
          "Sec-Fetch-Site": "same-origin"
      };
    const res = await request(this.page, "GET", "https://www.upwork.com/nx/plans/membership/change-plan?from=index" , headers);
    console.log(res)
  }
  async checkIdentity(){
    try{
      const numberOfChildren = await this.page.$eval('div.air3-smf-container > div', div => div.childElementCount);
      return numberOfChildren === 2;
    }catch(e){
      return false;
    }
  }
  async checkNews(){
    try{
      const badge = await this.page.$$('#nav-main .nav-messages .nav-bubble');
      // console.log(badge)
      return badge.length>0;
    }catch(e){
      return false;
    }
  }
}