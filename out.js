const {PathDependy, checkDependenceTree} = require("./dependy.js")
const fs = require("fs");

class Enums {
  static TypeOfData = {
    Function: 0,
    Variable: 1
  };
  static Targets = {
    I386RealMode: 0,
    I386ProtectedMode: 1,
    ARMv7: 2,
    ARM64: 3
  }
}

var RegisterMaps = {
  [Enums.Targets.I386RealMode]: {
    r1: "ax", r2: "cx", r3: "dx", r4: "bx", r5: "sp", r6: "bp", r7: "si", r8: "di"
  },
  [Enums.Targets.I386ProtectedMode]: {
    r1: "eax", r2: "ecx", r3: "edx", r4: "ebx", r5: "esp", r6: "ebp", r7: "esi", r8: "edi"
  },
  [Enums.Targets.ARMv7]: {
    r1: "r0", r2: "r1", r3: "r2", r4: "r3", r5: "sp", r6: "r4", r7: "r5", r8: "r6"
  },
  [Enums.Targets.ARM64]: {
    r1: "x0", r2: "x1", r3: "x2", r4: "x3", r5: "sp", r6: "x4", r7: "x5", r8: "x6"
  }
};

function emitAdd(dest, src) {
  switch (ActualTarget) {
    case Enums.Targets.I386RealMode:
    case Enums.Targets.I386ProtectedMode:
      return `add ${dest},${src}\n`;
    case Enums.Targets.ARMv7:
      return `add ${dest}, ${dest}, ${src}\n`;

    case Enums.Targets.ARM64:
      return `add ${dest}, ${dest}, ${src}\n`;
  }
}
function emitSub(dest, src) {
  switch (ActualTarget) {

    case Enums.Targets.I386RealMode:
    case Enums.Targets.I386ProtectedMode:
      return `sub ${dest},${src}\n`;

    case Enums.Targets.ARMv7:
      return `sub ${dest}, ${dest}, ${src}\n`;

    case Enums.Targets.ARM64:
      return `sub ${dest}, ${dest}, ${src}\n`;
  }
}
function emitMul(dest, src) {
  switch (ActualTarget) {

    case Enums.Targets.I386ProtectedMode:
    case Enums.Targets.I386RealMode:
      return `imul ${dest},${src}\n`;

    case Enums.Targets.ARMv7:
      return `mul ${dest}, ${dest}, ${src}\n`;

    case Enums.Targets.ARM64:
      return `mul ${dest}, ${dest}, ${src}\n`;
  }
}
function emitDiv(dest, src, Tabulators) {
  switch (ActualTarget) {

    case Enums.Targets.I386ProtectedMode:
      return `push eax
${Tabulators}push edx
${Tabulators}mov eax, ${dest}
${Tabulators}cdq
${Tabulators}idiv ${src}
${Tabulators}mov ${dest}, eax
${Tabulators}pop edx
${Tabulators}pop eax
`;

    case Enums.Targets.ARMv7:
      return `sdiv ${dest}, ${dest}, ${src}\n`;

    case Enums.Targets.ARM64:
      return `sdiv ${dest}, ${dest}, ${src}\n`;
  }
}
function emitJumpEQ(label) {
  switch (ActualTarget) {

    case Enums.Targets.I386RealMode:
    case Enums.Targets.I386ProtectedMode:
      return `je ${label}\n`;

    case Enums.Targets.ARMv7:
    case Enums.Targets.ARM64:
      return `beq ${label}\n`;
  }
}
function emitPush(reg) {
  switch (ActualTarget) {

    case Enums.Targets.I386RealMode:
    case Enums.Targets.I386ProtectedMode:
      return `push ${reg}\n`;

    case Enums.Targets.ARMv7:
      return `push {${reg}}\n`;

    case Enums.Targets.ARM64:
      return `str ${reg}, [sp, #-16]!\n`;
  }
}
function emitPop(reg) {
  switch (ActualTarget) {

    case Enums.Targets.I386RealMode:
    case Enums.Targets.I386ProtectedMode:
      return `pop ${reg}\n`;

    case Enums.Targets.ARMv7:
      return `pop {${reg}}\n`;

    case Enums.Targets.ARM64:
      return `ldr ${reg}, [sp], #16\n`;
  }
}
function emitJumpGT(label) {
  switch (ActualTarget) {

    case Enums.Targets.I386RealMode:
    case Enums.Targets.I386ProtectedMode:
      return `jg ${label}\n`;

    case Enums.Targets.ARMv7:
    case Enums.Targets.ARM64:
      return `bgt ${label}\n`;
  }
}
function emitJumpLT(label) {
  switch (ActualTarget) {

    case Enums.Targets.I386RealMode:
    case Enums.Targets.I386ProtectedMode:
      return `jl ${label}\n`;

    case Enums.Targets.ARMv7:
    case Enums.Targets.ARM64:
      return `blt ${label}\n`;
  }
}

