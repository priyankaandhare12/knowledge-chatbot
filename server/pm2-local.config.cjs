module.exports = {
    apps: [
        {
            name: 'knowledge-chatbot',
            script: 'index.js',
            watch: true,
            ignore_watch: ['node_modules', 'logs'],
            env: {
                NODE_ENV: 'development',
            },
        },
    ],
};