import dotenv from 'dotenv'
import Browser from '../browser/index.mjs'
dotenv.config()
const upwork = new Browser('mail.6ee07190db67dcc@pleasenospam.email', 'P@ssw0rd123123');
await upwork.start('https://www.upwork.com/nx/boost-profile');
const authInfo = await upwork.getAuth();
// await upwork.getJobs();
const jobinfo = await upwork.boost();
console.log(jobinfo);

