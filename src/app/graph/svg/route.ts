import { NextRequest } from "next/server";

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
    const contributors = (await (await fetch(`${GITHUB_API_URL}/${repo}/contributors?per_page=96`)).json()) as Contributor[];
    const avatarUrls = contributors.map((contributor) => contributor.avatar_url);

    // Generate SVG markup with rounded avatars.
    const svgMarkup = generateSVG(avatarUrls);

    return new Response(svgMarkup, {
      status: 200,
      headers: {
        "Content-Type": "image/svg+xml",
      },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response("Internal server error", {
      status: 500,
    });
  }
};

// Function to generate SVG markup with rounded avatars.
function generateSVG(avatarUrls: string[]): string {
  const rowCount = 12;
  const collagePadding = 8;
  const imageSize = 64;
  const svgWidth = imageSize * rowCount + collagePadding * (rowCount + 1);
  const svgHeight = Math.floor(avatarUrls.length / rowCount) * imageSize + collagePadding * (Math.floor(avatarUrls.length / rowCount) + 1);

  const svgHeader = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}">`;
  let svgBody = "";

  avatarUrls.forEach((url, index) => {
    const rowIndex = Math.floor(index / rowCount);
    const columnIndex = index % rowCount;
    const x = columnIndex * imageSize + collagePadding * (columnIndex + 1);
    const y = rowIndex * imageSize + collagePadding * (rowIndex + 1);

    // Add a unique clipPath for each avatar with rounded corners.
    const clipPathId = `rounded-clip-path-${index}`;
    svgBody += `<defs><clipPath id="${clipPathId}"><circle cx="${x + imageSize / 2}" cy="${y + imageSize / 2}" r="${
      imageSize / 2
    }"/></clipPath></defs>`;

    // Add an image element for each avatar with rounded corners.
    svgBody += `<image x="${x}" y="${y}" width="${imageSize}" height="${imageSize}" href="${
      url + ";s=64"
    }" clip-path="url(#${clipPathId})" />`;
  });

  const svgFooter = "</svg>";

  return svgHeader + svgBody + svgFooter;
}
