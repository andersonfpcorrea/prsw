import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayEvent } from "aws-lambda";

const dynamodbClient = new DynamoDB();
const dynamodb = DynamoDBDocumentClient.from(dynamodbClient);

const defaultResults = parseInt(process.env.default_results ?? "");
const tableName = process.env.restaurants_table;

const findRestaurantsByTheme = async (theme: string, count: number) => {
  console.log(
    `finding (up to ${count}) restaurants with the theme ${theme}...`
  );

  const resp = await dynamodb.send(
    new ScanCommand({
      TableName: tableName,
      Limit: count,
      FilterExpression: "contains(themes, :theme)",
      ExpressionAttributeValues: { ":theme": theme },
    })
  );
  console.log(`found ${resp?.Items?.length ?? 0} restaurants`);
  return resp.Items;
};

export const handler = async (event: APIGatewayEvent, _context: unknown) => {
  if (typeof event?.body !== "string")
    return { statusCode: 400, body: "bad request" };
  const req = JSON.parse(event?.body);
  const theme = req.theme;
  const restaurants = await findRestaurantsByTheme(`${theme}`, defaultResults);
  const response = {
    statusCode: 200,
    body: JSON.stringify(restaurants),
  };

  return response;
};
