require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHANNEL_ID = "-1003974352666";
const PORT = process.env.PORT || 3000;

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// ============================================================
// 🎯 TIME SCHEDULE - 12:50 AM se 2:00 AM Tak + 5:00 AM se
// ============================================================

let TIME_SCHEDULE = {
  startHour: 0,    // 12:50 AM
  startMinute: 50,
  endHour: 2,      // 2:00 AM
  endMinute: 0,
  enabled: true
};

// ============================================================

// 🔥 BOT 1 SETTINGS (JO /test SE CHALTA HAI)
const BOT1 = {
  running: false,
  timer: null,
  userLastUsed: {},
  messageCount: 0,
  messageCount2: 0,
  firstMsg: true,
  secondMsg: true,
  messagesPerMinute: 1,

  // 👇 AMOUNT SETTINGS
  firstAmount: "0.1",
  secondAmount: "5",

  // 👇 TIME SETTINGS
  runTimeGapMin: 60,    // Run Time Minimum Gap (seconds)
  runTimeGapMax: 120,   // Run Time Maximum Gap (seconds)
  secondMsgDelayMin: 60, // Second Message Minimum Delay (seconds)
  secondMsgDelayMax: 90, // Second Message Maximum Delay (seconds)

  // 👇 USER ID REPEAT SETTINGS
  repeatTimeMin: 300,   // Minimum Repeat Time (seconds) = 5 Minutes
  repeatTimeMax: 360    // Maximum Repeat Time (seconds) = 6 Minutes
};

// 🔥 BOT 2 SETTINGS (JO /test 2 SE CHALTA HAI)
const BOT2 = {
  running: false,
  timer: null,
  userLastUsed: {},
  messageCount: 0,
  messageCount2: 0,
  firstMsg: true,
  secondMsg: true,
  messagesPerMinute: 50,

  // 👇 AMOUNT SETTINGS
  firstAmount: "0.1",
  secondAmount: "5",

  // 👇 TIME SETTINGS
  runTimeGapMin: 60,
  runTimeGapMax: 120,
  secondMsgDelayMin: 60,
  secondMsgDelayMax: 90,

  // 👇 USER ID REPEAT SETTINGS
  repeatTimeMin: 300,
  repeatTimeMax: 360
};

// ============================================================

// ✅ CHECK KARO KE TIME SCHEDULE KE ANDAR HAI? (INDIAN TIME)
function isTimeAllowed() {
  if (!TIME_SCHEDULE.enabled) return true;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = TIME_SCHEDULE.startHour * 60 + TIME_SCHEDULE.startMinute;
  const endMinutes = TIME_SCHEDULE.endHour * 60 + TIME_SCHEDULE.endMinute;

  // ✅ Multiple Schedules Support: 12:50 AM - 2:00 AM, 5:00 AM - 12:00 AM
  const schedule1Start = 0 * 60 + 50;   // 12:50 AM = 00:50
  const schedule1End = 2 * 60 + 0;      // 2:00 AM = 02:00
  const schedule2Start = 5 * 60 + 0;    // 5:00 AM = 05:00
  const schedule2End = 24 * 60 + 0;     // 12:00 AM = 24:00

  // ✅ Check if current time is in any allowed schedule
  const inSchedule1 = currentMinutes >= schedule1Start && currentMinutes < schedule1End;
  const inSchedule2 = currentMinutes >= schedule2Start && currentMinutes < schedule2End;

  return inSchedule1 || inSchedule2;
}

// ✅ INDIAN TIME FORMATTER
function getIndianTime(date) {
  const d = date || new Date();
  const options = {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  };
  const formatter = new Intl.DateTimeFormat('en-IN', options);
  const parts = formatter.formatToParts(d);
  let day, month, year, hour, minute, second;
  parts.forEach(part => {
    if (part.type === 'day') day = part.value;
    if (part.type === 'month') month = part.value;
    if (part.type === 'year') year = part.value;
    if (part.type === 'hour') hour = part.value;
    if (part.type === 'minute') minute = part.value;
    if (part.type === 'second') second = part.value;
  });
  return `${day}/${month}/${year} ${hour}:${minute}:${second}`;
}

