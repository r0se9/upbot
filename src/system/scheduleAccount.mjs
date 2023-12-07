import cron from 'node-cron';
import { exec } from 'child_process';

// Schedule the task to run every 2 hours
cron.schedule('0 */1 * * *', function() {
  console.log('Running the task every 1 hours');
  exec('cd /d C:\\Users\\Administrator\\Documents\\upbot && node src\\core\\account.mjs -m=nospammail -n=15 -f=kane', (error, stdout, stderr) => {
    if (error) {
      console.error(`exec error: ${error}`);
      return;
    }
    console.log(`stdout: ${stdout}`);
    console.error(`stderr: ${stderr}`);
  });
});

// The cron pattern is as follows:
// '0 */2 * * *' means "at minute 0 past every 2nd hour."
