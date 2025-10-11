interface PrismWorkerGlobalScope extends WorkerGlobalScope {
    Prism: { disableWorkerMessageHandler: boolean };
}

(self as PrismWorkerGlobalScope).Prism = {
    disableWorkerMessageHandler: true,
};

import('prismjs').then(async ({ default: Prism }) => {
    await import('prismjs/components/prism-javascript');
    await import('prismjs/components/prism-typescript');
    await import('prismjs/components/prism-jsx');
    await import('prismjs/components/prism-tsx');

    await Promise.all([
        import('prismjs/components/prism-csharp'),
        import('prismjs/components/prism-json'),
        import('prismjs/components/prism-css'),
        import('prismjs/components/prism-scss'),
        import('prismjs/components/prism-markdown'),
        import('prismjs/components/prism-bash'),
        import('prismjs/components/prism-rust'),
        import('prismjs/components/prism-python'),
        import('prismjs/components/prism-yaml'),
        import('prismjs/components/prism-go'),
        import('prismjs/components/prism-java'),
        import('prismjs/components/prism-sql'),
    ]);

    self.onmessage = (event: MessageEvent<{ code: string; language: string; jobId: string }>) => {
        const { code, language, jobId } = event.data;
        const grammar = Prism.languages[language] || Prism.languages.plaintext;

        if (!grammar) {
            postMessage({ error: `Grammar for language "${language}" not found.`, jobId });
            return;
        }

        const html = Prism.highlight(code, grammar, language);
        postMessage({ html, jobId });
    };

    postMessage({ ready: true });
});