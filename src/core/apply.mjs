// available check
import dotenv from 'dotenv';
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';
import chalk from 'chalk';
import moment from 'moment-timezone';
import { decorate } from '../utils/decorator.mjs'
import Browser from '../browser/index.mjs';
import Database from '../db/mongodb.mjs';
import { getPrompt } from '../gpt/prompt.config.mjs';
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
  .option('user', {
    alias: 'u',
    description: 'Enter your name',
    demandOption: true,
    type: 'string'
  })
  .option('mode', {
    alias: 'm',
    description: 'Enter the bid mode',
    choices: ['speed', 'boost'],
    demandOption: true,
  })
  .help()
  .alias('help', 'h')
  .argv;
const user = argv.user;
const mode = argv.mode;
const DEBUG = (argv.debug && argv.debug === true) ? true : false;


const database = new Database(process.env.MONGODB_URI)
await database.connect();
const gpt = new GPT(process.env.OPENAI_KEY, process.env.GPT_MODEL)

async function getAccounts() {
	const accounts = await database.get('accounts', { status: 'active', botName: process.env.BOT, name: user, isPremium: true });
	return accounts;
}
async function getJobs(user){
	const timeLimit = moment().subtract(process.env.LIMIT, 'hours').tz('UTC').toDate();	
	console.log(timeLimit)
	const jobs = await database.get('jobs', {
		$and:[
			{
				'client.location.country': { $nin: ["Pakistan", "India","South Korea"]},
				users: { $ne: user },
				isPrivate: { $ne: true },
				publishedOn: { $gte: timeLimit }
			},
			{
				$or: [
					{
						isFixed: true, 
						budget: {
							$gte: process.env.FIXED_LIMIT || 500
						}
					},
					{
						isFixed: false,
						'budget.type' : {$ne:'NOT_PROVIDED'},
						'budget.max': { $gte: process.env.HOURLY_LIMIT|| 25 }
					},
					{
						isFixed: false,
						'budget.type' : 'NOT_PROVIDED',
					}
					]
			}
			]
	}, { sort: { publishedOn: -1 }});
	return jobs;
}

async function boost(agent, total){
	await agent.navigate('https://www.upwork.com/nx/boost-profile');
	await agent.getAuth();
	const result = await agent.boost(total, total, '2023-12-31');
	if(result.data && result.data.data && result.data.data.createAd !== null){
		console.log(chalk.green('>>> Successfully boosted :)'))
	}
}


// if(pendingJobs.length){
// 	await apply(upwork, pendingJobs[0]);
// }
async function main(){
	console.log('===========================================');
	let lastTime = moment();
	const [accounts, jobs] = await Promise.all([getAccounts(), getJobs(user)]);
	console.log(`Fetched data from DB ${moment().diff(lastTime)}ms`)
	lastTime = moment();

	if(accounts.length===0){
		console.log('======== NO ACCOUNT =========');
		await wait(15 * 1000);
	} 
	else if(jobs.length === 0){
		console.log('======== NO JOBS ===========');
		await wait(1000);
	}
	else {
		
		const account = accounts[0];
		const job = jobs[0];
		console.log(`> ${account.email}`)
		console.log('Title: ' + chalk.green(job.title) + ' ' + 
			moment().diff(job.publishedOn) / 1000
		+ ' sec ago');

		const upwork = new Browser(!DEBUG);
		const [_, coverLetter] = await Promise.all([
			 (async ()=> {
						await upwork.login({ user: account.email, password: process.env.PASSWORD}, `https://www.upwork.com/ab/proposals/job/${job.link}/apply`);
						await upwork.getAuth();
					})(),
					(async()=>{
						const startTime = moment();
					const text = await	gpt.prompt(getPrompt(job.description))
					console.log(`GPT in ${moment().diff(startTime)}ms`)
					return text;
					})()
					])

		console.log(`=======================
			${coverLetter}
			===================`)

		const result = await upwork.applyJob(job.uid, {
			connects: (mode === 'speed') ? 50: 30,
			link: job.link,
			coverLetter,
			questions: job.questions.map(el=>({...el, answer: gpt.getAnswer(el.question)})),
			amount: job.isFixed ? job.budget: (process.env.HOURLY_RATE || 30),
			isFixed: job.isFixed,
			estimatedDuration: !job.isFixed ? null : job.engagementDuration
		})
		console.log(`Application ${moment().diff(lastTime)}ms`)
	if(result.status==='success'){
		console.log(chalk.green(`Successfully Applied in ${moment().diff(moment(job.publishedOn))}`))
		if(mode==='boost'){
			await boost(upwork, 20);
		}
		await Promise.all([
			database.update('jobs', {uid: job.uid}, { '$push': { users: user }}), 
			database.update('accounts', { email: account.email },{ '$set': { status: 'applied'}})
			]);
		await upwork.close();
		// await database.
	} else {
		console.log(chalk.red('============ Application Failed ==========='));
		
		if(result && result.data && result.data.error && result.data.error.message_key === 'jpb_Opening_DefaultForbidden_ErrorMessage'){
			// In this case, job is transferred to private, you cannot bid to that.....
			const opening = await upwork.getJobOpening(job.uid)
			if(opening.flSuspended){
				console.log(chalk.red('>>>> Account is restricted'));
				await database.delete('accounts', { email:account.email })
			}else if(opening.opening.job.info.isPtcPrivate){
				console.log(chalk.red('>>>> Job is private only'))
				await database.update('jobs', {uid: job.uid}, { '$set': { isPrivate: true }});
			}
			
		} else if(result && result.data && result.data.error && result.data.error.message_key === 'jpb_TNSJobIDVerificationRequired'){
			console.log(chalk.red('>>>> Job needs ID verification'));
			await database.update('jobs', {uid: job.uid}, { '$set': { idvRequiredByOpening: true }});
			await database.delete('accounts', { email:account.email })

		} else if(result && result.data && result.data.error && result.data.error.message_key === 'jpb_ThisJobIsNoLongerAvailable'){

			console.log(chalk.red('>>>> Job is no longer Available.'));
			await database.update('jobs', {uid: job.uid}, { '$set': { isPrivate: true }});

		} else if(result && result.data && result.data.error && result.data.error.message_key === 'jpb_codeExtended_VJF_JA_2'){

			console.log(chalk.red('>>>> Job is no longer Available.'));
			await database.update('jobs', {uid: job.uid}, { '$set': { isPrivate: true }});

		} else if(result && result.data && result.data.error && result.data.error.message_key === 'jpb_codeExtended_VJF_CONN_1'){

			console.log(chalk.red('>>>> Insufficient connects....'));
			database.update('accounts', { email: account.email },{ '$set': { status: 'applied'}})

		} else if(result && result.data && result.data.error && result.data.error.message_key === 'jpb_Opening_DefaultServerError_ErrorMessage'){
			
				console.log(chalk.red('Server is temporarily down. Try again in a while.'))
				await wait(5 * 60 * 1000);	
		}
		 else{
			console.log(result.data);
			await wait(1* 1000);	
		}
		await upwork.close();
	}
	}
}

while(true){
	await main();
}