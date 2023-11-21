// browser
import dotenv from "dotenv";
import os from "os";
import path from "path";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { click } from "puppeteer-utilz";
import { wait } from './../utils/time.mjs'
const stealth = StealthPlugin();
puppeteer.use(stealth);
stealth.enabledEvasions.delete("iframe.contentWindow");

async function input(page, selector, text, delay = 0) {
  	await page.waitForSelector(selector);
   	await page.type(selector, text, { delay });
}
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
	constructor(user, password, headless=false){
		this.user = user;
		this.password = password;
    this.headless = headless;
    
	}
	async start(startUrl = this.AUTH_URL){
		  const options = {
        defaultViewport: null,
        args: [
         "--start-maximized"
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
  		await this.page.goto(startUrl);
  		console.log('========= Rendered Page ==========')
  		// TIMER
  		await input(this.page, '#login_username', this.user);
  		await click({
  			component: this.page,
  			selector: '#login_password_continue'
  		});
  		await wait(1500);
  		await input(this.page, '#login_password', this.password);
  		await Promise.all([this.page.waitForNavigation(),
  			click({
  				component: this.page,
  				selector: '#login_control_continue'
  			})])
  		console.log('========= Got In ==========')
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
    		if (cookie["name"] === "oauth2_global_js_token") result["oauth"] = cookie["value"];
    		if (cookie["name"] === "user_uid") result["uid"] = cookie["value"];
    		if (cookie["name"] === "console_user") result["oDeskUserID"] = cookie["value"];
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
          "Accept-Encoding": "gzip, deflate, br, zstd",
          "Accept-Language": "en-US,en;q=0.9",
          "Authorization": "bearer " + this.AUTH["boostToken"],
          "Sec-Fetch-Dest": "empty",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": "same-origin",
          "x-odesk-user-agent": "oDesk LM",
          "x-requested-with": "XMLHttpRequest",
          "X-Upwork-Accept-Language": "en-US"
        };
        const response = await request(this.page, url, headers, data);
        return response;
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
      return ({
        engagementDurationsList: res.data.context.engagementDurationsList || [],
        idVerificationRequired: res.data.context.idVerificationNeeded || false,
        idvRequiredByOpening: res.data.context.idvRequiredByOpening || false,
        phoneVerificationNeeded: res.data.context.phoneVerificationNeeded || false,
      })
  }

	async getJobs(){
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
      	const response = await request(this.page, "GET", process.env.MOST_RECENT_URL, headers);
      	return response.data.results;
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
	async applyJob(uid, {link, coverLetter, questions, amount, estimatedDuration, isFixed, connects }){
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
      		questions: questions,
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
    	const headers = {
      		Accept: "application/json, text/plain, */*",
      "Accept-Encoding": "gzip, deflate, br",
      "Accept-Language": "en-US,en;q=0.9",
      Authorization: "Bearer " + this.AUTH["oauth"],
      "Content-Type": "application/json",
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-origin",
      "x-odesk-csrf-token": this.AUTH["token"],
      "x-odesk-user-agent": "oDesk LM",
      "x-requested-with": "XMLHttpRequest",
      "X-Upwork-Accept-Language": "en-US",
    	};
    	const result = await request(this.page, "POST", "https://www.upwork.com/ab/proposals/api/v2/application/new", headers, data)
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
}