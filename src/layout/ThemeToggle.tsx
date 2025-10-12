import {ActionIcon, Group, Tooltip, useMantineColorScheme} from '@mantine/core';
import {IconMoon, IconSun} from '@tabler/icons-react';

export const ThemeToggle = () => {
    const {colorScheme, toggleColorScheme} = useMantineColorScheme();

    return (
        <Group justify="center">
            <Tooltip
                label={colorScheme === 'dark' ? 'Light mode' : 'Dark mode'}
                position="right"
                transitionProps={{transition: 'fade', duration: 200}}
            >
                <ActionIcon
                    aria-label="Toggle color scheme"
                    size="lg"
                    variant="default"
                    onClick={toggleColorScheme}
                >
                    {colorScheme === 'dark' ? <IconSun stroke={1.5}/> : <IconMoon stroke={1.5}/>}
                </ActionIcon>
            </Tooltip>
        </Group>
    );
}