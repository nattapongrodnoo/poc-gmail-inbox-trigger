# C4 Level 2: Container Diagram

```mermaid
C4Container
title Gmail Service POC - Container Diagram

Person(user, "User", "Interacts with the Gmail Service App")
System_Boundary(gmailService, "Gmail Service App") {
    Container(webApp, "Express Web App", "Node.js/TypeScript", "Handles API requests and Pub/Sub notifications")
    Container(authService, "OAuth Service", "Node.js/TypeScript", "Manages OAuth2 authentication with Gmail API")
    Container(gmailHandler, "Gmail Handler", "Node.js/TypeScript", "Processes Gmail notifications and attachments")
    Container(fileSystem, "File System", "Local Storage", "Stores tokens, history IDs, and attachments")
}
System_Ext(gmail, "Gmail API", "Provides email data and notifications")
System_Ext(pubsub, "Google Cloud Pub/Sub", "Handles push notifications from Gmail API")

Rel(user, webApp, "Uses", "HTTP")
Rel(webApp, authService, "Manages authentication", "Internal API")
Rel(webApp, gmailHandler, "Processes notifications", "Internal API")
Rel(gmailHandler, fileSystem, "Reads/Writes data", "File I/O")
Rel(authService, gmail, "Authenticates", "OAuth2")
Rel(gmailHandler, gmail, "Fetches email data", "HTTPS")
Rel(pubsub, webApp, "Sends notifications", "Pub/Sub")
```