var globalSymbolsExpands = new Map();

var ActualTarget = Enums.Targets.I386ProtectedMode;
var AllowStackPic = true;
var NoNameUpper = false;

/** @param {string} candyVar */
function candyVarToRegister(candyVar) {
  if (candyVar.startsWith("[Uint32]") || candyVar.startsWith("[Int32]")) {
    return "dword " + candyVarToRegister(candyVar.startsWith("[Uint32]") ? candyVar.substring(8) : candyVar.substring(7));
  } else if (candyVar.startsWith("[Uint16]") || candyVar.startsWith("[Int16]")) {
    return "word " + candyVarToRegister(candyVar.startsWith("[Uint16]") ? candyVar.substring(8) : candyVar.substring(7));
  } else if (candyVar.startsWith("[Uint8]") || candyVar.startsWith("[Int8]")) {
    return "byte " + candyVarToRegister(candyVar.startsWith("[Uint8]") ? candyVar.substring(7) : candyVar.substring(6));
  }
  
  if (candyVar.startsWith("[") && candyVar.endsWith("]"))
  {
    return "[" + candyVarToRegister(candyVar.slice(1, -1)) + "]";
  }

  if (globalSymbolsExpands.has(candyVar)) return globalSymbolsExpands.get(candyVar)

  const map = RegisterMaps[ActualTarget];

  if (map && map[candyVar]) {
    return map[candyVar];
  }

  return candyVar;
}

function isLetter(c) {
  return (
    (c >= 'A' && c <= 'Z') ||
    (c >= 'a' && c <= 'z') ||
    (c >= '0' && c <= '9') ||
    c === '_' ||
    c === '[' ||
    c === ']' ||
    c === ':' ||
    c === '.'
  );
}

class VariableModuCandy {
  constructor(name, type, offset) {
    this.name = name;
    this.type = type;
    this.offset = offset;
  }
}

