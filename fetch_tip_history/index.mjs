import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";

const client = new DynamoDBClient({ region: "us-east-1" });
const TABLE_NAME = "DailyTips";

export const handler = async (event) => {
  try {
    const { Items } = await client.send(
      new ScanCommand({
        TableName: TABLE_NAME,
      })
    );

    if (!Items || Items.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "No tips found." }),
      };
    }

    const tips = Items.map(item => ({
      date: item.id.S,
      tip: item.tip.S,
    }));

    // Sort descending by date
    tips.sort((a, b) => (a.date < b.date ? 1 : -1));

    // Limit to last 10 tips
    const latestTips = tips.slice(0, 10);

    return {
      statusCode: 200,
      body: JSON.stringify({ tips: latestTips }),
    };
  } catch (error) {
    console.error("Error fetching tip history:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal Server Error" }),
    };
  }
};
