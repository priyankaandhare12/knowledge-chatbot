module.exports = {
    apps: [
        {
            name: 'knowledge-chatbot-debug',
            script: 'index.js',
            watch: true,
            ignore_watch: ['node_modules', 'logs'],
            env: {
                NODE_ENV: 'development',
                DEBUG: '*',
            },
        },
    ],
};