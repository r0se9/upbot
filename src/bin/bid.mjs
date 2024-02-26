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
  .option('force', {
    alias: 'f',
    description: 'Apply forcefully',
     type: 'boolean',
    default: false
  })
  .option('best', {
    description: 'Apply for the best matched jobs',
     type: 'boolean',
    default: false
  })
  .option('recent', {
    description: 'Apply for the most recent jobs',
     type: 'boolean',
    default: false
  })
  .option('search', {
    description: 'Advanced search to apply',
     type: 'boolean',
    default: false
  })
  .help()
  .alias('help', 'h')
  .argv;

const USER = 'ken'; // TODO
const MODE =  (argv.force && argv.force === true) ? true : false;
const DEBUG = (argv.debug && argv.debug === true) ? true : false;
const USEGPT = (argv.gpt && argv.gpt === true) ? true : false;
const USEPOE = (argv.poe && argv.poe === true) ? true : false;
const BIDMODE = {
  isBest : argv.best,
  isRecent: (!argv.best && !argv.search )? true :argv.recent,
  isSearch: argv.search
}
let gpt;
if(USEPOE){
  gpt = new Poe(8080);
  await gpt.connect();
} else {
  gpt = new GPT(process.env.OPENAI_KEY, process.env.GPT_MODEL);
}
// TO-DO
gpt.setPrompt(e=>
	`
Input:
"
${e}
"


`);
gpt.setKnowledgeBase([
	]);
const database = new Database(process.env.MONGODB_URI);
await database.connect();
await main(gpt, database, USER, MODE, DEBUG, USEGPT, BIDMODE);
if(USEPOE){
  await gpt.disconnect();
}