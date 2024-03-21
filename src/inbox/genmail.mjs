import axios from "axios";
import cheerio from "cheerio";

import {
  generateText,
  getHash,
  getRandomElement,
  retry,
  wait,
} from "../utils/lib.mjs";
export default class GeneratorMail {
  baseUrl = "https://generator.email";

  constructor(email) {
    this.email = email;
  }
  static create() {
    const name = "w";
    const domains = process.env.GENDOMAINS.split(',');
    return generateText(name) + "@" + getRandomElement(domains);
  }
  async getInbox() {
    const url = "https://generator.email/inbox/";
    const emailParts = this.email.split("@");
    const prefix = emailParts[0];
    const suffix = emailParts[1];
    const headers = {
      authority: "generator.email",
      method: "GET",
      path: "/inbox9/",
      scheme: "https",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "Accept-Encoding": "gzip, deflate, br",
      "Accept-Language": "en-US,en;q=0.9",
      "Cache-Control": "max-age=0",
      Cookie: `_ga=GA1.1.1792958436.1694916301; soundnotification=on; slds=on; embx=%5B%22${prefix}%40${suffix}%22%2C%22ronbombbomb%40${suffix}%22%2C%22ronbombb.omb%40${suffix}%22%2C%22ronbombdsffdsbomb%40${suffix}%22%2C%22bhert123%40discretevtd.com%22%5D; _ga_1GPPTBHNKN=GS1.1.1695097465.5.1.1695097877.48.0.0; surl=${suffix}/${prefix}`,
      "Sec-Ch-Ua":
        '"Chromium";v="116", "Not)A;Brand";v="24", "Google Chrome";v="116"',
      "Sec-Ch-Ua-Mobile": "?0",
      "Sec-Ch-Ua-Platform": '"Windows"',
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "same-origin",
      "Sec-Fetch-User": "?1",
      "Upgrade-Insecure-Requests": "1",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36",
    };

    let response;
    try {
      response = await axios.get(url, { headers });

      if (response.status === 200) {
        return response.data;
      } else {
        return undefined;
      }
    } catch (error) {
      return undefined;
    }
  }
  async verify(TEMP=20) {
    let href;
    let temp = 0;
    while (true) {
      let htmlContent;
      try {
        htmlContent = await this.getInbox();
      } catch (error) {
        console.error("Failed to fetch inbox:", error);
        continue;
      }

      const $ = cheerio.load(htmlContent);

      const verifyEmailLink = $("a:contains('Verify')");

      const elements = $("#email-table .list-group-item div.time_div_45g45gg");

      elements.each((i, element) => {
        const lastCheckedAt = $(element).text();
        console.log(lastCheckedAt);
      });

      if (verifyEmailLink.length > 0) {
        href = verifyEmailLink.attr("href");
        return href;
      } else {
        temp += 1;
        if (temp >= TEMP) {
          console.log("Limit");
          throw new Error("Verfication Limit reached.");
        }
        console.log("Verify Email link not found");
      }
      await wait(1000);
    }
  }
  static async getDetail(link) {
    try {
      const chunks = link.split("/");

      const headers = {
        authority: "generator.email",
        method: "GET",
        path: "/inbox2/",
        scheme: "https",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "Accept-Encoding": "gzip, deflate, br",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "max-age=0",
        Cookie: `embx=%5B%22${
          chunks[4]
        }%40${3}%22%5D; _gid=GA1.2.2016425913.1696519846; _ga=GA1.1.1747404333.1696519846; _ga_1GPPTBHNKN=GS1.1.1696519846.1.1.1696520136.60.0.0; surl=${
          chunks[3]
        }%2F${chunks[4]}%2F${chunks[5]}`,
        "Sec-Ch-Ua":
          '"Chromium";v="116", "Not)A;Brand";v="24", "Google Chrome";v="116"',
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Platform": '"Windows"',
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "same-origin",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36",
      };

      const body = await axios.get(link, { headers });

      const $ = cheerio.load(body.data);
      return $("#message").parent().find("table").html();
    } catch (e) {
      console.log("[ERR] Network too many requests");
      return link;
    }
  }
  async getMessages() {
    try {
      const messages = [];
      const body = await retry(
        (e) => e !== undefined,
        () => this.getInbox(),
        500,
        process.env.MAX_RETRY
      );
      // console.log(body)
      const $ = cheerio.load(body);
      const mails = $("#email-table .list-group-item"); // finding that has issues
      for (const mail of mails) {
        const fromEmail = $(mail).find("div.from_div_45g45gg").text();
        if (fromEmail === "") continue;
        const subject = $(mail).find("div.subj_div_45g45gg").text();
        const timestamp = $(mail).find("div.time_div_45g45gg").text();
        const link = $(mail).attr("href");

        const id = getHash(this.email + ":" + subject + ":" + timestamp);
        
          messages.push({
            id,
            fromEmail,
            subject,
            timestamp,
            link: this.baseUrl + link,
          });
      }
      return messages;
    } catch (e) {
      console.log(e)
      console.error("[ERR] Timeout");
      return [];
    }
  }
}
