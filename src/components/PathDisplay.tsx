import {Breadcrumbs, Text, useMantineTheme} from '@mantine/core';
import {useMediaQuery} from '@mantine/hooks';

interface PathDisplayProps {
    path: string | null;
}

export const PathDisplay = ({path}: PathDisplayProps) => {
    const theme = useMantineTheme();
    const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints.sm})`);

    if (!path) {
        return null;
    }

    const separator = path.includes('/') ? '/' : '\\';
    const parts = path.split(separator).filter(Boolean);

    const cumulativePaths = parts.reduce<string[]>((acc, part) => {
        const previousPath = acc.length > 0 ? acc[acc.length - 1] : '';
        const newPath = previousPath ? `${previousPath}${separator}${part}` : part;
        return [...acc, newPath];
    }, []);

    let itemsToRender;

    if (isMobile && parts.length > 3) {
        const first = parts[0];
        const last = parts[parts.length - 1];
        const secondToLast = parts[parts.length - 2];
        itemsToRender = [
            <Text key={cumulativePaths[0]} c="dimmed" size="sm">{first}</Text>,
            <Text key="ellipsis" c="dimmed" size="sm">...</Text>,
            <Text key={cumulativePaths[parts.length - 2]} c="dimmed" size="sm">{secondToLast}</Text>,
            <Text key={cumulativePaths[parts.length - 1]} fw={500} size="sm">{last}</Text>
        ];
    } else {
        itemsToRender = parts.map((part, index) => (
            <Text
                key={cumulativePaths[index]}
                c={index === parts.length - 1 ? 'default' : 'dimmed'}
                fw={index === parts.length - 1 ? 500 : 400}
                size="sm"
            >
                {part}
            </Text>
        ));
    }

    return (
        <Breadcrumbs
            separator="›"
            styles={{root: {alignItems: 'center', overflow: 'hidden', flexWrap: 'nowrap'}}}
        >
            {itemsToRender}
        </Breadcrumbs>
    );
}