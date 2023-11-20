import dotenv from 'dotenv'
import Browser from '../browser/index.mjs'
import Database from '../db/mongodb.mjs'
dotenv.config()
const upwork = new Browser('w7b6931a7a712b9196daabe6c@machaimichaelenterprise.com', 'P@ssw0rd123123');
const database = new Database(process.env.MONBO_URI)
await database.connect();
await upwork.start();
const authInfo = await upwork.getAuth();


// const ids = jobs.map(el=>el.uid);
// await Promise.all(ids.map(async el=>{
// const jobinfo = await upwork.getJobDetail(el)	
// console.log(el, jobinfo)
// }))
// console.log(jobs)
async function resolveJob(job){
	const results = await Promise.all([
		(async ()=>{
				const result = await upwork.getJobOpening(job.uid)
				
				const re = {
					uid: job.uid,
					isFixed: job.isFixed,
					budget: job.budget,
					link: job.link,
					category: job.category,
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
					isAvailable: 'NS',
				}
				return re;
				
			})(),
	(async ()=>{
			const result = await upwork.getJobDetail({link: job.link});
			return result;
		})()]);
	return ({...results[0], ...results[1]})

}
async function iterate(){
	// get jobs
	const result = await upwork.getJobs();
	console.log(result.results);
	const jobs = result.results.map(el=>{
	const result = {uid: el.uid, category: el.occupations, client: el.client, title: el.title, publishedOn: el.publishedOn, link: el.ciphertext };
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
	const newJobs  = jobs.filter(el=>!saved.includes(el.uid));
	console.log(`================= There are ${newJobs.length} new Jobs found =================`)
	const jobList = [];
	for(let index in newJobs){
		const job = await resolveJob(newJobs[index]);
		jobList.push(job);
	}
	await database.createMany('jobs', jobList);
	const data = await upwork.getMe();
	console.log(data)
	
}
await iterate();
process.on('exit', ()=>{
	console.log('xxxx close database xxxx')
	database.close();
})



