import chalk from 'chalk';
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

const frames = ['◐', '◓', '◑', '◒']; // These characters simulate rotation

// Function to update the rotating icon and time
export function updateProgress(text, i) {
  const frame = frames[i % frames.length];
  const elapsed = process.uptime(); // Node.js process uptime in seconds
  const elapsedFormatted = new Date(elapsed * 1000).toISOString().substr(11, 8); // Format as HH:MM:SS

  process.stdout.clearLine();  // Clear the current text
  process.stdout.cursorTo(0); // Move cursor to start of line
  process.stdout.write(`${text} ${frame} Elapsed: ${elapsedFormatted}`);
}