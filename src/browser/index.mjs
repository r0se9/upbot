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
async function request(page, url, headers, data) {
  return data
    ? await page.evaluate(
        async (e, t, a) => {
          console.log(a)
          const response = await fetch(e, {
            method: "POST",
            headers: t,
            credentials: "include",
            body: JSON.stringify(a),
          });
          console.log(response)
          return response.ok ? await response.json() : null;
        },
        url,
        headers,
        data
      )
    : await page.evaluate(
        async (e, t) => {
          const response = await fetch(e, { headers: t, credentials: "include" });
          return response.ok ? await response.json() : null;
        },
        url,
        headers
      );
}
export default class Browser{
	AUTH_URL = 'https://www.upwork.com/ab/account-security/login?redir=%2Fnx%2Ffind-work%2Fmost-recent'
	constructor(user, password){
		this.user = user;
		this.password = password;
	}
	async start(){
		const options = {
    		defaultViewport: null,
    		args: [
     		 "--start-maximized"
     		 ],
    		headless: false,
    		// devtools: true
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
  		await this.page.goto(this.AUTH_URL);
  		console.log('========= Rendered Page ==========')
  		// TIMER
  		await input(this.page, '#login_username', this.user);
  		await click({
  			component: this.page,
  			selector: '#login_password_continue'
  		});
  		await wait(1000);
  		await input(this.page, '#login_password', this.password);
  		await Promise.all([this.page.waitForNavigation(),
  			click({
  				component: this.page,
  				selector: '#login_control_continue'
  			})])
  		console.log('========= Got In ==========')
  		}
  		
  	async getAuth(){
  		const result = { token: "", oauth: "", uid: "", oDeskUserID: "" };
  		const cookies = await this.page.cookies();
  		for (const cookie of cookies) {
   		 	if (cookie["name"] === "XSRF-TOKEN") result["token"] = cookie["value"];
    		if (cookie["name"] === "oauth2_global_js_token") result["oauth"] = cookie["value"];
    		if (cookie["name"] === "user_uid") result["uid"] = cookie["value"];
    		if (cookie["name"] === "console_user") result["oDeskUserID"] = cookie["value"];
  		}
  		this.AUTH = result;
	}
  async getMe(){
    const url ='https://www.upwork.com/freelancers/api/v1/profile/me/fwh';
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
        const response = await request(this.page, url, headers);
        return response;
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
      const url = 'https://www.upwork.com/ab/proposals/api/v4/job/details/' + link;
      const res = await request(this.page, "https://www.upwork.com/ab/proposals/api/v4/job/details/" + link, headers);
      return ({
        engagementDurationsList: res.context.engagementDurationsList,
        idVerificationRequired: res.context.idVerificationNeeded,
        idvRequiredByOpening: res.context.idvRequiredByOpening,
        phoneVerificationNeeded: res.context.phoneVerificationNeeded,
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
      	const response = await request(this.page, process.env.MOST_RECENT_URL, headers);
      	return response;
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
    	const response = await request(this.page, "https://www.upwork.com/ab/proposals/api/openings/" + id, headers)
    	return response;
	}
	async applyJob(uid, {link, coverLetter, questions, amount, estimatedDuration, isFixed }){
    await this.page.goto(`https://www.upwork.com/ab/proposals/job/${link}/apply`)

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
      		boostBidAmount: 50,
      		rateGuidance: null,
      		agencyOrgUid: null,
    	};
    	if(!isFixed){ 
    		data['sri'] = { percent: 0, frequency: 0 };
    	}
      console.log(data)
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
    	const re = await request(this.page, 'https://www.upwork.com/ab/proposals/api/disintermediation/apply', headers);
      const re = await request(this.page, 'https://www.upwork.com/ab/proposals/api/disintermediation', headers);
      const re = await request(this.page, 'https://www.upwork.com/ab/proposals/api/disintermediation/apply', headers);
      console.log(re)
    	const result = await request(this.page, "https://www.upwork.com/ab/proposals/api/v2/application/new", headers, data)
    	console.log(result);



	}
}