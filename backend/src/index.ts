const rpName = 'fullstack-ladder-webauthn-demo';
const rpId = 'localhost';
const expectedOrigin = 'http://localhost:4200';

import {
  VerifiedAuthenticationResponse,
  VerifiedRegistrationResponse,
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from '@simplewebauthn/server';
import bodyParser from 'body-parser';
import express from 'express';
import {
  UserAuthenticator,
  clearUserLoginChallenge,
  clearUserRegisterChallenge,
  getUserLoginChallenge,
  getUserRegisterChallenge,
  getUserRegisteredAuthenticators,
  registerUserAuthenticator,
  saveUserLoginChallenge,
  saveUserRegisterChallenge,
} from './db-utils';
import { convertBase64 } from './utils';

const app = express();

app.all('*', function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', '*');
  res.header('Access-Control-Allow-Headers', '*');
  next();
});

app.use(bodyParser.json());

// 開始註冊裝置
app.post('/device-register/start', (req, res) => {
  let username = req.body.username;

  // (資料庫) 找出使用者目前的所有驗證器
  const userAuthenticators = getUserRegisteredAuthenticators(username);

  // 產生裝置註冊選項
  const options = generateRegistrationOptions({
    rpName,
    rpID: rpId,
    userID: username,
    userName: username,
    // 設定要排除的驗證器，避免驗證器重複註冊
    excludeCredentials: userAuthenticators.map(
      (authenticator: UserAuthenticator) => ({
        id: Buffer.from(authenticator.credentialID, 'base64'),
        type: 'public-key',
        transports: authenticator.transports,
      })
    ),
    timeout: 60000,
  });

  // (資料庫)
  // 將 challenge 存入資料庫
  // 實務上 challenge 是會到期的，到期時間依照 options 的 timeout 設定
  // 所以存到 cache 就足夠了，不一定需要存到資料庫
  saveUserRegisterChallenge(username, options.challenge);

  res.json(options);
});

app.post('/device-register/finish', async (req, res) => {
  const username = req.body.username;

  // (資料庫) 從資料庫中取得目前使用者的 challenge
  const expectedChallenge = getUserRegisterChallenge(username);

  // 驗證使用者回應
  let verification: VerifiedRegistrationResponse;
  try {
    verification = await verifyRegistrationResponse({
      response: req.body.data,
      expectedChallenge,
      expectedOrigin,
      requireUserVerification: true
    });
  } catch (error: any) {
    // 驗證失敗
    return res.status(400).send({ message: error.message });
  }

  // 驗證成功，取得驗證相關資料
  const { verified, registrationInfo } = verification;

  if (verified && registrationInfo) {
    // 註冊使用的驗證器
    const { credentialPublicKey, credentialID, counter } = registrationInfo;

    // 新的驗證器資訊
    const newAuthenticator: UserAuthenticator = {
      credentialID: convertBase64(credentialID),
      credentialPublicKey: convertBase64(credentialPublicKey),
      counter,
      transports: req.body.data.response.transports,
    };

    // (資料庫) 註冊驗測器，儲存到資料庫中
    registerUserAuthenticator(username, newAuthenticator);

    // (資料庫) 清除資料庫中目前使用者的 challenge
    clearUserRegisterChallenge(username);

    return res.status(200).send(true);
  }

  res.status(500).send(false);
});

app.post('/login/start', (req, res) => {
  const username = req.body.username;

  // (資料庫) 取得使用者註冊的驗證器
  const userAuthenticators = getUserRegisteredAuthenticators(username);

  // 產生裝置登入選項
  const options = generateAuthenticationOptions({
    allowCredentials: userAuthenticators.map((authenticator) => ({
      id: Buffer.from(authenticator.credentialID, 'base64'),
      type: 'public-key',
      transports: authenticator.transports,
    })),
    userVerification: 'preferred',
  });

  // (資料庫)
  // 將 challenge 存入資料庫
  // 實務上 challenge 是會到期的，到期時間依照 options 的 timeout 設定
  // 所以存到 cache 就足夠了，不一定需要存到資料庫
  saveUserLoginChallenge(username, options.challenge);

  res.json(options);
});

app.post('/login/finish', async (req, res) => {
  const username = req.body.username;

  // (資料庫) 取得使用者目前的 challenge
  const expectedChallenge = getUserLoginChallenge(username);

  // (資料庫) 從資料庫中檢查是否包含符合的驗證器
  const authenticators = getUserRegisteredAuthenticators(username);

  if (!authenticators || !authenticators.length) {
    return res.status(400).send({ error: 'User is not registered any device' });
  }

  const authenticator = authenticators.find(
    (device) => device.credentialID === req.body.data.id
  );
  if (!authenticator) {
    return res
      .status(400)
      .send({ error: 'User is not registered this device' });
  }

  // 執行驗證
  let verification: VerifiedAuthenticationResponse;
  try {
    verification = await verifyAuthenticationResponse({
      response: req.body.data,
      expectedChallenge,
      expectedOrigin,
      expectedRPID: rpId,
      authenticator: {
        credentialID: Buffer.from(authenticator.credentialID, 'base64'),
        credentialPublicKey: Buffer.from(
          authenticator.credentialPublicKey,
          'base64'
        ),
        counter: authenticator.counter,
        transports: authenticator.transports,
      },
      requireUserVerification: true,
    });
  } catch (error: any) {
    console.error(error);
    return res.status(400).send({ message: error.message });
  }

  const { verified } = verification;
  if (verified) {
    // (資料庫) 清除使用者 challenge
    clearUserLoginChallenge(username);

    // 驗證成功，看是要核發 token 還是要做什麼登入後的事情都可以
    return res.status(200).send(true);
  }

  return res.status(500).send(false);
});

app.listen(3000, () => {
  console.log('Server is listening on port 3000');
});
