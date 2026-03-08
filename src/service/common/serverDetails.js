const getmac = require("getmac").default;

const os = require("os");

function getServerIP() {
    const networkInterfaces = os.networkInterfaces();

    for (const interfaceName in networkInterfaces) {
        for (const interface of networkInterfaces[interfaceName]) {
            // Check for IPv4 and non-internal addresses (to exclude localhost)
            if (interface.family === "IPv4" && !interface.internal) {
                return interface.address;
            }
        }
    }

    return "IP address not found";
}

function getMacAddress() {
    try {
        const mac = getmac();
        return mac;
    } catch (err) {
        console.error("Error fetching MAC address:", err);
        return null;
    }
}


module.exports = {
    getServerIP,
    getMacAddress,
};


