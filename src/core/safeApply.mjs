// Fast Apply
import chalk from 'chalk';
import moment from 'moment-timezone';
import Browser from '../browser/index.mjs';
// import { getPrompt } from '../gpt/prompt.config.mjs';
import _ from 'lodash';
import { wait } from '../utils/time.mjs';
import { retry } from '../utils/lib.mjs';
import { updateProgress } from '../utils/decorator.mjs';






async function boost(agent, total){
	await agent.navigate('https://www.upwork.com/nx/boost-profile');
	await agent.getAuth();
	const result = await agent.boost(total, total, '2023-12-31');
	if(result.data && result.data.data && result.data.data.createAd !== null){
		console.log(chalk.green('>>> Successfully boosted :)'))
	}
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
async function getLastAppliedJobs(){
	const uids = await database.get('applied', { name: USER }, { sort: { postedAt: 1 }, limit: 10 });
	return uids.map(el=>el.uid);
}
async function getJobs(agent){
	const results = await Promise.all([agent.getJobs(), agent.searchJobs()]);
	const result = results[0];
	_.forEach(results[1], item=>{
		if(!_.find(result, ['uid', item.uid])){
			result.push(item);
		}
	})
	

	
	const jobs = result.map(el=>{
		const publishedOn = moment(el.renewedOn ? el.renewedOn : el.publishedOn).tz('UTC');
	const result = {uid: el.uid, type: el.hourlyBudget.type,  client: el.client, title: el.title, description: el.description,  postedAt: publishedOn.toDate(), link: `https://www.upwork.com/ab/proposals/job/${el.ciphertext}/apply/`, ciphertext: el.ciphertext, category: el.occupations };
	const isFixed = el.amount.amount ? true: false;
	result.isFixed = isFixed;
	if(isFixed){
		result.budget = el.amount.amount;
	}else{
		result.budget = el.hourlyBudget;
	}

	return result;
	});
	return jobs;
}
const BANNED_COUNTRIES = [
	'India', 'Pakistan', 'South Korea'
	]
function filterJobs(jobs, exclude){
	return _.filter(jobs, job=>{
		let score = 0;
		if(exclude.includes(job.uid)) return false;
		if(job.category.category.prefLabel === 'Web, Mobile & Software Dev') return false;
		if(job.category.subcategories.prefLabel === 'Data Entry & Transcription Services') return false;
		if(job.client.location.country && BANNED_COUNTRIES.includes(job.client.location.country)) score--;
		if(job.isFixed){
			if(job.budget < process.env.FIXED_LIMIT) score --;
			else score ++;
		}else{
			if(job.type === 'NOT_PROVIDED') score ++;
			else if(job.budget.min + job.budget.max > 2 * process.env.HOURLY_LIMIT) score ++;
		}
		if(score>=0)return true;
		else return false;
	})
}
async function apply(agent, job, gpt, myconnects, MODE, USEGPT){

	console.log('JOB:' + job.title )
	console.log('ID: ' + job.uid)
	console.log('Job was posted ' + moment().diff(job.postedAt)/1000 + 's before')
	const start = moment();
	
	const engagementDuration = {
  "uid": "474250516458926082",
  "rid": 3,
  "label": "1 to 3 months",
  "weeks": 9,
  "ctime": "2014-06-04T17:59:10.123Z",
  "mtime": "2014-06-04T17:59:10.123Z",
  "replacedByUid": null
};
	const [coverLetter] = await Promise.all([
		(async ()=>{
					const start = moment();
					let result;
					if(USEGPT){
						result = await gpt.prompt(job.description);
						console.log(chalk.green(`GPT is created in ${moment().diff(start)/1000}s`));
					}else{
						result = await gpt.default;
					}
					return result;
				})()
		]);
	const reqConnects = await agent.getJobConnects(job.ciphertext);
			console.log(`1. Job needs ${reqConnects} connects`);
			const bids = await agent.getJobBids(job.uid);
			const connects = bids.map(el=>el.amount);
			let amount = myconnects;
			if(connects.length===4 && connects[connects.length - 1] + reqConnects === 50 && !MODE){
				console.log('Cannot boost!')
				amount = null;
			}else{
				console.log('Boosted')
			}

			console.log(job.isFixed ? job.budget: (process.env.HOURLY_RATE || 30))
	const result = await agent.applyJob(job.uid, {
			connects: amount,
			link: job.link,
			coverLetter,
			amount: (job.isFixed ? job.budget: (process.env.HOURLY_RATE || 30)) || 30,
			isFixed: job.isFixed,
			estimatedDuration: !job.isFixed ? null : engagementDuration
		});
	console.log(chalk.green(`Application is finshed in ${moment().diff(start) / 1000 }s`))
	return result;
}
async function followUp(database, agent, email, job, result, MODE, USER){
	if(result.status==='success'){
		const now = moment().tz('UTC');
		const postedAt = moment(job.postedAt).tz('UTC');
		console.log(chalk.green(`Successfully Applied in ${now.diff(postedAt) / 1000 } s`))

		console.log(chalk.green(`Job: ${job.title}`))
		if(MODE==='boost'){
			await boost(agent, 20);
		}
		const myconnects = await agent.getConnects();
	console.log('Connects Remaining: ' + myconnects)
		await Promise.all([
			database.create('applied', {uid: job.uid, name: USER, mode: MODE, status: 'success', appliedAt: now.toDate(), postedAt: postedAt.toDate() }), 
			database.update('accounts', { email: email },{ '$set': { status: 'applied', connects: myconnects }})
			]);
	} else {
		console.log(chalk.red('============ Application Failed ==========='));
		console.log(result.data.error);
		if(result && result.data && result.data.error && result.data.error.message_key === 'jpb_Opening_DefaultForbidden_ErrorMessage'){
			// In this case, job is transferred to private, you cannot bid to that.....
			const opening = await agent.getJobOpening(job.uid);
      		const isRestricted = await checkRestrict(agent);
      		const flRestricted = opening.flSuspended;
			if(isRestricted || flRestricted){
				console.log(chalk.red('>>>> Account is restricted'));
				console.log(`delete account with ${email}`)
        
				await database.delete('accounts', { email });
			}
      if(opening.opening.job.info.isPtcPrivate){
				console.log(chalk.red('>>>> Job is private only'))
				await database.create('applied', {uid: job.uid, status: 'private', name: USER});
			}
			
		} else if(result && result.data && result.data.error && result.data.error.message_key === 'jpb_codeExtended_VJ_JA_8'){
			console.log(chalk.red('>>>> Job is no longer Available.'));
			await database.delete('applied', { email });
		}else if(result && result.data && result.data.error && result.data.error.message_key === 'jpb_ThisJobIsNoLongerAvailable'){

			console.log(chalk.red('>>>> Job is no longer Available.'));
			await database.create('applied', {uid: job.uid, status: 'no longer avaialble', name: USER});

		} else if(result && result.data && result.data.error && result.data.error.message_key === 'jpb_codeExtended_VJF_JA_2'){

			console.log(chalk.red('>>>> Job is no longer Available.'));
			await database.create('applied', {uid: job.uid, status: 'no longer avaialble', name: USER});

		} else if(result && result.data && result.data.error && result.data.error.message_key === 'jpb_codeExtended_VJ_JA_10'){
			console.log(chalk.green('>>>> You already applied'));
			await database.create('applied', {uid: job.uid, status: 'already applied', name: USER});

		} else if(result && result.data && result.data.error && result.data.error.message_key === 'jpb_TNSJobIDVerificationRequired'){
			await database.delete('accounts', { email });

		} else if(result && result.data && result.data.error && result.data.error.message_key === 'jpb_codeExtended_VJF_CONN_1'){

			console.log(chalk.red('>>>> Insufficient connects....'));
			database.update('accounts', { email: email }, { '$set': { status: 'applied'}})

		} else if(result && result.data && result.data.error && result.data.error.message_key === 'jpb_Opening_DefaultServerError_ErrorMessage'){
			
				console.log(chalk.red('Server is temporarily down. Try again in a while.'))
				await database.delete('accounts', { email }, {'$set': {status: 'temporarily'}});
		}
		 else{
			console.log(result.data);
			await wait(1* 1000);	
		}
		
	}
}


async function checkRestrict(agent){
	const result = await agent.getMe();
	try{
		const restResult = await retry((e)=>!!e.data.data, ()=>agent.isRestricted(result.personUid), 100, 10);
		const identity = await agent.checkIdentity();
		return restResult.data.data.developerSuspended.suspendedStatus || identity;
	}catch(e){
		return false;
	}
	


}
async function main(gpt, database, USER, MODE, DEBUG, USEGPT){

	while(true){

		// let accounts = await database.get('accounts', { connects:{'$gte': 16 },  botName: process.env.BOT, name: USER, isActive: { '$ne': false } }, { sort: {createdAt: -1}});
		let accounts = await database.get('accounts', { status:'active',  botName: process.env.BOT, name: USER, isActive: { '$ne': false } }, { sort: {createdAt: -1}});

		if(accounts.length === 0){
			console.log(chalk.red('There is no account.'))
			await wait(100 * 1000);
		} else{
			const { email } = accounts[0];
			console.log(chalk.green(`Start with ${email}`));
			let agent;
		
			agent = await createAgent(email, DEBUG);

		
			// await agent.visitPlan();
			const isRestricted = await checkRestrict(agent);
			const myconnects = await agent.getConnects();
			console.log('Connects: ' + myconnects)

			if(isRestricted){
				console.log(chalk.red('This has been restricted.'))
				await database.delete('accounts', { email });
				await agent.close();
				continue;
			}
			if(myconnects==0 || myconnects < 16){
				database.update('accounts', { email: email },{ '$set': { connects: myconnects, status: "applied" }})
				await agent.close();
				continue;
			}
			let filteredJobs = [];
			let index=0;
			const startTime = moment();
			const interval = setInterval(() => {
  				updateProgress('Searching Job ', startTime, index);
  				index++;
			}, 250); // Rotate every 250ms
		

			do {
				const jobs = await getJobs(agent);
				const saved = await database.get('applied', {uid: {'$in':jobs.map(el=>el.uid)}, name: USER});
				filteredJobs = filterJobs(jobs, saved.map(el=>el.uid));
				if(filteredJobs.length===0){
					await wait(5 * 1000);
					// console.log('Waiting Job.....')
				}
			} while(filteredJobs.length === 0);
			clearInterval(interval);
  			process.stdout.clearLine();
  			process.stdout.cursorTo(0);
			const job = filteredJobs[0];
			console.log(USEGPT ? "GPT MODE" : "MANNUAL MODE")
			const result = await apply(agent, job, gpt, myconnects, MODE, USEGPT);
			await followUp(database, agent, email, job, result, MODE, USER);
			await agent.close();
		}
		
	}
	await database.close();
}
export default main;