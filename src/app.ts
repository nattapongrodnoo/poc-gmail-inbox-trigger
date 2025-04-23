import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import { handlePubSubMessage } from "./services/pubsubHandler";
import { getAuthUrl, getTokens, oauth2Client } from "./services/oauth";
import { google } from "googleapis";
import { errorHandler } from "./middlewares/errorHandler";
import path from "path";
import fs from "fs";

dotenv.config();

const app = express();
const tokenPath = path.resolve(__dirname, "../token.json");

// Middleware
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

app.get("/login", (req, res) => {
  const url = getAuthUrl();
  res.redirect(url);
});

// Step 2: Callback
app.get("/oauth2callback", async (req, res) => {
  const code = req.query.code as string;

  try {
    const tokens = await getTokens(code);
    oauth2Client.setCredentials(tokens);
    fs.writeFileSync(tokenPath, JSON.stringify(tokens, null, 2));

    // Store the tokens securely (DB or file)
    console.log("Access Token:", tokens.access_token);
    console.log("Refresh Token:", tokens.refresh_token);

    // Test Gmail watch
    const gmail = google.gmail({ version: "v1", auth: oauth2Client });
    const result = await gmail.users.watch({
      userId: "me",
      requestBody: {
        labelIds: ["INBOX"],
        topicName: `projects/${process.env.PROJECT_ID}/topics/${process.env.TOPIC_NAME}`,
      },
    });

    console.log("Watch result:", result.data);

    res.send("Authentication successful. Gmail watch started.");
  } catch (err) {
    console.error(err);
    res.status(500).send("Auth failed");
  }
});

app.use("/api/gmail-service/pubsub/push", handlePubSubMessage);

// Error handling
app.use(errorHandler);

export default app;
