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
const ROW_COUNT = 12;
const AVATAR_SIZE = 64;
const IMAGE_PADDING = 8;

export const GET = async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const repo = searchParams.get("repo");
    const format = searchParams.get("format");

    // Fetch contributors from GitHub API using fetch.
    const contributors = (await (await fetch(`${GITHUB_API_URL}/${repo}/contributors?per_page=96`)).json()) as Contributor[];
    const avatarUrls = contributors.map((contributor) => contributor.avatar_url);

    // Fetch contributor avatars and build an array of image buffers.
    const avatarBuffers = await Promise.all(
      avatarUrls.map(async (avatarUrl) => {
        const avatarResponse = await fetch(avatarUrl + "&s=64");
        return avatarResponse.buffer();
      })
    );

    if (format === "svg") {
      // Generate SVG markup with rounded avatars.
      const svgMarkup = generateSVG(avatarBuffers);

      return new Response(svgMarkup, {
        status: 200,
        headers: {
          "Content-Type": "image/svg+xml",
        },
      });
    }

    // Create a Jimp image for each avatar.
    const avatarImages = await Promise.all(
      avatarBuffers.map(async (buffer) => {
        const image = await Jimp.read(buffer);
        return image.resize(64, 64).circle();
      })
    );

    const collageWidth = AVATAR_SIZE * ROW_COUNT + IMAGE_PADDING * (ROW_COUNT + 1);
    const collageHeight =
      Math.floor(contributors.length / ROW_COUNT) * AVATAR_SIZE + IMAGE_PADDING * (Math.floor(contributors.length / ROW_COUNT) + 1);

    // Create a blank Jimp image for the collage.
    const collage = new Jimp(collageWidth, collageHeight, 0x00000000, (err, image) => {
      if (err) throw err;
    });

    // Paste each avatar onto the collage.
    avatarImages.forEach((avatar, index) => {
      const rowIndex = Math.floor(index / ROW_COUNT);
      const columnIndex = index % ROW_COUNT;
      const x = columnIndex * AVATAR_SIZE + IMAGE_PADDING * (columnIndex + 1);
      const y = rowIndex * AVATAR_SIZE + IMAGE_PADDING * (rowIndex + 1);
      collage.composite(avatar, x, y);
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

// Generate SVG markup with rounded avatars.
function generateSVG(avatars: Buffer[]): string {
  const avatarUrls = avatars.map((buffer: any) => {
    const base64 = buffer.toString("base64");
    return `data:image/png;base64,${base64}`;
  });
  const svgWidth = AVATAR_SIZE * ROW_COUNT + IMAGE_PADDING * (ROW_COUNT + 1);
  const svgHeight =
    Math.floor(avatarUrls.length / ROW_COUNT) * AVATAR_SIZE + IMAGE_PADDING * (Math.floor(avatarUrls.length / ROW_COUNT) + 1);

  const svgHeader = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}">`;
  let svgBody = "";

  avatarUrls.forEach((url, index) => {
    const rowIndex = Math.floor(index / ROW_COUNT);
    const columnIndex = index % ROW_COUNT;
    const x = columnIndex * AVATAR_SIZE + IMAGE_PADDING * (columnIndex + 1);
    const y = rowIndex * AVATAR_SIZE + IMAGE_PADDING * (rowIndex + 1);

    // Add a unique clipPath for each avatar with rounded corners.
    const clipPathId = `rounded-clip-path-${index}`;
    svgBody += `<defs><clipPath id="${clipPathId}"><circle cx="${x + AVATAR_SIZE / 2}" cy="${y + AVATAR_SIZE / 2}" r="${
      AVATAR_SIZE / 2
    }"/></clipPath></defs>`;

    // Add an image element for each avatar with rounded corners.
    svgBody += `<image x="${x}" y="${y}" width="${AVATAR_SIZE}" height="${AVATAR_SIZE}" href="${url}" clip-path="url(#${clipPathId})" />`;
  });

  const svgFooter = "</svg>";

  return svgHeader + svgBody + svgFooter;
}
