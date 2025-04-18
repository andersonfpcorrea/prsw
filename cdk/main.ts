#!/usr/bin/env node

import * as cdk from "aws-cdk-lib";
import { ApiStack } from "./constructs/api-stack";
import { DatabaseStack } from "./constructs/database-stack";
import { CognitoStack } from "./constructs/cognito-stack";

const app = new cdk.App();
let stageName = app.node.tryGetContext("stageName");
if (!stageName) {
  console.log("Defaulting stage name to dev");
  stageName = "dev";
}
const dbStack = new DatabaseStack(app, `DatabaseStack-${stageName}`, {
  stageName,
});
const cognitoStack = new CognitoStack(app, `CognitoStack-${stageName}`, {
  stageName,
});
new ApiStack(app, `ApiStack-${stageName}`, {
  stageName,
  restaurantsTable: dbStack.restaurantsTable,
  cognitoUserPool: cognitoStack.cognitoUserPool,
  webUserPoolClient: cognitoStack.webUserPoolClient,
});
