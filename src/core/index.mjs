import dotenv from 'dotenv'
import Browser from '../browser/index.mjs'
dotenv.config()
const upwork = new Browser('mail.dcc453cad274139@spamlessmail.org', 'P@ssw0rd123123');
await upwork.start();
const authInfo = await upwork.getAuth();
// await upwork.getJobs();
const jobinfo = await upwork.getJobDetail('1724651642678562816')

