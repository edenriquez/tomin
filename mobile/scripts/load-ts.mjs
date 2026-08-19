/**
 * Loads a TypeScript module from `src/` into this Node process, so the
 * verification scripts exercise the *real* app code rather than a copy.
 *
 * Compiles to CommonJS and evaluates through a genuine `Module`, which gives
 * the file a working `require` rooted at its own directory — needed because
 * some of these modules pull in npm packages (e.g. the streams ponyfill), and a
 * `data:` URL import cannot resolve bare specifiers.
 */
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const Module = require("node:module");

export function loadTs(absolutePath) {
    const source = readFileSync(absolutePath, "utf8");
    const { outputText } = ts.transpileModule(source, {
        compilerOptions: {
            target: ts.ScriptTarget.ES2020,
            module: ts.ModuleKind.CommonJS,
            esModuleInterop: true,
        },
        fileName: absolutePath,
    });

    const module = new Module(absolutePath, null);
    module.filename = absolutePath;
    module.paths = Module._nodeModulePaths(path.dirname(absolutePath));
    module._compile(outputText, absolutePath);
    return module.exports;
}
