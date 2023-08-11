export const convertBase64 = (arr: Uint8Array) => {
  return Buffer.from(arr).toString('base64').replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
};
