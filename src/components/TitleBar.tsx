import { ActionIcon, Box, Group, Text, useMantineColorScheme, useMantineTheme } from '@mantine/core';
import { IconMinus, IconSquare, IconX, IconCopy, IconFileText } from '@tabler/icons-react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useEffect, useState } from 'react';

export const TitleBar = () => {
    const { colorScheme } = useMantineColorScheme();
    const theme = useMantineTheme();
    const [isMaximized, setIsMaximized] = useState(false);

    const appWindow = getCurrentWindow();

    useEffect(() => {
        let isMounted = true;
        let unlistenFn: (() => void) | null = null;

        const setupListener = async () => {
            // Initial check
            if (isMounted) {
                setIsMaximized(await appWindow.isMaximized());
            }

            // Listen for resize events to detect OS snapping or manual resizing
            unlistenFn = await appWindow.listen('tauri://resize', async () => {
                if (isMounted) {
                    setIsMaximized(await appWindow.isMaximized());
                }
            });
        };

        setupListener();

        return () => {
            isMounted = false;
            if (unlistenFn) unlistenFn();
        };
    }, [appWindow]);

    const handleMinimize = () => appWindow.minimize();
    const handleMaximize = async () => {
        await appWindow.toggleMaximize();
        // State will update via the resize listener, but we can optimistically flip it here too
        setIsMaximized(!isMaximized);
    };
    const handleClose = () => appWindow.close();

    const isDark = colorScheme === 'dark';
    const bgColor = isDark ? theme.colors.dark[8] : theme.colors.gray[0];
    const borderColor = isDark ? theme.colors.dark[7] : theme.colors.gray[2];
    const iconColor = isDark ? theme.colors.gray[4] : theme.colors.gray[7];

    return (
        <Box
            data-tauri-drag-region
            h={30}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                zIndex: 9999,
                backgroundColor: bgColor,
                borderBottom: `1px solid ${borderColor}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                userSelect: 'none',
            }}
        >
            <Group gap="xs" px="xs" style={{ pointerEvents: 'none' }}>
                <IconFileText color={iconColor} size={14} />
                <Text c="dimmed" fw={500} size="xs">
                    File Collector
                </Text>
            </Group>

            {/* Window Controls */}
            <Group gap={0} h="100%">
                <ActionIcon
                    c={iconColor}
                    h="100%"
                    radius={0}
                    style={{
                        '--ai-hover': isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                    }}
                    variant="subtle"
                    w={42}
                    onClick={handleMinimize}
                >
                    <IconMinus size={16} stroke={1.5} />
                </ActionIcon>
                <ActionIcon
                    c={iconColor}
                    h="100%"
                    radius={0}
                    style={{
                        '--ai-hover': isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                    }}
                    variant="subtle"
                    w={42}
                    onClick={handleMaximize}
                >
                    {isMaximized ? (
                        <IconCopy size={14} stroke={1.5} />
                    ) : (
                        <IconSquare size={14} stroke={1.5} />
                    )}
                </ActionIcon>
                <ActionIcon
                    c={iconColor}
                    h="100%"
                    radius={0}
                    style={{
                        '--ai-hover': '#e81123',
                        '--ai-color-hover': 'white',
                    }}
                    variant="subtle"
                    w={42}
                    onClick={handleClose}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#e81123';
                        e.currentTarget.style.color = 'white';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = iconColor;
                    }}
                >
                    <IconX size={16} stroke={1.5} />
                </ActionIcon>
            </Group>
        </Box>
    );
}