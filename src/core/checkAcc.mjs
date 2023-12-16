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
dotenv.config()
decorate();
const argv = yargs(hideBin(process.argv))
.option('debug', {
    alias: 'd',
    description: 'Run this code in debug mode',
    type: 'boolean',
    default: false
  })
  .help()
  .alias('help', 'h')
  .argv;

const credential = fs.readFileSync(path.resolve('static/credentials/token.json'));
const gmail = new GMail(JSON.parse(credential));


const DEBUG = (argv.debug && argv.debug === true) ? true : false;
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

const database = new Database(process.env.MONBO_URI)
await database.connect();
async function getAccounts() {
	const accounts = await database.get('accounts', { status: {'$in':['applied', 'opened']}, botName: process.env.BOT});
	return accounts;
}
async function createAgent(user, DEBUG){
	const first = moment();
	const upwork = new Browser(!DEBUG);
	await upwork.login({ user, password: process.env.PASSWORD});
	await upwork.getAuth();
	console.log(`New Agent is created in ${moment().diff(first) /1000}s`)
	return upwork;
}
async function checkRestrict(agent){
	const result = await agent.getMe();
	const restResult = await agent.isRestricted(result.personUid);
	return restResult?.data?.data?.developerSuspended?.suspendedStatus || false;


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

async function checkOne(user, DEBUG){
	const agent = await createAgent(user, DEBUG);
	const isRestricted = await checkRestrict(agent);
	const hasMessage = await checkRooms(agent);
	if(isRestricted && !hasMessage){
		console.log(chalk.red('Delete: ' + user));
		await database.delete('accounts', { email: user });
	}else if(hasMessage){
		console.log(chalk.green('Message: ' + user));
		await gmail.sendMail({
			to: process.env.EMAIL_NOTIFICATION,
			subject: 'Good news! ' + user,
			message: 'process.env.EMAIL_NOTIFICATION',
		})
		//send Mail;
	}
	await agent.close();

}
async function main(){
	const users = await getAccounts();
	for(let user of users.map(el=>el.email)){
		await checkOne(user, DEBUG);
	}
}
await main();
await database.close();