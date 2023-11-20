import dotenv from 'dotenv'
import Browser from '../browser/index.mjs'
import Database from '../db/mongodb.mjs'
dotenv.config()
const upwork = new Browser('mail.dcc453cad274139@spamlessmail.org', 'P@ssw0rd123123');
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

async function iterate(){
	// get jobs
	const result = await upwork.getJobs();
	const jobs = result.results.map(el=>{
	const result = {uid: el.uid, category: el.occupations, client: el.client };
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
	const newUids  = uids.filter(el=>!saved.includes(el));
	console.log(newUids);

	
}
await iterate();
process.on('exit', ()=>{
	console.log('xxxx close database xxxx')
	database.close();
})



