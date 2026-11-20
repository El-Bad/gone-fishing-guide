// Copy what the app needs from the field-guide project into live/public/ (served as-is by Vite and the Worker):
//   maps/<id>.webp, maps/<id>-depth.webp, maps/maps.json   (map images, depth charts, landmarks)
//   guide/index.html                                       (the single-file field guide, at /guide/)
import { copyFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const live = join(dirname(fileURLToPath(import.meta.url)), "..");
const root = join(live, "..");
const pub = join(live, "public");

mkdirSync(join(pub, "maps"), { recursive: true });
let n = 0;
for (const f of readdirSync(join(root, "source", "maps"))) {
  if (/\.(webp)$/.test(f) || f === "maps.json") { copyFileSync(join(root, "source", "maps", f), join(pub, "maps", f)); n++; }
}
const guide = join(root, "GONE-Fishing-Field-Guide.html");
if (existsSync(guide)) {
  mkdirSync(join(pub, "guide"), { recursive: true });
  copyFileSync(guide, join(pub, "guide", "index.html"));
  n++;
}
console.log(`prepare-public: copied ${n} files into live/public`);