// ✅ USER ID GENERATE - 5-6 MINUTE BAAD REPEAT
function generateRandomUserId(userMap, settings) {
  const now = Date.now();
  const map = userMap;

  let repeatUsers = Object.keys(map).filter(uid => {
    let diff = (now - map[uid]) / 1000;
    return diff >= settings.repeatTimeMin && diff <= settings.repeatTimeMax;
  });

  if (repeatUsers.length && Math.random() <= 0.4) {
    let uid = repeatUsers[Math.floor(Math.random() * repeatUsers.length)];
    map[uid] = now;
    return uid;
  }

  while (true) {
    let first4 = Math.floor(Math.random() * 4000 + 6000);
    let last4 = Math.floor(Math.random() * 9000 + 1000);
    let uid = `${first4}****${last4}`;
    if (!map[uid]) {
      map[uid] = now;
      return uid;
    }
  }
}

// ✅ MESSAGE FORMAT 1 - Bot 1
function buildMessage1(userId, amount, runTime, trackTime) {
  return (
`<b>Conversation Count 💝</b>

<b>🎁 Offer Name - PolicyBazar</b>

<b>User Id : ${userId}</b>
<b>User Amount : ₹${amount}</b>
<b>🥳 User Payment : Success</b>

<b>Run Time - ${runTime}</b>
<b>Track Time - ${trackTime}</b>

<b>Powered By - CashFlix</b>`
  );
}

// ✅ MESSAGE FORMAT 2 - Bot 2
function buildMessage2(userId, amount, runTime, trackTime) {
  return (
`<b>🔥 New Offer 💝</b>

<b>🎁 Offer Name - Test</b>

<b>User Id :</b> ${userId}
<b>User Amount :</b> 💰 <b>₹${amount}</b>
<b>🥳 User Payment :</b> Success ✅

<b>Run Time -</b> ${runTime}
<b>Track Time -</b> ${trackTime}

<b>Powered By - CashFlix</b>`
  );
}

// ✅ SECOND MESSAGE
function sendSecondMessage(userId, runTime, buildFunction, settings, botName) {
  const randomDelay = Math.floor(Math.random() * (settings.secondMsgDelayMax - settings.secondMsgDelayMin + 1)) + settings.secondMsgDelayMin;

  setTimeout(() => {
    if (!settings.running || !settings.secondMsg) return;
    if (!isTimeAllowed()) {
      console.log(`⏸️ ${botName} - Time schedule ke bahar, second message blocked`);
      return;
    }
    const trackTime = getIndianTime(new Date());
    bot.sendMessage(
      CHANNEL_ID,
      buildFunction(userId, settings.secondAmount, runTime, trackTime),
      { parse_mode: "HTML" }
    ).catch(err => console.log("Second msg error:", err.message));
  }, randomDelay * 1000);
}

// ✅ SEND FIRST MESSAGE
async function sendFirstMessage(userId, amount, runTime, trackTime, buildFunction, settings, botName) {
  try {
    if (!settings.firstMsg) return false;
    if (!isTimeAllowed()) {
      console.log(`⏸️ ${botName} - Time schedule ke bahar, message blocked`);
      return false;
    }

    await bot.sendMessage(
      CHANNEL_ID,
      buildFunction(userId, amount, runTime, trackTime),
      { parse_mode: "HTML" }
    );
    settings.messageCount++;
    console.log(`✅ ${botName} ₹${amount} message sent for ${userId}`);
    return true;
  } catch (error) {
    console.log("Error:", error.message);
    return false;
  }
}

