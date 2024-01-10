
import dotenv from "dotenv";
// import path from 'path'
import fs from "fs";
import { retry } from "../utils/lib.mjs";
// import { fileURLToPath } from 'url';
import Database from "../db/mongodb.mjs";
import GeneratorMail from "../inbox/genmail.mjs";
import GMail from "../utils/gmail.mjs";
import { getTimeDiff } from "../utils/lib.mjs";



export class Mail{
  constructor(db, type, status=['applied','opened']){
      this.type = type;
      this.db = db;
      this.status = status;
  }
  async getAll(){
      const docs = await this.db.get('accounts', { status: {'$in':this.status}, type: this.type, isActive: {'$ne': false }});      
      return docs;
  }
  async saveNotification(id){
      const docs = await this.db.create('notifications', { id });
      return docs;
  }
  async isNewNotification (id){
      const docs = await this.db.get('notifications', { id });
      return docs;
  }

}


async function filterInbox(factory) {
  const messages = await factory.getMessages();
  // console.log(1, messages);
  return messages.filter((e) => {
    const subject = e["subject"];
    if (!subject) return false;
    if (subject.includes("Action required")) return true;
    if (subject.includes("You have unread")) return true;
    if (subject.includes("You have unread messages about the job")) return true;
    if (subject.includes("Offer:")) return true;
    if (subject.includes("Invitation")) return true;
    if (subject.includes("You received a direct")) return true;
    return false;
  });
}
async function getMessages(email) {
  const mail = new GeneratorMail(email);
  const messages = await filterInbox(mail);
  return messages;
}

async function checkEmail(email, callback, mail) {
  const messages = await getMessages(email);
  await Promise.all(
    messages.map(async (message) => {
      const isExist = await mail.isNewNotification(message.id);
      if (isExist.length === 0) {
        console.log(
          "============ New Message " + email + " ==================="
        );
        
        let detail;
        try {
          detail = await retry(
            (e) => e !== message.link,
            () => GeneratorMail.getDetail(message.link),
            500,
            process.env.MAX_RETRY
          );
        } catch (e) {
          detail = message.link;
        }
        const subject = message.subject + " " + email;
        await callback({
          to: process.env.EMAIL_NOTIFICATION,
          from: email,
          subject,
          message: `<html>
						<body>
						<div style="background-color:green; color: aliceblue;">
						👋New message From 
            <a href="mailto:${email}">${email}</a>
						<p>${getTimeDiff(message.timestamp)}</p>
					
					  </div>
            <div style="width: 100%; display: flex; justify-content: space-evenly;">
					  ${detail}
            </div>
					  </body>
					  </html>`,
        });
        await mail.saveNotification(message.id);
      }
    })
  );
}

export default async () => {
  const db = new Database(process.env.MONGODB_URI);
  await db.connect();
  console.log("[INFO] Database Connected.");
  const fakeMail = new Mail(db, "genmail");
  const token = fs.readFileSync("./static/credentials/token.json");
  const gmail = new GMail(JSON.parse(token.toString()));
  let interval;
  let isRunning = false;

  const iterate = async () => {
    console.log("[INFO] Start New Iteration");
    isRunning = true;
    const emails = (await fakeMail.getAll()).map(el=>el.email);
    console.log(
      `=============== Total Accounts: ${emails.length} ==============`
    );
    const results = [];
    const chunkNum = process.env.CHECKNUM * 1 || 100
    for (let i = 0; i < emails.length; i += chunkNum) {
      const chunk = emails.slice(i, i + chunkNum);
      results.push(chunk);
    }
    

    for (let index in results) {
      console.log(index)
      await Promise.all(
        results[index].map(async (email) => {
          await checkEmail(email, (e) => gmail.sendMail(e), fakeMail);
        })
      );
    }
    isRunning = false;
    console.log("[INFO] Finish Iteration");
  };

  await iterate();

  interval = setInterval(async () => {
    if (!isRunning) {
      await iterate();
    }
  }, process.env.TIMEOUT * 1000);
  process.once("SIGINT", () => {
    clearInterval(interval);
    db.close();
  });
  process.once("SIGTERM", () => {
    clearInterval(interval);
    db.close();
  });
};
