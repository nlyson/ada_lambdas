import * as https from 'node:https';

export const handler = (event, context, callback) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  // Handle preflight
  if (event.httpMethod === "OPTIONS") {
    return callback(null, {
      statusCode: 200,
      //headers: corsHeaders,
      body: "",
    });
  }

  // Log the full event
  console.log("EVENT:", JSON.stringify(event));

  try {
    const parsedBody = JSON.parse(event.body || "{}");
    const imageUrl = parsedBody.imageUrl;

    console.log("Parsed imageUrl:", imageUrl);

    if (!imageUrl) {
      return callback(null, {
        statusCode: 400,
        //headers: corsHeaders,
        body: JSON.stringify({ error: "Missing 'imageUrl'" }),
      });
    }

    const messages = [
      {
        role: "system",
        content: "You are an expert photographer. Analyze the uploaded photo for composition, lighting, subject, focus, and artistic quality. Give actionable advice, as if critiquing for improvement.",
      },
      {
        role: "user",
        content: [
          { type: "text", text: "Please review this photo." },
          { type: "image_url", image_url: { url: imageUrl } },
        ],
      },
    ];

    const postData = JSON.stringify({
      model: "gpt-4.1-mini",
      messages,
      max_tokens: 1000,
    });

    console.log("Post data:", postData);

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
              headers: corsHeaders,
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

    // ✅ Make sure postData is NOT undefined
    if (!postData) {
      throw new Error("postData is undefined before write()");
    }

    req.write(postData); // ✅ this is what was undefined before
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
