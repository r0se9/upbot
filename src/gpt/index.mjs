// get answers for the question
import OpenAI from 'openai';
const DEFAULT_MESSAGE = 'Hello, client. I can do this perfectly because I have skills as well as experiences.'
export default class GPT{
	constructor(apiKey, model){
		const config = ({ apiKey });
		this.openai = new OpenAI(config)
		this.model = model;
		this.fnPrompt = e=>e;
	}
	setPrompt(fn){
		this.fnPrompt = fn;

	}
	setDefault(message){
		this.default = message;
	}
	setKnowledgeBase(data){
		this.base = data;
	}
	async prompt(prompt_text){
		try{
			const text = await this.openai.chat.completions.create({
				model: this.model,
            	messages: [
            		{ role: 'user', content: this.fnPrompt(prompt_text) }
            		],
            		stream: false,
				}
			)
			return text.choices[0].message.content;

		} catch(e){
			return DEFAULT_MESSAGE;
		}

	}
	getAnswer(question){
		return 'Sure, I can.'
	}
}