// ✅ BOT 1 - START
function startConversation1() {
  console.log(`🚀 Bot 1 Started - ${BOT1.messagesPerMinute} msgs/min`);
  console.log(`   First Amount: ₹${BOT1.firstAmount} | Second Amount: ₹${BOT1.secondAmount}`);
  console.log(`   Run Time Gap: ${BOT1.runTimeGapMin}-${BOT1.runTimeGapMax} sec`);
  console.log(`   Second Msg Delay: ${BOT1.secondMsgDelayMin}-${BOT1.secondMsgDelayMax} sec`);
  console.log(`   User Repeat: ${BOT1.repeatTimeMin/60}-${BOT1.repeatTimeMax/60} minutes`);
  console.log(`⏰ Schedule: 12:50 AM - 2:00 AM & 5:00 AM - 12:00 AM (Indian Time)`);

  BOT1.timer = setInterval(async () => {
    if (!BOT1.running) {
      clearInterval(BOT1.timer);
      BOT1.timer = null;
      return;
    }

    const now = new Date();

    for (let i = 0; i < BOT1.messagesPerMinute; i++) {
      try {
        // ✅ TIME CHECK - AGAR SCHEDULE KE BAHAR HAI TO SKIP
        if (!isTimeAllowed()) {
          console.log(`⏸️ Bot1 - Time schedule ke bahar (${getIndianTime(now)})`);
          return;
        }

        let userId = generateRandomUserId(BOT1.userLastUsed, BOT1);

        const randomSeconds = Math.floor(Math.random() * (BOT1.runTimeGapMax - BOT1.runTimeGapMin + 1)) + BOT1.runTimeGapMin;
        let runTimeDate = new Date(now.getTime() - (randomSeconds * 1000));
        let runTime = getIndianTime(runTimeDate);
        let trackTime = getIndianTime(now);

        await sendFirstMessage(userId, BOT1.firstAmount, runTime, trackTime, buildMessage1, BOT1, "Bot1");

        if (BOT1.secondMsg) {
          sendSecondMessage(userId, runTime, buildMessage1, BOT1, "Bot1");
        }

        if (i < BOT1.messagesPerMinute - 1) {
          await new Promise(resolve => setTimeout(resolve, 10000));
        }

      } catch (error) {
        console.log("Error:", error.message);
        if (error.response?.body?.description?.includes('429')) {
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
    }
  }, 60000);
}

// ✅ BOT 2 - START
function startConversation2() {
  console.log(`🚀 Bot 2 Started - ${BOT2.messagesPerMinute} msgs/min`);
  console.log(`   First Amount: ₹${BOT2.firstAmount} | Second Amount: ₹${BOT2.secondAmount}`);
  console.log(`   Run Time Gap: ${BOT2.runTimeGapMin}-${BOT2.runTimeGapMax} sec`);
  console.log(`   Second Msg Delay: ${BOT2.secondMsgDelayMin}-${BOT2.secondMsgDelayMax} sec`);
  console.log(`   User Repeat: ${BOT2.repeatTimeMin/60}-${BOT2.repeatTimeMax/60} minutes`);
  console.log(`⏰ Schedule: 12:50 AM - 2:00 AM & 5:00 AM - 12:00 AM (Indian Time)`);

  BOT2.timer = setInterval(async () => {
    if (!BOT2.running) {
      clearInterval(BOT2.timer);
      BOT2.timer = null;
      return;
    }

    const now = new Date();

    for (let i = 0; i < BOT2.messagesPerMinute; i++) {
      try {
        // ✅ TIME CHECK - AGAR SCHEDULE KE BAHAR HAI TO SKIP
        if (!isTimeAllowed()) {
          console.log(`⏸️ Bot2 - Time schedule ke bahar (${getIndianTime(now)})`);
          return;
        }

        let userId = generateRandomUserId(BOT2.userLastUsed, BOT2);

        const randomSeconds = Math.floor(Math.random() * (BOT2.runTimeGapMax - BOT2.runTimeGapMin + 1)) + BOT2.runTimeGapMin;
        let runTimeDate = new Date(now.getTime() - (randomSeconds * 1000));
        let runTime = getIndianTime(runTimeDate);
        let trackTime = getIndianTime(now);

        await sendFirstMessage(userId, BOT2.firstAmount, runTime, trackTime, buildMessage2, BOT2, "Bot2");

        if (BOT2.secondMsg) {
          sendSecondMessage(userId, runTime, buildMessage2, BOT2, "Bot2");
        }

        if (i < BOT2.messagesPerMinute - 1) {
          await new Promise(resolve => setTimeout(resolve, 10000));
        }

      } catch (error) {
        console.log("Error:", error.message);
        if (error.response?.body?.description?.includes('429')) {
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
    }
  }, 60000);
}

// ============================================================
// 🎯 COMMANDS
// ============================================================

// ✅ /test - Bot 1 Start
bot.onText(/\/test$/, async (msg) => {
  const chatId = msg.chat.id;
  if (BOT1.running) return bot.sendMessage(chatId, "⚠️ Bot 1 already running!");

  try {
    const botInfo = await bot.getMe();
    await bot.getChatMember(CHANNEL_ID, botInfo.id);
  } catch (error) {
    return bot.sendMessage(chatId, "❌ Bot is not admin in channel!");
  }

  BOT1.running = true;
  BOT1.messageCount = 0;
  BOT1.userLastUsed = {};
  startConversation1();
  bot.sendMessage(chatId, `✅ Bot 1 Started!
📌 First Amount: ₹${BOT1.firstAmount}
📌 Second Amount: ₹${BOT1.secondAmount}
📌 Run Time Gap: ${BOT1.runTimeGapMin}-${BOT1.runTimeGapMax} sec
📌 Second Msg Delay: ${BOT1.secondMsgDelayMin}-${BOT1.secondMsgDelayMax} sec
📌 User Repeat: ${BOT1.repeatTimeMin/60}-${BOT1.repeatTimeMax/60} min
📌 Speed: ${BOT1.messagesPerMinute} msgs/min
⏰ Schedule: 12:50 AM - 2:00 AM & 5:00 AM - 12:00 AM (Indian Time)`);
});

// ✅ /test 2 - Bot 2 Start
bot.onText(/\/test 2/, async (msg) => {
  const chatId = msg.chat.id;
  if (BOT2.running) return bot.sendMessage(chatId, "⚠️ Bot 2 already running!");

  try {
    const botInfo = await bot.getMe();
    await bot.getChatMember(CHANNEL_ID, botInfo.id);
  } catch (error) {
    return bot.sendMessage(chatId, "❌ Bot is not admin in channel!");
  }

  BOT2.running = true;
  BOT2.messageCount = 0;
  BOT2.userLastUsed = {};
  startConversation2();
  bot.sendMessage(chatId, `✅ Bot 2 Started!
📌 First Amount: ₹${BOT2.firstAmount}
📌 Second Amount: ₹${BOT2.secondAmount}
📌 Run Time Gap: ${BOT2.runTimeGapMin}-${BOT2.runTimeGapMax} sec
📌 Second Msg Delay: ${BOT2.secondMsgDelayMin}-${BOT2.secondMsgDelayMax} sec
📌 User Repeat: ${BOT2.repeatTimeMin/60}-${BOT2.repeatTimeMax/60} min
📌 Speed: ${BOT2.messagesPerMinute} msgs/min
⏰ Schedule: 12:50 AM - 2:00 AM & 5:00 AM - 12:00 AM (Indian Time)`);
});

// ✅ /stop - Bot 1 Stop
bot.onText(/\/stop$/, (msg) => {
  const chatId = msg.chat.id;
  BOT1.running = false;
  if (BOT1.timer) { clearInterval(BOT1.timer); BOT1.timer = null; }
  bot.sendMessage(chatId, `🛑 Bot 1 Stopped. Total: ${BOT1.messageCount}`);
});

// ✅ /stop 2 - Bot 2 Stop
bot.onText(/\/stop 2/, (msg) => {
  const chatId = msg.chat.id;
  BOT2.running = false;
  if (BOT2.timer) { clearInterval(BOT2.timer); BOT2.timer = null; }
  bot.sendMessage(chatId, `🛑 Bot 2 Stopped. Total: ${BOT2.messageCount}`);
});

// ✅ /status - Full Status
bot.onText(/\/status/, (msg) => {
  const currentTime = getIndianTime(new Date());
  bot.sendMessage(msg.chat.id, `
📊 FULL STATUS:

🤖 Bot 1:
Running: ${BOT1.running ? "✅ Yes" : "❌ No"}
First Amount: ₹${BOT1.firstAmount}
Second Amount: ₹${BOT1.secondAmount}
Run Time Gap: ${BOT1.runTimeGapMin}-${BOT1.runTimeGapMax} sec
Second Msg Delay: ${BOT1.secondMsgDelayMin}-${BOT1.secondMsgDelayMax} sec
User Repeat: ${BOT1.repeatTimeMin/60}-${BOT1.repeatTimeMax/60} min
Total Messages: ${BOT1.messageCount}
Speed: ${BOT1.messagesPerMinute} msgs/min

🤖 Bot 2:
Running: ${BOT2.running ? "✅ Yes" : "❌ No"}
First Amount: ₹${BOT2.firstAmount}
Second Amount: ₹${BOT2.secondAmount}
Run Time Gap: ${BOT2.runTimeGapMin}-${BOT2.runTimeGapMax} sec
Second Msg Delay: ${BOT2.secondMsgDelayMin}-${BOT2.secondMsgDelayMax} sec
User Repeat: ${BOT2.repeatTimeMin/60}-${BOT2.repeatTimeMax/60} min
Total Messages: ${BOT2.messageCount}
Speed: ${BOT2.messagesPerMinute} msgs/min

⏰ SCHEDULE:
12:50 AM - 2:00 AM ✅
5:00 AM - 12:00 AM ✅
Status: ${isTimeAllowed() ? "✅ ACTIVE (Messages bhej raha hai)" : "⏸️ INACTIVE (Messages nahi bhej raha)"}

👥 Users Bot1: ${Object.keys(BOT1.userLastUsed).length}
👥 Users Bot2: ${Object.keys(BOT2.userLastUsed).length}
🕐 Current Time: ${currentTime}
  `);
});

// ============================================================
// 🎯 TIME SCHEDULE COMMANDS
// ============================================================

// ✅ /settime startHour:startMinute endHour:endMinute
bot.onText(/\/settime (\d+):(\d+) (\d+):(\d+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const startHour = parseInt(match[1]);
  const startMinute = parseInt(match[2]);
  const endHour = parseInt(match[3]);
  const endMinute = parseInt(match[4]);

  if (startHour < 0 || startHour > 23 || endHour < 0 || endHour > 24 ||
      startMinute < 0 || startMinute > 59 || endMinute < 0 || endMinute > 59) {
    return bot.sendMessage(chatId, "❌ Time sahi daalo! Hour 0-23, Minute 0-59");
  }

  TIME_SCHEDULE.startHour = startHour;
  TIME_SCHEDULE.startMinute = startMinute;
  TIME_SCHEDULE.endHour = endHour;
  TIME_SCHEDULE.endMinute = endMinute;
  TIME_SCHEDULE.enabled = true;

  bot.sendMessage(chatId, `
✅ Schedule Updated!

⏰ ${String(startHour).padStart(2,'0')}:${String(startMinute).padStart(2,'0')} to ${String(endHour).padStart(2,'0')}:${String(endMinute).padStart(2,'0')} (Indian Time)

📌 Bot ab is time ke andar hi messages bhejega!
  `);
});

// ✅ /schedule - Current Schedule Dikhaye
bot.onText(/\/schedule$/, (msg) => {
  const chatId = msg.chat.id;

  if (!TIME_SCHEDULE.enabled) {
    return bot.sendMessage(chatId, "⏰ Schedule: 24/7 (Disabled)");
  }

  bot.sendMessage(chatId, `
⏰ CURRENT SCHEDULE (Indian Time):
${String(TIME_SCHEDULE.startHour).padStart(2,'0')}:${String(TIME_SCHEDULE.startMinute).padStart(2,'0')} to ${String(TIME_SCHEDULE.endHour).padStart(2,'0')}:${String(TIME_SCHEDULE.endMinute).padStart(2,'0')}

📌 Status: ${isTimeAllowed() ? "✅ Active (Messages bhej raha hai)" : "⏸️ Inactive (Messages nahi bhej raha)"}
🕐 Current Time: ${getIndianTime(new Date())}
  `);
});

// ✅ /schedule on - Schedule On
bot.onText(/\/schedule on/, (msg) => {
  const chatId = msg.chat.id;
  TIME_SCHEDULE.enabled = true;
  bot.sendMessage(chatId, "✅ Schedule Enabled! Bot schedule ke hisaab se chalega.");
});

// ✅ /schedule off - Schedule Off (24/7)
bot.onText(/\/schedule off/, (msg) => {
  const chatId = msg.chat.id;
  TIME_SCHEDULE.enabled = false;
  bot.sendMessage(chatId, "✅ Schedule Disabled! Bot 24/7 chalega.");
});

// ============================================================
// 🎯 PORT (RENDER KE LIYE)
// ============================================================

const express = require('express');
const app = express();
app.get('/', (req, res) => res.send('🤖 Bot is running!'));
app.listen(PORT, () => console.log(`🌐 Web server running on port ${PORT}`));

console.log("🤖 Bot Started...");
console.log(`📢 Channel: ${CHANNEL_ID}`);
console.log(`🕐 Indian Time: ${getIndianTime(new Date())}`);
console.log(`
📌 ALL SETTINGS:
  Bot 1: First=₹${BOT1.firstAmount} | Second=₹${BOT1.secondAmount}
         Run Gap=${BOT1.runTimeGapMin}-${BOT1.runTimeGapMax}s | Delay=${BOT1.secondMsgDelayMin}-${BOT1.secondMsgDelayMax}s
         Repeat=${BOT1.repeatTimeMin/60}-${BOT1.repeatTimeMax/60} min
  Bot 2: First=₹${BOT2.firstAmount} | Second=₹${BOT2.secondAmount}
         Run Gap=${BOT2.runTimeGapMin}-${BOT2.runTimeGapMax}s | Delay=${BOT2.secondMsgDelayMin}-${BOT2.secondMsgDelayMax}s
         Repeat=${BOT2.repeatTimeMin/60}-${BOT2.repeatTimeMax/60} min
⏰ Schedule: 12:50 AM - 2:00 AM & 5:00 AM - 12:00 AM (Indian Time)
`);
