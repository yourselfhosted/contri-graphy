import Jimp from "jimp";
import { NextRequest } from "next/server";
import fetch from "node-fetch";

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

// Internal cache to store user avatars.
const avatarCache = new Map<string, ArrayBuffer>();

export const GET = async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const repo = searchParams.get("repo");
    const format = searchParams.get("format") || "svg";

    // Fetch contributors from GitHub API using fetch.
    const response = await fetch(`${GITHUB_API_URL}/${repo}/contributors?per_page=96`, {
      headers: {
        Accept: "application/vnd.github+json",
      },
    });
    const contributors = (await response.json()) as Contributor[];
    // If the repo doesn't exist or has no contributors, return a 404.
    if (Array.isArray(contributors) === false) {
      return new Response("Not found", {
        status: 404,
      });
    }

    const avatarUrls = contributors.map((contributor) => contributor.avatar_url);

    // Fetch contributor avatars and build an array of image array buffers.
    const avatarBuffers = await Promise.all(
      avatarUrls.map(async (avatarUrl) => {
        if (avatarCache.has(avatarUrl)) {
          return avatarCache.get(avatarUrl) as ArrayBuffer;
        }
        const avatarResponse = await fetch(avatarUrl + "&s=64");
        const arrayBuffer = await avatarResponse.arrayBuffer();
        avatarCache.set(avatarUrl, arrayBuffer);
        return arrayBuffer;
      }),
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
      avatarBuffers.map(async (arrayBuffer) => {
        const image = await Jimp.read(Buffer.from(arrayBuffer));
        return image.resize(64, 64).circle();
      }),
    );

    const graphWidth = AVATAR_SIZE * ROW_COUNT + IMAGE_PADDING * (ROW_COUNT + 1);
    const graphHeight =
      Math.floor(contributors.length / ROW_COUNT) * AVATAR_SIZE + IMAGE_PADDING * (Math.floor(contributors.length / ROW_COUNT) + 1);

    // Create a blank Jimp image for the graph.
    const graph = new Jimp(graphWidth, graphHeight, 0x00000000, (err) => {
      if (err) throw err;
    });

    // Paste each avatar onto the graph.
    avatarImages.forEach((avatar, index) => {
      const rowIndex = Math.floor(index / ROW_COUNT);
      const columnIndex = index % ROW_COUNT;
      const x = columnIndex * AVATAR_SIZE + IMAGE_PADDING * (columnIndex + 1);
      const y = rowIndex * AVATAR_SIZE + IMAGE_PADDING * (rowIndex + 1);
      graph.composite(avatar, x, y);
    });

    // Convert the Jimp image to a buffer.
    const graphBuffer = await graph.getBufferAsync(Jimp.MIME_PNG);

    return new Response(graphBuffer, {
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
function generateSVG(avatars: ArrayBuffer[]): string {
  const avatarUrls = avatars.map((arrayBuffer: any) => {
    const base64 = Buffer.from(arrayBuffer).toString("base64");
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
