// available check
import dotenv from 'dotenv'
import Browser from '../browser/index.mjs'
import Database from '../db/mongodb.mjs'
import GPT from '../gpt/index.mjs';
import { getPrompt } from '../gpt/prompt.mjs';
dotenv.config()
console.log(process.env.OPENAI_KEY)
const upwork = new Browser('mail.a1cf3df6b2fd350@spamlessmail.org', 'P@ssw0rd123123');
const database = new Database(process.env.MONBO_URI)
await database.connect();
await Promise.all([database.connect(), upwork.start()]);
const gpt = new GPT(process.env.OPENAI_KEY, process.env.GPT_MODEL)
const authInfo = await upwork.getAuth();
async function getJobs(){
	const jobs = await database.get('jobs', { idvRequiredByOpening: false});
	return jobs;
}
async function apply(agent, job){
	console.log(`===== Let's apply ========`);
	console.log(job);
	// const coverLetter = await gpt.prompt(getPrompt({description: job.description}));
	const coverLetter = 'Hello!'
	console.log(coverLetter)
	await agent.applyJob(job.uid, { 
		link: job.link,
		coverLetter, 
		questions: job.questions.map(el=>({...el, answer: gpt.getAnswer(el.question)})),
		amount: job.isFixed ? job.budget: (process.env.HOURLY_RATE || 30),
		isFixed: job.isFixed,
		estimatedDuration: !job.isFixed ? null : job.engagementDuration
	})
}

const pendingJobs = await getJobs();

if(pendingJobs.length){
	await apply(upwork, pendingJobs[0]);
}
