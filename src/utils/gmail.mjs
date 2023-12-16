import { google } from "googleapis";
import fs from "fs";
class GMail {
  constructor(token) {
    const auth = google.auth.fromJSON(token);
    this.gmail = google.gmail({ version: "v1", auth });
  }

  // Method to create raw email string
  async searchEmail({ query }) {
    const res = await this.gmail.users.messages.list({
      userId: "me",
      q: query,
    });
    return res.data;
  }
  async getEmail(id) {
    const res = await this.gmail.users.messages.get({
      userId: "me",
      id: id,
      format: "full",
    });
    return res.data;
  }
  createEmail(to, from, subject, message, messageId = false, reference) {
    let str = [
      'Content-Type: text/html; charset="UTF-8"\n',
      "MIME-Version: 1.0\n",
      "Content-Transfer-Encoding: 7bit\n",
      "to: ",
      to,
      "\n",
      "from: ",
      from,
      "\n",
      "subject: ",
      subject,
      "\n\n",
      message,
    ];
    if (messageId) {
      str = [
        "In-Reply-To: " + messageId + "\n",
        "References: " + reference + "\n",
        ...str,
      ];
    }
    return Buffer.from(str.join(""))
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
  }

  // Send mail method
  async sendMail({ to, from, subject, message }) {
    // const auth = await this.Authenticate();
    const data = await this.searchEmail({ subject });
    let resource;

    if (data.resultSizeEstimate) {
      const { threadId, id } = data.messages[0];
      const res = await this.gmail.users.messages.get({
        userId: "me",
        id, // change this to your message's id
        format: "full", // full format to get all parts of the message
      });
      const headers = res.data.payload.headers;
      let messageId;
      let reference;
      headers.forEach((header) => {
        if (header.name === "Message-Id") {
          messageId = header.value;
        }
        if (header.name === "References") {
          reference = header.value;
        }
      });
      if (reference) {
        reference = reference + " " + messageId;
      } else {
        reference = messageId;
      }
      const raw = this.createEmail(
        to,
        from,
        subject,
        message,
        messageId,
        reference
      );
      resource = {
        raw,
        threadId,
      };
    } else {
      const raw = this.createEmail(to, from, subject, message);
      resource = {
        raw,
      };
    }
    try {
      const res = await this.gmail.users.messages.send({
        userId: "me",
        resource,
      });
      return true;
      console.log("Message Sent");
    } catch (e) {
      console.error(e);
      return false;
    }
  }
}

export default GMail;
