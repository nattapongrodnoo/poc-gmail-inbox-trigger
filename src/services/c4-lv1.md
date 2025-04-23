# C4 Level 1: System Context Diagram

```mermaid
C4Context
title Gmail Service POC - Context Diagram

Person(user, "User", "Interacts with the Gmail Service App")
System(gmailService, "Gmail Service App", "Processes Gmail notifications and attachments")
System_Ext(gmail, "Gmail API", "Provides email data and notifications")
System_Ext(pubsub, "Google Cloud Pub/Sub", "Handles push notifications from Gmail API")

Rel(user, gmailService, "Uses", "HTTP")
Rel(gmailService, gmail, "Fetches email data and attachments", "HTTPS")
Rel(gmailService, pubsub, "Receives notifications", "Pub/Sub")
```
