const fs = require("fs");
const path = require("path");

// Read font files and convert to base64
const regularFont = fs.readFileSync(
  path.join(__dirname, "public/fonts/Cairo-Regular.ttf"),
  "base64"
);
const boldFont = fs.readFileSync(
  path.join(__dirname, "public/fonts/Cairo-Bold.ttf"),
  "base64"
);

// Create VFS file
const vfsContent = `this.pdfMake = this.pdfMake || {};
pdfMake.vfs = {
  "Cairo-Regular.ttf": "${regularFont}",
  "Cairo-Bold.ttf": "${boldFont}"
};
`;

fs.writeFileSync(
  path.join(__dirname, "public/fonts/vfs_fonts.js"),
  vfsContent
);

console.log("✅ VFS fonts file created!");
