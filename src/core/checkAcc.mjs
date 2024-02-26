// check account

import dotenv from 'dotenv';
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path'
import moment from 'moment-timezone';
import { decorate } from '../utils/decorator.mjs'
import Browser from '../browser/index.mjs';
import Database from '../db/mongodb.mjs';
import GMail from '../utils/gmail.mjs';
import GPT from '../gpt/index.mjs';
import { wait } from '../utils/time.mjs';
import { retry } from '../utils/lib.mjs';
dotenv.config()
decorate();
const argv = yargs(hideBin(process.argv))
.option('debug', {
    alias: 'd',
    description: 'Run this code in debug mode',
    type: 'boolean',
    default: false
  })
 .option("status", {
    alias: "s",
    description: "Enter statues active|applied",
    type: "string",
    demandOption: true,
  })
  .option("user", {
    alias: "u",
    description: "Enter your profile usernames, separated by |",
    type: "string",
    default: '',
  })
  .help()
  .alias('help', 'h')
  .argv;

const credential = fs.readFileSync(path.resolve('static/credentials/token.json'));
const gmail = new GMail(JSON.parse(credential));


const DEBUG = (argv.debug && argv.debug === true) ? true : false;
const statuses = argv.status.split('|');
const users = argv.user.split('|').filter(e=>e!=='');


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

const database = new Database(process.env.MONGODB_URI)
await database.connect();
async function getAccounts() {
	const query = { status: {'$in':statuses}, isActive: {'$ne': false}};
	if(users.length) query.name = {'$in': users};
	const accounts = await database.get('accounts', query);
	console.log(chalk.green(`Pushed ${accounts.length} accounts to the hell....`))
	return accounts;
}
async function createAgent(user, DEBUG){
	const first = moment();
	const upwork = new Browser(!DEBUG);
	await upwork.initPage();
	await upwork.navigate('https://www.upwork.com/nx/find-work/best-matches', { waitUntil: 'networkidle0' })
	await retry(e=>e, ()=> upwork.loginAPI({ user, password: process.env.PASSWORD}), 100, 10);
	await upwork.getAuth();
	console.log(`New Agent is created in ${moment().diff(first) /1000}s`)
	return upwork;
}
async function checkRestrict(agent){
	const result = await agent.getMe();
	const restResult = await agent.isRestricted(result.personUid);
	const identity = await agent.checkIdentity();
	return (restResult?.data?.data?.developerSuspended?.suspendedStatus || false) || identity;


};

async function captureAPI(agent, starturl){
	return new Promise((resolve, reject)=>{
		agent.on('response', async (response) => {
    	const url = response.url();
    	const params = new URL(url).searchParams;
    	// Check if the response URL is the one we're interested in and has a specific query parameter.
    	if (url.startsWith(starturl)  && !params.has('cursor') ) {
      		try {        		
          		const data = await response.json(); // Extract JSON data from the response
          		resolve(data)
      		} catch (error) {
        		console.error('Failed to process response:', error);
      		}
    	}
  		});
	})
}


async function checkRooms(agent){
	await agent.navigate('https://www.upwork.com/ab/messages');
	const data = await captureAPI(agent.page, 'https://www.upwork.com/api/v3/rooms/rooms/simplified')
	return data.rooms.length > 0;
}
async function sendMail(user){
	await retry((e)=>e, gmail.sendMail({
			to: process.env.EMAIL_NOTIFICATION,
			subject: 'Good news! ' + user,
			message: 'https://generator.email/'+ user,
		}), 5* 60 * 1000, 100);
}

async function checkOne(user, DEBUG){
	const agent = await createAgent(user, DEBUG);
	const isRestricted = await checkRestrict(agent);
	const hasMessage = await agent.checkNews();
	const connects = await agent.getConnects();
	console.log(connects)
	await database.update('accounts', {email: user}, {'$set': {connects}});
	if(isRestricted && !hasMessage){
		console.log(chalk.red('Delete: ' + user));
		await agent.closeAccount();
		await database.delete('accounts', { email: user });
	}else if(hasMessage){
		console.log(chalk.green('Message: ' + user));
		await sendMail(user);

		//send Mail;
	}

	await agent.close();

}
async function main(){
	const users = await getAccounts();
	for(let user of users.map(el=>el.email)){
		try{
			console.log('Check: '+ user)
			await checkOne(user, DEBUG);
		} catch(e){
			console.log(chalk.red('error' + user))
		}
		
	}
}
await main();
await database.close();