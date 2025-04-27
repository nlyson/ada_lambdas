import { DynamoDBClient, GetItemCommand, PutItemCommand, ScanCommand } from "@aws-sdk/client-dynamodb";

const client = new DynamoDBClient({ region: "us-east-1" });
const DAILY_TIP_LAMBDA_URL = "https://mxxgmre43oe44ufw2n7ub7dxnm0tskjq.lambda-url.us-east-1.on.aws/chat_with_gpt";

export async function handler(event) {
  const today = new Date().toISOString().slice(0, 10);

  try {
    // Step 1: Check if today's tip already exists
    const getResult = await client.send(
      new GetItemCommand({
        TableName: "DailyTips",
        Key: { id: { S: today } },
      })
    );

    if (getResult.Item) {
      console.log(`Tip already exists for ${today}:`, getResult.Item.tip.S);
      return {
        statusCode: 200,
        body: JSON.stringify({ message: "Tip already exists for today." }),
      };
    }

    console.log(`No tip found for ${today}. Generating...`);

    // Step 2: Fetch previous tips
    const previousTipsResult = await client.send(
      new ScanCommand({
        TableName: "DailyTips",
      })
    );

    const previousTips = previousTipsResult.Items?.map(item => item.tip.S) || [];
    const lastFewTips = previousTips.slice(-10);

    // Step 3: Call tip generator
    const response = await fetch(DAILY_TIP_LAMBDA_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userMessage: `Give me a daily photography tip. Make sure it is different from these: ${lastFewTips.join(' | ')}`,
        systemMessage: "You are a professional photography coach. Respond with ONLY the tip itself, directly, no extra commentary.",
      }),
    });

    const result = await response.json();
    const tip = result.result?.trim();

    if (!tip) {
      throw new Error("Failed to generate tip.");
    }

    // Step 4: Save the tip
    await client.send(
      new PutItemCommand({
        TableName: "DailyTips",
        Item: {
          id: { S: today },
          tip: { S: tip },
          timestamp: { S: new Date().toISOString() },
        },
      })
    );

    console.log(`Tip saved for ${today}:`, tip);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Tip generated and saved successfully." }),
    };
  } catch (error) {
    console.error("Error generating or saving daily tip:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal Server Error", error: error.message }),
    };
  }
}
