import dotenv from 'dotenv'
import Browser from '../browser/index.mjs'
dotenv.config()
const upwork = new Browser();

await upwork.login({user: 'w04242d78758364eef9c7d7dc@meldedigital.com', password:'P@ssw0rd123123'})
const authInfo = await upwork.getAuth();
// await upwork.getJobs();
const res = await upwork.closeAccount();
console.log(res)

