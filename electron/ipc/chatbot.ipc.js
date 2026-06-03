import { ipcMain } from "electron";
import { getLoginSession } from "../repositories/session.sqlite.repo.js";
import { processChatbotQuery } from "../services/chatbot.service.js";

ipcMain.handle("chatbot-query", async (event, query) => {
  try {
    const session = getLoginSession() || {};
    const fyCode = session.fy_code;
    return processChatbotQuery(query, fyCode);
  } catch (error) {
    console.error("Chatbot Error:", error);
    return "Oops! I encountered an error while trying to answer that.";
  }
});
