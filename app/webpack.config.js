const path = require('path');

module.exports = {
    // other configuration...
    resolve: {
        fallback: {
            path: require.resolve('path-browserify'), // Add this line
        },
    },
};
