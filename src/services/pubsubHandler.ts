import { RequestHandler } from "express";
import { google } from "googleapis";
import fs from "fs";
import path from "path";
import { authorize } from "./gmailService";

const historyStorePath = path.resolve(__dirname, "../../lastHistoryId.json");

const downloadAttachment = async (
  gmail: any,
  messageId: string,
  attachmentId: string
): Promise<Buffer> => {
  const attachment = await gmail.users.messages.attachments.get({
    userId: "me",
    messageId: messageId,
    id: attachmentId,
  });

  return Buffer.from(attachment.data.data, "base64");
};

export const handlePubSubMessage: RequestHandler = async (req, res) => {
  try {
    const message = req.body.message;
    console.log("Received Pub/Sub message:", message);

    if (!message) {
      res.status(400).send("Missing Pub/Sub message");
      return undefined;
    }

    const data = Buffer.from(message.data, "base64").toString("utf-8");
    const jsonData = JSON.parse(data);

    console.log("Decoded Pub/Sub message data:", jsonData);

    const { historyId, emailAddress } = jsonData;

    console.log("Parsed historyId:", historyId);
    console.log("Parsed emailAddress:", emailAddress);
    console.log("📬 PubSub message:", {
      data: message.data,
      messageId: message.messageId,
      publishTime: message.publishTime,
    });

    const auth = await authorize();
    const gmail = google.gmail({ version: "v1", auth });

    // ✅ Get last known history ID
    let lastHistoryId: string | undefined;
    if (fs.existsSync(historyStorePath)) {
      const file = JSON.parse(await fs.readFileSync(historyStorePath, "utf-8"));
      lastHistoryId = file.historyId;
    }

    // If we don’t have a stored one, use the current push ID (no delta)
    if (!lastHistoryId) {
      await fs.writeFileSync(historyStorePath, JSON.stringify({ historyId }));
      console.log(
        "⚠️ No previous historyId found, initializing with:",
        historyId
      );
      res.status(200).send("Initialized historyId");
      return;
    }

    // ✅ Get message changes from previous historyId
    const historyRes = await gmail.users.history.list({
      userId: "me",
      startHistoryId: lastHistoryId,
      historyTypes: ["messageAdded"],
    });

    console.log("History response:", historyRes.data)

    if (!historyRes.data.history) {
      fs.writeFileSync(historyStorePath, JSON.stringify({ historyId }));
      res.status(200).send("No new messages");
      return;
    }

    // ✅ Process new messages
    for (const record of historyRes.data.history) {
      if (record.messagesAdded) {
        for (const { message } of record.messagesAdded) {
          const fullMessage = await gmail.users.messages.get({
            userId: "me",
            id: message?.id!,
            format: "full", // Changed from 'metadata' to 'full' to get attachment info
          });

          const subject = fullMessage.data.payload?.headers?.find(
            (h) => h.name === "Subject"
          )?.value;
          const from = fullMessage.data.payload?.headers?.find(
            (h) => h.name === "From"
          )?.value;

          console.log(`✅ New Email:\nFrom: ${from}\nSubject: ${subject}`);

          await fs.writeFileSync(
            historyStorePath,
            JSON.stringify({ historyId })
          );

          // Handle attachments
          const parts = fullMessage.data.payload?.parts || [];
          for (const part of parts) {
            if (part.filename && part.body?.attachmentId) {
              try {
                const attachmentData = await downloadAttachment(
                  gmail,
                  message?.id ?? "",
                  part.body.attachmentId
                );

                // Create attachments directory if it doesn't exist
                const attachmentsDir = path.join(
                  __dirname,
                  "../../attachments"
                );
                if (!fs.existsSync(attachmentsDir)) {
                  fs.mkdirSync(attachmentsDir, { recursive: true });
                }

                // Save attachment
                const filePath = path.join(attachmentsDir, part.filename);
                fs.writeFileSync(filePath, attachmentData);
                console.log(`✅ Saved attachment: ${part.filename}`);
              } catch (error) {
                console.error(
                  `Failed to download attachment: ${part.filename}`,
                  error
                );
              }
            }
          }
        }
      }
    }

    // // // ✅ Update last known history ID after processing
    await fs.writeFileSync(historyStorePath, JSON.stringify({ historyId }));
    res.status(200).send("Message processed");
    return;
  } catch (error) {
    res.status(500).send("Internal server error");
    return;
  }
};
