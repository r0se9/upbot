import { generateText } from "../utils/lib.mjs";
import fs from "fs";
import GMail from "../gmail.js";
// import moment from "moment-timezone";cs
export default class Gmail {
  constructor(email) {
    this.email = email;
    const token = fs.readFileSync("./static/credentials/token.json");
    this.gmail = new GMail(JSON.parse(token.toString()));
  }
  static create(base) {
    return (
      base.split("@")[0] +
      "+" +
      generateText("gmail") +
      "@" +
      base.split("@")[1]
    );
  }
  async verify() {
    let ids;
    do {
      ids = await this.gmail.searchEmail({
        query: `to:${this.email} Subject: Verify your `,
      });
    } while (ids.resultSizeEstimate === 0);

    const message = await this.gmail.getEmail(ids.messages[0].id);
    const decoded = Buffer.from(
      message.payload.parts[0].body.data,
      "base64"
    ).toString("utf-8");

    const regex = /Verify Email: (\S+)/;

    // Search for matches in the content
    const match = decoded.match(regex);
    return match[1];
  }
}
