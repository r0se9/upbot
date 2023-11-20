// available check
import dotenv from 'dotenv'
import Browser from '../browser/index.mjs'
import Database from '../db/mongodb.mjs'
dotenv.config()
const upwork = new Browser('w7b6931a7a712b9196daabe6c@machaimichaelenterprise.com', 'P@ssw0rd123123');
const database = new Database(process.env.MONBO_URI)
await database.connect();
await upwork.start();
const authInfo = await upwork.getAuth();
async function getJobs(){
	const jobs = await database.get('jobs', { idvRequiredByOpening: false});
	return jobs;
}

const pendingJobs = await getJobs();

if(pendingJobs.length){
	console.log(pendingJobs[0]);
	const data = await upwork.checkJob(pendingJobs[0]);
	console.log(data)
}
