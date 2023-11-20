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
          const response = await fetch(e, {
            method: "POST",
            headers: t,
            credentials: "include",
            body: JSON.stringify(a),
          });
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
    		devtools: true
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
	async getJobDetail(id){
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
	async applyForJob(id, {coverLetter, questions, chargedAmount, estimatedDuration, isFixed }){

		data = {
      		version: 3,
      		jobReference: response["opening"]["job"]["openingUid"],
      		agency: null,
      		chargedAmount:chargedAmount,
      		coverLetter: coverLetter,
      		earnedAmount: null,
      		estimatedDuration: null,
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
      		profileRateToSet: ![],
      		boostBidAmount: 50,
      		rateGuidance: null,
      		agencyOrgUid: null,
    	};
    	if(isFixed){ 
    		data['sri'] = { percent: 0, frequency: 0 };
    	} else {
    		const res = await request(this.page, "https://www.upwork.com/ab/proposals/api/v4/job/details/" + id, headers);
    		data.estimatedDuration = estimatedDuration || res.context.engagementDurationsList[3]

    	}
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
    	await request(this.page, 'https://www.upwork.com/ab/proposals/api/disintermediation/apply', headers);
    	const result = await request(this.page, "https://www.upwork.com/ab/proposals/api/v2/application/new", headers, data)
    	console.log(result);



	}
}