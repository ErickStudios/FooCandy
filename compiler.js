#!/usr/bin/env node
const outter = require("./out");

const args = process.argv.slice(2);

let target = outter.Enums.Targets.I386RealMode;
let picvars = true;
let no_name_upper = false;
let file = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === "-f" && args[i+1]) {
    if (args[i+1] === "i386_real") target = outter.Enums.Targets.I386RealMode;
    if (args[i+1] === "i386_protected") target = outter.Enums.Targets.I386ProtectedMode;
    i++;
  }
  else if (args[i] == "-nopicvars") {
    picvars = false;
  } 
  else if (args[i] == "-nonameupper") {
    no_name_upper = false;
  }
  else {
    file = args[i];
  }
}

if (!file) {
  console.error("Uso: foocandy -f <i386_real|i386_protected> archivo.cdy");
  process.exit(1);
}

// leer archivo.cdy
const fs = require("fs");
const code = fs.readFileSync(file, "utf8");

// compilar
const result = outter.parseCode(code, target, picvars, no_name_upper);
console.log(result);