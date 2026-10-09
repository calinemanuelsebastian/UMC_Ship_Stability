import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFile, mkdir, copyFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { shipPackageFiles, validateBuiltInShips } from './scripts/ship-package-files.ts'

let outputDir='dist';
let building=false;
const localBase = '/local-reviewed-vessel/';
const sourceDir = fileURLToPath(new URL('./validation-references/reviewed-apples-vessel/', import.meta.url));
const packageFiles = () => shipPackageFiles(sourceDir, ['vectis-castle-apples.geometry.json', 'hull-curves.svg']);
let files = new Set<string>();

// https://vite.dev/config/
export default defineConfig({
  optimizeDeps: { include: ['three', 'three/addons/controls/OrbitControls.js', 'three/addons/loaders/GLTFLoader.js', 'three/addons/lines/Line2.js', 'three/addons/lines/LineGeometry.js', 'three/addons/lines/LineMaterial.js', 'three/addons/lines/LineSegments2.js', 'three/addons/lines/LineSegmentsGeometry.js'] },
  plugins: [react(), {
    name: 'local-reviewed-vessel',
    configResolved(config){outputDir=resolve(config.root,config.build.outDir);building=config.command==='build';},
    async buildStart(){ files = await packageFiles(); },
    async closeBundle(){
      if(!building)return;
      const target=resolve(outputDir,'built-in-ship-models/reviewed-apples-vessel');
      await Promise.all([...files].map(async file=>{
        const destination=resolve(target,file);
        await mkdir(dirname(destination),{recursive:true});
        await copyFile(resolve(sourceDir,file),destination);
      }));
      await validateBuiltInShips(outputDir);
    },
    async configureServer(server) {
      files = await packageFiles();
      server.middlewares.use(async (req, res, next) => {
        const path = req.url?.split('?')[0];
        const prefix=path?.startsWith(localBase)?localBase:'/built-in-ship-models/reviewed-apples-vessel/';
        if (!path?.startsWith(prefix)) return next();
        const file = path.slice(prefix.length);
        if (!files.has(file)) { res.statusCode = 404; res.end(); return; }
        try {
          const data = await readFile(new URL(`./validation-references/reviewed-apples-vessel/${file}`, import.meta.url));
          res.setHeader('Content-Type', file.endsWith('.csv') ? 'text/csv' : file.endsWith('.svg') ? 'image/svg+xml' : file.endsWith('.gltf') ? 'model/gltf+json' : 'application/json');
          res.setHeader('Cache-Control', 'no-store');
          res.end(data);
        } catch { res.statusCode = 404; res.end(); }
      });
    },
  }],
  // Poll for edits made by external tools as well as the editor.
  server: { watch: { usePolling: true, interval: 300 } },
})
