import { useState, useEffect } from 'react';
import { Box, Center, Stack, Text, Button } from '@mantine/core';

interface LoadingScreenProps {
    visible: boolean;
    message?: string;
    onAbort?: () => void;
}

const animationStyles = `
@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
@keyframes spin {
  0% { transform: rotateY(0deg); }
  100% { transform: rotateY(360deg); }
}
@keyframes float1 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(50px, -30px) scale(1.1); }
}
@keyframes float2 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(-40px, 40px) scale(0.9); }
}
@keyframes float3 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(30px, 50px) scale(1.05); }
}
`;

export const LoadingScreen = ({ visible, message, onAbort }: LoadingScreenProps) => {
    const [activeIndex, setActiveIndex] = useState(0);

    useEffect(() => {
        if (!visible) return;
        const timer = setInterval(() => {
            setActiveIndex(i => (i === 0 ? 1 : 0));
        }, 3000);
        return () => clearInterval(timer);
    }, [visible]);

    if (!visible) return null;

    return (
        <>
            <style>{animationStyles}</style>
            <Box
                style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 9999,
                    backgroundColor: 'rgba(0, 0, 0, 0.9)',
                    backdropFilter: 'blur(12px)',
                }}
            >
                <Box
                    style={{
                        position: 'absolute',
                        width: '100%',
                        height: '100%',
                        overflow: 'hidden',
                        opacity: 0.6,
                    }}
                >
                    <Box
                        style={{
                            position: 'absolute',
                            width: '60vw',
                            height: '60vw',
                            maxWidth: 800,
                            maxHeight: 800,
                            borderRadius: '50%',
                            background: 'radial-gradient(circle, var(--mantine-color-blue-6) 0%, transparent 70%)',
                            filter: 'blur(80px)',
                            top: '-10%',
                            left: '-10%',
                            animation: 'float1 20s ease-in-out infinite',
                        }}
                    />
                    <Box
                        style={{
                            position: 'absolute',
                            width: '50vw',
                            height: '50vw',
                            maxWidth: 700,
                            maxHeight: 700,
                            borderRadius: '50%',
                            background: 'radial-gradient(circle, var(--mantine-color-violet-6) 0%, transparent 70%)',
                            filter: 'blur(80px)',
                            bottom: '-10%',
                            right: '-10%',
                            animation: 'float2 25s ease-in-out infinite',
                        }}
                    />
                    <Box
                        style={{
                            position: 'absolute',
                            width: '40vw',
                            height: '40vw',
                            maxWidth: 600,
                            maxHeight: 600,
                            borderRadius: '50%',
                            background: 'radial-gradient(circle, var(--mantine-color-cyan-6) 0%, transparent 70%)',
                            filter: 'blur(80px)',
                            top: '40%',
                            left: '50%',
                            animation: 'float3 22s ease-in-out infinite',
                        }}
                    />
                </Box>

                <Center h="100%">
                    <Stack align="center" gap="xl">
                        <Box
                            style={{
                                position: 'relative',
                                width: 'clamp(120px, 15vw, 160px)',
                                height: 'clamp(120px, 15vw, 160px)',
                            }}
                        >
                            <Box
                                style={{
                                    position: 'absolute',
                                    inset: 0,
                                    opacity: activeIndex === 0 ? 1 : 0,
                                    transform: activeIndex === 0 ? 'scale(1) rotate(0deg)' : 'scale(0.8) rotate(-90deg)',
                                    transition: 'all 1s cubic-bezier(0.4, 0, 0.2, 1)',
                                    width: '100%',
                                    height: '100%',
                                    background: 'linear-gradient(135deg, var(--mantine-color-blue-6) 0%, var(--mantine-color-cyan-4) 100%)',
                                    clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                                    animation: activeIndex === 0 ? 'rotate 8s linear infinite' : 'none',
                                    boxShadow: '0 0 60px rgba(34, 139, 230, 0.6)',
                                }}
                            />
                            <Box
                                style={{
                                    position: 'absolute',
                                    inset: 0,
                                    opacity: activeIndex === 1 ? 1 : 0,
                                    transform: activeIndex === 1 ? 'scale(1) rotateY(0deg)' : 'scale(0.8) rotateY(90deg)',
                                    transition: 'all 1s cubic-bezier(0.4, 0, 0.2, 1)',
                                    width: '100%',
                                    height: '100%',
                                    borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #FFD700 0%, #FDB931 50%, #C09628 100%)',
                                    border: '6px solid rgba(255, 215, 0, 0.4)',
                                    animation: activeIndex === 1 ? 'spin 4s linear infinite' : 'none',
                                    boxShadow: '0 0 60px rgba(255, 215, 0, 0.5)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <Box
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        borderRadius: '50%',
                                        position: 'absolute',
                                        background: 'linear-gradient(90deg, transparent 45%, rgba(255,255,255,0.6) 50%, transparent 55%)',
                                    }}
                                />
                            </Box>
                        </Box>

                        <Stack align="center" gap="md">
                            {message && (
                                <Text
                                    c="white"
                                    fw={600}
                                    size="xl"
                                    style={{
                                        textShadow: '0 2px 20px rgba(0,0,0,0.8)',
                                        letterSpacing: '0.5px',
                                    }}
                                    ta="center"
                                >
                                    {message}
                                </Text>
                            )}

                            {onAbort && (
                                <Button
                                    color="red"
                                    radius="xl"
                                    size="md"
                                    style={{
                                        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                                    }}
                                    variant="light"
                                    onClick={onAbort}
                                >
                                    Abort Loading
                                </Button>
                            )}
                        </Stack>
                    </Stack>
                </Center>
            </Box>
        </>
    );
};