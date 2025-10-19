import {
    IconBrandCSharp,
    IconBrandGit,
    IconBrandHtml5,
    IconBrandJavascript,
    IconBrandPython,
    IconBrandReact,
    IconBrandRust,
    IconBrandSass,
    IconBrandTypescript,
    IconBrandVisualStudio,
    IconBrandVite,
    IconCode,
    IconFile,
    IconFileText,
    IconFileTypeXml,
    IconFolder,
    IconFolderOpen,
    IconJson,
    IconMarkdown,
    IconPhoto,
    IconSquareLetterY,
    IconTerminal2
} from "@tabler/icons-react";
import {ReactNode} from "react";

interface FileIconProps {
    name: string;
    isFolder: boolean;
    expanded: boolean;
}

const fileIconMap: Record<string, { icon: ReactNode; color: string }> = {
    ts: {icon: <IconBrandTypescript size={18}/>, color: '#3178c6'},
    tsx: {icon: <IconBrandReact size={18}/>, color: '#61dafb'},
    js: {icon: <IconBrandJavascript size={18}/>, color: '#f7df1e'},
    jsx: {icon: <IconBrandReact size={18}/>, color: '#61dafb'},
    json: {icon: <IconJson size={18}/>, color: '#f9a825'},
    cs: {icon: <IconBrandCSharp size={18}/>, color: '#68217a'},
    sln: {icon: <IconBrandVisualStudio size={18}/>, color: '#800080'},
    csproj: {icon: <IconFileTypeXml size={18}/>, color: '#bcaaa4'},
    md: {icon: <IconMarkdown size={18}/>, color: '#ffffff'},
    html: {icon: <IconBrandHtml5 size={18}/>, color: '#e34f26'},
    css: {icon: <IconCode size={18}/>, color: '#563d7c'},
    scss: {icon: <IconBrandSass size={18}/>, color: '#c6538c'},
    py: {icon: <IconBrandPython size={18}/>, color: '#3572A5'},
    rs: {icon: <IconBrandRust size={18}/>, color: '#dea584'},
    sh: {icon: <IconTerminal2 size={18}/>, color: '#4d5a5e'},
    yml: {icon: <IconSquareLetterY size={18}/>, color: '#cb171e'},
    yaml: {icon: <IconSquareLetterY size={18}/>, color: '#cb171e'},
    xml: {icon: <IconFileTypeXml size={18}/>, color: '#bcaaa4'},
    txt: {icon: <IconFileText size={18}/>, color: '#eeeeee'},
    gitignore: {icon: <IconBrandGit size={18}/>, color: '#f05032'},
    vite: {icon: <IconBrandVite size={18}/>, color: '#646cff'},
    png: {icon: <IconPhoto size={18}/>, color: '#a5d6a7'},
    jpg: {icon: <IconPhoto size={18}/>, color: '#a5d6a7'},
    jpeg: {icon: <IconPhoto size={18}/>, color: '#a5d6a7'},
    gif: {icon: <IconPhoto size={18}/>, color: '#a5d6a7'},
    svg: {icon: <IconPhoto size={18}/>, color: '#ffab91'},
};

export const FileIcon = ({name, isFolder, expanded}: FileIconProps) => {
    if (isFolder) {
        return expanded ? <IconFolderOpen color="#f7d794" size={18}/> : <IconFolder color="#f7d794" size={18}/>;
    }

    const extension = name.split('.').pop()?.toLowerCase() ?? '';
    let specialName = '';
    if (name.startsWith('.git')) specialName = 'gitignore';
    if (name.includes('vite.config')) specialName = 'vite';

    const iconInfo = fileIconMap[specialName] ?? fileIconMap[extension];

    if (iconInfo) {
        return <span style={{color: iconInfo.color}}>{iconInfo.icon}</span>;
    }

    return <IconFile color="#bdbdbd" size={18}/>;
}