import axios from "axios";
import cheerio from "cheerio";

import {
  generateText,
  getHash,
  getRandomElement,
  retry,
  wait,
} from "../utils/lib.mjs";

export default class TenMail {
  constructor(email) {
    this.email = email;
    this.headers = {
      Accept: "application/json, text/javascript, */*; q=0.01",
      "Accept-Language": "en-US;q=0.7,en;q=0.3",
      "X-Requested-With": "XMLHttpRequest",
      Connection: "keep-alive",
      Referer: "https://www.minuteinbox.com/",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36",
    };
  }
  static async create() {
    const headers = {
      Accept: "application/json, text/javascript, */*; q=0.01",
      "Accept-Language": "en-US;q=0.7,en;q=0.3",
      "X-Requested-With": "XMLHttpRequest",
      Connection: "keep-alive",
      Referer: "https://www.minuteinbox.com/",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36",
    };
    const {
      data: { email },
    } = await axios.get("https://www.minuteinbox.com/index/index", { headers });
    const url = "https://www.minuteinbox.com/expirace/568523";
    const cookie = `MI=${email};`;
    await axios.get(url, { headers: { ...headers, Cookie: cookie } });

    return email;
  }
  async getMonth() {
    const cookie = `MI=${this.email};`;
    const response = await axios.get(
      "https://www.minuteinbox.com/index/zivot",
      { headers: { ...this.headers, Cookie: cookie } }
    );
    console.log(response.data);
  }
  async getInbox() {
    const cookie = `MI=${this.email};`;
    const { data } = await axios.get(
      "https://www.minuteinbox.com/index/refresh",
      { headers: { ...this.headers, Cookie: cookie } }
    );
    return (data || []).map((message) => {
      const id = getHash(
        `${this.email}:${message["id"]}:${message["predmet"]}`
      );
      return {
        id,
        email: this.email,
        subject: message["predmet"],
        from: message["od"],
        timestamp: message["kdy"],
        link: message["id"],
      };
    });
  }
  async getMessages() {
    try {
      const data = await this.getInbox();
      const messages = await Promise.all(
        data.map(async (message) => {
          const link = message["link"];
          const data = await this.getMessageContent(link);
          return {
            ...message,
            body: parseHtml(data),
          };
        })
      );
      return messages;
    } catch (error) {
      console.log("[ERR]", error.message);
    }
  }
  async verify() {
    let inboxes;
    let retry = 0;
    while (retry < 20) {
      const data = await this.getInbox();
      inboxes = data.filter((el) => {
        if (el["subject"].includes("Verify")) {
          return true;
        }
        return false;
      });
      if (inboxes.length > 0) break;
      retry++;
      console.log("[INFO] Retry..." + retry);
    }
    if (retry === 20) throw new Error("Maximum Retry Exceed");

    const last = inboxes[0];
    const message = await this.getMessageContent(last["link"]);
    const $ = cheerio.load(message);
    return $('a:contains("Verify Email")').attr("href");
  }
  async getMessageContent(id) {
    const cookie = `MI=${this.email};`;
    const response = await axios.get(
      `https://www.minuteinbox.com/email/id/${id}`,
      { headers: { ...this.headers, Cookie: cookie } }
    );
    return response.data;
  }
}