function parseCodeInternal(code) {
  /** @type { Map<string, number>} */
  let Symbols = new Map();
  let structsAsMacros = [];
  let structsExp = new Map();

  let Tabulators = "   ";

  let codeRet = "";
  let wordSymbol = "";
  let typeUse = "";

  let dataSection =
`DATA_MODUCANDY_DATA:
   call DATA_MODUCANDY_DATA_GETEIP
   ret
   ;datas
`;

  let datasReal = "";
  let datasFunctions =
`; ModuCandy: eip get runtime for data calc
DATA_MODUCANDY_DATA_GETEIP:
   pop eax
   push eax
   inc eax
   ret
`;

  let variables = [];
  let offsetActual = 0;
  let atributes = "";

  let inComment = false;
  let typeUsage = false;

  for (let i = 0; i < code.length; i++) {
    const c = code[i];

    // comentario
    if (inComment) {
      codeRet += c;
      if (c === '\n') inComment = false;
      continue;
    }

    // acumulación de símbolo
    if (isLetter(c)) {
      if (wordSymbol.length === 0 && c >= 'A' && c <= 'Z') {
        typeUsage = true;
      }

      if (typeUsage)
      {
        typeUse += c;
      }
      wordSymbol += c;
      continue;
    }

    // cierre de palabra
    if (typeUsage) {
        typeUsage = false;
      }
      else if (typeUse !== "") {
          // fn
          if (wordSymbol === "fn") {
            i++;
            while (code[i] === ' ' || code[i] === '\t') i++;

            let funcName = "";
            while (isLetter(code[i])) {
              funcName += code[i++];
            }

            Symbols.set(funcName, Enums.TypeOfData.Function);
            codeRet += `; type=${typeUse}\n${funcName}:\n`;
          }

          // let
          else if (wordSymbol === "let") {
            i++;
            while (code[i] === ' ' || code[i] === '\t') i++;

            let varName = "";
            while (isLetter(code[i])) {
              varName += code[i++];
            }

            let imaginaryFinded = false;

            if (atributes.includes("imaginary=true"))
            {
              if (atributes.includes("org=")) {
                let org = Number(atributes.split("org=")[1].split(",")[0]);
                  globalSymbolsExpands.set(varName, org.toString())

                if (structsExp.has(typeUse)) {
                  for (const abc of structsExp.get(typeUse))
                  {
                    globalSymbolsExpands.set(varName + "." + abc.field, (org + abc.offset).toString())
                  }
                  imaginaryFinded = true;
                }
              }
            }

            if (!imaginaryFinded) {
            if (structsAsMacros.includes(typeUse)) {
              codeRet += "instance_" + typeUse + " " + varName;
            }
            else {
            let compileAsStru = false;
            for (let av of variables)
            {
              let a = typeUse;
              a += "::__New__";

              if (av.name == a)
              {
                compileAsStru = true;
                for (let av2 of variables) {
                  let str2 = av2.name;
                  let str1 = typeUse + "::";
                  let len = str1.length;
                  let comparate = str2.startsWith(str1) ? 0 : -1;

                  if (comparate == 0)
                  {
                    str2 = str2.substring(len);
                    // simular el ret ;place for a struct field
                    for (let i = 0; i < (av2.type === "u32" ? 4 : ( av2.type == "stru" ? 0 : 1)); i++) {
                        datasReal += "   ret ;place for a struct field\n";
                    }

                    let Variable = new VariableModuCandy(varName + "::" + str2, av2.type, offsetActual);

                    offsetActual += (av2.type === "u32" ? 4 : ( av2.type == "stru" ? 0 : 1));
                    Symbols.set(Variable.name, Enums.TypeOfData.Variable);
                    variables.push(Variable);
                  }
                }
                break;
              }
            }
            if (compileAsStru == false) {
              Symbols.set(varName, Enums.TypeOfData.Variable);
            if (typeUse === "BuiltIn_u32" || typeUse === "BuiltIn_i32") {
              for (let a = 0; a < 4; a++) {
                datasReal += "   ret ;place for variable (u/i32)\n";
              }

              variables.push(
                new VariableModuCandy(varName, "u32", offsetActual)
              );
              offsetActual += 4;
            }
            else if (typeUse === "BuiltIn_u8" || typeUse === "BuiltIn_i8") {
              datasReal += "   ret ;place for variable (u/i8)\n";

              variables.push(
                new VariableModuCandy(varName, "u8", offsetActual)
              );
              offsetActual += 1;
            }
          }
          }
        }
      }
          typeUse = "";
      }
      if (wordSymbol === "return") {
          codeRet += Tabulators + ((ActualTarget == Enums.Targets.ARMv7) || (ActualTarget == Enums.Targets.ARM64) ? "bx lr\n" :  "ret\n");
      }
      else if (wordSymbol == "__pragma__") {
        i++;
        if (code.slice(i, -1).startsWith("ifarch=")) {
          i+= 7;
          let candyVar = "";
          while (isLetter(code[i])) {
              candyVar += code[i];
              i++;
          }

          if (ActualTargetStr != candyVar) {
            let str_engached = "";
            while (!str_engached.endsWith("__endif__"))
            {
              str_engached += code[i];
              i++;
            }
          }
        }
      }
      else if (wordSymbol == "stru") {
        let make_struct_macro = false;
        if (atributes !== "") {
          if (atributes.includes("useMacros=true")) {
            make_struct_macro = true;
          }
        }

        atributes = "";

          i++;
        let candyVar = "";
        while (isLetter(code[i])) {
            candyVar += code[i];
            i++;
        }
  
        if (make_struct_macro) {
          while (code[i] == ' ') { i++; }
          if (code[i] == '{') {
            i++;
            let struct = "";
            while (code[i] != '}')
            { 
                struct += code[i];
                i++;
            }
            let offsets_expand = "";
            let macro_expand = "%macro instance_" + candyVar + " 1\n%1:\n"
            let offset_struct = 0;
            let regex = /\b([A-Z]\w*)\b\s+\blet\b\s+([\w:.]+)/g;

            let match;
            let results = [];

            while ((match = regex.exec(struct)) !== null) {
              macro_expand += `   .${match[2]} ${
                (match[1] == "Int32" || match[1] == "Uint32") ? "dd" :
                (match[1] == "Int16" || match[1] == "Uint16") ? "dw" :
                (match[1] == "Int8" || match[1] == "Uint8") ? "db" : "db"
              } 0\n`;
              offsets_expand += `Offset_${candyVar}_${match[2]} equ ${offset_struct.toString()}\n`
              results.push({
                type: match[1],   // Grupo 1: nombre de la estructura
                field: match[2],   // Grupo 2: campo con tipo
                offset: offset_struct
              });
              offset_struct += (match[1] == "Int32" || match[1] == "Uint32") ? 4 :
                (match[1] == "Int16" || match[1] == "Uint16") ? 2 :
                (match[1] == "Int8" || match[1] == "Uint8") ? 1 : 1;
            }

            structsAsMacros.push(candyVar);
            structsExp.set(candyVar, results);
            macro_expand += "%endmacro\n";
            codeRet += macro_expand;
            codeRet += offsets_expand;
          }
        }
        else {
        Symbols.set(candyVar + "::__New__", Enums.TypeOfData.Variable);
        variables.push(new VariableModuCandy(candyVar + "::__New__", "stru", 0));
        }
      }
      else if (wordSymbol === "candy") {
        i++;
        let candyVar = "";
        while (isLetter(code[i])) {
            candyVar += code[i];
            i++;
        }

        try {
          let deptree = checkDependenceTree();
          
          for (const dep of deptree) {
            if (dep.logica_nsp == candyVar)
            {
              let depa = parseCodeInternal(fs.readFileSync(dep.directory, "utf-8"));
              codeRet += depa.codeRet;
              Symbols = new Map([...Symbols, ...depa.Symbols]);
              break;
            }
          }
        } catch (error) {
        }
      }
      else if (wordSymbol === "unsafe") {
          i++;
          if (code[i] === '"') {
              let assemblyCode = "";
              i++;
              while (code[i] !== '"' && i < code.length) {
              assemblyCode += code[i];
              i++;
              }
              codeRet += Tabulators + assemblyCode + "\n";
          }
      }
      else if (wordSymbol == "__attr__") {
          i++;
          if (code[i] === '"') {
              let assemblyCode = "";
              i++;
              while (code[i] !== '"' && i < code.length) {
              assemblyCode += code[i];
              i++;
              }
              atributes = assemblyCode;
          }
      }
      else if (c === '/' && code[i + 1] === '/') {
        inComment = true;
        codeRet += Tabulators + ';';
        i++;
      }
      else if (c === '(' && code[i + 1] === ')') {
      i++;

      let upper = (NoNameUpper ? wordSymbol : wordSymbol.toUpperCase());
      codeRet += Tabulators + ((ActualTarget == Enums.Targets.ARMv7) || (ActualTarget == Enums.Targets.ARM64)  ? "bl " : "call ") + candyVarToRegister(upper) + "\n";
      }
      else if (c === '<' && code[i + 1] === '=') {
      i += 2;

      let candyVar = "";
      while (isLetter(code[i])) {
          candyVar += code[i];
          i++;
      }

      for (const v of variables) {
          if (v.name === candyVar) {
          codeRet += Tabulators +
              "call DATA_MODUCANDY_DATA\n" + Tabulators +
              "mov ebx," + v.offset + "\n" + Tabulators +
              "add eax,ebx\n";
          }
      }
      }
      else if (c === '?') {
      i++;

      let candyVar = "";
      while (isLetter(code[i])) {
          candyVar += code[i];
          i++;
      }

      codeRet += Tabulators +
          "cmp " +
          candyVarToRegister(wordSymbol) +
          "," +
          candyVarToRegister(candyVar) +
          "\n";
      }
      else if (c === '>' && wordSymbol === "") {
      i++;

      let label = "";
      while (isLetter(code[i])) {
          label += code[i];
          i++;
      }

      codeRet += Tabulators + emitJumpGT((NoNameUpper ? label : label.toUpperCase()));
      }
        else if (c === '<' && wordSymbol === "") {
      i++;

      let label = "";
      while (isLetter(code[i])) {
          label += code[i];
          i++;
      }

      codeRet += Tabulators + emitJumpLT(NoNameUpper ? label : label.toUpperCase());
      }
      else if (c === '+') {
      i++;

      let candyVar = "";
      while (isLetter(code[i])) {
          candyVar += code[i];
          i++;
      }

      codeRet += Tabulators + emitAdd(candyVarToRegister(wordSymbol), candyVarToRegister(candyVar));
      }
      else if (c === '*') {
      i++;

      let candyVar = "";
      while (isLetter(code[i])) {
          candyVar += code[i];
          i++;
      }

      codeRet += Tabulators + emitMul(candyVarToRegister(wordSymbol), candyVarToRegister(candyVar));
      }
      else if (c === '/') {
      i++;

      let candyVar = "";
      while (isLetter(code[i])) {
          candyVar += code[i];
          i++;
      }

      codeRet += Tabulators + emitDiv(candyVarToRegister(wordSymbol), candyVarToRegister(candyVar), Tabulators);
      }
      else if (c === '-' && code[i + 1] === '>') {
      i += 2;

      let candyVar = "";
      while (isLetter(code[i])) {
          candyVar += code[i];
          i++;
      }

      codeRet += Tabulators + emitPop(candyVarToRegister(candyVar));
      }
      else if ((c === '<' && code[i + 1] === '-') && wordSymbol !== "") {
      i += 2;

      codeRet += Tabulators + emitPush(candyVarToRegister(wordSymbol));
      }
      else if (c === '-') {
      i++;

      let candyVar = "";
      while (isLetter(code[i])) {
          candyVar += code[i];
          i++;
      }

      codeRet += Tabulators + emitSub(candyVarToRegister(wordSymbol), candyVarToRegister(candyVar));
      }
      else if (c === '=' && wordSymbol !== "") {
      i++;

      let candyVar = "";
      while (isLetter(code[i])) {
          candyVar += code[i];
          i++;
      }

      codeRet += Tabulators + 
          "mov " +
          candyVarToRegister(wordSymbol) +
          "," +
          candyVarToRegister(candyVar) +
          "\n";
      }
      else if (c === '=' && wordSymbol === "") {
      i++;

      let label = "";
      while (isLetter(code[i])) {
          label += code[i];
          i++;
      }

      codeRet += Tabulators + emitJumpEQ(NoNameUpper ? label : label.toUpperCase());
      }
  
    
      wordSymbol = "";
  }

  
  return {codeRet: codeRet , dataSection: dataSection , datasReal: datasReal, datasFunctions: datasFunctions, final:codeRet+(AllowStackPic == true ? dataSection+datasReal+datasFunctions : "") , Symbols:Symbols};
}

function parseCode(code, target, allowPic, no_name_upper, archstr)
{
  globalSymbolsExpands.clear();
  ActualTargetStr = archstr;
  ActualTarget = target;
  AllowStackPic = allowPic;
  NoNameUpper = no_name_upper;
  let abc = parseCodeInternal(code);
  return abc.final;
}

module.exports = { candyVarToRegister,isLetter, VariableModuCandy, parseCode, parseCodeInternal, Enums}