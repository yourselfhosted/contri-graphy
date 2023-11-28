import { NextRequest } from "next/server";
import fetch from "node-fetch";
import Jimp from "jimp";

interface Contributor {
  login: string;
  id: number;
  node_id: string;
  avatar_url: string;
  gravatar_id: string;
  url: string;
  contributions: number;
}

const GITHUB_API_URL = "https://api.github.com/repos";

export const GET = async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const repo = searchParams.get("repo");

    // Fetch contributors from GitHub API using fetch.
    const contributors = (await (await fetch(`${GITHUB_API_URL}/${repo}/contributors?per_page=100`)).json()) as Contributor[];
    const avatarUrls = contributors.map((contributor) => contributor.avatar_url);

    // Fetch contributor avatars and build an array of image buffers.
    const avatarBuffers = await Promise.all(
      avatarUrls.map(async (avatarUrl) => {
        const avatarResponse = await fetch(avatarUrl + "&s=64");
        return avatarResponse.buffer();
      })
    );

    // Create a Jimp image for each avatar.
    const avatarImages = await Promise.all(
      avatarBuffers.map(async (buffer) => {
        const image = await Jimp.read(buffer);
        return image.resize(64, 64).circle();
      })
    );

    const imageSize = 64;
    const collagePadding = 8;
    const collageWidth = imageSize * 10 + collagePadding * (10 + 1);
    const collageHeight = Math.floor(contributors.length / 10) * imageSize + collagePadding * (Math.floor(contributors.length / 10) + 1);

    // Create a blank Jimp image for the collage.
    const collage = new Jimp(collageWidth, collageHeight, 0x00000000, (err, image) => {
      if (err) throw err;
    });

    // Paste each avatar onto the collage.
    avatarImages.forEach((avatar, index) => {
      const x = (index % Math.sqrt(avatarImages.length)) * imageSize;
      const y = Math.floor(index / Math.sqrt(avatarImages.length)) * imageSize;
      collage.composite(
        avatar,
        x + collagePadding * ((index % Math.sqrt(avatarImages.length)) + 1),
        y + collagePadding * (Math.floor(index / Math.sqrt(avatarImages.length)) + 1)
      );
    });

    // Convert the Jimp image to a buffer.
    const collageBuffer = await collage.getBufferAsync(Jimp.MIME_PNG);

    return new Response(collageBuffer, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
      },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response("Internal server error", {
      status: 500,
    });
  }
};
