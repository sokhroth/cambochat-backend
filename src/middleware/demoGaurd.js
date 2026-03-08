
// Demo guard middleware
 function demoGuard(req, res, next) {
    // You can use NODE_ENV or a custom env variable like DEMO_MODE
    const isDemo = process.env.IS_CLIENT != 'true';

    if (isDemo) {
        return res.status(403).json({
            success: false,
            message: 'You are not authorized to perform this action in demo mode',
        });
    }

    next();
}

module.exports = { demoGuard };
