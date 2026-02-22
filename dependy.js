// dependencias
const fs =                                  require("fs");
const path =                                require("path");
const lib_path =                            path.join(__dirname, "library");
const json_config_path =                    path.join(lib_path, "dependy.json");
const secondary_json_config_path =          path.join(process.cwd(), "candydep.json");
// variables
var activeJson =                            JSON.parse(fs.readFileSync(json_config_path, "utf-8"));
// clases
class PathDependy {constructor(logica_nsp, directory) {
    this.logica_nsp =                       logica_nsp;
    this.directory =                        directory;
}};
// funciones
function checkDependenceTree() {
    activeJson =                            JSON.parse(fs.readFileSync(json_config_path, "utf-8"));
    const results = [];

    function addModulesFromJson(jsonObj, basePath) {
        for (const key of Object.keys(jsonObj)) {
            const node = jsonObj[key];
            if (node && typeof node === "object" && node.type === "moducandy.module.tree" && Array.isArray(node.modules)) {
                for (const moduleName of node.modules) {
                    results.push(new PathDependy(
                        key + "::" + moduleName,
                        path.join(basePath, node.path, moduleName.toLowerCase() + ".cdy")
                    ));
                }
            }
        }
    }

    // primero dependencias primarias
    addModulesFromJson(activeJson, lib_path);

    // luego secundarias si existen
    if (fs.existsSync(secondary_json_config_path)) {
        const secondaryJson = JSON.parse(fs.readFileSync(secondary_json_config_path, "utf-8"));
        addModulesFromJson(secondaryJson, process.cwd());
    }

    return results;
}

module.exports = {checkDependenceTree,PathDependy};