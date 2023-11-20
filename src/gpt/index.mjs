// get answers for the question
import { getPrompt } from './prompt.mjs';
import OpenAI from 'openai';
const DEFAULT_MESSAGE = 'Hello, client. I can do this perfectly because I have skills as well as experiences.'
export default class GPT{
	constructor(apiKey, model){
		const config = ({ apiKey });
		this.openai = new OpenAI(config)
		this.model = model;
	}
	async prompt(prompt_text){
		try{
			const text = await this.openai.chat.completions.create({
				model: this.model,
            	messages: [
            		{ role: 'user', content: prompt_text }
            		],
            		stream: false,
				}
			)
			return text.choices[0].message.content;

		} catch(e){
			console.log(e.message)
			return DEFAULT_MESSAGE;
		}

	}
	async getAnswer(question){
		return 'Sure, I can.'
	}
}