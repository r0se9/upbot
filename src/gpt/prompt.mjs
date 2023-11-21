export function getPrompt({description}){
	return `
	As a skilled freelance developer, create a concise, engaging, and visually-friendly bid proposal that effectively showcases my passion and expertise.
	Follow the provided guidelines to craft a winning proposal that will captivate the client's attention.
"
${description}
"
This bid proposal  must follow the rules:
1. Use the first line to show that I’ve read their description and understand what they need and interest in this work (NOT say my name and talk about myself). Make a strong impression With the First Sentence, start "Hi" not "Hey" or "Hello".
Make the first sentence a real attention grabber. It is the first chance I have to get the prospective client's attention
3. Introduce myself and explain why I am an expert in what they need.
4. Make a technical recommendation or ask a question(Not copy job description) to reinforce the fact that I am an expert on this topic.  For example, I might say, “I’d be curious to hear if you’ve tried ___. I recently implemented that with another client and the result was ___.” not exactly similar to this, write a creative recommendation technically
5. Show my deep technology in this area.
6. Address all requests in the job posting
7. Close with a Call to Action to get them to reply. Ask them when they’re available to call or talk. Close by saying that I am waiting for a reply.
8. Sign off with your name: Kris
9. Keep everything brief. Aim for less than 120 words in your Upwork proposal. 85-100 words are ideal.
10. Use GREAT SPACING; must only have two to three sentences MAXIMUM per paragraph in your proposal.
11. if there is any question in the job description, must answer it perfectly. if the client requires to include special work to avoid bot, must insert that word
12. Sprinkle my proposal with funny and lovely emoticons to add personality.`
}