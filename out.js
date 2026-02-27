// dependencia de carpetas
const {PathDependy, checkDependenceTree} = require("./dependy.js")
// sistema de archivos
const fs = require("fs");
// enumeradores
class Enums {
  // tipo de dato
  static TypeOfData = {
    // funciones
    Function: 0,
    // variables
    Variable: 1
  };
  // objetivos
  static Targets = {
    // modo real i386
    I386RealMode: 0,
    // modo protegido i386
    I386ProtectedMode: 1,
    // ARMv7
    ARMv7: 2,
    // ARM64 aarch64
    ARM64: 3
  }
}
// mapa de registros
var RegisterMaps = {
  // registros de modo real
  [Enums.Targets.I386RealMode]: {
    r1: "ax", r2: "cx", r3: "dx", r4: "bx", r5: "sp", r6: "bp", r7: "si", r8: "di"
  },
  // registros de modo protegido
  [Enums.Targets.I386ProtectedMode]: {
    r1: "eax", r2: "ecx", r3: "edx", r4: "ebx", r5: "esp", r6: "ebp", r7: "esi", r8: "edi"
  },
  // registros de ARMv7
  [Enums.Targets.ARMv7]: {
    r1: "r0", r2: "r1", r3: "r2", r4: "r3", r5: "sp", r6: "r4", r7: "r5", r8: "r6"
  },
  // registros de ARM aarch64
  [Enums.Targets.ARM64]: {
    r1: "x0", r2: "x1", r3: "x2", r4: "x3", r5: "sp", r6: "x4", r7: "x5", r8: "x6"
  }
};
// emitir addicion
function emitAdd(dest, src) {
  // target
  switch (ActualTarget) {
    // i386
    case Enums.Targets.I386RealMode:
    case Enums.Targets.I386ProtectedMode:
      return `add ${dest},${src}\n`;
    // ARMv7
    case Enums.Targets.ARMv7: return `add ${dest}, ${dest}, ${src}\n`;
    // ARM aarch64
    case Enums.Targets.ARM64: return `add ${dest}, ${dest}, ${src}\n`;
  }
}
// emitir substraccion
function emitSub(dest, src) {
  // target
  switch (ActualTarget) {
    // i386
    case Enums.Targets.I386RealMode:
    case Enums.Targets.I386ProtectedMode:
      return `sub ${dest},${src}\n`;
    // ARMv7
    case Enums.Targets.ARMv7: return `sub ${dest}, ${dest}, ${src}\n`;
    // ARM aarch64
    case Enums.Targets.ARM64: return `sub ${dest}, ${dest}, ${src}\n`;
  }
}
// emitir multiplicacion
function emitMul(dest, src) {
  // target
  switch (ActualTarget) {
    // i386
    case Enums.Targets.I386ProtectedMode:
    case Enums.Targets.I386RealMode:
      return `imul ${dest},${src}\n`;
    // ARMv7
    case Enums.Targets.ARMv7: return `mul ${dest}, ${dest}, ${src}\n`;
    // ARM aarch64
    case Enums.Targets.ARM64: return `mul ${dest}, ${dest}, ${src}\n`;
  }
}
// emitir division
function emitDiv(dest, src, Tabulators) {
  switch (ActualTarget) {
    // i386
    case Enums.Targets.I386RealMode:
    case Enums.Targets.I386ProtectedMode:
      return  `push eax\n`                      +
              `${Tabulators}push edx\n`         +
              `${Tabulators}mov eax, ${dest}\n` +
              `${Tabulators}cdq\n`              +
              `${Tabulators}idiv ${src}\n`      +
              `${Tabulators}mov ${dest}, eax\n` +
              `${Tabulators}pop edx\n`          +
              `${Tabulators}pop eax\n`
  ;
    // ARMv7
    case Enums.Targets.ARMv7: return `sdiv ${dest}, ${dest}, ${src}\n`;
    // ARM aarch64
    case Enums.Targets.ARM64: return `sdiv ${dest}, ${dest}, ${src}\n`;
  }
}
// emitir je
function emitJumpEQ(label) {
  // target
  switch (ActualTarget) {
    // i386
    case Enums.Targets.I386RealMode:
    case Enums.Targets.I386ProtectedMode:
      return `je ${candyVarToRegister(label)}\n`;
    // ARMv7 o aarch64
    case Enums.Targets.ARMv7:
    case Enums.Targets.ARM64:
      return `beq ${candyVarToRegister(label)}\n`;
  }
}
function emitPush(reg) {
  // target
  switch (ActualTarget) {
    // i386
    case Enums.Targets.I386RealMode:
    case Enums.Targets.I386ProtectedMode:
      return `push ${reg}\n`;
    // ARMv7
    case Enums.Targets.ARMv7: return `push {${reg}}\n`;
    // ARM aarch64
    case Enums.Targets.ARM64: return `str ${reg}, [sp, #-16]!\n`;
  }
}
function emitPop(reg) {
  // target
  switch (ActualTarget) {
    // i386
    case Enums.Targets.I386RealMode:
    case Enums.Targets.I386ProtectedMode:
      return `pop ${reg}\n`;
    // ARMv7
    case Enums.Targets.ARMv7: return `pop {${reg}}\n`;
    // ARM aarch64
    case Enums.Targets.ARM64: return `ldr ${reg}, [sp], #16\n`;
  }
}
function emitJumpGT(label) {
  // target
  switch (ActualTarget) {
    // i386
    case Enums.Targets.I386RealMode:
    case Enums.Targets.I386ProtectedMode:
      return `jg ${label}\n`;
    // ARMv7 o aarch64
    case Enums.Targets.ARMv7:
    case Enums.Targets.ARM64:
      return `bgt ${label}\n`;
  }
}
function emitJumpLT(label) {
  // target
  switch (ActualTarget) {
    // i386
    case Enums.Targets.I386RealMode:
    case Enums.Targets.I386ProtectedMode:
      return `jl ${label}\n`;
    // ARMv7 o aarch64
    case Enums.Targets.ARMv7:
    case Enums.Targets.ARM64:
      return `blt ${label}\n`;
  }
}
// no namespace with guion
var gnspwg = false;
// simbolos que se expandiran
var globalSymbolsExpands = new Map();
// objetivo actual
var ActualTarget = Enums.Targets.I386ProtectedMode;
// permitir code position independient, esto solo funciona en Enums.Targets.I386ProtectedMode y Enums.Targets.I386RealMode
var AllowStackPic = true;
// que el nombre no se va a hacer mayusculas
var NoNameUpper = false;
// variable a registro
function candyVarToRegister(candyVar) {
  // t32
  if (candyVar.startsWith("[Uint32]") || candyVar.startsWith("[Int32]")) { return "dword " + candyVarToRegister(candyVar.startsWith("[Uint32]") ? candyVar.substring(8) : candyVar.substring(7)); } 
  // t16
  else if (candyVar.startsWith("[Uint16]") || candyVar.startsWith("[Int16]")) { return "word " + candyVarToRegister(candyVar.startsWith("[Uint16]") ? candyVar.substring(8) : candyVar.substring(7)); } 
  // t8
  else if (candyVar.startsWith("[Uint8]") || candyVar.startsWith("[Int8]")) { return "byte " + candyVarToRegister(candyVar.startsWith("[Uint8]") ? candyVar.substring(7) : candyVar.substring(6)); }
  // direccionamiento
  if (candyVar.startsWith("[") && candyVar.endsWith("]")) { return "[" + candyVarToRegister(candyVar.slice(1, -1)) + "]"; }
  // si contiene expansion entonces expandir
  if (globalSymbolsExpands.has(candyVar)) return globalSymbolsExpands.get(candyVar)
  // mapa
  const map = RegisterMaps[ActualTarget];
  // si contiene el mapa y aparte hay candvar
  if (map && map[candyVar]) {
    // retornar
    return map[candyVar];
  }
  // retornar el candyVar original
  return (gnspwg ? candyVar.replaceAll("::", "__") :  candyVar);
}
// no necesariamente tiene que ser letra si no un caracter admitido para sentencias del parser
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
// variable de ModuCandy/FooCandy
class VariableModuCandy {
  constructor(name, type, offset) {
    this.name = name;
    this.type = type;
    this.offset = offset;
  }
}
// parsea el codigo interno
function parseCodeInternal(code) {
  /** simbolos @type { Map<string, number>} */
  let Symbols = new Map();
  // estructuras como macros
  let structsAsMacros = [];
  // expresiones de estructuras
  let structsExp = new Map();
  // tabuladores
  let Tabulators = "   ";
  // codigo que retornara
  let codeRet = "";
  // simbolo de la palabra
  let wordSymbol = "";
  // tipo a usar
  let typeUse = "";
  // seccion de datos
  let dataSection =
`DATA_MODUCANDY_DATA:
   call DATA_MODUCANDY_DATA_GETEIP
   ret
   ;datas
`;
  // datos reales
  let datasReal = "";
  // funciones auxiliares de datos
  let datasFunctions =
`; ModuCandy: eip get runtime for data calc
DATA_MODUCANDY_DATA_GETEIP:
   pop eax
   push eax
   inc eax
   ret
`;
  // variabkes
  let variables = [];
  // offset actual
  let offsetActual = 0;
  // atributos
  let atributes = "";
  // si esta en comentario
  let inComment = false;
  // usando tipo
  let typeUsage = false;
  // recorrer parse
  for (let i = 0; i < code.length; i++) {
    // caracter
    const c = code[i];
    // comentario
    if (inComment) {
      // comentario
      codeRet += c;
      // si termina
      if (c === '\n') inComment = false;
      // continuar
      continue;
    }

    // acumulación de símbolo
    if (isLetter(c)) {
      // se usara un tipo
      if (wordSymbol.length === 0 && c >= 'A' && c <= 'Z') typeUsage = true;
      // si usa un tipo
      if (typeUsage) typeUse += c;
      // simbolo de palabra
      wordSymbol += c;
      continue;
    }

    // cierre de palabra
    if (typeUsage) typeUsage = false;
    // es null
      else if (typeUse !== "") {
          // funcion
          if (wordSymbol === "fn") {
            // saltar tabuladores
            i++; while (code[i] === ' ' || code[i] === '\t') i++;
            // obtener nombre
            let funcName = ""; while (isLetter(code[i])) { funcName += code[i++]; }
            // setear funcion
            Symbols.set((gnspwg ? funcName.replaceAll("::", "__") :  funcName), Enums.TypeOfData.Function);
            // sumar codigo
            codeRet += `; type=${typeUse}\n${(gnspwg ? funcName.replaceAll("::", "__") :  funcName)}:\n`;
          }
          // let
          else if (wordSymbol === "let") {
            // saltar espacios
            i++; while (code[i] === ' ' || code[i] === '\t') i++;
            // detectar nombre
            let varName = ""; while (isLetter(code[i])) varName += code[i++];
            // si lo encontro
            let imaginaryFinded = false;
            // si sera imaginaria
            if (atributes.includes("imaginary=true"))
            {
              // si es un org
              if (atributes.includes("org=")) {
                // setaer
                let org = Number(atributes.split("org=")[1].split(",")[0]); globalSymbolsExpands.set(varName, org.toString())

                if (structsExp.has(typeUse)) {
                  // abc
                  for (const abc of structsExp.get(typeUse)) globalSymbolsExpands.set(varName + "." + abc.field, (org + abc.offset).toString())
                  // se encontro imaginario
                  imaginaryFinded = true;
                }
              }
            }

            // si lo encontro setear
            if (!imaginaryFinded) { if (structsAsMacros.includes(typeUse)) {codeRet += "instance_" + typeUse + " " + varName;}
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
        // vaciar tipo de uso
        typeUse = "";
      }
      // retornar
      if (wordSymbol === "return") { codeRet += Tabulators + ((ActualTarget == Enums.Targets.ARMv7) ? "bx lr\n" :  (ActualTarget == Enums.Targets.ARM64 || ActualTarget) ? "ret\n" : "ret\n"); }
      // pragma
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
      // safe
      else if (wordSymbol == "safe") {
          i++;
          let word = "";
          while (isLetter(code[i])) {
              word += code[i];
              i++;
          }

          switch (word) {
              // incrementar
              case "increments": {
                  i++;
                  let candyVar = "";
                  while (isLetter(code[i])) candyVar += code[i++];

                  codeRet += Tabulators + emitAdd(candyVarToRegister(candyVar), "1");
                  break;
              }
              // decrementar
              case "decrements": {
                  i++;
                  let candyVar = "";
                  while (isLetter(code[i])) candyVar += code[i++];

                  codeRet += Tabulators + emitSub(candyVarToRegister(candyVar), "1");
                  break;
              }
              // lista de numeros
              case "numlist": {
                i++;
                let Name = "";
                while (isLetter(code[i])) Name += code[i++];
                if (code[i] == '<')
                {
                  i++;
                  let type = "";
                  while (code[i] != ">") type += code[i++];
                  i++;
                  while (code[i].replaceAll("\n", "").replaceAll("\r", "").replaceAll("\t", "").replaceAll(" ", "") == "") i++;
                  if (code[i] == '{') {
                    i++;
                    let enumE = "";
                    while (code[i] != "}") {
                      enumE += code[i];
                      i++;
                    }
                    let fields = enumE.replaceAll("\n", "").replaceAll("\r", "").replaceAll("\t", "").replaceAll(" ", "").split(",");
                    let fieldsOffset = 0;
                    for (const member of fields) {
                      if (member.includes("="))
                      {
                        globalSymbolsExpands.set(Name + "::" + member.split("=")[0], member.split("=")[1]);
                      }
                      else {
                        globalSymbolsExpands.set(Name + "::" + member.split("=")[0], fieldsOffset.toString());
                        fieldsOffset++;
                      }
                    }
                  }
                }
                break;
              }
              // salto incondicional
              case "jumps": {
                  i++;
                  let label = "";
                  while (isLetter(code[i])) label += code[i++];

                  switch (ActualTarget) {
                      case Enums.Targets.I386RealMode:
                      case Enums.Targets.I386ProtectedMode:
                          codeRet += Tabulators + "jmp " + (NoNameUpper ? label : label.toUpperCase()) + "\n";
                          break;
                      case Enums.Targets.ARMv7:
                          codeRet += Tabulators + "b " + candyVarToRegister(label) + "\n";
                          break;
                      case Enums.Targets.ARM64:
                          codeRet += Tabulators + "b " + candyVarToRegister(label) + "\n";
                          break;
                  }
                  break;
              }
              default:
                  break;
          }
      }
      // estructuras
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
      // importar modulos
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
      // codigo ensamblador
      else if (wordSymbol === "unsafe") {
          i++;
          if (code[i] === '"') {
              // detectar codigo
              let assemblyCode = ""; i++; while (code[i] !== '"' && i < code.length) { assemblyCode += code[i]; i++; }
              // spliteado
              let asmsplit = assemblyCode.split("\n")
              // sumar lineas
              for (let index = 0; index < asmsplit.length; index++) {           
                const linea = asmsplit[index].trim();   
                codeRet += Tabulators + linea + "\n";
              }
          }
      }
      // atributos
      else if (wordSymbol == "__attr__") {
        // detectar
        i++; if (code[i] === '"') { let assemblyCode = ""; i++; while (code[i] !== '"' && i < code.length) { assemblyCode += code[i]; i++; } atributes = assemblyCode;
        }
      }
      // comentarios
      else if (c === '/' && code[i + 1] === '/') {
        inComment = true;
        codeRet += Tabulators + (ActualTarget == Enums.Targets.ARM64 ? '//' : ';');
        i++;
      }
      // funciones
      else if (c === '(' && code[i + 1] === ')') {
          i++;
          let upper = (NoNameUpper ? wordSymbol : wordSymbol.toUpperCase());

          if (ActualTarget == Enums.Targets.ARMv7 || ActualTarget == Enums.Targets.ARM64) {
              // Apilar LR antes de llamar
              codeRet += Tabulators + emitPush("lr");
              codeRet += Tabulators + "bl " + candyVarToRegister(upper) + "\n";
              codeRet += Tabulators + emitPop("lr");
          } else {
              // x86
              codeRet += Tabulators + "call " + candyVarToRegister(upper) + "\n";
          }
      }
      // variables
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
      // comparar
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
      // saltar si es mayor
      else if (c === '>' && wordSymbol === "") {
      i++;

      let label = "";
      while (isLetter(code[i])) {
          label += code[i];
          i++;
      }

      codeRet += Tabulators + emitJumpGT((NoNameUpper ? label : label.toUpperCase()));
      }
      // saltar si es menor
      else if (c === '<' && wordSymbol === "") {
      i++;

      let label = "";
      while (isLetter(code[i])) {
          label += code[i];
          i++;
      }

      codeRet += Tabulators + emitJumpLT(NoNameUpper ? label : label.toUpperCase());
      }
      // sumar
      else if (c === '+') {
      i++;

      let candyVar = "";
      while (isLetter(code[i])) {
          candyVar += code[i];
          i++;
      }

      codeRet += Tabulators + emitAdd(candyVarToRegister(wordSymbol), candyVarToRegister(candyVar));
      }
      // multiplicar
      else if (c === '*') {
      i++;

      let candyVar = "";
      while (isLetter(code[i])) {
          candyVar += code[i];
          i++;
      }

      codeRet += Tabulators + emitMul(candyVarToRegister(wordSymbol), candyVarToRegister(candyVar));
      }
      // dividir
      else if (c === '/') {
      i++;

      let candyVar = "";
      while (isLetter(code[i])) {
          candyVar += code[i];
          i++;
      }

      codeRet += Tabulators + emitDiv(candyVarToRegister(wordSymbol), candyVarToRegister(candyVar), Tabulators);
      }
      // hacer pop
      else if (c === '-' && code[i + 1] === '>') {
      i += 2;

      let candyVar = "";
      while (isLetter(code[i])) {
          candyVar += code[i];
          i++;
      }

      codeRet += Tabulators + emitPop(candyVarToRegister(candyVar));
      }
      // hacer push
      else if ((c === '<' && code[i + 1] === '-') && wordSymbol !== "") {
      i += 2;

      codeRet += Tabulators + emitPush(candyVarToRegister(wordSymbol));
      }
      // restar
      else if (c === '-') {
      i++;

      let candyVar = "";
      while (isLetter(code[i])) {
          candyVar += code[i];
          i++;
      }

      codeRet += Tabulators + emitSub(candyVarToRegister(wordSymbol), candyVarToRegister(candyVar));
      }
      // asignar
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
      // si es equal
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

function parseCode(code, target=Enums.Targets.I386ProtectedMode, allowPic=true, no_name_upper=false, archstr="i386_protected", nspwg=false)
{
  globalSymbolsExpands.clear();
  ActualTargetStr = archstr;
  ActualTarget = target;
  AllowStackPic = allowPic;
  NoNameUpper = no_name_upper;
  gnspwg = nspwg;
  let abc = parseCodeInternal(code);
  return abc.final;
}

module.exports = { candyVarToRegister,isLetter, VariableModuCandy, parseCode, parseCodeInternal, Enums}