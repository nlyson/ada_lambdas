import * as https from 'node:https';

export const handler = (event, context, callback) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (event.httpMethod === "OPTIONS") {
    return callback(null, {
      statusCode: 200,
      //headers: corsHeaders,
      body: "",
    });
  }

  console.log("EVENT:", JSON.stringify(event));

  try {
    const parsedBody = JSON.parse(event.body || "{}");
    const userMessage = parsedBody.userMessage;
    const systemMessage = parsedBody.systemMessage || "You are a helpful assistant.";

    if (!userMessage) {
      return callback(null, {
        statusCode: 400,
        //headers: corsHeaders,
        body: JSON.stringify({ error: "Missing 'userMessage'" }),
      });
    }

    const messages = [
      { role: "system", content: systemMessage },
      { role: "user", content: userMessage }
    ];

    const postData = JSON.stringify({
      model: "gpt-4.1-mini",
      messages: messages,
      max_tokens: 1000,
    });

    const options = {
      hostname: "api.openai.com",
      port: 443,
      path: "/v1/chat/completions",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Length": Buffer.byteLength(postData),
      },
    };

    const req = https.request(options, (res) => {
      let responseBody = "";

      res.setEncoding("utf8");
      res.on("data", (chunk) => responseBody += chunk);
      res.on("end", () => {
        try {
          const data = JSON.parse(responseBody);
          if (data.error) {
            return callback(null, {
              statusCode: 500,
              //headers: corsHeaders,
              body: JSON.stringify({ error: data.error.message }),
            });
          }

          return callback(null, {
            statusCode: 200,
            //headers: corsHeaders,
            body: JSON.stringify({ result: data.choices?.[0]?.message?.content || "No result." }),
          });
        } catch (parseErr) {
          console.error("Parse error:", parseErr);
          return callback(null, {
            statusCode: 500,
            //headers: corsHeaders,
            body: JSON.stringify({ error: "Error parsing response." }),
          });
        }
      });
    });

    req.on("error", (err) => {
      console.error("HTTPS Error:", err);
      return callback(null, {
        statusCode: 500,
        //headers: corsHeaders,
        body: JSON.stringify({ error: "Failed to send request." }),
      });
    });

    req.write(postData);
    req.end();
  } catch (err) {
    console.error("Catch block error:", err);
    return callback(null, {
      statusCode: 500,
      //headers: corsHeaders,
      body: JSON.stringify({ error: "Unexpected server error." }),
    });
  }
};
