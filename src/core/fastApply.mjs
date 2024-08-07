// Fast Apply
import chalk from 'chalk';
import moment from 'moment-timezone';
import Browser from '../browser/index.mjs';
import { getPrompt } from '../gpt/prompt.config.mjs';
import _ from 'lodash';
import { wait } from '../utils/time.mjs';






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
	await upwork.login({ user, password: process.env.PASSWORD});
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
	const result = _.map(results[1], (item)=>{
		return _.merge({}, item, _.find(results[0], ['uid', item.uid]))
	})
	
	const jobs = result.map(el=>{
		const publishedOn = moment(el.renewedOn ? el.renewedOn : el.publishedOn).tz('UTC');
	const result = {uid: el.uid,  client: el.client, title: el.title, description: el.description,  postedAt: publishedOn.toDate(), link: `https://www.upwork.com/ab/proposals/job/${el.ciphertext}/apply/` };
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
async function apply(agent, job, gpt, MODE){
	const start = moment();
	const [coverLetter, {engagementDuration, questions }] = await Promise.all([
		(async ()=>{
					const start = moment();
					const result = await gpt.prompt(getPrompt(job.description));
					console.log(chalk.green(`GPT is created in ${moment().diff(start)/1000}s`));
					console.log('======= GPT ====');
					console.log(result);
					console.log('================');
					return result;
				})(),
		(async ()=>{
			await agent.navigate(job.link, { waitUntil: "networkidle0" });
			await agent.getAuth();
			const result = await agent.getJobOpening(job.uid);
			return {engagementDuration: result.opening.job.engagementDuration, questions: result.questions.questions};
		})()
		]);
	const result = await agent.applyJob(job.uid, {
			connects: (MODE === 'speed') ? 50: 30,
			link: job.link,
			coverLetter,
			questions: questions.map(el=>({...el, answer: gpt.getAnswer(el.question)})),
			amount: job.isFixed ? job.budget: (process.env.HOURLY_RATE || 30),
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
		await Promise.all([
			database.create('applied', {uid: job.uid, name: USER, mode: MODE, status: 'success', appliedAt: now.toDate(), postedAt: postedAt.toDate() }), 
			database.update('accounts', { email: email },{ '$set': { status: 'applied'}})
			]);
	} else {
		console.log(chalk.red('============ Application Failed ==========='));
		
		if(result && result.data && result.data.error && result.data.error.message_key === 'jpb_Opening_DefaultForbidden_ErrorMessage'){
			// In this case, job is transferred to private, you cannot bid to that.....
			const opening = await agent.getJobOpening(job.uid)
			if(opening.flSuspended){
				console.log(chalk.red('>>>> Account is restricted'));
				console.log(`delete account with ${email}`)
				await database.delete('accounts', { email: email })
			}else if(opening.opening.job.info.isPtcPrivate){
				console.log(chalk.red('>>>> Job is private only'))
				await database.create('applied', {uid: job.uid, status: 'private'});
			}
			
		} else if(result && result.data && result.data.error && result.data.error.message_key === 'jpb_ThisJobIsNoLongerAvailable'){

			console.log(chalk.red('>>>> Job is no longer Available.'));
			await database.create('applied', {uid: job.uid, status: 'no longer avaialble'});

		} else if(result && result.data && result.data.error && result.data.error.message_key === 'jpb_codeExtended_VJF_JA_2'){

			console.log(chalk.red('>>>> Job is no longer Available.'));
			await database.create('applied', {uid: job.uid, status: 'no longer avaialble'});

		} else if(result && result.data && result.data.error && result.data.error.message_key === 'jpb_codeExtended_VJF_CONN_1'){

			console.log(chalk.red('>>>> Insufficient connects....'));
			database.update('accounts', { email: email }, { '$set': { status: 'applied'}})

		} else if(result && result.data && result.data.error && result.data.error.message_key === 'jpb_Opening_DefaultServerError_ErrorMessage'){
			
				console.log(chalk.red('Server is temporarily down. Try again in a while.'))
				await database.delete('accounts', { email: email })
		}
		 else{
			console.log(result.data);
			await wait(1* 1000);	
		}
		
	}
}


async function checkRestrict(agent){
	const result = await agent.getMe();
	const restResult = await agent.isRestricted(result.personUid);
	return restResult.data.data.developerSuspended.suspendedStatus


}
async function main(gpt, database, USER, MODE, DEBUG){
	while(true){
		let accounts = await database.get('accounts', { status: 'active', botName: process.env.BOT, name: USER });
		if(accounts.length === 0){
			console.log(chalk.red('There is no account.'))
			break;
		}
		const { email } = accounts[0];
		console.log(chalk.green(`Start with ${email}`));
		const agent = await createAgent(email, DEBUG);
		const isRestricted = await checkRestrict(agent);
		if(isRestricted){
			console.log(chalk.red('This has been restricted.'))
			await database.delete('accounts', { email });
			await agent.close();
			continue;
		}
		let filteredJobs = [];
		do {
			const jobs = await getJobs(agent);
			const saved = await database.get('applied', {uid: {'$in':jobs.map(el=>el.uid)}});
			filteredJobs = filterJobs(jobs, saved.map(el=>el.uid));
			if(filteredJobs.length===0){
				await wait(5 * 1000);
				console.log('Waiting Job.....')
			}
		} while(filteredJobs.length === 0);

		const job = filteredJobs[0];
		const result = await apply(agent, job, gpt, MODE);
		await followUp(database, agent, email, job, result, MODE, USER);
		await agent.close();
	}
	await database.close();
}
export default main;