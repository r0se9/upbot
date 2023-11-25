import dotenv from 'dotenv'
import Browser from '../browser/index.mjs'
import Database from '../db/mongodb.mjs'
import chalk from 'chalk';
import yargs from 'yargs/yargs';
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
const upwork = new Browser( !argv.debug);
const database = new Database(process.env.MONBO_URI)
await database.connect();
await upwork.login({user: process.env.SEARCH_MAIL, password: process.env.PASSWORD});
const authInfo = await upwork.getAuth();


async function resolveJob(job){
	const results = await Promise.all([
		(async ()=>{
				const result = await upwork.getJobOpening(job.uid)

				const re = {
					uid: job.uid,
					isFixed: job.isFixed,
					budget: job.budget,
					link: job.link,
					publishedOn: job.publishedOn,
					category: job.category,
					isPrivate: result.opening.job.info.isPtcPrivate,
					isPremium: result.opening.job.info.premium,
					questions: result.questions.questions,
					title: result.opening.title,
					description: result.opening.description,
					qualifications: result.qualifications,
					engagementDuration: result.opening.job.engagementDuration,
					isOngoing: result.opening.job.segmentationData,
					client: {
						...job.client,
						contact: result.organization.contact,
						timezone: result.organization.timezoneName,
					},
				}
				return re;
				
			})(),
	(async ()=>{
			const res = await upwork.getJobDetail({link: job.link});

			return ({
        engagementDurationsList: res.data.context.engagementDurationsList || [],
        idVerificationRequired: res.data.context.idVerificationNeeded || false,
        idvRequiredByOpening: res.data.context.idvRequiredByOpening || false,
        phoneVerificationNeeded: res.data.context.phoneVerificationNeeded || false,
      });
		})()]);
	return ({...results[0], ...results[1]})

}
async function scrap(){
	// get jobs
	
	
	const results = await Promise.all([upwork.getJobs(), upwork.searchJobs()]);
	const result = _.map(results[0], (item)=>{
		return _.merge({}, item, _.find(results[1], ['uid', item.uid]))
	})
	
	const jobs = result.map(el=>{
	const result = {uid: el.uid, category: el.occupations, client: el.client, title: el.title, publishedOn: el.renewedOn ? el.renewedOn : el.publishedOn, link: el.ciphertext };
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
	const saved = await database.get('jobs', {uid: {'$in':uids}});
	const savedUids = saved.map(el=>el.uid);
	const newJobs  = jobs.filter(el=>!savedUids.includes(el.uid));
	console.log(`================= There are ${newJobs.length} new Jobs found =================`)
	if(newJobs.length===0) return;
	const jobList = [];
	for(let index in newJobs){
		const job = await resolveJob(newJobs[index]);
		jobList.push(job);
	}
	await database.createMany('jobs', jobList);
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



