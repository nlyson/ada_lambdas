export async function handler(event) {
  const RSS_URL = "https://feeds.buzzsprout.com/2408212.rss"; // ✅ Correct URL now

  try {
    const response = await fetch(RSS_URL);
    const rssText = await response.text();

    //console.log("✅ RSS Feed Fetched. Length:", rssText.length);
    //console.log("🔎 Sample:", rssText.slice(0, 200)); // Just preview

    return {
      statusCode: 200,
      headers: {
        //"Access-Control-Allow-Origin": "*",
        //"Access-Control-Allow-Headers": "*",
        //"Access-Control-Allow-Methods": "*",
        "Content-Type": "application/xml",
      },
      body: rssText,
    };
  } catch (error) {
    console.error("❌ Error fetching RSS feed:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to fetch podcast feed." }),
    };
  }
}
