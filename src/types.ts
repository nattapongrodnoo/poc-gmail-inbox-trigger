export interface PubSubMessage {
  data: string;
  messageId: string;
  attributes: {
    [key: string]: string;
  };
}

export interface WatchResponse {
  historyId: string;
  expiration: string;
}
