// fetch_daily_tip.mjs

import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";

const client = new DynamoDBClient({ region: "us-east-1" }); // adjust if needed

export async function handler(event) {
  const today = new Date().toISOString().slice(0, 10); // e.g., "2025-04-26"

  try {
    const getResult = await client.send(
      new GetItemCommand({
        TableName: "DailyTips",
        Key: { id: { S: today } },
      })
    );

    if (!getResult.Item) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "No tip found for today." }),
      };
    }

    const tip = getResult.Item.tip.S;

    return {
      statusCode: 200,
      body: JSON.stringify({ tip }),
    };
  } catch (error) {
    console.error("Error fetching today's tip:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal Server Error" }),
    };
  }
}
