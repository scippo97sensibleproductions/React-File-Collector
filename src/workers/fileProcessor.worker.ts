import type {FileInfo} from "../models/FileInfo.ts";

function estimateTokens(text: string): number {
    if (!text) {
        return 0;
    }
    const tokenRegex = /[\w]+|[^\s\w]/g;
    const tokens = text.match(tokenRegex);
    return Math.round((tokens?.length ?? 0) * 1.39);
}

function getLanguage(file: string): string {
    const extension = file.split('.').pop()?.toLowerCase();
    if (!extension) return 'plaintext';

    const languageMap: Record<string, string> = {
        '1c': 'oneC', abnf: 'abnf', log: 'accesslog', as: 'actionscript', ada: 'ada',
        ags: 'angelscript', apacheconf: 'apache', applescript: 'applescript', arcade: 'arcade',
        ino: 'arduino', arm: 'armasm', adoc: 'asciidoc', aj: 'aspectj', ahk: 'autohotkey',
        au3: 'autoit', asm: 'avrasm', awk: 'awk', ax: 'axapta', sh: 'bash', bash: 'bash',
        bas: 'basic', bnf: 'bnf', bf: 'brainfuck', c: 'c', cal: 'cal', capnp: 'capnproto',
        ceylon: 'ceylon', icl: 'clean', clj: 'clojure', cmake: 'cmake', coffee: 'coffeescript',
        cos: 'cos', cpp: 'cpp', h: 'cpp', crm: 'crmsh', cr: 'crystal', cs: 'csharp',
        sln: 'csharp', slnx: 'csharp', csproj: 'xml', csp: 'csp', css: 'css', d: 'd',
        dart: 'dart', pas: 'delphi', diff: 'diff', django: 'django', bind: 'dns',
        dockerfile: 'dockerfile', bat: 'dos', dsconfig: 'dsconfig', dts: 'dts', dust: 'dust',
        ebnf: 'ebnf', ex: 'elixir', exs: 'elixir', elm: 'elm', erb: 'erb', erl: 'erlang',
        xlsx: 'excel', fix: 'fix', flix: 'flix', f90: 'fortran', f95: 'fortran', fs: 'fsharp',
        gms: 'gams', gss: 'gauss', gcode: 'gcode', feature: 'gherkin', glsl: 'glsl', gml: 'gml',
        go: 'go', golo: 'golo', gradle: 'gradle', groovy: 'groovy', haml: 'haml',
        hbs: 'handlebars', hs: 'haskell', hx: 'haxe', hsp: 'hsp', html: 'htmlbars',
        http: 'http', hy: 'hy', i7: 'inform7', ini: 'ini', irpf90: 'irpf90', isbl: 'isbl',
        java: 'java', js: 'javascript', jsx: 'javascript', jbcli: 'jbossCli', json: 'json',
        jl: 'julia', kt: 'kotlin', lasso: 'lasso', tex: 'latex', ldif: 'ldif', leaf: 'leaf',
        less: 'less', lisp: 'lisp', lsc: 'livecodeserver', ls: 'livescript', ll: 'llvm',
        lsl: 'lsl', lua: 'lua', mak: 'makefile', md: 'markdown', matlab: 'matlab', max: 'maxima',
        mel: 'mel', merc: 'mercury', mips: 'mipsasm', mizar: 'mizar', mojolicious: 'mojolicious',
        monkey: 'monkey', moon: 'moonscript', n1ql: 'n1ql', nginxconf: 'nginx', nim: 'nim',
        nix: 'nix', nsi: 'nsis', m: 'objectivec', ml: 'ocaml', scad: 'openscad',
        oxygene: 'oxygene', p3: 'parser3', pl: 'perl', pf: 'pf', pgsql: 'pgsql', php: 'php',
        txt: 'plaintext', pony: 'pony', ps1: 'powershell', pde: 'processing', pro: 'profile',
        prolog: 'prolog', properties: 'properties', proto: 'protobuf', pp: 'puppet',
        pb: 'purebasic', py: 'python', q: 'q', qml: 'qml', r: 'r', re: 'reasonml', rib: 'rib',
        graph: 'roboconf', ros: 'routeros', rsl: 'rsl', rb: 'ruby', rules: 'ruleslanguage',
        rs: 'rust', sas: 'sas', scala: 'scala', scm: 'scheme', sci: 'scilab', scss: 'scss',
        shell: 'shell', smali: 'smali', st: 'smalltalk', sml: 'sml', sqf: 'sqf', sql: 'sql',
        stan: 'stan', do: 'stata', stp: 'step21', styl: 'stylus', subunit: 'subunit',
        swift: 'swift', tag: 'taggerscript', tap: 'tap', tcl: 'tcl', thrift: 'thrift',
        tp: 'tp', twig: 'twig', ts: 'typescript', tsx: 'typescript', vala: 'vala', vb: 'vbnet',
        vbs: 'vbscript', v: 'verilog', vhd: 'vhdl', vim: 'vim', x86asm: 'x86asm', xl: 'xl',
        xml: 'xml', xq: 'xquery', yml: 'yaml', yaml: 'yaml', zephir: 'zephir'
    };
    return languageMap[extension] ?? 'plaintext';
}


self.onmessage = (event: MessageEvent<{ file: { path: string, content: string }, jobId: number }>) => {
    const {file, jobId} = event.data;

    const tokenCount = estimateTokens(file.content);
    const language = getLanguage(file.path);

    const fileInfo: FileInfo = {
        path: file.path,
        status: 'complete',
        tokenCount,
        language,
    };
    self.postMessage({jobId, fileInfo});
};