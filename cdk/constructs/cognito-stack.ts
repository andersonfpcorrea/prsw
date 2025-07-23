import { Stack, StackProps } from "aws-cdk-lib";
import { UserPool, UserPoolClient } from "aws-cdk-lib/aws-cognito";
import { Construct } from "constructs";

interface CognitoStackProps extends StackProps {
  stageName: string;
}

export class CognitoStack extends Stack {
  cognitoUserPool: UserPool;
  webUserPoolClient: UserPoolClient;
  serverUserPoolClient: UserPoolClient;
  constructor(scope: Construct, id: string, props: CognitoStackProps) {
    super(scope, id, props);

    const userPool = new UserPool(this, "UserPool", {
      selfSignUpEnabled: true,
      signInCaseSensitive: false,
      autoVerify: {
        email: true,
      },
      signInAliases: {
        email: true,
      },
      passwordPolicy: {
        minLength: 8,
        requireDigits: true,
        requireLowercase: true,
        requireSymbols: true,
        requireUppercase: true,
      },
      standardAttributes: {
        givenName: {
          required: true,
          mutable: true,
        },
        familyName: {
          required: true,
          mutable: true,
        },
        email: {
          required: true,
          mutable: true,
        },
      },
    });

    const webUserPoolClient = new UserPoolClient(this, "WebUserPoolClient", {
      userPool,
      authFlows: {
        userSrp: true,
      },
      preventUserExistenceErrors: true,
    });

    const serverUserPoolClient = new UserPoolClient(
      this,
      "ServerUserPoolClient",
      {
        userPool,
        authFlows: {
          adminUserPassword: true,
        },
        preventUserExistenceErrors: true,
      }
    );

    this.cognitoUserPool = userPool;
    this.webUserPoolClient = webUserPoolClient;
    this.serverUserPoolClient = serverUserPoolClient;
  }
}
