// App Constants
export const APP_NAME = "NetChat";

// Firebase Collections
export const USERS_REF = "users";
export const CONVERSATIONS_REF = "conversations";
export const MESSAGES_REF = "messages";
export const STATUSES_REF = "statuses";

// Status Constants
export const STATUS_EXPIRY_HOURS = 24;
export const MAX_GROUP_MEMBERS = 2000;

// URLs
export const DEFAULT_PROFILE_IMAGE = "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y";

// WebSocket Events
export const WS_EVENTS = {
  CONNECT: "connect",
  MESSAGE: "message",
  STATUS_UPDATE: "status_update",
  TYPING: "typing",
  USER_STATUS: "user_status",
  ERROR: "error",
  DISCONNECTED: "disconnected",
};

// Local Storage Keys
export const LS_KEYS = {
  USER: "netChat_user",
  AUTH_TOKEN: "netChat_token",
};
