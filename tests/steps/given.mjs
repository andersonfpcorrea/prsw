import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminInitiateAuthCommand,
  AdminRespondToAuthChallengeCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { Chance } from "chance";

const chance = Chance();

// needs number, special char, upper and lower case
const random_password = () => `${chance.string({ length: 8 })}B!gM0uth`;

export const an_authenticated_user = async () => {
  const cognito = new CognitoIdentityProviderClient();

  const userpoolId = process.env.cognito_user_pool_id;
  const clientId = process.env.CognitoServerClientId;

  const firstName = chance.first({ nationality: "en" });
  const lastName = chance.last({ nationality: "en" });
  const password = random_password();
  const email = `${firstName}-${lastName}@big-mouth.com`;

  const createReq = new AdminCreateUserCommand({
    UserPoolId: userpoolId,
    Username: email,
    MessageAction: "SUPPRESS",
    TemporaryPassword: password,
    UserAttributes: [
      { Name: "given_name", Value: firstName },
      { Name: "family_name", Value: lastName },
      { Name: "email", Value: email },
    ],
  });
  await cognito.send(createReq);

  console.log(`[${email}] - user is created`);

  const req = new AdminInitiateAuthCommand({
    AuthFlow: "ADMIN_NO_SRP_AUTH",
    UserPoolId: userpoolId,
    ClientId: clientId,
    AuthParameters: {
      USERNAME: email,
      PASSWORD: password,
    },
  });
  const resp = await cognito.send(req);

  console.log(`[${email}] - initialised auth flow`);

  const challengeReq = new AdminRespondToAuthChallengeCommand({
    UserPoolId: userpoolId,
    ClientId: clientId,
    ChallengeName: resp.ChallengeName,
    Session: resp.Session,
    ChallengeResponses: {
      USERNAME: email,
      NEW_PASSWORD: random_password(),
    },
  });
  const challengeResp = await cognito.send(challengeReq);

  console.log(`[${email}] - responded to auth challenge`);

  return {
    username: email,
    firstName,
    lastName,
    idToken: challengeResp.AuthenticationResult.IdToken,
  };
};
