//bin
import GPT from '../gpt/index.mjs';
import main from '../core/safeApply.mjs';
import Poe from '../gpt/poe.mjs';
import Database from '../db/mongodb.mjs';
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';
import dotenv from 'dotenv';
import { decorate } from '../utils/decorator.mjs';
dotenv.config()
decorate();
const argv = yargs(hideBin(process.argv))
.option('debug', {
    alias: 'd',
    description: 'Run this code in debug mode',
    type: 'boolean',
    default: false
  })
  .option('gpt', {
    alias: 'g',
    description: 'Use Gpt ',
    type: 'boolean',
    default: false
  })
  .option('poe', {
    alias: 'p',
    description: 'Use Poe ',
    type: 'boolean',
    default: false
  })
  .option('mode', {
    alias: 'm',
    description: 'Enter the bid mode',
    choices: ['speed', 'boost'],
    demandOption: true,
  })
  .help()
  .alias('help', 'h')
  .argv;

const USER = 'ai_us'; // TODO
const MODE = argv.mode;
const DEBUG = (argv.debug && argv.debug === true) ? true : false;
const USEGPT = (argv.gpt && argv.gpt === true) ? true : false;
const USEPOE = (argv.poe && argv.poe === true) ? true : false;
let gpt;
if(USEPOE){
  gpt = new Poe(8080);
  await gpt.connect();
} else {
  gpt = new GPT(process.env.OPENAI_KEY, process.env.GPT_MODEL);
}
gpt.setDefault(
  `
Greetings,

I noticed you have an open job posting on Upwork for an AI-powered full-stack developer. Based on my portfolio at https://my-personalsite.web.app/, I believe I am an excellent match for this role. 

As you can see from my site, I have over 6 years of experience in web development with proficiency in frontend frameworks like React and Vue, as well as backend technologies like Node.js, Express, and Django. I specialize in AI integration, having worked on 4 past projects utilizing machine learning, NLP, computer vision and more. My focus is at the intersection of AI and web technologies.

In addition to programming skills, I pride myself on effective communication and quality client relations. Previous clients have praised my responsiveness, attention to detail, and ability to deliver projects on schedule and on budget. I am versatile and able to work on any part of the development process from design to deployment.

My portfolio highlights a variety of full-stack projects that demonstrate the full scope of my abilities. From simple websites to complex blockchain dapps and AI products, I have proven experience delivering solutions for real clients across industries.

I would welcome the opportunity to discuss your needs and requirements in more detail. You can reach me via email or any of the contact methods listed on my site. I'm confident that with my skills and experience, I can help your business thrive through innovative AI-driven web applications. Please let me know if you would like me to send along some references as well. I look forward to hearing from you!

Regards,

Kurai (kurainakamura047@gmail.com)
AI-Powered Full-Stack Developer.
`
  )
// TO-DO
gpt.setPrompt(e=>
	`
Humor is important!!!!!!! The proposal should capture the customer's attention with unique humor. Humor is nesscessary thing, Don't miss it! The entire bid proposal must be animated with fresh humor. Create a visually appealing bid proposal that showcases your passion and expertise as a skilled freelance developer. Start with a friendly "Hi" in the first sentence, followed by demonstrating your understanding of the client's specific needs, such as their desired features, technology stack, or project timeline. . Introduce yourself as an expert in their required field and share a brief anecdote or personal story that relates to your expertise or passion as a developer. Sprinkle 5-6 emoticons throughout each paragraph to add personality. Highlight relevant achievements, such as specific projects you've completed or awards you've received. Offer a unique value proposition or mention a specific benefit the client will gain by choosing you as their developer, such as your ability to deliver high-quality, custom solutions tailored to their needs. Address all the client's requests, emphasizing your deep knowledge in the area. Close with a Call to Action, expressing eagerness for a reply and asking when they're available to chat. Sign off with your name: Chris . Keep the proposal brief, aiming for less than 120 words with great spacing and no more than two to three sentences per paragraph. "${e}"
`);
gpt.setKnowledgeBase([
	]);
const database = new Database(process.env.MONGODB_URI);
await database.connect();
await main(gpt, database, USER, MODE, DEBUG, USEGPT);
if(USEPOE){
  await gpt.disconnect();
}