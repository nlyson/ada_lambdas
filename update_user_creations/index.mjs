import { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({ region: "us-east-1" });
const BUCKET_NAME = "amplify-d1gu2movs4qop8-nl-appstoragebucket6cbf3fd8-9ej6aeyhtt6o";

export const handler = async (event) => {
  const { action, username, fileName, fileContent, fileType } = JSON.parse(event.body || '{}');

  const userFolder = `user-creations/${username}/`;

  try {
    if (action === "upload") {
      // Check how many items user already has
      const { Contents } = await s3.send(new ListObjectsV2Command({
        Bucket: BUCKET_NAME,
        Prefix: `user-creations/${username}/`,
      }));

      if ((Contents?.length || 0) >= 10) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "Upload limit reached. Max 10 uploads allowed." }),
        };
      }
      const key = `${userFolder}${Date.now()}_${fileName}`;
      await s3.send(new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: Buffer.from(fileContent, 'base64'), // image comes in base64
        ContentType: fileType,
      }));
      return { statusCode: 200, body: JSON.stringify({ message: "Upload successful", key }) };
    }

    if (action === "list") {
      try {
        const { Contents } = await s3.send(new ListObjectsV2Command({
          Bucket: BUCKET_NAME,
          Prefix: userFolder,
        }));
  
        const items = Contents || [];
  
        // Generate a signed URL for each object
        const signedItems = await Promise.all(
          items.map(async (item) => {
            const url = await getSignedUrl(
              s3,
              new GetObjectCommand({
                Bucket: BUCKET_NAME,
                Key: item.Key,
              }),
              { expiresIn: 3600 } // 1 hour expiration
            );
  
            return {
              key: item.Key,
              url,
            };
          })
        );
  
        return {
          statusCode: 200,
          body: JSON.stringify({ items: signedItems }),
        };
      } catch (err) {
        console.error(err);
        return { statusCode: 500, body: JSON.stringify({ error: "Failed to list objects" }) };
      }
    }

    if (action === "delete") {
      await s3.send(new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: `${userFolder}${fileName}`,
      }));
      return { statusCode: 200, body: JSON.stringify({ message: "Delete successful" }) };
    }

    return { statusCode: 400, body: JSON.stringify({ error: "Invalid action" }) };
  } catch (error) {
    console.error(error);
    return { statusCode: 500, body: JSON.stringify({ error: "Server error" }) };
  }
};
