// available check
import dotenv from 'dotenv';
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';
import Browser from '../browser/index.mjs';
import Database from '../db/mongodb.mjs';
import { getPrompt } from '../gpt/prompt.mjs';
import GPT from '../gpt/index.mjs';
import { wait } from '../utils/time.mjs';
dotenv.config()
const argv = yargs(hideBin(process.argv))
  .option('name', {
    alias: 'n',
    description: 'Enter your name',
    type: 'string'
  })
  .help()
  .alias('help', 'h')
  .argv;
const user = argv.user;
const database = new Database(process.env.MONBO_URI)
await database.connect();
const gpt = new GPT(process.env.OPENAI_KEY, process.env.GPT_MODEL)

async function getAccounts() {
	const accounts = await database.get('accounts', { status: 'active', botName: process.env.BOT, name: user });
	return accounts;
}
async function getJobs(user){
	const jobs = await database.get('jobs', { idvRequiredByOpening: false, users: { $ne: user }});
	return jobs;
}
async function apply(agent, job){
	console.log(`===== Let's apply ========`);
	
	await agent.navigate(`https://www.upwork.com/ab/proposals/job/${job.link}/apply`)
    await agent.getAuth();
	// const coverLetter = await gpt.prompt(getPrompt({description: job.description}));
	const coverLetter = 'Hello!'
	console.log(coverLetter)
	const result = await agent.applyJob(job.uid, { 
		link: job.link,
		coverLetter, 
		questions: job.questions.map(el=>({...el, answer: gpt.getAnswer(el.question)})),
		amount: job.isFixed ? job.budget: (process.env.HOURLY_RATE || 30),
		isFixed: job.isFixed,
		estimatedDuration: !job.isFixed ? null : job.engagementDuration
	})
	if(result!==null){
		console.log('============ Successfully Applied =========')
		// await database.
	}

	
}




// if(pendingJobs.length){
// 	await apply(upwork, pendingJobs[0]);
// }
async function main(){
	const [accounts, jobs] = await Promise.all([getAccounts(), getJobs(user)]);	
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
		console.log(`=====> ${account.email} ================`)
		const upwork = new Browser(account.email, process.env.PASSWORD, true);
		const [_, coverLetter] = await Promise.all([
			 (async ()=> {
						await upwork.start(`https://www.upwork.com/ab/proposals/job/${job.link}/apply`);
						await upwork.getAuth();
					})(),
					gpt.prompt(getPrompt(job.description))
					])
		await upwork.getAuth();
		const result = await upwork.applyJob(job.uid, { 
			link: job.link,
			coverLetter,
			questions: job.questions.map(el=>({...el, answer: gpt.getAnswer(el.question)})),
			amount: job.isFixed ? job.budget: (process.env.HOURLY_RATE || 30),
			isFixed: job.isFixed,
			estimatedDuration: !job.isFixed ? null : job.engagementDuration
		})
	if(result.status==='success'){
		console.log('============ Successfully Applied =========')
		await Promise.all([
			database.update('jobs', {uid: job.uid}, { '$push': { users: account.email }}), 
			database.update('accounts', { email: account.email },{ '$set': { status: 'applied'}})
			]);
		await upwork.close();
		// await database.
	}else{
		console.log('============ Application Failed ===========');
		console.log(result.data);
		// database.update('accounts', { email: account.email }, { '$set': { status: 'error'}})
		await wait(10* 1000);
		// await upwork.start();
		// await upwork.close();
	}
	}
}
while(true){
	await main();
}