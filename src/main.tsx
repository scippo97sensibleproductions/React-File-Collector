import {StrictMode} from 'react';
import ReactDOM from 'react-dom/client';
import {createRouter, RouterProvider} from '@tanstack/react-router';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';

import {routeTree} from './routeTree.gen';
import {createTheme, localStorageColorSchemeManager, MantineProvider} from "@mantine/core";
import {Notifications} from "@mantine/notifications";
import {UpdaterProvider} from "./hooks/useUpdater.tsx";

const theme = createTheme({
    fontFamily: 'Inter, sans-serif',
    headings: {fontFamily: 'Inter, sans-serif'},
    primaryColor: 'blue',
});

const router = createRouter({routeTree});

const colorSchemeManager = localStorageColorSchemeManager({
    key: 'mantine-color-scheme',
});

declare module '@tanstack/react-router' {
    interface Register {
        router: typeof router
    }
}

const rootElement = document.getElementById('root')!;
if (!rootElement.innerHTML) {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
        <StrictMode>
            <MantineProvider
                colorSchemeManager={colorSchemeManager}
                defaultColorScheme="dark"
                theme={theme}
            >
                <UpdaterProvider>
                    <Notifications/>
                    <RouterProvider router={router}/>
                </UpdaterProvider>
            </MantineProvider>
        </StrictMode>,
    );
}