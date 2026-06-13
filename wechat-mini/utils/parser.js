/**
 * Chat message parser - shared between web and mini program
 * Parses text input into structured message objects.
 */
function parseChat(text) {
  var lines = text.split(/\n/);
  var msgs = [];
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    if (!line.trim()) continue;
    var match;
    match = line.match(/^(我|对方):\s*(.*)/);
    if (match) { msgs.push({ type: "text", side: match[1] === "我" ? "right" : "left", text: match[2] }); continue; }
    match = line.match(/^角色\s*1\s*[：:]\s*(.*)/);
    if (match) { msgs.push({ type: "text", side: "right", text: match[1] }); continue; }
    match = line.match(/^角色\s*2\s*[：:]\s*(.*)/);
    if (match) { msgs.push({ type: "text", side: "left", text: match[1] }); continue; }
    match = line.match(/^（角色\s*1\s*发送定位[：:]\s*(.*)）$/);
    if (match) { msgs.push({ type: "location", side: "right", text: match[1] }); continue; }
    match = line.match(/^（角色\s*2\s*发送定位[：:]\s*(.*)）$/);
    if (match) { msgs.push({ type: "location", side: "left", text: match[1] }); continue; }
    match = line.match(/^（角色\s*1[^）]*发送[^）]*图片[^）]*）$/);
    if (match) { msgs.push({ type: "image", side: "right", src: "", text: "[图片]" }); continue; }
    match = line.match(/^（角色\s*2[^）]*发送[^）]*图片[^）]*）$/);
    if (match) { msgs.push({ type: "image", side: "left", src: "", text: "[图片]" }); continue; }
    match = line.match(/^time:\s*(.*)/);
    if (match) { msgs.push({ type: "time", text: match[1] }); continue; }
    match = line.match(/^system:\s*(.*)/);
    if (match) { msgs.push({ type: "system", text: match[1] }); continue; }
    match = line.match(/^transfer:\s*(我|对方|角色\s*1|角色\s*2)\s+(.*)/);
    if (match) { msgs.push({ type: "transfer", side: (match[1]==="我"||/1/.test(match[1])) ? "right" : "left", amount: match[2] }); continue; }
    match = line.match(/^redpacket:\s*(我|对方|角色\s*1|角色\s*2)\s+(.*)/);
    if (match) { msgs.push({ type: "redpacket", side: (match[1]==="我"||/1/.test(match[1])) ? "right" : "left", text: match[2] }); continue; }
    match = line.match(/^location:\s*(我|对方|角色\s*1|角色\s*2)\s+(.*)/);
    if (match) { msgs.push({ type: "location", side: (match[1]==="我"||/1/.test(match[1])) ? "right" : "left", text: match[2] }); continue; }
    match = line.match(/^image:\s*(我|对方|角色\s*1|角色\s*2)\s+(.*)/);
    if (match) { msgs.push({ type: "image", side: (match[1]==="我"||/1/.test(match[1])) ? "right" : "left", src: match[2] }); continue; }
    match = line.match(/^voice:\s*(我|对方|角色\s*1|角色\s*2)\s+(.*)/);
    if (match) { msgs.push({ type: "voice", side: (match[1]==="我"||/1/.test(match[1])) ? "right" : "left", dur: match[2] }); continue; }
    msgs.push({ type: "text", side: "left", text: line });
  }
  return msgs;
}

function generateId() {
  return "s" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
}

function escHtml(s) {
  if (!s) return "";
  s = String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  s = s.replace(/\n/g, "<br>");
  return s;
}

module.exports = {
  parseChat: parseChat,
  generateId: generateId,
  escHtml: escHtml
};
