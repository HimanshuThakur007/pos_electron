import { ipcMain } from "electron";
import {
  saveRememberedUser,
  getRememberedUsers,
  getCredentialsForUser,
  removeRememberedUser,
} from "../repositories/remembered_users.sqlite.repo.js";

ipcMain.handle("get-remembered-users", async () => {
  try {
    return getRememberedUsers();
  } catch (error) {
    console.error("IPC: Failed to get remembered users", error);
    return [];
  }
});

ipcMain.handle("get-credentials-for-user", async (event, email) => {
  try {
    return await getCredentialsForUser(email);
  } catch (error) {
    console.error("IPC: Failed to get credentials for user", error);
    return null;
  }
});

ipcMain.handle("save-remembered-user", async (event, { email, password }) => {
  console.log(`IPC: Received 'save-remembered-user' for ${email}`);
  try {
    await saveRememberedUser(email, password);
    return { success: true };
  } catch (error) {
    console.error("IPC: Failed to save remembered user", error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("remove-remembered-user", async (event, email) => {
  console.log(`IPC: Received 'remove-remembered-user' for ${email}`);
  try {
    removeRememberedUser(email);
    return { success: true };
  } catch (error) {
    console.error("IPC: Failed to remove remembered user", error);
    return { success: false, error: error.message };
  }
});
