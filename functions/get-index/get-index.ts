import { readFileSync } from "node:fs";
import * as Mustache from "mustache";
import { AwsClient } from "aws4fetch";
import { fromNodeProviderChain } from "@aws-sdk/credential-providers";
const crypto = require("crypto");

const restaurantsApiRoot = process.env.restaurants_api || "";
const cognitoUserPoolId = process.env.cognito_user_pool_id;
const cognitoClientId = process.env.cognito_client_id;
const awsRegion = process.env.AWS_REGION;
const days = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

let aws: AwsClient | undefined;

async function getAwsClient() {
  const credentialProvider = fromNodeProviderChain();
  const credentials = await credentialProvider();
  aws = new AwsClient({
    accessKeyId: credentials.accessKeyId,
    secretAccessKey: credentials.secretAccessKey,
    sessionToken: credentials.sessionToken,
  });
  return aws;
}

getAwsClient();

let html: string | undefined;

function loadHtml() {
  if (!html) {
    console.log("loading index.html...");
    html = readFileSync("static/index.html", "utf-8");
    console.log("loaded");
  }
  return html;
}

const getRestaurants = async () => {
  const resp = aws
    ? await aws.fetch(restaurantsApiRoot)
    : await (await getAwsClient()).fetch(restaurantsApiRoot);
  return await resp.json();
};

export async function handler(event: unknown, context: unknown) {
  const template = loadHtml();
  const restaurants = await getRestaurants();
  const dayOfWeek = days[new Date().getDay()];
  const view = {
    awsRegion,
    cognitoUserPoolId,
    cognitoClientId,
    dayOfWeek,
    restaurants,
    searchUrl: `${restaurantsApiRoot}/search`,
  };
  const html = Mustache.render(template, view);
  const response = {
    statusCode: 200,
    headers: {
      "Content-Type": "text/html; charset=UTF-8",
    },
    body: html,
  };

  return response;
}
