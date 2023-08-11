import fs from "fs";

export interface UserAuthenticator {
  credentialID: string;
  credentialPublicKey: string;
  counter: number;
  transports: Array<"ble" | "internal" | "nfc" | "usb" | "cable" | "hybrid">;
}

export const getDb = () => {
  return JSON.parse(fs.readFileSync("./db.json", { encoding: "utf-8" }));
};

export const saveDb = (db: any) => {
  fs.writeFileSync("./db.json", JSON.stringify(db));
};

export const saveUserRegisterChallenge = (
  username: string,
  challenge: string
) => {
  const db = getDb();

  if (!db.users[username]) {
    db.users[username] = {
      authenticators: []
    };
  }
  db.users[username].registerChallenge = challenge;
  saveDb(db);
};

export const saveUserLoginChallenge = (username: string, challenge: string) => {
  const db = getDb();

  if (!db.users[username]) {
    db.users[username] = {
      authenticators: []
    };
  }
  db.users[username].loginChallenge = challenge;
  saveDb(db);
};

export const clearUserRegisterChallenge = (username: string) => {
  const db = getDb();
  db.users[username].registerChallenge = null;
  saveDb(db);
};

export const clearUserLoginChallenge = (username: string) => {
  const db = getDb();
  db.users[username].loginChallenge = null;
  saveDb(db);
};

export const getUserRegisterChallenge = (username: string) => {
  const db = getDb();
  if (!db.users[username]) {
    return null;
  }
  return db.users[username].registerChallenge;
};

export const getUserLoginChallenge = (username: string) => {
  const db = getDb();
  if (!db.users[username]) {
    return null;
  }
  return db.users[username].loginChallenge;
};

export const getUserRegisteredAuthenticators = (username: string) => {
  const db = getDb();

  if (!db.users[username]) {
    return [];
  }
  return db.users[username].authenticators as UserAuthenticator[];
};

export const registerUserAuthenticator = (
  username: string,
  authenticator: UserAuthenticator
) => {
  const db = getDb();

  db.users[username].authenticators.push(authenticator);

  saveDb(db);
};
