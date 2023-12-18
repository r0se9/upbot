// get answers for the question
import Browser from '../browser/index.mjs';
const DEFAULT_MESSAGE = 'Hello, client. I can do this perfectly because I have skills as well as experiences.'
export default class Poe{
	constructor(port){
		this.fnPrompt = e=>e;
		this.port = port;

	}
	async connect(){
		this.browser = new Browser();
		await this.browser.connectRemote(this.port);
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
			const template = this.fnPrompt(prompt_text);
			const input_textarea_selector = 'textarea[placeholder^="Talk to"]';
    		const send_btn_selector = 'footer>div>div>button:last-child';
    		const page = await this.browser.getPage(0)
    		const input = await page.$(input_textarea_selector);

    		await page.evaluate((selector, text)=>{
    			const inp = document.querySelector(selector);
    			inp.value = text;
    		}, input_textarea_selector, template)
    		// await input.click({ clickCount: 3 }); // Select all the existing text
    		// await page.keyboard.press('Backspace'); // Clear the textarea
    		await page.keyboard.down('Shift');
     			await page.keyboard.press('Enter'); // Line break without submitting
      			await page.keyboard.up('Shift');
    		

    		console.log("[Info]: Bid Template Sent!");

    		// Click the send button
    		await page.click(send_btn_selector);
    
    		console.log("[Info]: Send Button Clicked!");

    		// Wait until the send button is not disabled (i.e., ready to be clicked again)
    		await page.waitForSelector('footer>div>div>button:not([disabled]):last-child', {timeout: 200000});

    		console.log('[Info]: Waiting button enabled');

    		// Run JavaScript inside page context to grab the bid_div contents
    		const cover_letter = await page.evaluate(() => {
      			const bid_divs = document.querySelectorAll('div[class^="Markdown_markdownContainer"]');
      			return bid_divs[bid_divs.length -1].textContent;
    		});

    		if (cover_letter === "You are sending and receiving too many words in a short period of time.") {
      			const clear_btn_selector = 'button.Button_buttonBase__0QP_m.Button_flat__1hj0f.ChatBreakButton_button__EihE0.ChatMessageInputFooter_chatBreakButton__hqJ3v';
      			await page.click(clear_btn_selector);
     			// Here you would call your `getting_from_gpt` function which is not included
      			// getting_from_gpt(job_description, type_, getPrompt);
    		} else {
      			return cover_letter;
    		}

		} catch(e){
			console.log(e)
			return DEFAULT_MESSAGE;
		}

	}
	getAnswer(question){
		return 'Sure, I can.'
	}
	async close(){
		await this.browser.disconnect();
	}
}