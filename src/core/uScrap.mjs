import dotenv from 'dotenv'
import Browser from '../browser/index.mjs'
import Database from '../db/mongodb.mjs'
import chalk from 'chalk';
import yargs from 'yargs/yargs';
import moment from 'moment-timezone';
import _ from 'lodash';
import { hideBin } from 'yargs/helpers';
import { decorate } from '../utils/decorator.mjs'
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
const upwork = new Browser();
const database = new Database(process.env.MONGODB_URI)
await database.connect();
await upwork.connectRemote(8081);
await upwork.navigate('https://www.upwork.com/nx/find-work/domestic')
console.log(chalk.green('Remote Connected'))


async function resolveJob(job){
				const result = await upwork.getJobOpening(job.uid);
				const postedAt = job.publishedOn || job.renewedOn;
				const re = {
					uid: job.uid,
					isFixed: job.isFixed,
					budget: job.budget,
					link: job.link,
					isUSA: true,
					postedAt: moment(postedAt).tz('UTC').toDate(),
					questions: result.questions.questions,
					title: result.opening.title,
					description: result.opening.description,
					qualifications: result.qualifications,
					client: {
						...job.client,
						contact: result.organization.contact,
						timezone: result.organization.timezoneName,
					},
				}
				return re;
}
async function scrap(){
	// get jobs
	await upwork.getAuth();

	const results = await Promise.all([upwork.getUSJobs(), upwork.searchUSJobs(process.env.USA_SEARCH_URL)]);
	const result = _.map(results[1], (item)=>{
		return _.merge({}, item, _.find(results[0], ['uid', item.uid]))
	})
	
	const jobs = result.map(el=>{
		const publishedOn = moment(el.renewedOn ? el.renewedOn : el.publishedOn).tz('UTC');
	const result = {
		uid: el.uid, 
		category: el.occupations, 
		client: el.client, 
		title: el.title,
		publishedOn: publishedOn.toDate(), 
		link: `https://www.upwork.com/ab/proposals/job/${el.ciphertext}/apply/` 
	};
	const isFixed = el.amount.amount ? true: false;
	result.isFixed = isFixed;
	if(isFixed){
		result.budget = el.amount.amount;
	}else{
		result.budget = el.hourlyBudget;
	}

	return result;
	});
	
	// get uids
	const uids = jobs.map(el=>el.uid);
	// check unsaved uids
	const saved = await database.get('newJobs', {uid: {'$in':uids}});
	const savedUids = saved.map(el=>el.uid);
	const newJobs  = jobs.filter(el=>!savedUids.includes(el.uid));
	console.log(`================= There are ${newJobs.length} new Jobs found =================`)
	if(newJobs.length===0) return;
	const jobList = [];
	for(let index in newJobs){
		try{
			const job = await resolveJob(newJobs[index]);
			jobList.push(job);	
		}catch(e){
			console.log(chalk.red(`Error resolve Job: ${job.uid}`))
		}
		
	}
	await database.createMany('newJobs', jobList);
	// const data = await upwork.getConnects();
	// console.log(data)
	
}
async function main(){
	await scrap();
	setTimeout(main, 10000);
}
await main();
process.on('exit', ()=>{
	console.log('xxxx close database xxxx')
	database.close();
})



