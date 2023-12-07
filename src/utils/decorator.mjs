import chalk from 'chalk';
import moment from 'moment-timezone';
export function decorate(){
  console.log(`
         █    ██  ██▓███   █     █░ ▒█████   ██▀███   ██ ▄█▀
         ██  ▓██▒▓██░  ██▒▓█░ █ ░█░▒██▒  ██▒▓██ ▒ ██▒ ██▄█▒ 
        ▓██  ▒██░▓██░ ██▓▒▒█░ █ ░█ ▒██░  ██▒▓██ ░▄█ ▒▓███▄░ 
        ▓▓█  ░██░▒██▄█▓▒ ▒░█░ █ ░█ ▒██   ██░▒██▀▀█▄  ▓██ █▄ 
        ▒▒█████▓ ▒██▒ ░  ░░░██▒██▓ ░ ████▓▒░░██▓ ▒██▒▒██▒ █▄
        ░▒▓▒ ▒ ▒ ▒▓▒░ ░  ░░ ▓░▒ ▒  ░ ▒░▒░▒░ ░ ▒▓ ░▒▓░▒ ▒▒ ▓▒
        ░░▒░ ░ ░ ░▒ ░       ▒ ░ ░    ░ ▒ ▒░   ░▒ ░ ▒░░ ░▒ ▒░
         ░░░ ░ ░ ░░         ░   ░  ░ ░ ░ ▒    ░░   ░ ░ ░░ ░ 
           ░                  ░        ░ ░     ░     ░  ░   
                                                    `)
}

const frames = ['█     ', '██    ', '███   ', '████  ', '█████ ', '██████']; // These characters simulate rotation

// Function to update the rotating icon and time
export function updateProgress(text, startTime,  i) {
  const frame = frames[i % frames.length];
  const endTime = moment();
  const duration = moment.duration(endTime.diff(startTime));

  const hours = duration.hours().toString().padStart(2, '0');
  const minutes = duration.minutes().toString().padStart(2, '0');
  const seconds = duration.seconds().toString().padStart(2, '0');
  const elapsedFormatted = `${hours}:${minutes}:${seconds}` // Format as HH:MM:SS

  process.stdout.clearLine();  // Clear the current text
  process.stdout.cursorTo(0); // Move cursor to start of line
  process.stdout.write(`${text} ${frame} Elapsed: ${elapsedFormatted}`);
}