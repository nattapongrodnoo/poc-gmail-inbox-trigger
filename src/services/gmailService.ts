import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import path from "path";
import fs from "fs";

const SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"];

export const authorize = async (): Promise<OAuth2Client> => {
  const credentialsPath = path.join(__dirname, "../../credentials.json");
  const credentials = JSON.parse(fs.readFileSync(credentialsPath, "utf-8"));

  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0]
  );

  // Check if we have previously stored a token.
  const tokenPath = path.join(__dirname, "../../token.json");
  if (fs.existsSync(tokenPath)) {
    const token = JSON.parse(fs.readFileSync(tokenPath, "utf-8"));
    oAuth2Client.setCredentials(token);
  } else {
    throw new Error(
      "Token not found. Please authenticate and store the token."
    );
  }

  return oAuth2Client;
};

export const watchInbox = async (
  auth: OAuth2Client,
  topicName: string
): Promise<void> => {
  const gmail = google.gmail({ version: "v1", auth });

  const response = await gmail.users.watch({
    userId: "me",
    requestBody: {
      labelIds: ["INBOX"],
      topicName: topicName,
    },
  });

  console.log("Watch response:", response.data);
};

export const getMessage = async (
  auth: OAuth2Client,
  messageId: string
): Promise<void> => {
  const gmail = google.gmail({ version: "v1", auth });

  const message = await gmail.users.messages.get({
    userId: "me",
    id: messageId,
  });

  console.log("Message data:", message.data);
};
