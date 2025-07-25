const APP_ROOT = "../../";
import _ from "lodash";
import { AwsClient } from "aws4fetch";
import { fromNodeProviderChain } from "@aws-sdk/credential-providers";

const mode = process.env.TEST_MODE;

const viaHandler = async (event, functionName) => {
  const { handler } = await import(
    `${APP_ROOT}/.dist/functions/${functionName}/${functionName}.js`
  );

  const context = {};
  const response = await handler(event, context);
  const contentType = _.get(
    response,
    "headers.content-type",
    "application/json"
  );
  if (response.body && contentType === "application/json") {
    response.body = JSON.parse(response.body);
  }
  return response;
};

const viaHttp = async (relPath, method, opts) => {
  const url = `${process.env.ApiUrl}${relPath}`;
  console.info(`invoking via HTTP ${method} ${url}`);

  const body = _.get(opts, "body");
  const headers = {};

  const authHeader = _.get(opts, "auth");
  if (authHeader) {
    headers.Authorization = authHeader;
  }

  let res;
  if (_.get(opts, "iam_auth", false) === true) {
    const credentialProvider = fromNodeProviderChain();
    const credentials = await credentialProvider();
    const aws = new AwsClient({
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      sessionToken: credentials.sessionToken,
    });

    res = await aws.fetch(url, { method, headers, body });
  } else {
    res = await fetch(url, { method, headers, body });
  }

  const respHeaders = {};
  for (const [key, value] of res.headers.entries()) {
    respHeaders[key] = value;
  }

  const respBody =
    respHeaders["content-type"] === "application/json"
      ? await res.json()
      : await res.text();

  return {
    statusCode: res.status,
    body: respBody,
    headers: respHeaders,
  };
};

export const we_invoke_get_index = async () => {
  switch (mode) {
    case "handler":
      return await viaHandler({}, "get-index");
    case "http":
      return await viaHttp("", "GET");
    default:
      throw new Error(`unsupported mode: ${mode}`);
  }
};

export const we_invoke_get_restaurants = async () => {
  switch (mode) {
    case "handler":
      return await viaHandler({}, "get-restaurants");
    case "http":
      return await viaHttp("restaurants", "GET", { iam_auth: true });
    default:
      throw new Error(`unsupported mode: ${mode}`);
  }
};

export const we_invoke_search_restaurants = async (theme, user) => {
  const body = JSON.stringify({ theme });

  switch (mode) {
    case "handler":
      return await viaHandler({ body }, "search-restaurants");
    case "http":
      const auth = user.idToken;
      return await viaHttp("restaurants/search", "POST", { body, auth });
    default:
      throw new Error(`unsupported mode: ${mode}`);
  }
};
