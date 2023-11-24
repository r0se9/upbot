import cheerio from "cheerio";
import { parseHtml, retry, generateText, getRandomElement } from "../utils/lib.mjs";
import axios from "axios";

export default class NoSpamMail {
  static domains = ["spamlessmail.org", "pleasenospam.email"];
  baseUrl = "https://pleasenospam.email/";
  constructor(email) {
    this.email = email;
  }
  static create() {
    return generateText("mail.", 20) + "@" + getRandomElement(this.domains);
  }
  async getInbox() {
    try {
      const options = {
        method: "get",
        url: this.baseUrl + this.email + ".json",
      };
      const res = await axios.request(options);
      return res.data.map((el) => ({
        id: el.id,
        subject: el.subject,
        body: parseHtml(el.html),
        timestamp: el.sentDate,
      }));
    } catch (e) {
      console.log(
        "[ERROR] Error has occurred while get inbox from nospam mail...."
      );
      return [];
    }
  }
  async verify() {
    const result = await retry(
      (e) => e.length !== 0,
      async () => {
        const inbox = await this.getInbox();
        return inbox.filter((el) => el.subject == "Verify your email address");
      },
      1000,
      20
    );
    const $ = cheerio.load(result[0].body);
    return $('a:contains("Verify Email")').attr("href");
  }
}
