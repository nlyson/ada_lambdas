import { S3Client, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({ region: "us-east-1" });

const BUCKET_NAME = "amplify-d1gu2movs4qop8-nl-appstoragebucket6cbf3fd8-9ej6aeyhtt6o";

export const handler = async (event) => {
  try {
    const result = await s3.send(
      new ListObjectsV2Command({
        Bucket: BUCKET_NAME,
        Prefix: "user-creations/",
        Delimiter: "/",
      })
    );

    const userFolders = result.CommonPrefixes?.map(prefixObj => prefixObj.Prefix) || [];

    const featuredPhotos = [];

    for (const userFolder of userFolders) {
      const username = userFolder.split("/")[1];

      const userImages = await s3.send(
        new ListObjectsV2Command({
          Bucket: BUCKET_NAME,
          Prefix: userFolder,
        })
      );

      const images = userImages.Contents || [];
      if (images.length > 0) {
        const randomIndex = Math.floor(Math.random() * images.length);
        const randomImage = images[randomIndex];

        const signedUrl = await getSignedUrl(
          s3,
          new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: randomImage.Key,
          }),
          { expiresIn: 3600 } // 1 hour expiry
        );

        featuredPhotos.push({
          username,
          photoUrl: signedUrl,
        });
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ featuredPhotos }),
    };
  } catch (error) {
    console.error("Error generating featured photos:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal Server Error" }),
    };
  }
};
