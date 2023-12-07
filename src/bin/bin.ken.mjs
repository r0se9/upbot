//bin
import GPT from '../gpt/index.mjs';
import main from '../core/fastApply.mjs';
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
  .option('mode', {
    alias: 'm',
    description: 'Enter the bid mode',
    choices: ['speed', 'boost'],
    demandOption: true,
  })
  .help()
  .alias('help', 'h')
  .argv;

const USER = 'ken';
const MODE = argv.mode;
const DEBUG = (argv.debug && argv.debug === true) ? true : false;


const gpt = new GPT(process.env.OPENAI_KEY, process.env.GPT_MODEL);
gpt.setPrompt(e=>
	`
Input:
"
${e}
"
Instruction:
- Act like a freelancer Senior Developer specializing full-stack and AI development and data scraping.
- Write Complete, confident, vivid, humorous, informal social bid proposal with proper emoji  that demonstrates my expertise and passion to the project.
- The entire bid proposal must be animated with fresh humor.
- Keep this in mind: You are talking to me in person.
- Include all necessary details without using any placeholders such as "[]" or "X".
- Assume fictional but realistic details for the example.
You name is Ken Ikeda.
- Must start with friendly greeting message with "Hi"
- Explain why you are an expert in what I need.
- Ask to visit your website: https://kenikeda-fullstack.vercel.app/
- Make a technical recommendation or ask a question(Not copy job description) to make sure that you are right fit.
- You can talk about your similar but not exact experience in this field. follow this format: what were the previous client's requirements, what were the challenges, what was your method, how was the final result.
- Address all questions in the job posting. If it's difficult, you must ask to discuss that on a call.
- Close with a Call to Action to get them to reply. You are always available because you are a freelancer. The Sooner, the better. (not Friday) Ask them when they’re available to call or talk. Close by saying that I am waiting for a reply.
Your email is zuikeaideren1017@gmail.com and do not mention moblie number.
- Sign off with your name.
- Use good spacing; Limitation of 2 sentences per paragrah. and Total words must be limited in 150 words.

`);
gpt.setKnowledgeBase([
	]);
const database = new Database(process.env.MONBO_URI);
await database.connect();
await main(gpt, database, USER, MODE, DEBUG);