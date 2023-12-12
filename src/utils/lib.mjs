import crypto from "crypto";
import cheerio from "cheerio";
import fs from 'fs';

export function parseHtml(input) {
  const $ = cheerio.load(input);
  return $("body").html();
}
export function generateText(feed, MAX_LEN = 25) {
  const prefix = feed;
  let maxLength = MAX_LEN - prefix.length;

  // Generate random suffix
  let suffix = crypto
    .randomBytes(maxLength)
    .toString("hex")
    .substring(0, maxLength);

  // Combine prefix and suffix
  let text = prefix + suffix;

  return text.toLowerCase();
}
export function getRandomElement(array) {
  var randomIndex = Math.floor(Math.random() * array.length);
  return array[randomIndex];
}
export function getTimeDiff(time) {
  let givenTime = `${time.split(" ")[0]}T${time.split(" ")[1]}Z`; // replace this with your timestamp. The 'T' and 'Z' are required for this format.

  let date1 = new Date(givenTime);
  let date2 = new Date(); // current date and time

  let diffInSeconds = Math.abs(date2 - date1) / 1000;
  let minutes = Math.floor(diffInSeconds / 60);
  let hours = Math.floor(minutes / 60);
  minutes -= hours * 60;
  let seconds = Math.floor(diffInSeconds % 60);

  return (
    (hours ? `${hours} hours ` : "") +
    minutes +
    " minutes and " +
    seconds +
    " seconds."
  );
}

export function wait(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}
export function promisify(fn) {
  return new Promise((resolve, reject) => {
    fn()
      .then((e) => resolve(e))
      .catch((e) => reject(e));
  });
}
export function getHash(str) {
  const hash = crypto.createHash("md5"); // you can choose other hash algorithms like 'sha1', 'sha256', etc.
  hash.update(str);
  return hash.digest("hex");
}

export async function retry(validator, callback, timeout, maximumTry) {
  let tries = 0;
  while (maximumTry > tries) {
    const result = await callback();
    if (validator(result)) return result;
    else {
      console.log(`Let's retry: ${tries + 1}`);
      await wait(timeout);
      tries++;
    }
  }

  throw new Error("Maximum Retry Timeout");
}
// Function to convert image to base64
export const imageToBase64 = (filePath) => new Promise((resolve, reject) => {
  // Read the file into a buffer
  fs.readFile(filePath, (err, data) => {
    if (err) {
      reject(err);
      return;
    }
    // Convert the buffer to a base64 string
    const base64Image = data.toString('base64');
    resolve(base64Image);
  });
});