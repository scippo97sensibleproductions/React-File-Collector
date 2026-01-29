import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { inspectAttr } from 'kimi-plugin-inspect-react';
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer';
import compression from 'vite-plugin-compression';

// https://vite.dev/config/
export default defineConfig({
    server: {
        port: 1420,
    },
    base: './',
    plugins: [
        inspectAttr(),
        react({
        }),
        ViteImageOptimizer({
            png: { quality: 80 },
            jpeg: { quality: 80 },
            webp: { quality: 80 },
            avif: { quality: 70 },
            svg: {
                multipass: true,
                plugins: [
                    {
                        name: 'preset-default',
                        params: {
                            overrides: {
                                cleanupNumericValues: false,
                                cleanupIds: {
                                    minify: false,
                                    remove: false,
                                },
                                convertPathData: false,
                            },
                        },
                    },
                    'sortAttrs',
                    {
                        name: 'addAttributesToSVGElement',
                        params: {
                            attributes: [{ xmlns: 'http://www.w3.org/2000/svg' }],
                        },
                    },
                ],
            }
        }),
        compression({
            algorithm: 'gzip',
            ext: '.gz',
            threshold: 1024,
            deleteOriginFile: false,
        }),
        compression({
            algorithm: 'brotliCompress',
            ext: '.br',
            threshold: 1024,
            deleteOriginFile: false,
        }),
    ],
    resolve: {
        alias: {
            "@": fileURLToPath(new URL("./src", import.meta.url)),
        },
    },
    build: {
        target: 'esnext',
        minify: true,
        cssMinify: true,
        cssCodeSplit: true,
        sourcemap: false,
        reportCompressedSize: false,
        chunkSizeWarningLimit: 1000,
        rolldownOptions: {
            output: {
                manualChunks(id) {
                    if (id.includes('node_modules')) {
                        if (id.includes('react') || id.includes('react-dom') || id.includes('scheduler')) {
                            return 'react-vendor';
                        }
                        if (id.includes('@mantine') || id.includes('@tabler')) {
                            return 'mantine-vendor';
                        }
                        if (id.includes('@lingui')) {
                            return 'lingui-vendor';
                        }
                        if (id.includes('date-fns') || id.includes('lodash') || id.includes('axios')) {
                            return 'utils-vendor';
                        }
                    }
                },
            },
        },
    },
});